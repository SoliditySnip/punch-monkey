import './style.css';
import Game from './game/Game.js';
import Music from './game/Music.js';
import { submitScore, getLeaderboard, getPlayerRank } from './game/Leaderboard.js';

/* ══════════ STATE ══════════ */
let game = null;
let playerName = '';
let finalScore = 0;
let assets = { punch: null, plushy: null };
const music = new Music();

/* ══════════ SCREENS ══════════ */
const screens = {
    menu: document.getElementById('menu-screen'),
    game: document.getElementById('game-screen'),
    gameover: document.getElementById('gameover-screen'),
    leaderboard: document.getElementById('leaderboard-screen'),
};
function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name]?.classList.add('active');
}

/* ══════════ ASSETS ══════════ */
function loadImg(src) {
    return new Promise(r => {
        const img = new Image();
        img.onload = () => r(img);
        img.onerror = () => r(null);
        img.src = src;
    });
}
async function loadAssets() {
    const [punch, plushy] = await Promise.all([loadImg('/punch.png'), loadImg('/plushy.png')]);
    assets = { punch, plushy };
}

/* ══════════ CANVAS ══════════ */
const canvas = document.getElementById('game-canvas');
function resizeCanvas() {
    const ui = document.getElementById('game-ui');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - (ui?.offsetHeight ?? 52);
}
window.addEventListener('resize', () => {
    if (game) { resizeCanvas(); game.onResize(canvas.width, canvas.height); }
});

/* ══════════ NAME VALIDATION ══════════ */
function validateName() {
    const val = document.getElementById('player-name').value.trim();
    const err = document.getElementById('name-error');
    if (!val) {
        err.classList.remove('hidden');
        document.getElementById('player-name').classList.add('input-error');
        setTimeout(() => {
            err.classList.add('hidden');
            document.getElementById('player-name').classList.remove('input-error');
        }, 2500);
        return false;
    }
    err.classList.add('hidden');
    document.getElementById('player-name').classList.remove('input-error');
    playerName = val;
    return true;
}

/* ══════════ GAME ══════════ */
async function startGame() {
    showScreen('game');
    resizeCanvas();
    if (game) game.destroy();
    game = new Game(canvas, assets, handleGameOver, updateGameUI);
    game.start();
    music.start();
}

/* ══════════ GAME UI ══════════ */
function updateGameUI(state) {
    document.getElementById('score-value').textContent = state.score.toLocaleString();
    const m = Math.floor(state.gameTime / 60000);
    const s = Math.floor((state.gameTime % 60000) / 1000);
    document.getElementById('timer-display').textContent = `${m}:${s.toString().padStart(2, '0')}`;
    document.getElementById('wave-value').textContent = state.wave;

    const livesEl = document.getElementById('lives-display');
    livesEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const h = document.createElement('span');
        h.className = 'heart ' + (i < state.lives ? 'active' : 'lost');
        h.textContent = '❤️';
        livesEl.appendChild(h);
    }

    const shieldUI = document.getElementById('shield-ui');
    if (state.shieldActive) {
        shieldUI.classList.remove('hidden');
        document.getElementById('shield-secs').textContent = Math.ceil(state.shieldTimer / 1000);
    } else {
        shieldUI.classList.add('hidden');
    }
}

/* ══════════ GAME OVER — AUTO-SUBMIT ══════════ */
async function handleGameOver(state) {
    finalScore = state.score;
    document.getElementById('final-score').textContent = finalScore.toLocaleString();

    const saveEl = document.getElementById('save-status');
    const rankEl = document.getElementById('rank-msg');

    saveEl.className = 'save-status saving';
    saveEl.textContent = '⏳ Saving score to leaderboard…';
    rankEl.classList.add('hidden');

    showScreen('gameover');

    // Auto-submit
    try {
        await submitScore(playerName, finalScore);
        saveEl.className = 'save-status saved';
        saveEl.textContent = '✅ Score saved to leaderboard!';
        // Get rank
        const rank = await getPlayerRank(finalScore);
        if (rank !== null) {
            rankEl.textContent = getRankMessage(rank);
            rankEl.classList.remove('hidden');
        }
    } catch (err) {
        saveEl.className = 'save-status error';
        saveEl.textContent = '⚠️ Score not saved — check Supabase config.';
        console.error('[Leaderboard]', err.message);
    }
}

