export default class Particles {
    constructor() {
        this.list = [];
    }

    burst(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = 60 + Math.random() * 100;
            this.list.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                alpha: 1,
                size: 4 + Math.random() * 5,
                life: 600 + Math.random() * 300,
                maxLife: 900,
            });
        }
    }

    text(x, y, msg, color = '#FFD700') {
        this.list.push({
            x, y, msg, color,
            alpha: 1, vy: -60, vx: 0,
            life: 900, maxLife: 900,
            isText: true,
        });
    }

    update(dt) {
        const s = dt / 1000;
        this.list = this.list.filter(p => {
            p.life -= dt;
            p.alpha = Math.max(0, p.life / p.maxLife);
            p.x += p.vx * s;
            p.y += p.vy * s;
            p.vy += 80 * s; // gravity
            return p.life > 0;
        });
    }

    draw(ctx) {
        this.list.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            if (p.isText) {
                ctx.font = 'bold 18px Fredoka One, sans-serif';
                ctx.fillStyle = p.color;
                ctx.textAlign = 'center';
                ctx.fillText(p.msg, p.x, p.y);
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });
    }
}
