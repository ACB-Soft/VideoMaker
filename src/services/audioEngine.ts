import { AudioTrackOption } from '../types/video';

export const AUDIO_TRACKS: AudioTrackOption[] = [
  {
    id: 'track-corporate-innovation',
    name: '🚀 Corporate Innovation (Pixabay - Önerilen & Varsayılan)',
    genre: 'Kurumsal İnovasyon',
    tempo: 110,
    previewColor: 'from-blue-600 to-teal-600',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
  },
  {
    id: 'track-corporate-prestige',
    name: '🏢 Kurumsal Prestij & Güven',
    genre: 'Kurumsal Tanıtım',
    tempo: 100,
    previewColor: 'from-blue-600 to-indigo-700',
    url: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_8b284815a5.mp3',
  },
  {
    id: 'track-tech-innovation',
    name: '🚀 İnovasyon & Dijital Vizyon',
    genre: 'Mühendislik / Teknoloji',
    tempo: 112,
    previewColor: 'from-emerald-500 to-teal-600',
    url: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_8b284815a5.mp3',
  },
  {
    id: 'track-epic-achievement',
    name: '🏆 Görkemli Zirve & 30. Yıl Marşı',
    genre: 'Senfonik Prestij',
    tempo: 108,
    previewColor: 'from-rose-600 to-purple-800',
    url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3',
  },
  {
    id: 'track-warm-community',
    name: '🌿 Sıcak Dernek & Akustik Ritim',
    genre: 'Organik Topluluk',
    tempo: 96,
    previewColor: 'from-amber-600 to-orange-500',
    url: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f73117.mp3',
  },
  {
    id: 'track-dynamic-launch',
    name: '⚡ Dinamik Proje Lansmanı',
    genre: 'Enerjik Tanıtım',
    tempo: 120,
    previewColor: 'from-indigo-500 to-purple-500',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3',
  },
  {
    id: 'track-modern-minimal',
    name: '✨ Minimal & Modern İlham',
    genre: 'Sade Kurumsal',
    tempo: 90,
    previewColor: 'from-cyan-500 to-blue-600',
    url: 'https://cdn.pixabay.com/download/audio/2022/11/06/audio_c8191cb05f.mp3',
  },
  {
    id: 'track-custom',
    name: '🎵 Kendi MP3 Müziğini Yükle...',
    genre: 'Özel Müzik',
    tempo: 100,
    previewColor: 'from-fuchsia-600 to-pink-600',
  },
  {
    id: 'track-none',
    name: '🔇 Sessiz (Arkaplan Müziği Yok)',
    genre: 'Sessiz',
    tempo: 0,
    previewColor: 'from-slate-600 to-slate-800',
  },
];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private intervalId: any = null;
  private masterGain: GainNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private currentTrackId = 'track-corporate-innovation';
  private volume = 0.5;

  private customAudioBuffer: AudioBuffer | null = null;
  private customAudioName: string = '';
  private currentBufferSource: AudioBufferSourceNode | null = null;
  private audioBufferCache: Map<string, AudioBuffer> = new Map();

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.destinationNode = this.ctx.createMediaStreamDestination();

      // Connect masterGain to both audio destination speaker and stream
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.connect(this.destinationNode);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getAudioStreamDestination(): MediaStreamAudioDestinationNode {
    this.initContext();
    return this.destinationNode!;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public setTrack(trackId: string) {
    this.currentTrackId = trackId;
    if (this.isPlaying) {
      this.stop();
      this.play(this.currentTrackId);
    }
  }

  public getCustomAudioName(): string {
    return this.customAudioName;
  }

  public async loadCustomAudioFile(file: File): Promise<string> {
    this.initContext();
    if (!this.ctx) throw new Error('AudioContext başlatılamadı.');

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.customAudioBuffer = audioBuffer;
    this.customAudioName = file.name;
    this.currentTrackId = 'track-custom';

    if (this.isPlaying) {
      this.stop();
      this.play('track-custom');
    }

    return file.name;
  }

  public async play(trackId = this.currentTrackId) {
    if (trackId === 'track-none') {
      this.stop();
      return;
    }

    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    this.stop();

    this.isPlaying = true;
    this.currentTrackId = trackId;

    // Check if custom uploaded track is selected
    if (trackId === 'track-custom') {
      if (this.customAudioBuffer) {
        this.playAudioBuffer(this.customAudioBuffer);
        return;
      }
    }

    // Find track in list
    const trackObj = AUDIO_TRACKS.find((t) => t.id === trackId);
    if (trackObj?.url) {
      try {
        let buffer = this.audioBufferCache.get(trackObj.url);
        if (!buffer) {
          const resp = await fetch(trackObj.url);
          const data = await resp.arrayBuffer();
          buffer = await this.ctx.decodeAudioData(data);
          this.audioBufferCache.set(trackObj.url, buffer);
        }
        if (this.isPlaying && this.currentTrackId === trackId) {
          this.playAudioBuffer(buffer);
          return;
        }
      } catch (e) {
        console.warn('Real track audio load failed, falling back to synthesized promo track:', e);
      }
    }

    // Fallback: Rich Promo Video Synthesizer
    this.playSynthesizedPromoTrack(trackId);
  }

  private playAudioBuffer(buffer: AudioBuffer) {
    if (!this.ctx || !this.masterGain || !this.isPlaying) return;

    this.currentBufferSource = this.ctx.createBufferSource();
    this.currentBufferSource.buffer = buffer;
    this.currentBufferSource.loop = true;
    this.currentBufferSource.connect(this.masterGain);
    this.currentBufferSource.start(0);
  }

  private playSynthesizedPromoTrack(trackId: string) {
    if (!this.ctx || !this.masterGain) return;

    const chordsCorporate = [
      [261.63, 329.63, 392.00, 523.25], // C Major add9
      [220.00, 261.63, 329.63, 440.00], // A Minor7
      [174.61, 220.00, 261.63, 349.23], // F Major7
      [196.00, 246.94, 293.66, 392.00], // G Major
    ];

    const chordsInspiring = [
      [293.66, 369.99, 440.00, 587.33], // D Major
      [220.00, 277.18, 329.63, 440.00], // A Major
      [246.94, 293.66, 369.99, 493.88], // B Minor
      [196.00, 246.94, 293.66, 392.00], // G Major
    ];

    const chordsAcoustic = [
      [196.00, 246.94, 293.66, 392.00], // G Major
      [164.81, 220.00, 261.63, 329.63], // Em
      [130.81, 174.61, 220.00, 261.63], // C Major
      [146.83, 196.00, 246.94, 293.66], // D7
    ];

    const chordsEpic = [
      [130.81, 196.00, 261.63, 392.00, 523.25], // C Epic
      [174.61, 220.00, 261.63, 349.23, 523.25], // F Epic
      [110.00, 164.81, 220.00, 329.63, 440.00], // Am Epic
      [196.00, 246.94, 293.66, 392.00, 587.33], // G Epic
    ];

    let chordProgression = chordsCorporate;
    let stepTime = 900; // ms

    if (trackId === 'track-tech-innovation') {
      chordProgression = chordsInspiring;
      stepTime = 800;
    } else if (trackId === 'track-warm-community') {
      chordProgression = chordsAcoustic;
      stepTime = 950;
    } else if (trackId === 'track-epic-achievement') {
      chordProgression = chordsEpic;
      stepTime = 1100;
    } else if (trackId === 'track-dynamic-launch') {
      chordProgression = chordsInspiring;
      stepTime = 700;
    } else if (trackId === 'track-modern-minimal') {
      chordProgression = chordsCorporate;
      stepTime = 1200;
    }

    let step = 0;

    const playStep = () => {
      if (!this.isPlaying || !this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;
      const currentChord = chordProgression[step % chordProgression.length];

      // Play soft pad/synth chord
      currentChord.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        const chordDuration = (stepTime / 1000) * 0.95;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + chordDuration);

        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1200;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + chordDuration);
      });

      // Soft Kick
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.frequency.setValueAtTime(110, now);
      kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.18);

      kickGain.gain.setValueAtTime(0.12, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      kickOsc.connect(kickGain);
      kickGain.connect(this.masterGain);

      kickOsc.start(now);
      kickOsc.stop(now + 0.22);

      step++;
    };

    playStep();
    this.intervalId = setInterval(playStep, stepTime);
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.currentBufferSource) {
      try {
        this.currentBufferSource.stop();
        this.currentBufferSource.disconnect();
      } catch (e) {
        // ignore
      }
      this.currentBufferSource = null;
    }
  }
}

export const audioEngine = new AudioEngine();
