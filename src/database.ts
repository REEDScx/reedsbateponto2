import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

export const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export type GuildSettings = {
  guild_id: string;
  log_channel_id: string | null;
  manager_role_id: string | null;
  timezone: string;
};

export async function getSettings(guildId: string): Promise<GuildSettings> {
  const { data, error } = await supabase.from('guild_settings').select('*').eq('guild_id', guildId).maybeSingle();
  if (error) throw error;
  if (data) return data as GuildSettings;
  const initial = { guild_id: guildId, log_channel_id: null, manager_role_id: null, timezone: 'America/Fortaleza' };
  const inserted = await supabase.from('guild_settings').upsert(initial).select('*').single();
  if (inserted.error) throw inserted.error;
  return inserted.data as GuildSettings;
}

export async function startSession(guildId: string, userId: string) {
  const open = await supabase.from('punch_sessions').select('id').eq('guild_id', guildId).eq('user_id', userId).eq('status', 'open').maybeSingle();
  if (open.error) throw open.error;
  if (open.data) return { alreadyOpen: true };
  const result = await supabase.from('punch_sessions').insert({ guild_id: guildId, user_id: userId }).select('id,started_at').single();
  if (result.error) {
    if (result.error.code === '23505') return { alreadyOpen: true };
    throw result.error;
  }
  return { alreadyOpen: false, session: result.data };
}

export async function finishSession(guildId: string, userId: string) {
  const current = await supabase.from('punch_sessions').select('id,started_at').eq('guild_id', guildId).eq('user_id', userId).eq('status', 'open').maybeSingle();
  if (current.error) throw current.error;
  if (!current.data) return null;
  const endedAt = new Date();
  const seconds = Math.max(0, Math.floor((endedAt.getTime() - new Date(current.data.started_at).getTime()) / 1000));
  const updated = await supabase.from('punch_sessions').update({ ended_at: endedAt.toISOString(), duration_seconds: seconds, status: 'closed' }).eq('id', current.data.id).eq('status', 'open').select('id').maybeSingle();
  if (updated.error) throw updated.error;
  if (!updated.data) return null;
  return { seconds, startedAt: current.data.started_at, endedAt };
}

export async function getUserSummary(guildId: string, userId: string) {
  const since = new Date();
  since.setDate(1); since.setHours(0, 0, 0, 0);
  const { data, error } = await supabase.from('punch_sessions').select('duration_seconds,started_at,status').eq('guild_id', guildId).eq('user_id', userId).gte('started_at', since.toISOString());
  if (error) throw error;
  const seconds = (data ?? []).reduce((sum, row) => sum + (row.duration_seconds ?? (row.status === 'open' ? Math.max(0, Math.floor((Date.now() - new Date(row.started_at).getTime()) / 1000)) : 0)), 0);
  const active = (data ?? []).some(row => row.status === 'open');
  return { seconds, active };
}

export async function setGuildSetting(guildId: string, key: 'log_channel_id' | 'manager_role_id', value: string) {
  const { error } = await supabase.from('guild_settings').upsert({ guild_id: guildId, [key]: value });
  if (error) throw error;
}

export async function writeAudit(guildId: string, actorId: string, action: string, targetId?: string, details: Record<string, unknown> = {}) {
  const { error } = await supabase.from('audit_logs').insert({ guild_id: guildId, actor_id: actorId, action, target_id: targetId ?? null, details });
  if (error) console.error('Falha ao registrar auditoria:', error.message);
}
