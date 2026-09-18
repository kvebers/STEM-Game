import { supabase } from '../api/supabaseClient.js';

/**
 * Watches my own matchmaking_queue row for the waiting -> matched
 * transition. Returns an unsubscribe function.
 */
export function subscribeToQueueRow(userId, onMatched) {
  const channel = supabase
    .channel(`queue:${userId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'matchmaking_queue', filter: `user_id=eq.${userId}` },
      (payload) => {
        if (payload.new.status === 'matched' && payload.new.match_id) onMatched(payload.new.match_id);
      },
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/**
 * Watches a specific match row for pending -> active (questions are ready)
 * and active -> completed (opponent's submit-match-result finished first).
 */
export function subscribeToMatchStatus(matchId, { onActive, onCompleted }) {
  const channel = supabase
    .channel(`match-status:${matchId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
      (payload) => {
        if (payload.new.status === 'active') onActive?.(payload.new);
        if (payload.new.status === 'completed') onCompleted?.(payload.new);
      },
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/**
 * Joins the low-latency ephemeral channel for a live match: broadcast for
 * "I answered question N" progress pings (durable scoring still goes
 * through match_answers as normal — this is just for the live race UI),
 * and presence for basic disconnect awareness. Returns the channel so the
 * caller can send broadcasts and unsubscribe when done.
 */
export function joinMatchChannel(matchId, { onOpponentAnswer, onOpponentLeave, onOpponentJoin } = {}) {
  const channel = supabase.channel(`match:${matchId}`, {
    config: { presence: { key: crypto.randomUUID() } },
  });

  channel
    .on('broadcast', { event: 'answer' }, ({ payload }) => onOpponentAnswer?.(payload))
    .on('presence', { event: 'leave' }, ({ leftPresences }) => onOpponentLeave?.(leftPresences))
    .on('presence', { event: 'join' }, ({ newPresences }) => onOpponentJoin?.(newPresences))
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') channel.track({ online: true });
    });

  return channel;
}

export function broadcastAnswer(channel, questionIndex, isCorrect) {
  channel.send({ type: 'broadcast', event: 'answer', payload: { questionIndex, isCorrect } });
}
