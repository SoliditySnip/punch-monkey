import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Export null if keys not configured — game will still work, leaderboard will be disabled
export const supabase = (url && key) ? createClient(url, key) : null;

if (!supabase) {
    console.warn('[Save Punch] Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env to enable the leaderboard.');
}
