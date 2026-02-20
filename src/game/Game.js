import Player from './Player.js';
import Enemy from './Enemy.js';
import Plushie from './Plushie.js';
import Particles from './Particles.js';

const FENCE = 36;
const TILE = 32;
const SHIELD_DURATION = 12000;
const INVINCIBLE_DUR = 2000;
const PLUSHIE_INTERVAL = 8000;
const WAVE_INTERVAL = 30000;
const INIT_ENEMIES = 3;
const MAX_ENEMIES = 12;
const ENEMIES_PER_WAVE = 2;
const PTS_PER_SEC = 2;
const MAX_PLUSHIES = 3;

export default class Game {
    constructor(canvas, assets, onGameOver, onStateUpdate) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.assets = assets;
        this.onGameOver = onGameOver;
        this.onStateUpdate = onStateUpdate;

        this.W = canvas.width;
        this.H = canvas.height;
        this.uiH = document.getElementById('game-ui')?.offsetHeight ?? 52;

        this.running = false;
        this.animFrame = null;
        this.lastTime = 0;

        this.score = 0;
        this.lives = 3;
        this.wave = 1;
        this.gameTime = 0;
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.invincibleTimer = 0;
        this.shakeTimer = 0;

        this.plushieTimer = 0;
        this.waveTimer = 0;

        this.particles = new Particles();
        this.obstacles = [];
        this.enemies = [];
        this.plushies = [];
        this.player = null;

        this.keys = {};
        this.joystick = { x: 0, y: 0 };

        // Pre-generate static decorations (grass tiles, rocks, paw prints)
        this._decorations = [];
        this._rocks = [];
        this._pawPrints = [];

        this._buildObstacles();
        this._buildDecorations();
        this._spawnPlayer();
        this._spawnInitialEnemies();
        this._spawnPlushie();

