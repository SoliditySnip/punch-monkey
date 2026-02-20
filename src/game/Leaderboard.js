import { supabase } from '../supabase.js';

const TABLE = 'leaderboard';

function requireClient() {
    if (!supabase) throw new Error('Leaderboard not available — add Supabase keys to .env');
}

export async function submitScore(playerName, score) {
    requireClient();
    const { data, error } = await supabase
        .from(TABLE)
        .insert([{ player_name: playerName.trim(), score: Math.floor(score) }])
        .select();
    if (error) throw error;
    return data;
}

export async function getLeaderboard(limit = 20) {
    requireClient();
    const { data, error } = await supabase
        .from(TABLE)
        .select('id, player_name, score, created_at')
        .order('score', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data;
}

export async function getPlayerRank(score) {
    if (!supabase) return null;
    const { count, error } = await supabase
        .from(TABLE)
        .select('id', { count: 'exact', head: true })
        .gt('score', score);
    if (error) return null;
    return (count ?? 0) + 1;
}
