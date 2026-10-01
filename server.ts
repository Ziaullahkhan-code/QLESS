import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { INITIAL_RESTAURANTS } from './src/data/restaurants';
import { QueueToken, Restaurant } from './src/types';
import { validatePakistanPhone } from './src/utils/pakistanPhone';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// --- IN-MEMORY QUEUE STORE ON BACKEND ---
let restaurants: Restaurant[] = [...INITIAL_RESTAURANTS];
let tokens: QueueToken[] = [];
let counterTimeoutSeconds: number = 60;
let sseClients: Set<Response> = new Set();
let tokenCounter = 100;

// Seed initial queue state with realistic Karachi diners
function seedInitialData() {
  tokens = [];
  restaurants.forEach((r) => {
    const prefix = r.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);

    // Initial waiting diners
    const sampleNames = [
      { name: 'Bilal Khan', size: 2, phone: '0300-4521890' },
      { name: 'Ayesha Siddiqui', size: 4, phone: '0321-9872341' },
      { name: 'Omer Farooq', size: 1, phone: '0333-5612984' },
      { name: 'Zainab Raza', size: 3, phone: '0312-3498127' },
    ];

    sampleNames.slice(0, 3).forEach((guest, idx) => {
      tokenCounter++;
      tokens.push({
        id: `tok-init-${r.id}-${idx}`,
        restaurantId: r.id,
        tokenNumber: `${prefix}-${tokenCounter}`,
        customerName: guest.name,
        partySize: guest.size,
        phone: guest.phone,
        createdAt: Date.now() - (idx + 1) * 180000,
        status: 'waiting',
      });
    });
  });
}

seedInitialData();