function getRankMessage(rank) {
    if (rank === 1) return '🥇 You\'re #1 in the world!';
    if (rank <= 3) return `🏅 Top 3 globally! Incredible!`;
    if (rank <= 10) return `🔥 Top 10 worldwide!`;
    if (rank <= 50) return `🐒 Global rank #${rank} — nice run!`;
    return `You'd rank #${rank} globally — keep going!`;
}

/* ══════════ LEADERBOARD ══════════ */
async function loadLeaderboard() {
    const list = document.getElementById('lb-list');
    list.innerHTML = '<div class="lb-loading">Loading champions…</div>';
    try {
        const data = await getLeaderboard(20);
        if (!data?.length) {
            list.innerHTML = '<div class="lb-empty">No scores yet — be the first hero! 🐒</div>';
            return;
        }
        list.innerHTML = data.map((e, i) => {
            const isMe = e.player_name === playerName && e.score === finalScore;
            return `<div class="lb-entry ${i < 3 ? 'top-' + (i + 1) : ''}">
        <span class="lb-rank">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1)}</span>
        <span class="lb-name">${esc(e.player_name)}${isMe ? '<span class="lb-me">YOU</span>' : ''}</span>
        <span class="lb-score">${Number(e.score).toLocaleString()}</span>
      </div>`;
        }).join('');
    } catch (err) {
        list.innerHTML = '<div class="lb-error">⚠️ Could not load leaderboard.</div>';
    }
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

/* ══════════ JOYSTICK ══════════ */
const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');
const KNOB_MAX = 38;
let joyActive = false, joyOrigin = { x: 0, y: 0 };

joystickBase.addEventListener('touchstart', e => {
    e.preventDefault();
    const r = joystickBase.getBoundingClientRect();
    joyOrigin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    joyActive = true;
}, { passive: false });

window.addEventListener('touchmove', e => {
    if (!joyActive) return;
    e.preventDefault();
    const t = e.changedTouches[0];
    const dx = t.clientX - joyOrigin.x, dy = t.clientY - joyOrigin.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamp = Math.min(dist, KNOB_MAX);
    const nx = dist > 0 ? dx / dist : 0, ny = dist > 0 ? dy / dist : 0;
    joystickKnob.style.transform = `translate(${nx * clamp}px, ${ny * clamp}px)`;
    if (game) game.setJoystick(nx, ny);
}, { passive: false });

window.addEventListener('touchend', () => {
    joyActive = false;
    joystickKnob.style.transform = '';
    if (game) game.setJoystick(0, 0);
});

/* ══════════ MUTE BUTTON ══════════ */
document.getElementById('mute-btn').addEventListener('click', () => {
    const muted = music.toggleMute();
    document.getElementById('mute-btn').textContent = muted ? '🔇' : '🔊';
});

/* ══════════ EVENT LISTENERS ══════════ */
// Menu → Play
document.getElementById('start-btn').addEventListener('click', async () => {
    if (!validateName()) return;
    await loadAssets();
    startGame();
});

// Menu → Leaderboard
document.getElementById('leaderboard-btn').addEventListener('click', () => {
    showScreen('leaderboard');
    loadLeaderboard();
});

// Enter key support
document.getElementById('player-name').addEventListener('keydown', async e => {
    if (e.key === 'Enter') {
        if (!validateName()) return;
        await loadAssets();
        startGame();
    }
    // Clear error on typing
    document.getElementById('name-error').classList.add('hidden');
    document.getElementById('player-name').classList.remove('input-error');
});

// Game Over → Play Again
document.getElementById('play-again-btn').addEventListener('click', () => startGame());

// Game Over → Menu
document.getElementById('menu-btn').addEventListener('click', () => showScreen('menu'));

// Leaderboard → Back
document.getElementById('back-btn').addEventListener('click', () => showScreen('menu'));

// Leaderboard → Play
document.getElementById('play-lb-btn').addEventListener('click', async () => {
    if (!playerName) { showScreen('menu'); return; }
    await loadAssets();
    startGame();
});

/* ══════════ INIT ══════════ */
showScreen('menu');
loadAssets(); // pre-load in background
