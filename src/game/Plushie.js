const RADIUS = 18;
const PULSE_SPEED = 2.5;

export default class Plushie {
    constructor(x, y, assets) {
        this.x = x;
        this.y = y;
        this.radius = RADIUS;
        this.assets = assets;
        this.age = 0;         // ms alive
        this.bobOffset = 0;
    }

    update(dt) {
        this.age += dt;
        this.bobOffset = Math.sin((this.age / 1000) * PULSE_SPEED * Math.PI) * 5;
    }

    draw(ctx) {
        const x = this.x;
        const y = this.y + this.bobOffset;
        const r = this.radius;
        const t = this.age / 1000;

        // Outer glow rings (animated)
        for (let i = 3; i >= 1; i--) {
            const pulse = Math.sin(t * 3 + i) * 4;
            const glowR = r + 10 + i * 8 + pulse;
            const grad = ctx.createRadialGradient(x, y, r, x, y, glowR);
            grad.addColorStop(0, `rgba(255,165,0,${0.15 / i})`);
            grad.addColorStop(1, 'rgba(255,165,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, glowR, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.save();
        ctx.translate(x, y);

        if (this.assets?.plushy) {
            // Draw real plushy image
            const size = r * 2.8;
            ctx.drawImage(this.assets.plushy, -size / 2, -size / 2, size, size);
        } else {
            // Fallback: draw cute orange plushie circle
            const inner = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
            inner.addColorStop(0, '#FFD280');
            inner.addColorStop(1, '#FF8C00');
            ctx.fillStyle = inner;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();

            // Ears
            ctx.fillStyle = '#FFA040';
            ctx.beginPath(); ctx.arc(-r * 0.65, -r * 0.65, r * 0.35, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(r * 0.65, -r * 0.65, r * 0.35, 0, Math.PI * 2); ctx.fill();

            // Eyes
            ctx.fillStyle = '#333';
            ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.1, r * 0.13, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.1, r * 0.13, 0, Math.PI * 2); ctx.fill();

            // Shine
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.beginPath(); ctx.arc(-r * 0.23, -r * 0.2, r * 0.07, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        // "Grab me!" label
        const alpha = 0.6 + Math.sin(t * 4) * 0.4;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 11px Nunito, sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.fillText('🧸 Grab!', x, y - r - 10);
        ctx.restore();
    }
}
