/**
 * Sound utility for exercise feedback
 * Uses Web Audio API for beeps and Web Speech API for voice
 */

// Audio context singleton
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (required by browsers)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

// Sound settings
interface SoundSettings {
  enabled: boolean;
  volume: number; // 0-1
  voiceEnabled: boolean;
}

let settings: SoundSettings = {
  enabled: true,
  volume: 0.5,
  voiceEnabled: true,
};

export function setSoundSettings(newSettings: Partial<SoundSettings>) {
  settings = { ...settings, ...newSettings };
}

export function getSoundSettings(): SoundSettings {
  return { ...settings };
}

/**
 * Play a beep tone
 * @param frequency - Frequency in Hz (higher = higher pitch)
 * @param duration - Duration in seconds
 * @param type - Oscillator type
 */
export function playBeep(
  frequency: number = 440,
  duration: number = 0.15,
  type: OscillatorType = 'sine'
) {
  if (!settings.enabled) return;
  
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    // Fade out to prevent clicking
    gainNode.gain.setValueAtTime(settings.volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('Could not play beep:', e);
  }
}

/**
 * Play a success sound (ascending tones)
 */
export function playRepComplete() {
  if (!settings.enabled) return;
  playBeep(523, 0.1, 'sine'); // C5
  setTimeout(() => playBeep(659, 0.15, 'sine'), 100); // E5
}

/**
 * Play a goal reached celebration sound
 */
export function playGoalReached() {
  if (!settings.enabled) return;
  // Fanfare-like ascending arpeggio
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => playBeep(freq, 0.2, 'sine'), i * 120);
  });
}

/**
 * Play a warning sound for bad form
 */
export function playBadForm() {
  if (!settings.enabled) return;
  playBeep(220, 0.3, 'triangle'); // Low A3 warning tone
}

/**
 * Play a countdown beep
 */
export function playCountdown(final: boolean = false) {
  if (!settings.enabled) return;
  if (final) {
    playBeep(880, 0.3, 'sine'); // Higher pitch for final beep
  } else {
    playBeep(440, 0.15, 'sine'); // Normal countdown beep
  }
}

// Voice synthesis
let speechSynth: SpeechSynthesis | null = null;
let thaiVoice: SpeechSynthesisVoice | null = null;
let voiceInitialized = false;

function initVoice() {
  if (voiceInitialized || typeof window === 'undefined') return;
  
  speechSynth = window.speechSynthesis;
  
  // Find Thai voice or fallback
  const findVoice = () => {
    const voices = speechSynth?.getVoices() || [];
    thaiVoice = voices.find(v => v.lang.startsWith('th')) || 
                voices.find(v => v.lang.startsWith('en')) ||
                voices[0] || null;
  };
  
  findVoice();
  speechSynth?.addEventListener('voiceschanged', findVoice);
  voiceInitialized = true;
}

/**
 * Speak text using text-to-speech
 */
export function speak(text: string, priority: boolean = false) {
  if (!settings.voiceEnabled || typeof window === 'undefined') return;
  
  initVoice();
  
  if (!speechSynth) return;
  
  // Cancel previous speech if priority
  if (priority) {
    speechSynth.cancel();
  }
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = thaiVoice;
  utterance.rate = 1.1; // Slightly faster
  utterance.pitch = 1.0;
  utterance.volume = settings.volume;
  
  speechSynth.speak(utterance);
}

// Pre-defined voice messages
export const VoiceMessages = {
  repComplete: () => speak('ครบ'),
  goodForm: () => speak('ดีมาก'),
  goalReached: () => speak('ยินดีด้วย ครบเป้าหมายแล้ว', true),
  badForm: {
    hipsTooHigh: () => speak('ลดสะโพกลง'),
    hipsTooLow: () => speak('ยกสะโพกขึ้น'),
    notLowEnough: () => speak('ลงต่ำอีก'),
    elbowsFlared: () => speak('ข้อศอกชิดตัว'),
    backNotStraight: () => speak('หลังตรง'),
    headPosition: () => speak('หน้ามองพื้น'),
    keepGoing: () => speak('สู้ๆ'),
  },
  countdown: {
    three: () => speak('สาม'),
    two: () => speak('สอง'),
    one: () => speak('หนึ่ง'),
    go: () => speak('เริ่ม', true),
  }
};

// Combined feedback with sound + voice
let lastBadFormTime = 0;
const BAD_FORM_COOLDOWN = 3000; // 3 seconds between bad form warnings

export function feedbackRepComplete(quality: 'good' | 'partial' | 'none') {
  playRepComplete();
  if (quality === 'good') {
    VoiceMessages.goodForm();
  }
}

export function feedbackGoalReached() {
  playGoalReached();
  setTimeout(() => VoiceMessages.goalReached(), 500);
}

export function feedbackBadForm(issue: keyof typeof VoiceMessages.badForm) {
  const now = Date.now();
  if (now - lastBadFormTime < BAD_FORM_COOLDOWN) return;
  
  lastBadFormTime = now;
  playBadForm();
  
  const voiceFn = VoiceMessages.badForm[issue];
  if (voiceFn) {
    setTimeout(() => voiceFn(), 200);
  }
}

// Unlock audio on first user interaction (required by browsers)
export function unlockAudio() {
  if (typeof window === 'undefined') return;
  
  const unlock = () => {
    getAudioContext();
    initVoice();
    // Play silent sound to unlock
    playBeep(0, 0.001);
    
    document.removeEventListener('click', unlock);
    document.removeEventListener('touchstart', unlock);
  };
  
  document.addEventListener('click', unlock, { once: true });
  document.addEventListener('touchstart', unlock, { once: true });
}
