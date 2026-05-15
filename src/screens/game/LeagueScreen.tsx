import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { C, R } from '../../theme';

type Tier = 'diamond' | 'gold' | 'silver' | 'bronze' | 'unranked';

const TIER: Record<Tier, { label: string; emoji: string; color: string; min: number; next: number | null }> = {
  diamond:  { label: 'Diamond',  emoji: '💎', color: '#B9F2FF', min: 800, next: null },
  gold:     { label: 'Gold',     emoji: '🥇', color: '#FFD60A', min: 600, next: 800 },
  silver:   { label: 'Silver',   emoji: '🥈', color: '#C0C0C0', min: 400, next: 600 },
  bronze:   { label: 'Bronze',   emoji: '🥉', color: '#CD7F32', min: 0,   next: 400 },
  unranked: { label: 'Unranked', emoji: '🔘', color: C.text3,   min: -1,  next: 0   },
};

export function getTier(avg: number, rounds: number): Tier {
  if (rounds === 0) return 'unranked';
  if (avg >= 800) return 'diamond';
  if (avg >= 600) return 'gold';
  if (avg >= 400) return 'silver';
  return 'bronze';
}

export function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

type PlayerStat = {
  user_id: string;
  display_name: string;
  rounds: number;
  avg: number;
  tier: Tier;
  isMe: boolean;
};

