/**
 * Chiptune background music using Web Audio API.
 * No audio files needed — entirely procedural.
 */
export default class Music {
    constructor() {
        this.actx = null;
        this.master = null;
        this.muted = false;
        this._loopId = null;
        this._started = false;
    }

    _init() {
        if (this.actx) return;
        this.actx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.actx.createGain();
        this.master.gain.value = 0.18;
        this.master.connect(this.actx.destination);
    }

    _note(freq, startTime, dur, type = 'square', vol = 0.28) {
        const osc = this.actx.createOscillator();
        const env = this.actx.createGain();
        osc.connect(env);
        env.connect(this.master);
        osc.type = type;
        osc.frequency.value = freq;
        env.gain.setValueAtTime(vol, startTime);
        env.gain.exponentialRampToValueAtTime(0.001, startTime + dur * 0.9);
        osc.start(startTime);
        osc.stop(startTime + dur);
    }

    _scheduleLoop() {
        if (!this.actx || this.muted) return;
        const now = this.actx.currentTime;
        const step = 0.22; // seconds per note

        // === Melody (catchy 16-bar chipmunk loop) ===
        const melody = [
            523, 587, 659, 523, 659, 784, 0, 0,
            784, 880, 784, 659, 523, 0, 523, 0,
            659, 523, 440, 494, 523, 440, 0, 440,
            392, 440, 494, 523, 440, 392, 349, 0,
        ];
        melody.forEach((f, i) => {
            if (f > 0) this._note(f, now + i * step, step * 0.85, 'square', 0.22);
        });

        // === Harmony (lower octave) ===
        const harmony = [
            261, 0, 329, 0, 329, 0, 392, 0,
            392, 0, 440, 0, 261, 0, 261, 0,
            329, 0, 220, 0, 261, 0, 220, 0,
            196, 0, 247, 0, 220, 196, 174, 0,
        ];
        harmony.forEach((f, i) => {
            if (f > 0) this._note(f, now + i * step, step * 0.75, 'triangle', 0.12);
        });

        // === Bass (pulse) ===
        const bass = [
            130, 0, 130, 0, 164, 0, 0, 0,
            196, 0, 196, 0, 130, 0, 0, 0,
            164, 0, 110, 0, 130, 0, 0, 0,
            98, 0, 123, 0, 110, 0, 87, 0,
        ];
        bass.forEach((f, i) => {
            if (f > 0) this._note(f, now + i * step, step * 0.6, 'sawtooth', 0.1);
        });

        const loopMs = melody.length * step * 1000;
        this._loopId = setTimeout(() => this._scheduleLoop(), loopMs - 200);
    }

    start() {
        this._init();
        if (this.actx.state === 'suspended') this.actx.resume();
        if (!this._started && !this.muted) {
            this._started = true;
            this._scheduleLoop();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.master) {
            this.master.gain.value = this.muted ? 0 : 0.18;
        }
        if (!this.muted && this.actx) {
            if (this._loopId) clearTimeout(this._loopId);
            this._started = false;
            this._scheduleLoop();
            this._started = true;
        }
        return this.muted;
    }
}
