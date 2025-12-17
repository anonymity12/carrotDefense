
class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isBgmPlaying: boolean = false;
  private bgmInterval: any = null;
  private bgmNoteIndex: number = 0;

  constructor() {
    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.3; // Master volume
    } catch (e) {
      console.error("Web Audio API not supported");
    }
  }

  public init() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(mute ? 0 : 0.3, this.ctx?.currentTime || 0);
    }
  }

  public toggleMute() {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  public playShoot(type: string) {
    if (this.isMuted || !this.ctx) return;
    this.init();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain!);

    if (type === 'SWAT') {
       // Heavy shot
       osc.type = 'square';
       osc.frequency.setValueAtTime(150, t);
       osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
       gain.gain.setValueAtTime(0.3, t);
       gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
       osc.start(t);
       osc.stop(t + 0.15);
    } else if (type === 'TRAFFIC') {
       // Laser/Zap
       osc.type = 'sawtooth';
       osc.frequency.setValueAtTime(600, t);
       osc.frequency.exponentialRampToValueAtTime(100, t + 0.2);
       gain.gain.setValueAtTime(0.15, t);
       gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
       osc.start(t);
       osc.stop(t + 0.2);
    } else {
       // Standard Pew
       osc.type = 'triangle';
       osc.frequency.setValueAtTime(800, t);
       osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
       gain.gain.setValueAtTime(0.1, t);
       gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
       osc.start(t);
       osc.stop(t + 0.1);
    }
  }

  public playHit() {
    if (this.isMuted || !this.ctx) return;
    // Simple noise burst
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.1; // 0.1s
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    
    // Lowpass filter to make it sound like a thud
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    
    noise.start(t);
  }

  public startBGM() {
    if (this.isBgmPlaying || !this.ctx) return;
    this.isBgmPlaying = true;
    this.init();
    
    // Simple 8-step bass sequence
    const sequence = [110, 110, 146.83, 146.83, 98, 98, 130.81, 130.81]; // A2, D3, G2, C3
    const tempo = 400; // ms per beat

    this.bgmInterval = setInterval(() => {
        if (!this.isBgmPlaying || !this.ctx) return;
        
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain!);
        
        const freq = sequence[this.bgmNoteIndex % sequence.length];
        this.bgmNoteIndex++;
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        
        // Pluck envelope
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        
        osc.start(t);
        osc.stop(t + 0.3);

    }, tempo);
  }

  public stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmInterval) {
        clearInterval(this.bgmInterval);
        this.bgmInterval = null;
    }
  }
}

export const soundManager = new SoundManager();