export default function LeagueScreen() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<PlayerStat | null>(null);
  const [standings, setStandings] = useState<PlayerStat[]>([]);
  const [weekLabel, setWeekLabel] = useState('');

  useFocusEffect(
    useCallback(() => { loadLeague(); }, [])
  );

  async function loadLeague() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const weekStart = getWeekStart();
    const d = new Date(weekStart);
    setWeekLabel(`Week of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);

    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .eq('status', 'active');

    const followingIds = (follows ?? []).map((f) => f.following_id);
    const allIds = [user.id, ...followingIds];

    const [{ data: rounds }, { data: profiles }] = await Promise.all([
      supabase
        .from('rounds')
        .select('guesser_id, score')
        .in('guesser_id', allIds)
        .not('resolved_at', 'is', null)
        .gte('resolved_at', weekStart),
      supabase
        .from('users')
        .select('id, display_name')
        .in('id', allIds),
    ]);

    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

    const statsByUser: Record<string, { total: number; count: number }> = {};
    for (const uid of allIds) {
      statsByUser[uid] = { total: 0, count: 0 };
    }
    for (const r of rounds ?? []) {
      if (statsByUser[r.guesser_id]) {
        statsByUser[r.guesser_id].total += r.score ?? 0;
        statsByUser[r.guesser_id].count++;
      }
    }

    const stats: PlayerStat[] = allIds.map((uid) => {
      const { total, count } = statsByUser[uid];
      const avg = count > 0 ? Math.round(total / count) : 0;
      return {
        user_id: uid,
        display_name: nameMap.get(uid) ?? '?',
        rounds: count,
        avg,
        tier: getTier(avg, count),
        isMe: uid === user.id,
      };
    });

    stats.sort((a, b) => b.avg - a.avg || b.rounds - a.rounds);
    setStandings(stats);
    setMe(stats.find((s) => s.isMe) ?? null);
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  const myTierCfg = me ? TIER[me.tier] : TIER.unranked;
  const nextThreshold = myTierCfg.next;
  const ptsToNext = me && nextThreshold !== null ? nextThreshold - me.avg : 0;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>Accuracy League</Text>
        <Text style={styles.subtitle}>{weekLabel}</Text>

        {/* My tier hero */}
        {me && (
          <View style={[styles.tierHero, { borderColor: myTierCfg.color + '60' }]}>
            <Text style={styles.tierEmoji}>{myTierCfg.emoji}</Text>
            <Text style={[styles.tierName, { color: myTierCfg.color }]}>{myTierCfg.label}</Text>
            <View style={styles.tierStats}>
              <View style={styles.tierStat}>
                <Text style={styles.tierStatValue}>{me.avg}</Text>
                <Text style={styles.tierStatLabel}>avg pts</Text>
              </View>
              <View style={styles.tierStatDivider} />
              <View style={styles.tierStat}>
                <Text style={styles.tierStatValue}>{me.rounds}</Text>
                <Text style={styles.tierStatLabel}>guesses</Text>
              </View>
            </View>
            {nextThreshold !== null && me.rounds > 0 && (
              <Text style={styles.tierProgress}>
                {ptsToNext > 0
                  ? `+${ptsToNext} avg pts to ${TIER[
                    me.tier === 'bronze' ? 'silver' : me.tier === 'silver' ? 'gold' : 'diamond'
                  ].label}`
                  : `Almost there!`}
              </Text>
            )}
            {me.rounds === 0 && (
              <Text style={styles.tierProgress}>Make a guess this week to rank</Text>
            )}
          </View>
        )}

        {/* Standings */}
        <Text style={styles.sectionLabel}>FRIENDS THIS WEEK</Text>
        {standings.map((player, idx) => {
          const cfg = TIER[player.tier];
          return (
            <View
              key={player.user_id}
              style={[styles.row, player.isMe && styles.rowMe]}
            >
              <Text style={styles.rank}>#{idx + 1}</Text>
              <Text style={styles.rowEmoji}>{cfg.emoji}</Text>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowName, player.isMe && styles.rowNameMe]}>
                  {player.display_name}{player.isMe ? ' (you)' : ''}
                </Text>
                <Text style={styles.rowTier}>{cfg.label}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={[styles.rowAvg, { color: player.rounds > 0 ? cfg.color : C.text3 }]}>
                  {player.rounds > 0 ? player.avg : '—'}
                </Text>
                <Text style={styles.rowRounds}>{player.rounds} guess{player.rounds !== 1 ? 'es' : ''}</Text>
              </View>
            </View>
          );
        })}

        {/* Tier legend */}
        <Text style={styles.sectionLabel}>TIERS</Text>
        <View style={styles.legend}>
          {(['diamond', 'gold', 'silver', 'bronze'] as Tier[]).map((t) => (
            <View key={t} style={styles.legendRow}>
              <Text style={styles.legendEmoji}>{TIER[t].emoji}</Text>
              <Text style={styles.legendLabel}>{TIER[t].label}</Text>
              <Text style={styles.legendRange}>
                {TIER[t].next !== null
                  ? `${TIER[t].min}–${TIER[t].next! - 1} avg`
                  : `${TIER[t].min}+ avg`}
              </Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loadingRoot: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 12 },

  title: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: C.text3, marginTop: -6 },

  tierHero: {
    backgroundColor: C.surface, borderRadius: R.xl, borderWidth: 1,
    padding: 24, alignItems: 'center', gap: 6, marginBottom: 4,
  },
  tierEmoji: { fontSize: 52 },
  tierName: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  tierStats: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 4 },
  tierStat: { alignItems: 'center', gap: 2 },
  tierStatValue: { fontSize: 24, fontWeight: '800', color: C.text },
  tierStatLabel: { fontSize: 11, color: C.text3, fontWeight: '600', letterSpacing: 0.5 },
  tierStatDivider: { width: 1, height: 32, backgroundColor: C.border },
  tierProgress: { fontSize: 12, color: C.text3, marginTop: 4, textAlign: 'center' },

  sectionLabel: { fontSize: 10, fontWeight: '800', color: C.text3, letterSpacing: 1.5, marginTop: 4 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: R.md, padding: 14,
    borderWidth: 0.5, borderColor: C.border,
  },
  rowMe: { borderColor: 'rgba(255,95,31,0.4)', backgroundColor: 'rgba(255,95,31,0.06)' },
  rank: { fontSize: 12, fontWeight: '700', color: C.text3, width: 24, textAlign: 'center' },
  rowEmoji: { fontSize: 20 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: C.text },
  rowNameMe: { color: C.primary },
  rowTier: { fontSize: 11, color: C.text3, marginTop: 1 },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  rowAvg: { fontSize: 18, fontWeight: '800' },
  rowRounds: { fontSize: 10, color: C.text3 },

  legend: {
    backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 0.5, borderColor: C.border,
    overflow: 'hidden',
  },
  legendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  legendEmoji: { fontSize: 18, width: 24, textAlign: 'center' },
  legendLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text },
  legendRange: { fontSize: 12, color: C.text3 },
});