        this._onKeyDown = (e) => {
            this.keys[e.code] = true;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
        };
        this._onKeyUp = (e) => { this.keys[e.code] = false; };
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
    }

    /* ── Setup ── */
    _buildObstacles() {
        const W = this.W, H = this.H, ui = this.uiH;
        const top = FENCE + ui + 16;
        const bot = H - FENCE - 10;
        const lft = FENCE + 16;
        const rgt = W - FENCE - 16;
        const cx = W / 2, cy = (top + bot) / 2;

        this.obstacles = [
            // Corner trees
            { x: lft + 55, y: top + 55, r: 30 },
            { x: rgt - 55, y: top + 55, r: 30 },
            { x: lft + 55, y: bot - 55, r: 30 },
            { x: rgt - 55, y: bot - 55, r: 30 },
            // Mid-edge trees
            { x: cx, y: top + 44, r: 24 },
            { x: cx, y: bot - 44, r: 24 },
            { x: lft + 60, y: cy, r: 22 },
            { x: rgt - 60, y: cy, r: 22 },
        ];
    }

    _buildDecorations() {
        const W = this.W, H = this.H, ui = this.uiH;
        const inner = { x: FENCE, y: FENCE + ui, w: W - 2 * FENCE, h: H - ui - 2 * FENCE };

        // Pre-generate grass tile variants (dark spots for pixel texture)
        this._grassSpots = [];
        const cols = Math.ceil(inner.w / TILE) + 1;
        const rows = Math.ceil(inner.h / TILE) + 1;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // deterministic pseudo-random using grid pos
                const n = (c * 17 + r * 31) % 7;
                this._grassSpots.push({ c, r, variant: n });
            }
        }

        // Scattered paw prints
        this._pawPrints = [];
        for (let i = 0; i < 14; i++) {
            const px = FENCE + 50 + ((i * 127) % (inner.w - 100));
            const py = FENCE + ui + 40 + ((i * 83) % (inner.h - 80));
            this._pawPrints.push({ x: px, y: py, angle: (i * 65) % 360 });
        }

        // Small rocks
        this._rocks = [];
        const rockSeeds = [
            [0.25, 0.45], [0.75, 0.55], [0.5, 0.75], [0.5, 0.28],
            [0.18, 0.72], [0.82, 0.28],
        ];
        for (const [rx, ry] of rockSeeds) {
            const x = FENCE + rx * (W - 2 * FENCE);
            const y = FENCE + ui + ry * (H - ui - 2 * FENCE);
            if (!this._inObstacle(x, y, 30)) {
                this._rocks.push({ x, y, w: 10 + (x % 8), h: 7 + (y % 5) });
            }
        }
    }

    _spawnPlayer() {
        this.player = new Player(this.W / 2, this.uiH + (this.H - this.uiH) / 2, this.assets);
    }

    _spawnInitialEnemies() {
        for (let i = 0; i < INIT_ENEMIES; i++) this._spawnEnemy();
    }

    /* ── Public API ── */
    start() {
        this.running = true;
        this.lastTime = performance.now();
        this._loop(this.lastTime);
    }

    setJoystick(x, y) { this.joystick.x = x; this.joystick.y = y; }

    onResize(w, h) {
        this.W = w; this.H = h;
        this.uiH = document.getElementById('game-ui')?.offsetHeight ?? 52;
        this._buildObstacles();
        this._buildDecorations();
    }

    destroy() {
        this.running = false;
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
    }

    /* ── Loop ── */
    _loop(ts) {
        if (!this.running) return;
        const dt = Math.min(ts - this.lastTime, 50);
        this.lastTime = ts;
        this._update(dt);
        this._draw();
        this.animFrame = requestAnimationFrame(t => this._loop(t));
    }

    /* ── Update ── */
    _update(dt) {
        this.gameTime += dt;
        this.score += (dt / 1000) * PTS_PER_SEC;

        if (this.shieldActive) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) {
                this.shieldActive = false;
                this.shieldTimer = 0;
                this.particles.burst(this.player.x, this.player.y, '#FF8C00', 10);
                this.particles.text(this.player.x, this.player.y - 30, 'Shield gone!', '#ff6600');
            }
        }
        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
        if (this.shakeTimer > 0) this.shakeTimer -= dt;

        this.plushieTimer += dt;
        if (this.plushieTimer >= PLUSHIE_INTERVAL) {
            this.plushieTimer = 0;
            if (this.plushies.length < MAX_PLUSHIES) this._spawnPlushie();
        }

        this.waveTimer += dt;
        if (this.waveTimer >= WAVE_INTERVAL && this.enemies.length < MAX_ENEMIES) {
            this.waveTimer = 0;
            this.wave++;
            for (let i = 0; i < ENEMIES_PER_WAVE; i++) this._spawnEnemy();
            this.particles.text(this.W / 2, this.uiH + 70, `WAVE ${this.wave}! 😡`, '#FF3333');
        }

        const input = this._getInput();
        this.player.update(dt, input, this);
        this.enemies.forEach(e => e.update(dt, this));

        if (this.shieldActive) {
            for (const e of this.enemies) {
                const dx = e.x - this.player.x, dy = e.y - this.player.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                const min = this.player.radius + e.radius + 8;
                if (d < min && d > 0) { e.x = this.player.x + (dx / d) * min; e.y = this.player.y + (dy / d) * min; }
            }
        }

        this.plushies.forEach(p => p.update(dt));
        this.plushies = this.plushies.filter(p => {
            if (this.player.overlaps(p)) { this._collectPlushie(p); return false; }
            return true;
        });

        if (!this.shieldActive && this.invincibleTimer <= 0) {
            for (const e of this.enemies) {
                if (this.player.overlaps(e)) { this._takeDamage(); break; }
            }
        }

        this.particles.update(dt);
        this.onStateUpdate({
            score: Math.floor(this.score), lives: this.lives, wave: this.wave,
            gameTime: this.gameTime, shieldActive: this.shieldActive, shieldTimer: this.shieldTimer,
        });
    }

    _getInput() {
        const k = this.keys;
        let dx = 0, dy = 0;
        if (k['ArrowLeft'] || k['KeyA']) dx -= 1;
        if (k['ArrowRight'] || k['KeyD']) dx += 1;
        if (k['ArrowUp'] || k['KeyW']) dy -= 1;
        if (k['ArrowDown'] || k['KeyS']) dy += 1;
        if (Math.abs(this.joystick.x) > 0.08 || Math.abs(this.joystick.y) > 0.08) {
            dx = this.joystick.x; dy = this.joystick.y;
        }
        return { dx, dy };
    }

    _collectPlushie(p) {
        this.shieldActive = true;
        this.shieldTimer = SHIELD_DURATION;
        this.score += 50;
        this.particles.burst(p.x, p.y, '#FFD700', 14);
        this.particles.text(p.x, p.y - 34, '+50 🧸', '#FFD700');
    }

    _takeDamage() {
        this.lives--;
        this.invincibleTimer = INVINCIBLE_DUR;
        this.shakeTimer = 380;
        this.particles.burst(this.player.x, this.player.y, '#FF2222', 14);
        this.particles.text(this.player.x, this.player.y - 34, 'OUCH! 💥', '#FF2222');
        if (this.lives <= 0) {
            this.running = false;
            setTimeout(() => this.onGameOver({ score: Math.floor(this.score) }), 600);
        }
    }

    _spawnEnemy() {
        const pad = FENCE + 22;
        const ui = this.uiH;
        const W = this.W, H = this.H;
        let x, y, attempts = 0;
        do {
            const side = Math.floor(Math.random() * 4);
            if (side === 0) { x = pad + Math.random() * (W - 2 * pad); y = pad + ui; }
            else if (side === 1) { x = W - pad; y = pad + ui + Math.random() * (H - ui - 2 * pad); }
            else if (side === 2) { x = pad + Math.random() * (W - 2 * pad); y = H - pad; }
            else { x = pad; y = pad + ui + Math.random() * (H - ui - 2 * pad); }
            attempts++;
        } while (this.player && this._dist(x, y, this.player.x, this.player.y) < 200 && attempts < 20);
        const spd = 55 + (this.wave - 1) * 10 + Math.random() * 18;
        this.enemies.push(new Enemy(x, y, spd));
    }

    _spawnPlushie() {
        const pad = FENCE + 52;
        const ui = this.uiH;
        let x, y, valid = false, attempts = 0;
        while (!valid && attempts < 40) {
            x = pad + Math.random() * (this.W - 2 * pad);
            y = pad + ui + Math.random() * (this.H - ui - 2 * pad);
            valid = !this._inObstacle(x, y, 26);
            attempts++;
        }
        this.plushies.push(new Plushie(x, y, this.assets));
    }

    _inObstacle(x, y, r = 0) { return this.obstacles.some(o => this._dist(x, y, o.x, o.y) < o.r + r); }
    _dist(x1, y1, x2, y2) { return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2); }

    /* ── Draw ── */
    _draw() {
        const ctx = this.ctx;
        ctx.save();
        if (this.shakeTimer > 0) {
            const mag = Math.min(this.shakeTimer / 65, 8);
            ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
        }
        this._drawZoo();
        this.plushies.forEach(p => p.draw(ctx));
        this.particles.draw(ctx);
        this.enemies.forEach(e => e.draw(ctx, this.shieldActive));
        const blink = this.invincibleTimer > 0 && Math.floor(this.invincibleTimer / 130) % 2 === 0;
        if (!blink) this.player.draw(ctx, this.shieldActive);
        ctx.restore();
    }

    /* ══════════════════════════════════════════════
       PIXELATED ZOO ENVIRONMENT
    ══════════════════════════════════════════════ */
    _drawZoo() {
        const { ctx, W, H } = this;
        const ui = this.uiH;
        const inner = {
            x: FENCE, y: FENCE + ui,
            w: W - 2 * FENCE, h: H - ui - 2 * FENCE,
            x2: W - FENCE, y2: H - FENCE,
        };

        // 1. Outer zone (behind fence) — dark concrete
        ctx.fillStyle = '#3a2e1e';
        ctx.fillRect(0, ui, W, H - ui);

        // 2. Fence on all 4 sides
        this._drawZooFence(inner);

        // 3. Tiled pixel grass floor with variation
        this._drawPixelGrass(inner);

        // 4. Dirt path (cross pattern)
        this._drawDirtPath(inner);

        // 5. Rocks
        this._drawRocks();

        // 6. Paw prints
        this._drawPawPrints();

        // 7. Trees (pixel-art style)
        this._drawPixelTrees();

        // 8. Zoo sign
        this._drawZooSign(inner);
    }

    _drawZooFence(inn) {
        const { ctx, W, H } = this;
        const ui = this.uiH;
        const concreteW = FENCE;

        // Concrete base (all 4 sides)
        ctx.fillStyle = '#6B6B5A';
        ctx.fillRect(0, ui, W, concreteW);           // top
        ctx.fillRect(0, H - concreteW, W, concreteW); // bottom
        ctx.fillRect(0, ui, concreteW, H - ui);        // left
        ctx.fillRect(W - concreteW, ui, concreteW, H - ui); // right

        // Concrete bricks (horizontal lines) — darker mortar lines
        ctx.fillStyle = '#57574A';
        const brickH = 10;
        for (let y = ui + brickH; y < H; y += brickH) {
            ctx.fillRect(0, y, W, 1);             // top/bottom fence
            ctx.fillRect(0, y, concreteW, 1);     // left
            ctx.fillRect(W - concreteW, y, concreteW, 1); // right
        }
        // Vertical brick joints (offset alternating rows)
        ctx.fillStyle = '#50504A';
        const brickW = 20;
        for (let r = 0; r < Math.ceil((H - ui) / brickH); r++) {
            const offset = (r % 2) * 10;
            for (let bx = offset; bx < W; bx += brickW) {
                const by = ui + r * brickH;
                ctx.fillRect(bx, by, 1, brickH);
            }
        }

        // Zoo IRON BARS on top of concrete
        const barColor = '#2a2a35';
        const barHighlight = '#5a5a70';
        const barSpacing = 14;
        const barThick = 4;
        const barTop = ui;

        // Top rail bars (vertical, decorative on top/bottom fences)
        ctx.fillStyle = barColor;
        for (let bx = FENCE + 8; bx < W - FENCE - 8; bx += barSpacing) {
            ctx.fillRect(bx, ui + 2, barThick, FENCE - 4);               // top
            ctx.fillRect(bx, H - FENCE + 2, barThick, FENCE - 4);        // bottom
        }
        // Side rail bars (horizontal on left/right fences)
        for (let by = ui + 8; by < H - 8; by += barSpacing) {
            ctx.fillRect(2, by, FENCE - 4, barThick);                    // left
            ctx.fillRect(W - FENCE + 2, by, FENCE - 4, barThick);        // right
        }
        // Bar highlights
        ctx.fillStyle = barHighlight;
        for (let bx = FENCE + 8; bx < W - FENCE - 8; bx += barSpacing) {
            ctx.fillRect(bx + 1, ui + 2, 1, FENCE - 4);
            ctx.fillRect(bx + 1, H - FENCE + 2, 1, FENCE - 4);
        }

        // Horizontal rails connecting bars (2 rails per fence)
        ctx.fillStyle = '#1e1e28';
        // Top fence rails
        ctx.fillRect(FENCE, ui + 10, W - 2 * FENCE, 3);
        ctx.fillRect(FENCE, ui + 24, W - 2 * FENCE, 3);
        // Bottom fence rails
        ctx.fillRect(FENCE, H - FENCE + 10, W - 2 * FENCE, 3);
        ctx.fillRect(FENCE, H - FENCE + 24, W - 2 * FENCE, 3);
        // Left fence rails
        ctx.fillRect(10, ui + FENCE, 3, H - ui - 2 * FENCE);
        ctx.fillRect(24, ui + FENCE, 3, H - ui - 2 * FENCE);
        // Right fence rails
        ctx.fillRect(W - FENCE + 10, ui + FENCE, 3, H - ui - 2 * FENCE);
        ctx.fillRect(W - FENCE + 24, ui + FENCE, 3, H - ui - 2 * FENCE);

        // Inner fence border — thick dark line
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 3;
        ctx.strokeRect(FENCE, FENCE + this.uiH, W - 2 * FENCE, H - this.uiH - 2 * FENCE);
    }

    _drawPixelGrass(inn) {
        const { ctx } = this;
        const ui = this.uiH;
        const baseX = FENCE, baseY = FENCE + ui;

        // Clip to grass area
        ctx.save();
        ctx.beginPath();
        ctx.rect(inn.x + 1, inn.y + 1, inn.w - 2, inn.h - 2);
        ctx.clip();

        // Tile the grass with two alternating shades (pixel-art checkerboard)
        const t1 = '#4DB850', t2 = '#45A848';
        const cols = Math.ceil(inn.w / TILE) + 1;
        const rows = Math.ceil(inn.h / TILE) + 1;
        for (let r = 0; r <= rows; r++) {
            for (let c = 0; c <= cols; c++) {
                const x = baseX + c * TILE;
                const y = baseY + r * TILE;
                ctx.fillStyle = (r + c) % 2 === 0 ? t1 : t2;
                ctx.fillRect(x, y, TILE, TILE);

                // Pixel grass texture: random dark dots inside each tile
                const n = (c * 17 + r * 31) % 7;
                ctx.fillStyle = 'rgba(0,0,0,0.07)';
                if (n < 2) ctx.fillRect(x + 6, y + 8, 2, 2);
                if (n < 4) ctx.fillRect(x + 20, y + 18, 2, 2);
                if (n === 0) ctx.fillRect(x + 12, y + 24, 3, 2);

                // Lighter grass tufts
                ctx.fillStyle = 'rgba(255,255,255,0.045)';
                if (n % 3 === 0) {
                    ctx.fillRect(x + 4, y + 6, 4, 2);
                    ctx.fillRect(x + 22, y + 20, 4, 2);
                }
            }
        }

        ctx.restore();
    }

    _drawDirtPath(inn) {
        const { ctx, W, H } = this;
        const ui = this.uiH;

        ctx.save();
        ctx.beginPath();
        ctx.rect(FENCE + 1, FENCE + ui + 1, W - 2 * FENCE - 2, H - ui - 2 * FENCE - 2);
        ctx.clip();

        const pathColor = 'rgba(160,120,60,0.28)';
        const pathDark = 'rgba(120,85,30,0.18)';

        // Horizontal path
        const py = (FENCE + ui + H - FENCE) / 2 - 18;
        ctx.fillStyle = pathColor;
        ctx.fillRect(FENCE, py, W - 2 * FENCE, 36);
        // Vertical path
        ctx.fillRect(W / 2 - 18, FENCE + ui, 36, H - ui - 2 * FENCE);
        // Darker path edges (pixel-art shadow)
        ctx.fillStyle = pathDark;
        ctx.fillRect(FENCE, py, W - 2 * FENCE, 3);           // top edge
        ctx.fillRect(FENCE, py + 33, W - 2 * FENCE, 3);         // bottom edge
        ctx.fillRect(W / 2 - 18, FENCE + ui, 3, H - ui - 2 * FENCE); // left edge
        ctx.fillRect(W / 2 + 15, FENCE + ui, 3, H - ui - 2 * FENCE); // right edge

        ctx.restore();
    }

    _drawRocks() {
        const { ctx } = this;
        for (const rock of this._rocks) {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.18)';
            ctx.beginPath();
            ctx.ellipse(rock.x + 3, rock.y + 4, rock.w * 0.9, rock.h * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Rock body (pixel-ish)
            ctx.fillStyle = '#9E9E9E';
            ctx.beginPath();
            ctx.roundRect(rock.x - rock.w, rock.y - rock.h, rock.w * 2, rock.h * 2, 4);
            ctx.fill();
            ctx.fillStyle = '#BDBDBD';
            ctx.fillRect(rock.x - rock.w + 2, rock.y - rock.h + 2, rock.w * 0.8, rock.h * 0.6);
            ctx.fillStyle = '#757575';
            ctx.fillRect(rock.x + 2, rock.y + 3, rock.w * 0.6, 2);
        }
    }

    _drawPawPrints() {
        const { ctx } = this;
        ctx.globalAlpha = 0.10;
        for (const pp of this._pawPrints) {
            ctx.save();
            ctx.translate(pp.x, pp.y);
            ctx.rotate(pp.angle * Math.PI / 180);
            ctx.fillStyle = '#3a2000';
            // Main pad
            ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
            // Toe pads
            const toes = [[-6, -6], [0, -8], [6, -6], [-8, -2]];
            toes.forEach(([tx, ty]) => {
                ctx.beginPath(); ctx.arc(tx, ty, 2.5, 0, Math.PI * 2); ctx.fill();
            });
            ctx.restore();
        }
        ctx.globalAlpha = 1;
    }

    _drawPixelTrees() {
        const { ctx } = this;
        for (const obs of this.obstacles) {
            this._drawPixelTree(ctx, obs.x, obs.y, obs.r);
        }
    }

    _drawPixelTree(ctx, x, y, r) {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.ellipse(x + 4, y + r * 0.8, r * 0.85, r * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();

        // Trunk (pixelated rectangle)
        const tw = r * 0.32, th = r * 0.5;
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(x - tw / 2, y + r * 0.2, tw, th);
        ctx.fillStyle = '#4E342E';
        ctx.fillRect(x - tw / 2, y + r * 0.2, tw / 3, th);
        ctx.fillStyle = '#795548';
        ctx.fillRect(x + tw / 4, y + r * 0.2, tw / 4, th * 0.6);

        // Foliage in 3 stacked pixel-ish blocks (Nintendo tree style)
        const layers = [
            { dy: 0, rx: r * 0.78, ry: r * 0.68, c: '#2E7D32', h: '#388E3C', sh: '#1B5E20' },
            { dy: -r * 0.38, rx: r * 0.62, ry: r * 0.55, c: '#388E3C', h: '#43A047', sh: '#2E7D32' },
            { dy: -r * 0.70, rx: r * 0.44, ry: r * 0.40, c: '#43A047', h: '#66BB6A', sh: '#388E3C' },
        ];
        for (const l of layers) {
            // Shadow side
            ctx.fillStyle = l.sh;
            ctx.beginPath();
            ctx.ellipse(x + 3, y + l.dy + 3, l.rx, l.ry, 0, 0, Math.PI * 2);
            ctx.fill();
            // Main
            ctx.fillStyle = l.c;
            ctx.beginPath();
            ctx.ellipse(x, y + l.dy, l.rx, l.ry, 0, 0, Math.PI * 2);
            ctx.fill();
            // Highlight
            ctx.fillStyle = l.h;
            ctx.beginPath();
            ctx.ellipse(x - l.rx * 0.28, y + l.dy - l.ry * 0.28, l.rx * 0.42, l.ry * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            // Pixel dots on canopy
            ctx.fillStyle = l.sh;
            ctx.fillRect(x + l.rx * 0.3, y + l.dy - l.ry * 0.1, 3, 3);
            ctx.fillRect(x - l.rx * 0.5, y + l.dy + l.ry * 0.2, 3, 3);
        }
    }

    _drawZooSign(inn) {
        const { ctx } = this;
        // Small wooden sign near top fence
        const sx = inn.x + 24, sy = inn.y + 6;
        const sw = 72, sh = 18;
        // Post
        ctx.fillStyle = '#6D4C41';
        ctx.fillRect(sx + sw / 2 - 2, sy + sh, 4, 8);
        // Sign board
        ctx.fillStyle = '#A1887F';
        ctx.beginPath();
        ctx.roundRect(sx, sy, sw, sh, 3);
        ctx.fill();
        ctx.strokeStyle = '#6D4C41';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, sy, sw, sh);
        // Sign text
        ctx.fillStyle = '#3E2723';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🐒 ZOO ENCLOSURE', sx + sw / 2, sy + 13);
        ctx.textAlign = 'left';
    }
}