// Broadcast event to all connected SSE clients
function broadcast(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Background timer to check token expirations
setInterval(() => {
  const now = Date.now();
  let changed = false;

  const calledTokens = tokens.filter((t) => t.status === 'called' && t.expiresAt);
  for (const tok of calledTokens) {
    if (tok.expiresAt && now >= tok.expiresAt) {
      tok.status = 'expired';
      tok.expiredAt = now;
      tok.notes = `Auto-expired: Missed ${tok.calledToCounter || 'counter'} within ${counterTimeoutSeconds}s`;
      changed = true;

      broadcast('token_expired', {
        tokenId: tok.id,
        tokenNumber: tok.tokenNumber,
        restaurantId: tok.restaurantId,
        counter: tok.calledToCounter || 'Counter 3',
        timeoutSeconds: counterTimeoutSeconds,
      });
    }
  }

  if (changed) {
    broadcast('queue_updated', { tokensCount: tokens.length });
  }
}, 1000);

async function startServer() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --- REST API ROUTES ---

  // 1. Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'QLESS Real-Time Queue & Priority Dispatch Backend',
      port: PORT,
      timestamp: Date.now(),
      uptimeSeconds: Math.floor(process.uptime()),
      activeTokensCount: tokens.filter((t) => t.status === 'waiting' || t.status === 'called').length,
      counterTimeoutSeconds,
    });
  });

  // 2. Restaurants list with live metrics
  app.get('/api/restaurants', (_req: Request, res: Response) => {
    const list = restaurants.map((r) => {
      const waiting = tokens.filter((t) => t.restaurantId === r.id && t.status === 'waiting');
      const serving = tokens.find((t) => t.restaurantId === r.id && (t.status === 'called' || t.status === 'serving'));
      return {
        ...r,
        waitingCount: waiting.length,
        estimatedWaitMinutes: waiting.length * r.avgWaitPerPartyMin,
        currentlyServing: serving || null,
      };
    });
    res.json({ restaurants: list });
  });

  // 3. Tokens list
  app.get('/api/tokens', (req: Request, res: Response) => {
    const { restaurantId, status } = req.query;
    let result = [...tokens];
    if (restaurantId && typeof restaurantId === 'string') {
      result = result.filter((t) => t.restaurantId === restaurantId);
    }
    if (status && typeof status === 'string') {
      result = result.filter((t) => t.status === status);
    }
    res.json({ tokens: result });
  });

  // 4. Claim token (with Pakistan Mobile Validation)
  app.post('/api/tokens/claim', (req: Request, res: Response) => {
    const { restaurantId, partySize = 2, customerName = 'Guest Diner', phone = '' } = req.body;

    const r = restaurants.find((item) => item.id === restaurantId);
    if (!r) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    let validatedPhone = phone;
    let operatorName = 'Standard Mobile';

    if (phone) {
      const phoneValidation = validatePakistanPhone(phone);
      if (!phoneValidation.isValid) {
        return res.status(400).json({ error: phoneValidation.error || 'Invalid Pakistan mobile format' });
      }
      validatedPhone = phoneValidation.formatted;
      operatorName = phoneValidation.operator || 'Pakistan Mobile 🇵🇰';
    }

    const prefix = r.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);

    tokenCounter++;
    const newToken: QueueToken = {
      id: `tok-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      restaurantId,
      tokenNumber: `${prefix}-${tokenCounter}`,
      customerName: customerName.trim() || 'Guest Diner',
      partySize: Number(partySize) || 2,
      phone: validatedPhone,
      createdAt: Date.now(),
      status: 'waiting',
    };

    tokens.push(newToken);

    broadcast('token_claimed', { token: newToken, operator: operatorName });
    res.status(201).json({ success: true, token: newToken, operator: operatorName });
  });

  // 5. Serve Next token at station counter
  app.post('/api/tokens/serve-next', (req: Request, res: Response) => {
    const { restaurantId, counterName = 'Counter 3' } = req.body;

    // Finish any currently serving token at this counter
    const activeAtCounter = tokens.find(
      (t) => t.restaurantId === restaurantId && (t.status === 'called' || t.status === 'serving') && t.calledToCounter === counterName
    );
    if (activeAtCounter) {
      activeAtCounter.status = 'completed';
    }

    // Find next waiting guest
    const nextWaiting = tokens.find((t) => t.restaurantId === restaurantId && t.status === 'waiting');
    if (!nextWaiting) {
      return res.json({ success: true, message: 'Queue is clear', token: null });
    }

    nextWaiting.status = 'called';
    nextWaiting.calledAt = Date.now();
    nextWaiting.calledToCounter = counterName;
    nextWaiting.expiresAt = Date.now() + counterTimeoutSeconds * 1000;

    broadcast('token_called', {
      token: nextWaiting,
      counter: counterName,
      expiresAt: nextWaiting.expiresAt,
    });

    res.json({ success: true, token: nextWaiting });
  });

  // 6. Skip token / No-Show
  app.post('/api/tokens/skip', (req: Request, res: Response) => {
    const { tokenId, reason = 'No show at counter' } = req.body;
    const tok = tokens.find((t) => t.id === tokenId);
    if (!tok) {
      return res.status(404).json({ error: 'Token not found' });
    }

    tok.status = 'skipped';
    tok.notes = reason;

    broadcast('token_skipped', { token: tok, reason });
    res.json({ success: true, token: tok });
  });

  // 7. Complete token service
  app.post('/api/tokens/complete', (req: Request, res: Response) => {
    const { tokenId } = req.body;
    const tok = tokens.find((t) => t.id === tokenId);
    if (!tok) {
      return res.status(404).json({ error: 'Token not found' });
    }

    tok.status = 'completed';
    broadcast('token_completed', { token: tok });
    res.json({ success: true, token: tok });
  });

  // 8. Voice Re-call token
  app.post('/api/tokens/recall', (req: Request, res: Response) => {
    const { tokenId, counterName } = req.body;
    const tok = tokens.find((t) => t.id === tokenId);
    if (!tok) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const counter = counterName || tok.calledToCounter || 'Counter 3';
    tok.calledToCounter = counter;
    // Reset expiration window on recall
    tok.expiresAt = Date.now() + counterTimeoutSeconds * 1000;

    broadcast('token_recalled', { token: tok, counter, expiresAt: tok.expiresAt });
    res.json({ success: true, token: tok, counter });
  });

  // 9. Rejoin Queue
  app.post('/api/tokens/rejoin', (req: Request, res: Response) => {
    const { tokenId } = req.body;
    const tok = tokens.find((t) => t.id === tokenId);
    if (!tok) {
      return res.status(404).json({ error: 'Token not found' });
    }

    tok.status = 'waiting';
    tok.createdAt = Date.now();
    tok.notes = 'Rejoined after missing turn';
    tok.expiresAt = undefined;

    broadcast('token_rejoined', { token: tok });
    res.json({ success: true, token: tok });
  });

  // 10. Walk-in issue
  app.post('/api/tokens/walk-in', (req: Request, res: Response) => {
    const { restaurantId, partySize = 2, name = 'Walk-in Guest', notes } = req.body;
    const r = restaurants.find((item) => item.id === restaurantId);
    if (!r) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const prefix = r.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);

    tokenCounter++;
    const newToken: QueueToken = {
      id: `tok-walkin-${Date.now()}`,
      restaurantId,
      tokenNumber: `${prefix}-${tokenCounter}`,
      customerName: name,
      partySize: Number(partySize) || 2,
      createdAt: Date.now(),
      status: 'waiting',
      notes,
    };

    tokens.push(newToken);
    broadcast('token_claimed', { token: newToken, isWalkIn: true });
    res.status(201).json({ success: true, token: newToken });
  });

  // 11. Reset / Seed Queue
  app.post('/api/tokens/reset', (_req: Request, res: Response) => {
    seedInitialData();
    broadcast('queue_reset', { timestamp: Date.now() });
    res.json({ success: true, message: 'Sample queue reset with Karachi diners' });
  });

  // 12. Timeout config
  app.get('/api/config/timeout', (_req: Request, res: Response) => {
    res.json({ counterTimeoutSeconds });
  });

  app.post('/api/config/timeout', (req: Request, res: Response) => {
    const { seconds } = req.body;
    if (seconds && Number(seconds) >= 10 && Number(seconds) <= 600) {
      counterTimeoutSeconds = Number(seconds);
      broadcast('timeout_updated', { counterTimeoutSeconds });
      return res.json({ success: true, counterTimeoutSeconds });
    }
    res.status(400).json({ error: 'Invalid timeout seconds (must be 10 - 600)' });
  });

  // 13. Pakistan SMS Gateway Simulation
  app.post('/api/notify/sms', (req: Request, res: Response) => {
    const { phone, tokenNumber, restaurantName, counterName = 'Counter 3', type = 'called' } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    const validation = validatePakistanPhone(phone);
    const operator = validation.operator || 'Pakistan Telecom';

    let message = '';
    if (type === 'called') {
      message = `[QLESS ALERT] Token #${tokenNumber} is now being called to ${counterName} at ${restaurantName || 'the counter'}. Please proceed within 60s.`;
    } else if (type === 'reissued') {
      message = `[QLESS] Notice: Your previous token expired. New pass #${tokenNumber} has been automatically reissued to hold your place at ${restaurantName}.`;
    } else {
      message = `[QLESS PASS] Your active pass for ${restaurantName} is #${tokenNumber}. Track live: https://qless.pk/t/${tokenNumber}`;
    }

    const result = {
      success: true,
      phone: validation.formatted || phone,
      operator,
      message,
      timestamp: Date.now(),
      deliveryId: `PK-SMS-${Date.now().toString(36).toUpperCase()}`,
      status: 'DELIVERED',
    };

    res.json(result);
  });

  // 14. Daily Queue Analytics CSV Export
  app.get('/api/analytics/export', (_req: Request, res: Response) => {
    const rows = [
      'Token Number,Restaurant,Party Size,Customer Name,Phone,Status,Wait Time Mins,Counter,Notes,Timestamp',
    ];

    tokens.forEach((t) => {
      const rest = restaurants.find((r) => r.id === t.restaurantId);
      const waitMins = Math.max(1, Math.floor((Date.now() - t.createdAt) / 60000));
      rows.push(
        `"${t.tokenNumber}","${rest?.name || t.restaurantId}",${t.partySize},"${t.customerName}","${t.phone || 'N/A'}","${t.status}",${waitMins},"${t.calledToCounter || 'N/A'}","${t.notes || ''}","${new Date(t.createdAt).toLocaleTimeString()}"`
      );
    });

    const csvContent = rows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="qless-karachi-queue-report.csv"');
    res.status(200).send(csvContent);
  });

  // 15. Server-Sent Events (SSE) Real-Time Stream
  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    sseClients.add(res);

    // Initial state event
    res.write(`event: init\ndata: ${JSON.stringify({ tokensCount: tokens.length, counterTimeoutSeconds })}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // --- VITE MIDDLEWARE OR STATIC SERVING ---
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[QLESS Server] Full-Stack Running at http://0.0.0.0:${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer();
