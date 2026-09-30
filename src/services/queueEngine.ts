import { QueueToken, Restaurant, TokenStatus, QueueMetrics, ExpiredNotification } from '../types';
import { INITIAL_RESTAURANTS } from '../data/restaurants';
import { 
  playServeNextChime, 
  playCustomerTurnAlert, 
  playRecallChime, 
  playTokenClaimedSound,
  playOrderCompleteSound,
  playExpirationAlert,
  playCustomerAutoReissuedAlert
} from './sound';

const STORAGE_KEY_TOKENS = 'qless_tokens_v5_karachi';
const STORAGE_KEY_USER_TOKEN = 'qless_user_token_id_v5';
const STORAGE_KEY_TIMEOUT = 'qless_counter_timeout_v5';
const BROADCAST_CHANNEL_NAME = 'qless_realtime_channel_v5';

type Listener = () => void;

class QueueEngine {
  private tokens: QueueToken[] = [];
  private restaurants: Restaurant[] = INITIAL_RESTAURANTS;
  private userTokenId: string | null = null;
  private latestExpiredNotification: ExpiredNotification | null = null;
  private listeners: Set<Listener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private tokenSeq: number = 100;
  private counterTimeoutSeconds: number = 60; // Configurable: 30s, 60s, 90s, 120s, 180s
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.init();
    if (typeof window !== 'undefined') {
      this.timerInterval = setInterval(() => {
        this.checkTokenExpirations();
      }, 1000);
    }
  }

  private init() {
    if (typeof window !== 'undefined') {
      try {
        const savedTimeout = localStorage.getItem(STORAGE_KEY_TIMEOUT);
        if (savedTimeout) {
          const parsed = parseInt(savedTimeout, 10);
          if (!isNaN(parsed) && parsed > 0) {
            this.counterTimeoutSeconds = parsed;
          }
        }

        const savedTokens = localStorage.getItem(STORAGE_KEY_TOKENS);
        if (savedTokens) {
          const parsed = JSON.parse(savedTokens);
          if (Array.isArray(parsed) && parsed.length >= 20) {
            this.tokens = parsed;
          } else {
            this.seedInitialTokens();
          }
        } else {
          this.seedInitialTokens();
        }

        const savedUserToken = localStorage.getItem(STORAGE_KEY_USER_TOKEN);
        if (savedUserToken) {
          this.userTokenId = savedUserToken;
        }

        if ('BroadcastChannel' in window) {
          this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
          this.broadcastChannel.onmessage = (event) => {
            if (event.data?.type === 'SYNC_STATE') {
              this.handleExternalSync(event.data.tokens);
            }
          };
        }

        window.addEventListener('storage', (e) => {
          if (e.key === STORAGE_KEY_TOKENS && e.newValue) {
            try {
              this.tokens = JSON.parse(e.newValue);
              this.notify();
            } catch {
              // ignore
            }
          }
        });
      } catch (err) {
        console.warn('QueueEngine initialization fallback:', err);
        this.seedInitialTokens();
      }
    } else {
      this.seedInitialTokens();
    }
  }

  public getCounterTimeoutSeconds(): number {
    return this.counterTimeoutSeconds;
  }

  public setCounterTimeoutSeconds(seconds: number) {
    this.counterTimeoutSeconds = Math.max(15, seconds);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_TIMEOUT, this.counterTimeoutSeconds.toString());
    }
    this.notify();
  }

  /**
   * Checks if any active called diner has exceeded the configurable counter timeout window.
   * If expired: marks expired, triggers alert, automatically reissues new token for the diner,
   * and automatically advances the queue to serve the next party.
   */
  public checkTokenExpirations() {
    const now = Date.now();
    const calledTokens = this.tokens.filter((t) => t.status === 'called' && t.expiresAt);

    let stateChanged = false;

    for (const token of calledTokens) {
      if (token.expiresAt && now >= token.expiresAt) {
        token.status = 'expired';
        token.expiredAt = now;
        token.notes = `Auto-expired: Did not reach ${token.calledToCounter || 'counter'} within ${this.counterTimeoutSeconds}s`;

        playExpirationAlert(token.tokenNumber);
        stateChanged = true;

        // Auto-generate and issue next token to the customer if this was their active ticket
        if (this.userTokenId === token.id) {
          const r = this.getRestaurant(token.restaurantId);
          const prefix = r ? r.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) : 'Q';
          const existingCount = this.tokens.filter((t) => t.restaurantId === token.restaurantId).length;
          const reissuedNumber = `${prefix}-${100 + existingCount + 1}`;

          const reissuedToken: QueueToken = {
            id: `tok-auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            restaurantId: token.restaurantId,
            tokenNumber: reissuedNumber,
            customerName: token.customerName,
            partySize: token.partySize,
            phone: token.phone,
            createdAt: Date.now(),
            status: 'waiting',
            isCurrentClientToken: true,
            autoReissuedFromId: token.id,
            notes: `Auto-reissued pass (Previous ${token.tokenNumber} expired)`,
          };

          this.tokens.push(reissuedToken);
          this.userTokenId = reissuedToken.id;
          token.reissuedTokenNumber = reissuedNumber;

          // Record notification for Customer View modal
          this.latestExpiredNotification = {
            id: `exp-${Date.now()}`,
            oldTokenNumber: token.tokenNumber,
            newTokenNumber: reissuedNumber,
            restaurantId: token.restaurantId,
            restaurantName: r ? r.name : 'Restaurant Counter',
            counterName: token.calledToCounter || 'Counter 3',
            timestamp: Date.now(),
            timeoutSeconds: this.counterTimeoutSeconds,
          };

          // Play specific auto-reissue alert and voice announcement for the user
          playCustomerAutoReissuedAlert(
            token.tokenNumber, 
            reissuedNumber, 
            token.calledToCounter || 'Counter 3'
          );
        } else {
          // Normal staff station expiration alert
          playExpirationAlert(token.tokenNumber);
        }

        // Automatically call the next customer in line to the station
        this.serveNext(token.restaurantId, token.calledToCounter || 'Counter 3');
      }
    }

    if (stateChanged) {
      this.persist();
    }
  }

  public getLatestExpiredNotification(): ExpiredNotification | null {
    return this.latestExpiredNotification;
  }

  public dismissExpiredNotification() {
    this.latestExpiredNotification = null;
    this.notify();
  }

  /**
   * Seed all 10 Karachi restaurants with active waiting parties and servers
   */
  private seedInitialTokens() {
    const now = Date.now();
    this.tokens = [
      // 1. Burger Lab (SMCHS - 50m)
      {
        id: 'tok-bl-001',
        restaurantId: 'rest-burger-lab',
        tokenNumber: 'BL-101',
        customerName: 'Hamza Farooqi',
        partySize: 2,
        createdAt: now - 14 * 60 * 1000,
        status: 'serving',
        calledAt: now - 2 * 60 * 1000,
        calledToCounter: 'Counter 3',
        notes: 'Dynamo fries & smash burger',
      },
      {
        id: 'tok-bl-002',
        restaurantId: 'rest-burger-lab',
        tokenNumber: 'BL-102',
        customerName: 'Ayesha Siddiqui',
        partySize: 3,
        createdAt: now - 9 * 60 * 1000,
        status: 'waiting',
        notes: 'Takeaway pack',
      },
      {
        id: 'tok-bl-003',
        restaurantId: 'rest-burger-lab',
        tokenNumber: 'BL-103',
        customerName: 'Zainab Qureshi',
        partySize: 1,
        createdAt: now - 5 * 60 * 1000,
        status: 'waiting',
      },
      {
        id: 'tok-bl-004',
        restaurantId: 'rest-burger-lab',
        tokenNumber: 'BL-104',
        customerName: 'Bilal Ahmed',
        partySize: 4,
        createdAt: now - 2 * 60 * 1000,
        status: 'waiting',
      },

      // 2. OD Donut & Bakeshop (SMCHS - 80m)
      {
        id: 'tok-od-001',
        restaurantId: 'rest-od-donuts',
        tokenNumber: 'OD-201',
        customerName: 'Sara Khan',
        partySize: 2,
        createdAt: now - 11 * 60 * 1000,
        status: 'serving',
        calledAt: now - 1 * 60 * 1000,
        calledToCounter: 'Counter 1',
        notes: 'Lotus Biscoff box of 6',
      },
      {
        id: 'tok-od-002',
        restaurantId: 'rest-od-donuts',
        tokenNumber: 'OD-202',
        customerName: 'Mustafa Alvi',
        partySize: 1,
        createdAt: now - 6 * 60 * 1000,
        status: 'waiting',
      },
      {
        id: 'tok-od-003',
        restaurantId: 'rest-od-donuts',
        tokenNumber: 'OD-203',
        customerName: 'Fatima Zahra',
        partySize: 2,
        createdAt: now - 3 * 60 * 1000,
        status: 'waiting',
      },

      // 3. Mizaaj Restaurant (SMCHS - 110m)
      {
        id: 'tok-mz-001',
        restaurantId: 'rest-mizaaj',
        tokenNumber: 'M-301',
        customerName: 'Dr. Tariq Jamil',
        partySize: 5,
        createdAt: now - 25 * 60 * 1000,
        status: 'serving',
        calledAt: now - 4 * 60 * 1000,
        calledToCounter: 'Counter 3',
        notes: 'Courtyard family dining',
      },
      {
        id: 'tok-mz-002',
        restaurantId: 'rest-mizaaj',
        tokenNumber: 'M-302',
        customerName: 'Naveed Akhtar',
        partySize: 4,
        createdAt: now - 12 * 60 * 1000,
        status: 'waiting',
      },
      {
        id: 'tok-mz-003',
        restaurantId: 'rest-mizaaj',
        tokenNumber: 'M-303',
        customerName: 'Sania Mirza',
        partySize: 2,
        createdAt: now - 7 * 60 * 1000,
        status: 'waiting',
      },
      {
        id: 'tok-mz-004',
        restaurantId: 'rest-mizaaj',
        tokenNumber: 'M-304',
        customerName: 'Rehan Sheikh',
        partySize: 3,
        createdAt: now - 2 * 60 * 1000,
        status: 'waiting',
      },

      // 4. KFC SMCHS (120m)
      {
        id: 'tok-kfc-001',
        restaurantId: 'rest-kfc-smchs',
        tokenNumber: 'KFC-401',
        customerName: 'Usman Ghani',
        partySize: 2,
        createdAt: now - 16 * 60 * 1000,
        status: 'serving',
        calledAt: now - 3 * 60 * 1000,
        calledToCounter: 'Counter 3',
      },
      {
        id: 'tok-kfc-002',
        restaurantId: 'rest-kfc-smchs',
        tokenNumber: 'KFC-402',
        customerName: 'Kashif Ali',
        partySize: 4,
        createdAt: now - 10 * 60 * 1000,
        status: 'waiting',
        notes: 'Bucket meal',
      },
      {
        id: 'tok-kfc-003',
        restaurantId: 'rest-kfc-smchs',
        tokenNumber: 'KFC-403',
        customerName: 'Zoya Baig',
        partySize: 2,
        createdAt: now - 4 * 60 * 1000,
        status: 'waiting',
      },

      // 5. Ginsoy Extreme Chinese (160m)
      {
        id: 'tok-gn-001',
        restaurantId: 'rest-ginsoy',
        tokenNumber: 'G-501',
        customerName: 'Salman Merchant',
        partySize: 4,
        createdAt: now - 20 * 60 * 1000,
        status: 'serving',
        calledAt: now - 3 * 60 * 1000,
        calledToCounter: 'Counter 3',
        notes: 'Dragon beef & 19B soup',
      },
      {
        id: 'tok-gn-002',
        restaurantId: 'rest-ginsoy',
        tokenNumber: 'G-502',
        customerName: 'Hina Rabbani',
        partySize: 3,
        createdAt: now - 13 * 60 * 1000,
        status: 'waiting',
      },
      {
        id: 'tok-gn-003',
        restaurantId: 'rest-ginsoy',
        tokenNumber: 'G-503',
        customerName: 'Omer Saeed',
        partySize: 2,
        createdAt: now - 6 * 60 * 1000,
        status: 'waiting',
      },

      // 6. Jan's Broast (180m)
      {
        id: 'tok-jb-001',
        restaurantId: 'rest-jans-broast',
        tokenNumber: 'JB-601',
        customerName: 'Ali Raza',
        partySize: 4,
        createdAt: now - 19 * 60 * 1000,
        status: 'serving',
        calledAt: now - 2 * 60 * 1000,
        calledToCounter: 'Counter 2',
        notes: 'Extra garlic sauce',
      },
      {
        id: 'tok-jb-002',
        restaurantId: 'rest-jans-broast',
        tokenNumber: 'JB-602',
        customerName: 'Waleed Khan',
        partySize: 2,
        createdAt: now - 11 * 60 * 1000,
        status: 'waiting',
      },
      {
        id: 'tok-jb-003',
        restaurantId: 'rest-jans-broast',
        tokenNumber: 'JB-603',
        customerName: 'Amber Shah',
        partySize: 3,
        createdAt: now - 5 * 60 * 1000,
        status: 'waiting',
      },

      // 7. Test Kitchen by Okra (190m)
      {
        id: 'tok-tk-001',
        restaurantId: 'rest-test-kitchen',
        tokenNumber: 'TK-701',
        customerName: 'Farhan Zaidi',
        partySize: 2,
        createdAt: now - 18 * 60 * 1000,
        status: 'serving',
        calledAt: now - 2 * 60 * 1000,
        calledToCounter: 'Counter 3',
        notes: 'Croissant & flat white',
      },
      {
        id: 'tok-tk-002',
        restaurantId: 'rest-test-kitchen',
        tokenNumber: 'TK-702',
        customerName: 'Natasha Rizvi',
        partySize: 2,
        createdAt: now - 8 * 60 * 1000,
        status: 'waiting',
      },
      {
        id: 'tok-tk-003',
        restaurantId: 'rest-test-kitchen',
        tokenNumber: 'TK-703',
        customerName: 'Adeel Hashmi',
        partySize: 1,
        createdAt: now - 3 * 60 * 1000,
        status: 'waiting',
      },

      // 8. FLOC (For the Love of Coffee) (220m)
      {
        id: 'tok-fl-001',
        restaurantId: 'rest-floc',
        tokenNumber: 'FL-801',
        customerName: 'Shehroz Sabzwari',
        partySize: 2,
        createdAt: now - 15 * 60 * 1000,
        status: 'serving',
        calledAt: now - 1 * 60 * 1000,
        calledToCounter: 'Counter 2',
      },
      {
        id: 'tok-fl-002',
        restaurantId: 'rest-floc',
        tokenNumber: 'FL-802',
        customerName: 'Mariam Ansari',
        partySize: 2,
        createdAt: now - 9 * 60 * 1000,
        status: 'waiting',
        notes: 'Pancake stack',
      },
      {
        id: 'tok-fl-003',
        restaurantId: 'rest-floc',
        tokenNumber: 'FL-803',
        customerName: 'Daniyal Tariq',
        partySize: 1,
        createdAt: now - 4 * 60 * 1000,
        status: 'waiting',
      },

      // 9. Subway SMCHS (250m)
      {
        id: 'tok-sub-001',
        restaurantId: 'rest-subway-smchs',
        tokenNumber: 'SW-901',
        customerName: 'Fahad Mustafa',
        partySize: 2,
        createdAt: now - 12 * 60 * 1000,
        status: 'serving',
        calledAt: now - 2 * 60 * 1000,
        calledToCounter: 'Counter 1',
      },
      {
        id: 'tok-sub-002',
        restaurantId: 'rest-subway-smchs',
        tokenNumber: 'SW-902',
        customerName: 'Sarah Chaudhry',
        partySize: 1,
        createdAt: now - 6 * 60 * 1000,
        status: 'waiting',
      },
      {
        id: 'tok-sub-003',
        restaurantId: 'rest-subway-smchs',
        tokenNumber: 'SW-903',
        customerName: 'Asad Vohra',
        partySize: 3,
        createdAt: now - 2 * 60 * 1000,
        status: 'waiting',
      },

      // 10. Tooso Bahadurabad (300m)
      {
        id: 'tok-ts-001',
        restaurantId: 'rest-tooso',
        tokenNumber: 'T-1001',
        customerName: 'Khurram Shehzad',
        partySize: 6,
        createdAt: now - 22 * 60 * 1000,
        status: 'serving',
        calledAt: now - 4 * 60 * 1000,
        calledToCounter: 'Counter 2',
        notes: 'Halwa puri family table',
      },
      {
        id: 'tok-ts-002',
        restaurantId: 'rest-tooso',
        tokenNumber: 'T-1002',
        customerName: 'Rashid Minhas',
        partySize: 4,
        createdAt: now - 14 * 60 * 1000,
        status: 'waiting',
      },
      {
        id: 'tok-ts-003',
        restaurantId: 'rest-tooso',
        tokenNumber: 'T-1003',
        customerName: 'Mehwish Hayat',
        partySize: 2,
        createdAt: now - 8 * 60 * 1000,
        status: 'waiting',
      },
      {
        id: 'tok-ts-004',
        restaurantId: 'rest-tooso',
        tokenNumber: 'T-1004',
        customerName: 'Noman Ijaz',
        partySize: 3,
        createdAt: now - 3 * 60 * 1000,
        status: 'waiting',
      },
    ];
    this.persist();
  }

  private persist() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(this.tokens));
        if (this.userTokenId) {
          localStorage.setItem(STORAGE_KEY_USER_TOKEN, this.userTokenId);
        } else {
          localStorage.removeItem(STORAGE_KEY_USER_TOKEN);
        }
      } catch {
        // Storage might be restricted
      }

      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({
            type: 'SYNC_STATE',
            tokens: this.tokens,
          });
        } catch {
          // ignore
        }
      }
    }
    this.notify();
  }

  private handleExternalSync(incomingTokens: QueueToken[]) {
    const prevUserToken = this.getUserToken();
    this.tokens = incomingTokens;

    const nextUserToken = this.getUserToken();
    if (nextUserToken && prevUserToken) {
      if (prevUserToken.status !== 'called' && nextUserToken.status === 'called') {
        playCustomerTurnAlert(nextUserToken.tokenNumber, nextUserToken.calledToCounter || 'Counter 3');
      }
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('Error in QueueEngine listener:', e);
      }
    });
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getRestaurants(): Restaurant[] {
    return this.restaurants;
  }

  public getRestaurant(id: string): Restaurant | undefined {
    return this.restaurants.find((r) => r.id === id);
  }

  public getAllTokens(): QueueToken[] {
    return [...this.tokens];
  }

  public getTokensForRestaurant(restaurantId: string): QueueToken[] {
    return this.tokens.filter((t) => t.restaurantId === restaurantId);
  }

  public getActiveQueue(restaurantId: string): QueueToken[] {
    return this.tokens
      .filter((t) => t.restaurantId === restaurantId && (t.status === 'waiting' || t.status === 'called'))
      .sort((a, b) => {
        if (a.status === 'called' && b.status !== 'called') return -1;
        if (b.status === 'called' && a.status !== 'called') return 1;
        return a.createdAt - b.createdAt;
      });
  }

  public getCurrentlyServing(restaurantId: string): QueueToken | undefined {
    return this.tokens.find(
      (t) => t.restaurantId === restaurantId && (t.status === 'called' || t.status === 'serving')
    );
  }

  public getUserToken(): QueueToken | null {
    if (!this.userTokenId) return null;
    const token = this.tokens.find((t) => t.id === this.userTokenId);
    if (!token) return null;
    return token;
  }

  public getUserTokenQueuePosition(tokenId: string): number {
    const token = this.tokens.find((t) => t.id === tokenId);
    if (!token) return -1;
    if (token.status === 'called' || token.status === 'serving') return 0;
    if (token.status !== 'waiting') return -1;

    const waitingTokens = this.tokens
      .filter((t) => t.restaurantId === token.restaurantId && t.status === 'waiting')
      .sort((a, b) => a.createdAt - b.createdAt);

    const index = waitingTokens.findIndex((t) => t.id === tokenId);
    return index === -1 ? -1 : index + 1;
  }

  public getMetrics(restaurantId: string): QueueMetrics {
    const restaurant = this.getRestaurant(restaurantId);
    const avgWaitPerParty = restaurant ? restaurant.avgWaitPerPartyMin : 4;

    const waitingTokens = this.tokens.filter(
      (t) => t.restaurantId === restaurantId && t.status === 'waiting'
    );
    const servedToday = this.tokens.filter(
      (t) => t.restaurantId === restaurantId && t.status === 'completed'
    ).length;
    const skippedToday = this.tokens.filter(
      (t) => t.restaurantId === restaurantId && t.status === 'skipped'
    ).length;
    const currentlyServing = this.getCurrentlyServing(restaurantId);

    return {
      totalWaiting: waitingTokens.length,
      estimatedWaitMinutes: Math.max(2, waitingTokens.length * avgWaitPerParty),
      currentlyServingToken: currentlyServing,
      servedCountToday: servedToday,
      skippedCountToday: skippedToday,
      averageWaitTimeMinutes: avgWaitPerParty,
    };
  }

  public claimToken(
    restaurantId: string,
    partySize: number = 2,
    customerName: string = 'Guest',
    phone: string = ''
  ): QueueToken {
    const restaurant = this.getRestaurant(restaurantId);
    const prefix = restaurant ? restaurant.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) : 'Q';
    const existingCount = this.tokens.filter((t) => t.restaurantId === restaurantId).length;
    this.tokenSeq += 1;
    const tokenNumber = `${prefix}-${100 + existingCount + 1}`;

    const newToken: QueueToken = {
      id: `tok-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      restaurantId,
      tokenNumber,
      customerName: customerName.trim() || `Party of ${partySize}`,
      partySize,
      phone: phone.trim() || undefined,
      createdAt: Date.now(),
      status: 'waiting',
      isCurrentClientToken: true,
    };

    this.tokens.push(newToken);
    this.userTokenId = newToken.id;
    this.persist();

    playTokenClaimedSound();
    return newToken;
  }

  /**
   * Business action: Prominent 'SERVE NEXT'
   * With voice calling out: "Token number B-105, please proceed to Counter 3"
   * And when it is the customer's own turn: "You are next! Please proceed to Counter 3"
   */
  public serveNext(restaurantId: string, counterName: string = 'Counter 3'): QueueToken | null {
    const currentActive = this.tokens.find(
      (t) => t.restaurantId === restaurantId && (t.status === 'called' || t.status === 'serving')
    );
    if (currentActive) {
      currentActive.status = 'completed';
    }

    const waitingTokens = this.tokens
      .filter((t) => t.restaurantId === restaurantId && t.status === 'waiting')
      .sort((a, b) => a.createdAt - b.createdAt);

    if (waitingTokens.length === 0) {
      this.persist();
      return null;
    }

    const nextToken = waitingTokens[0];
    nextToken.status = 'called';
    nextToken.calledAt = Date.now();
    nextToken.calledToCounter = counterName;
    nextToken.expiresAt = Date.now() + this.counterTimeoutSeconds * 1000;

    this.persist();

    // If this token belongs to the current user, announce "You are next!"
    if (this.userTokenId === nextToken.id) {
      playCustomerTurnAlert(nextToken.tokenNumber, counterName);
    } else {
      // Announce "Token number B-105, please proceed to Counter 3"
      playServeNextChime(nextToken.tokenNumber, nextToken.customerName, counterName);
    }

    return nextToken;
  }

  public skipToken(tokenId: string, reason: string = 'No show after call'): boolean {
    const token = this.tokens.find((t) => t.id === tokenId);
    if (!token) return false;

    token.status = 'skipped';
    token.notes = reason;
    this.persist();
    return true;
  }

  /**
   * Business action: Complete serving currently active customer
   * Plays completion fanfare and returns the completed token so UI shows "Thanks!" pop-up
   */
  public completeService(tokenId: string): QueueToken | null {
    const token = this.tokens.find((t) => t.id === tokenId);
    if (!token) return null;

    token.status = 'completed';
    this.persist();
    playOrderCompleteSound();
    return token;
  }

  /**
   * Re-call a token (repeat chime & voice announcement)
   * Calls out: "Token number B-105, please proceed to Counter 3"
   */
  public recallToken(tokenId: string, counterName?: string) {
    const token = this.tokens.find((t) => t.id === tokenId);
    if (!token) return;

    if (counterName) {
      token.calledToCounter = counterName;
    }
    token.calledAt = Date.now();
    token.expiresAt = Date.now() + this.counterTimeoutSeconds * 1000;
    this.persist();

    const targetCounter = token.calledToCounter || 'Counter 3';
    const isUserToken = this.userTokenId === token.id;

    playRecallChime(token.tokenNumber, token.customerName, targetCounter, isUserToken);
  }

  public cancelToken(tokenId: string) {
    const token = this.tokens.find((t) => t.id === tokenId);
    if (token) {
      token.status = 'cancelled';
    }
    if (this.userTokenId === tokenId) {
      this.userTokenId = null;
    }
    this.persist();
  }

  public rejoinQueue(tokenId: string) {
    const token = this.tokens.find((t) => t.id === tokenId);
    if (token) {
      token.status = 'waiting';
      token.createdAt = Date.now();
      this.persist();
    }
  }

  public addWalkIn(
    restaurantId: string,
    partySize: number,
    customerName: string = 'Walk-in Guest',
    notes?: string
  ): QueueToken {
    const restaurant = this.getRestaurant(restaurantId);
    const prefix = restaurant ? restaurant.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) : 'W';
    const count = this.tokens.filter((t) => t.restaurantId === restaurantId).length;
    const tokenNumber = `${prefix}-${100 + count + 1}`;

    const token: QueueToken = {
      id: `tok-walkin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      restaurantId,
      tokenNumber,
      customerName,
      partySize,
      createdAt: Date.now(),
      status: 'waiting',
      notes,
    };

    this.tokens.push(token);
    this.persist();
    return token;
  }

  public resetQueue(restaurantId: string) {
    this.tokens = this.tokens.filter((t) => t.restaurantId !== restaurantId);
    if (this.userTokenId) {
      const userToken = this.tokens.find((t) => t.id === this.userTokenId);
      if (userToken && userToken.restaurantId === restaurantId) {
        this.userTokenId = null;
      }
    }
    this.seedRestaurantDemo(restaurantId);
    this.persist();
  }

  private seedRestaurantDemo(restaurantId: string) {
    const now = Date.now();
    const r = this.getRestaurant(restaurantId);
    const prefix = r ? r.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) : 'Q';

    const sampleDiners = [
      { name: 'Hamza Farooqi', party: 2, note: 'Quick takeaway order' },
      { name: 'Ayesha Siddiqui', party: 4, note: 'Family dining requested' },
      { name: 'Daniyal Tariq', party: 1, note: 'Counter seat' },
      { name: 'Mahnoor Khan', party: 3, note: 'Outdoor patio' },
      { name: 'Zaid Memon', party: 2, note: '' },
    ];

    sampleDiners.forEach((d, idx) => {
      this.tokens.push({
        id: `demo-${restaurantId}-${idx}-${Date.now()}`,
        restaurantId,
        tokenNumber: `${prefix}-${100 + idx + 1}`,
        customerName: d.name,
        partySize: d.party,
        createdAt: now - (sampleDiners.length - idx) * 3 * 60 * 1000,
        status: idx === 0 ? 'serving' : 'waiting',
        calledAt: idx === 0 ? now - 2 * 60 * 1000 : undefined,
        calledToCounter: idx === 0 ? (r?.defaultCounter || 'Counter 3') : undefined,
        notes: d.note || undefined,
      });
    });
  }
}

export const queueEngine = new QueueEngine();
