# 🐒 Save Punch! — Setup Guide

## What it is
A browser-based 2D game where you play as Punch the viral baby monkey. Grab the orange plushie for protection and survive the big bullying monkeys as long as you can!

## 1. Add Your Images
Place these two files inside the `public/` folder:
- `public/punch.png` — Punch the baby monkey sprite
- `public/plushy.png` — The orange orangutan plushie sprite

> The game has built-in fallback drawings if these files are missing.

## 2. Supabase Setup

### A) Create the table
Go to your Supabase project → **SQL Editor** → run this:

```sql
-- Create leaderboard table
CREATE TABLE leaderboard (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name text NOT NULL,
  score integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read scores
CREATE POLICY "Anyone can read leaderboard"
  ON leaderboard FOR SELECT USING (true);

-- Allow anyone to insert their score
CREATE POLICY "Anyone can submit score"
  ON leaderboard FOR INSERT WITH CHECK (true);
```

### B) Get your keys
Go to: **Settings → API**
- Copy **Project URL** → this is your `VITE_SUPABASE_URL`
- Copy **anon / public** key → this is your `VITE_SUPABASE_ANON_KEY`

### C) Create `.env` file
Copy `.env.example` to `.env` and fill in:
```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key
```

## 3. Install & Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## 4. Build for Production

```bash
npm run build
```

Upload the `dist/` folder to any static host (Vercel, Netlify, GitHub Pages).

## Game Controls
| Platform | Control |
|---|---|
| Desktop | `WASD` or `Arrow Keys` |
| Mobile | On-screen touch joystick |

## Game Mechanics
| Feature | Detail |
|---|---|
| Lives | 3 hearts — lose one per enemy hit |
| Plushie shield | 12 seconds of immunity after grabbing plushie |
| Plushie spawn | Every 8 seconds (max 3 on screen) |
| Wave difficulty | Every 30 seconds: +2 enemies, +speed |
| Score | 2 pts/second + 50 pts per plushie grabbed |
| Leaderboard | Global top 20, stored in Supabase |
