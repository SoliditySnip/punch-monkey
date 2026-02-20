/**
 * Enemy — Big angry Japanese macaque.
 * NEVER uses the player's punch.png image — always draws its own custom pixel sprite.
 * Japanese macaques have silver-gray fur and a distinctive RED FACE.
 */
const RADIUS = 26;

export default class Enemy {
    constructor(x, y, speed) {
        this.x = x;
        this.y = y;
        this.radius = RADIUS;
        this.speed = speed;
        this.vx = 0;
        this.vy = 0;
        this.facingLeft = false;
        this.animTime = 0;
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderTimer = 0;
    }

    update(dt, game) {
        const s = dt / 1000;
        this.animTime += dt;

        const edx = game.player.x - this.x;
        const edy = game.player.y - this.y;
        const dist = Math.sqrt(edx * edx + edy * edy);

        if (game.shieldActive) {
            // Flee + wander  
            this.wanderTimer -= dt;
            if (this.wanderTimer <= 0) {
                this.wanderAngle += (Math.random() - 0.5) * 1.8;
                this.wanderTimer = 500 + Math.random() * 700;
            }
            const fleeX = dist > 0 ? -(edx / dist) : Math.cos(this.wanderAngle);
            const fleeY = dist > 0 ? -(edy / dist) : Math.sin(this.wanderAngle);
            const wx = Math.cos(this.wanderAngle);
            const wy = Math.sin(this.wanderAngle);
            this.vx = (fleeX * 0.75 + wx * 0.25) * this.speed * 0.85;
            this.vy = (fleeY * 0.75 + wy * 0.25) * this.speed * 0.85;
        } else {
            // Chase player with separation from other enemies
            let nx = dist > 0 ? edx / dist : 0;
            let ny = dist > 0 ? edy / dist : 0;
            for (const other of game.enemies) {
                if (other === this) continue;
                const sx = this.x - other.x;
                const sy = this.y - other.y;
                const sd = Math.sqrt(sx * sx + sy * sy);
                if (sd < this.radius * 2.4 && sd > 0) {
                    nx += (sx / sd) * 0.35;
                    ny += (sy / sd) * 0.35;
                }
            }
            const len = Math.sqrt(nx * nx + ny * ny);
            if (len > 0) { nx /= len; ny /= len; }
            this.vx = nx * this.speed;
            this.vy = ny * this.speed;
        }

        if (this.vx < -0.5) this.facingLeft = true;
        if (this.vx > 0.5) this.facingLeft = false;

        let nx2 = this.x + this.vx * s;
        let ny2 = this.y + this.vy * s;
        const pad = 34 + this.radius;
        nx2 = Math.max(pad, Math.min(game.W - pad, nx2));
        ny2 = Math.max(pad + game.uiH, Math.min(game.H - pad, ny2));
        for (const obs of game.obstacles) {
            const odx = nx2 - obs.x;
            const ody = ny2 - obs.y;
            const d = Math.sqrt(odx * odx + ody * ody);
            const minD = this.radius + obs.r;
            if (d < minD && d > 0) {
                nx2 = obs.x + (odx / d) * minD;
                ny2 = obs.y + (ody / d) * minD;
            }
        }
        this.x = nx2;
        this.y = ny2;
    }

