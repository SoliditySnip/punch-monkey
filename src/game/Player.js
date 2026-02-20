const SPEED = 165;
const RADIUS = 22;

export default class Player {
    constructor(x, y, assets) {
        this.x = x;
        this.y = y;
        this.radius = RADIUS;
        this.assets = assets;
        this.vx = 0;
        this.vy = 0;
        this.facingLeft = false;
        this.animTime = 0;
        this.isMoving = false;
    }

    update(dt, input, game) {
        const { dx, dy } = input;
        const len = Math.sqrt(dx * dx + dy * dy);
        const s = dt / 1000;

        this.isMoving = len > 0.05;
        if (this.isMoving) {
            this.animTime += dt;
            if (dx < -0.1) this.facingLeft = true;
            if (dx > 0.1) this.facingLeft = false;
        }

        const nx = len > 0 ? dx / len : 0;
        const ny = len > 0 ? dy / len : 0;
        this.vx = nx * SPEED;
        this.vy = ny * SPEED;

        let nx2 = this.x + this.vx * s;
        let ny2 = this.y + this.vy * s;

        // Wall boundaries (fence edge)
        const pad = 32 + this.radius;
        nx2 = Math.max(pad, Math.min(game.W - pad, nx2));
        ny2 = Math.max(pad + game.uiH, Math.min(game.H - pad, ny2));

        // Tree collision
        for (const obs of game.obstacles) {
            const odx = nx2 - obs.x;
            const ody = ny2 - obs.y;
            const dist = Math.sqrt(odx * odx + ody * ody);
            const minD = this.radius + obs.r;
            if (dist < minD && dist > 0) {
                nx2 = obs.x + (odx / dist) * minD;
                ny2 = obs.y + (ody / dist) * minD;
                nx2 = Math.max(pad, Math.min(game.W - pad, nx2));
                ny2 = Math.max(pad + game.uiH, Math.min(game.H - pad, ny2));
            }
        }

        this.x = nx2;
        this.y = ny2;
    }

    overlaps(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy) < this.radius + other.radius;
    }

    draw(ctx, shielded) {
        const x = this.x;
        const bob = this.isMoving ? Math.sin(this.animTime / 120) * 3 : 0;
        const y = this.y + bob;
        const r = this.radius;

        // Shield effect
        if (shielded) {
            const t = Date.now() / 400;
            // Outer glow
            const glow = ctx.createRadialGradient(x, y, r, x, y, r + 32);
            glow.addColorStop(0, 'rgba(255,200,0,0.55)');
            glow.addColorStop(1, 'rgba(255,200,0,0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(x, y, r + 32, 0, Math.PI * 2); ctx.fill();

            // Spinning shield ring
            ctx.save();
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 6]);
            ctx.lineDashOffset = -t * 20;
            ctx.beginPath(); ctx.arc(x, y, r + 14, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Ground shadow
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(x, this.y + r - 2, r * 0.75, r * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(x, y);
        if (this.facingLeft) ctx.scale(-1, 1);

        if (this.assets?.punch) {
            const size = r * 2.8;
            ctx.drawImage(this.assets.punch, -size / 2, -size / 2, size, size);
        } else {
            this._drawFallback(ctx, r, shielded);
        }
        ctx.restore();
    }

    _drawFallback(ctx, r, shielded) {
        // Body
        ctx.fillStyle = shielded ? '#FFD060' : '#8D6E63';
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        // Ears
        ctx.fillStyle = '#A1887F';
        ctx.beginPath(); ctx.arc(-r + 2, -r * 0.5, r * 0.38, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r - 2, -r * 0.5, r * 0.38, 0, Math.PI * 2); ctx.fill();
        // Face
        ctx.fillStyle = '#D7CCC8';
        ctx.beginPath(); ctx.ellipse(0, r * 0.12, r * 0.62, r * 0.48, 0, 0, Math.PI * 2); ctx.fill();
        // Eyes
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.12, r * 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.12, r * 0.15, 0, Math.PI * 2); ctx.fill();
        // Shine
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-r * 0.23, -r * 0.2, r * 0.06, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.37, -r * 0.2, r * 0.06, 0, Math.PI * 2); ctx.fill();
        // Nose
        ctx.fillStyle = '#795548';
        ctx.beginPath(); ctx.arc(0, r * 0.08, r * 0.12, 0, Math.PI * 2); ctx.fill();
        // Small smile
        ctx.strokeStyle = '#795548'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, r * 0.12, r * 0.2, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    }
}
