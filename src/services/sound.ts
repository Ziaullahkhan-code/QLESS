/**
 * Web Audio API synthesizer and Speech Voice Engine for QLESS.
 * Generates natural audio chimes, tactile click sound effects, and voice announcements.
 */

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

/**
 * Format token code for clear, natural speech synthesis.
 * E.g., "BL-101" -> "B L 101", "B-105" -> "B 105"
 */
function formatTokenForSpeech(tokenNumber: string): string {
  if (!tokenNumber) return '';
  return tokenNumber.replace(/[-_]/g, ' ').split('').join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Voice announcer helper using browser SpeechSynthesis
 */
function speakAnnouncement(text: string) {
  if (!soundEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel(); // cancel any pending utterances
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // clear, steady pace
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Choose an English voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis failed:', err);
  }
}

/**
 * Tactile subtle click sound for smooth button/tab interactions
 */
export function playClickSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.035);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  } catch {
    // Ignore audio restrictions
  }
}

/**
 * Modern two-tone chime & voice announcement for "SERVE NEXT"
 * Example: "Token number B-105, please proceed to Counter 3"
 */
export function playServeNextChime(tokenNumber: string = '101', customerName?: string, counterName: string = 'Counter 3') {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (ctx) {
      const now = ctx.currentTime;

      // Tone 1: High crisp Bell (F5 - 698.46 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(698.46, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.28, now + 0.03);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Tone 2: Harmonic resolution (A5 - 880 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.16);
      gain2.gain.setValueAtTime(0, now + 0.16);
      gain2.gain.linearRampToValueAtTime(0.3, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.95);
    }

    // Voice announcement right after the chime:
    // "Token number B-105, please proceed to Counter 3"
    const formattedToken = formatTokenForSpeech(tokenNumber);
    const spokenName = customerName && customerName !== 'Guest' && !customerName.includes('Party') ? `for ${customerName}` : '';
    const speechText = `Token number ${formattedToken} ${spokenName}, please proceed to ${counterName}.`;
    
    setTimeout(() => {
      speakAnnouncement(speechText);
    }, 600);

  } catch (err) {
    console.warn('Serve next chime failed:', err);
  }
}

/**
 * Customer Turn Voice Announcement when user's own token is called
 * Example: "You are next! Please proceed to Counter 3"
 */
export function playCustomerTurnAlert(tokenNumber: string = '101', counterName: string = 'Counter 3') {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (ctx) {
      const now = ctx.currentTime;
      const notes = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6 arpeggio

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.11;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.32, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });
    }

    // Mobile vibration if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 300]);
    }

    // Voice announcement:
    // "You are next! Please proceed to Counter 3"
    const formattedToken = formatTokenForSpeech(tokenNumber);
    const speechText = `You are next! Token number ${formattedToken}, please proceed to ${counterName}.`;

    setTimeout(() => {
      speakAnnouncement(speechText);
    }, 700);

  } catch (err) {
    console.warn('Customer turn alert failed:', err);
  }
}

/**
 * Re-call voice announcement (when staff clicks "Re-Call")
 * Example: "Token number B-105, please proceed to Counter 3"
 */
export function playRecallChime(tokenNumber: string, customerName?: string, counterName: string = 'Counter 3', isUserToken: boolean = false) {
  if (isUserToken) {
    playCustomerTurnAlert(tokenNumber, counterName);
  } else {
    playServeNextChime(tokenNumber, customerName, counterName);
  }
}

/**
 * Celebratory fanfare / ding when an order is completed
 */
export function playOrderCompleteSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 major chime

    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  } catch {
    // Ignore
  }
}

/**
 * Expiration warning alert & voice notification when a diner fails to reach counter
 */
export function playExpirationAlert(tokenNumber: string = '') {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (ctx) {
      const now = ctx.currentTime;
      const notes = [440, 370, 311]; // Descending minor triad

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + idx * 0.12;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.5);
      });
    }

    const formattedToken = formatTokenForSpeech(tokenNumber);
    const text = `Attention, token number ${formattedToken} has expired. Calling next guest in queue.`;
    setTimeout(() => {
      speakAnnouncement(text);
    }, 600);
  } catch (err) {
    console.warn('Expiration alert failed:', err);
  }
}

/**
 * Specific alert for the customer when their token expired and a new one was reissued
 */
export function playCustomerAutoReissuedAlert(oldTokenNumber: string, newTokenNumber: string, counterName: string = 'Counter 3') {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (ctx) {
      const now = ctx.currentTime;
      // Alert tones: High to low to resolve
      [587.33, 440, 659.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + idx * 0.14;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.5);
      });
    }

    const formattedOld = formatTokenForSpeech(oldTokenNumber);
    const formattedNew = formatTokenForSpeech(newTokenNumber);
    const text = `Notice: Your token ${formattedOld} has expired because you did not reach ${counterName} in time. A new token ${formattedNew} has been automatically generated for you.`;
    setTimeout(() => {
      speakAnnouncement(text);
    }, 650);
  } catch (err) {
    console.warn('Auto-reissue alert failed:', err);
  }
}

/**
 * Subtle feedback sound on token issue
 */
export function playTokenClaimedSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.16);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch {
    // fallback
  }
}
