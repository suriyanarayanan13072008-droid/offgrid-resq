/**
 * OFFGRID-RESQ – ACOUSTIC DISTRESS BEACON & AUDIO SYNTHESIZER
 * Pure Web Audio API – Works 100% offline without audio assets.
 * Generates official 800Hz SOS Morse Code beacon (... --- ...) and tactical audio cues.
 */

class EmergencyAudioBeacon {
  constructor() {
    this.audioCtx = null;
    this.isPlayingBeacon = false;
    this.beaconTimer = null;
    this.strobeInterval = null;
  }

  initContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Plays a synthesized beep of given frequency and duration.
   */
  playTone(frequency, durationMs, type = 'sine') {
    try {
      this.initContext();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + durationMs / 1000);
    } catch (e) {
      console.warn('Web Audio playback failed or blocked by browser', e);
    }
  }

  /**
   * Plays Critical Incident Alert Chime (Two-tone emergency siren).
   */
  playEmergencyAlertSound() {
    this.playTone(880, 200, 'sawtooth');
    setTimeout(() => this.playTone(660, 350, 'sawtooth'), 220);
  }

  /**
   * Plays Acknowledge Confirmation Chime.
   */
  playAcknowledgeSound() {
    this.playTone(523.25, 120, 'sine'); // C5
    setTimeout(() => this.playTone(659.25, 120, 'sine'), 130); // E5
    setTimeout(() => this.playTone(783.99, 250, 'sine'), 260); // G5
  }

  /**
   * Loops official Morse Code SOS sequence (... --- ...)
   * Dot = 150ms, Dash = 450ms, Intra-char gap = 150ms, Letter gap = 450ms, Loop gap = 1400ms
   */
  toggleSosBeacon(onStateChange) {
    if (this.isPlayingBeacon) {
      this.stopSosBeacon();
      if (onStateChange) onStateChange(false);
      return false;
    } else {
      this.startSosBeacon();
      if (onStateChange) onStateChange(true);
      return true;
    }
  }

  startSosBeacon() {
    this.initContext();
    this.isPlayingBeacon = true;

    const dotDuration = 140;
    const dashDuration = 420;
    const intraGap = 120;
    const letterGap = 350;

    const playSosSequence = () => {
      if (!this.isPlayingBeacon) return;

      let timeCursor = 0;

      // 3 Dots (S: . . .)
      for (let i = 0; i < 3; i++) {
        setTimeout(() => { if (this.isPlayingBeacon) this.playTone(850, dotDuration, 'square'); }, timeCursor);
        timeCursor += dotDuration + intraGap;
      }
      timeCursor += letterGap;

      // 3 Dashes (O: - - -)
      for (let i = 0; i < 3; i++) {
        setTimeout(() => { if (this.isPlayingBeacon) this.playTone(850, dashDuration, 'square'); }, timeCursor);
        timeCursor += dashDuration + intraGap;
      }
      timeCursor += letterGap;

      // 3 Dots (S: . . .)
      for (let i = 0; i < 3; i++) {
        setTimeout(() => { if (this.isPlayingBeacon) this.playTone(850, dotDuration, 'square'); }, timeCursor);
        timeCursor += dotDuration + intraGap;
      }

      // Schedule next sequence in 2.2 seconds
      this.beaconTimer = setTimeout(playSosSequence, timeCursor + 2200);
    };

    playSosSequence();
  }

  stopSosBeacon() {
    this.isPlayingBeacon = false;
    if (this.beaconTimer) {
      clearTimeout(this.beaconTimer);
      this.beaconTimer = null;
    }
  }

  /**
   * Fullscreen high-contrast Morse Strobe for search helicopters.
   */
  toggleVisualStrobe(overlayElement) {
    if (!overlayElement) return;

    if (this.strobeInterval) {
      clearInterval(this.strobeInterval);
      this.strobeInterval = null;
      overlayElement.style.display = 'none';
      return false;
    } else {
      overlayElement.style.display = 'block';
      let state = false;
      this.strobeInterval = setInterval(() => {
        state = !state;
        overlayElement.style.background = state ? '#ffffff' : '#000000';
      }, 180);
      return true;
    }
  }
}

// Global instance
window.resqAudio = new EmergencyAudioBeacon();