    draw(ctx, playerShielded) {
        const x = this.x;
        const bob = Math.sin(this.animTime / 130) * 2.5;
        const y = this.y + bob;
        const r = this.radius;
        const scared = playerShielded;

        // Angry red pulse aura (when not scared)
        if (!scared) {
            const t = this.animTime / 1000;
            const pulse = Math.sin(t * 4) * 4;
            const aura = ctx.createRadialGradient(x, y, r * 0.4, x, y, r + 18 + pulse);
            aura.addColorStop(0, 'rgba(255,30,30,0.4)');
            aura.addColorStop(1, 'rgba(255,30,30,0)');
            ctx.fillStyle = aura;
            ctx.beginPath(); ctx.arc(x, y, r + 18 + pulse, 0, Math.PI * 2); ctx.fill();
        }

        // Ground shadow
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(x, this.y + r - 2, r * 0.78, r * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(x, y);
        if (this.facingLeft) ctx.scale(-1, 1);
        this._drawMacaque(ctx, r, scared);
        ctx.restore();
    }

    /** Hand-drawn pixel-art style Japanese macaque (BIG bully monkey) */
    _drawMacaque(ctx, r, scared) {
        // === BODY — silver-grey fur ===
        const bodyColor = scared ? '#8A7FC0' : '#9E9E9E';
        const bodyDark = scared ? '#6A5FAA' : '#757575';
        const bodyLight = scared ? '#B0A8DC' : '#BDBDBD';

        // Main body (stocky, hunched forward)
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(0, r * 0.1, r * 0.72, r * 0.82, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head — rounder, sits on top
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(0, -r * 0.52, r * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // Big protruding ears (macaque ears)
        ctx.fillStyle = bodyDark;
        ctx.beginPath(); ctx.arc(-r * 0.56, -r * 0.62, r * 0.26, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.56, -r * 0.62, r * 0.26, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = bodyLight;
        ctx.beginPath(); ctx.arc(-r * 0.56, -r * 0.62, r * 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.56, -r * 0.62, r * 0.15, 0, Math.PI * 2); ctx.fill();

        // === RED FACE — Japanese macaque signature feature ===
        const faceColor = scared ? '#AA6699' : '#C0392B';
        ctx.fillStyle = faceColor;
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.48, r * 0.36, r * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();

        // Muzzle (protruding snout)
        ctx.fillStyle = scared ? '#AA6699' : '#E74C3C';
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.33, r * 0.22, r * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();

        // === ANGRY EYES ===
        // Eye whites
        ctx.fillStyle = '#fff5f5';
        ctx.beginPath(); ctx.ellipse(-r * 0.17, -r * 0.58, r * 0.13, r * 0.11, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(r * 0.17, -r * 0.58, r * 0.13, r * 0.11, 0, 0, Math.PI * 2); ctx.fill();

        // Pupils
        ctx.fillStyle = scared ? '#4a4a00' : '#1a0000';
        ctx.beginPath(); ctx.arc(-r * 0.17, -r * 0.56, r * 0.09, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.17, -r * 0.56, r * 0.09, 0, Math.PI * 2); ctx.fill();

        // Shine in eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-r * 0.12, -r * 0.6, r * 0.04, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.22, -r * 0.6, r * 0.04, 0, Math.PI * 2); ctx.fill();

        // === ANGRY BROWS (V-shape) ===
        ctx.strokeStyle = scared ? '#6A5FAA' : '#4a1010';
        ctx.lineWidth = r * 0.09;
        ctx.lineCap = 'round';
        // Left brow (angled down toward nose = angry)
        ctx.beginPath();
        ctx.moveTo(-r * 0.32, -r * 0.74);
        ctx.lineTo(-r * 0.08, -r * 0.66);
        ctx.stroke();
        // Right brow
        ctx.beginPath();
        ctx.moveTo(r * 0.08, -r * 0.66);
        ctx.lineTo(r * 0.32, -r * 0.74);
        ctx.stroke();

        // Nostrils
        ctx.fillStyle = scared ? '#7a4466' : '#8b0000';
        ctx.beginPath(); ctx.arc(-r * 0.08, -r * 0.30, r * 0.05, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.08, -r * 0.30, r * 0.05, 0, Math.PI * 2); ctx.fill();

        // === MOUTH — grimace / open aggression ===
        if (!scared) {
            ctx.fillStyle = '#7a0000';
            ctx.beginPath();
            ctx.arc(0, -r * 0.2, r * 0.14, 0, Math.PI);
            ctx.fill();
            // Teeth
            ctx.fillStyle = '#fffde0';
            ctx.fillRect(-r * 0.12, -r * 0.2, r * 0.1, r * 0.06);
            ctx.fillRect(r * 0.02, -r * 0.2, r * 0.1, r * 0.06);
        } else {
            // Scared mouth (frown)
            ctx.strokeStyle = '#7a4466';
            ctx.lineWidth = r * 0.07;
            ctx.beginPath();
            ctx.arc(0, -r * 0.12, r * 0.15, Math.PI + 0.3, -0.3);
            ctx.stroke();
        }

        // === ARMS (chunky) ===
        ctx.fillStyle = bodyDark;
        ctx.beginPath(); ctx.ellipse(-r * 0.68, r * 0.25, r * 0.22, r * 0.38, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(r * 0.68, r * 0.25, r * 0.22, r * 0.38, 0.4, 0, Math.PI * 2); ctx.fill();

        // Fur highlight on body
        ctx.fillStyle = bodyLight;
        ctx.beginPath();
        ctx.ellipse(-r * 0.15, -r * 0.05, r * 0.2, r * 0.28, -0.3, 0, Math.PI * 2);
        ctx.fill();
    }
}
