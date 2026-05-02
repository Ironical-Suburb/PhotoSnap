import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import type { AppStackParamList } from '../../navigation/types';
import { C, R } from '../../theme';

type FriendStatsRoute = RouteProp<AppStackParamList, 'FriendStats'>;

type Stats = {
  myRoundsCount: number;
  myTotalScore: number;
  theirRoundsCount: number;
  theirTotalScore: number;
};

export default function FriendStatsScreen() {
  const { params } = useRoute<FriendStatsRoute>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [myName, setMyName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: me } = await supabase
      .from('users').select('display_name').eq('id', user.id).single();
    if (me) setMyName(me.display_name);

    const { data: myRounds } = await supabase
      .from('rounds')
      .select('score')
      .eq('guesser_id', user.id)
      .not('score', 'is', null)
      .in(
        'photo_id',
        (await supabase.from('photos').select('id').eq('sender_id', params.friendId)).data?.map((p) => p.id) ?? []
      );

    const { data: theirRounds } = await supabase
      .from('rounds')
      .select('score')
      .eq('guesser_id', params.friendId)
      .not('score', 'is', null)
      .in(
        'photo_id',
        (await supabase.from('photos').select('id').eq('sender_id', user.id)).data?.map((p) => p.id) ?? []
      );

    setStats({
      myRoundsCount: myRounds?.length ?? 0,
      myTotalScore: myRounds?.reduce((sum, r) => sum + (r.score ?? 0), 0) ?? 0,
      theirRoundsCount: theirRounds?.length ?? 0,
      theirTotalScore: theirRounds?.reduce((sum, r) => sum + (r.score ?? 0), 0) ?? 0,
    });
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
  if (!stats) return null;

  const myAvg = stats.myRoundsCount > 0
    ? Math.round(stats.myTotalScore / stats.myRoundsCount) : 0;
  const theirAvg = stats.theirRoundsCount > 0
    ? Math.round(stats.theirTotalScore / stats.theirRoundsCount) : 0;
  const totalRounds = stats.myRoundsCount + stats.theirRoundsCount;
  const myWins = stats.myTotalScore > stats.theirTotalScore;
  const tied = stats.myTotalScore === stats.theirTotalScore;

  const winnerName = tied ? null : myWins ? myName : params.friendName;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.content}>
        {/* VS header */}
        <View style={styles.vsRow}>
          <Text style={styles.vsName} numberOfLines={1}>{myName}</Text>
          <View style={styles.vsBadge}><Text style={styles.vsBadgeText}>VS</Text></View>
          <Text style={[styles.vsName, styles.vsNameRight]} numberOfLines={1}>{params.friendName}</Text>
        </View>

        {totalRounds === 0 ? (
          <View style={styles.noGames}>
            <Text style={styles.noGamesText}>No rounds between you yet</Text>
            <Text style={styles.noGamesSub}>Challenge each other to get started!</Text>
          </View>
        ) : (
          <>
            {winnerName && (
              <View style={styles.winnerBanner}>
                <Text style={styles.winnerEmoji}>★</Text>
                <Text style={styles.winnerText}>{winnerName} is winning</Text>
              </View>
            )}
            {tied && (
              <View style={styles.winnerBanner}>
                <Text style={styles.winnerText}>All tied up!</Text>
              </View>
            )}

            {/* Score comparison */}
            <View style={styles.scoreCard}>
              <View style={styles.scoreCol}>
                <Text style={styles.scoreName} numberOfLines={1}>{myName}</Text>
                <Text style={[styles.scoreValue, myWins && styles.scoreValueWinner]}>
                  {stats.myTotalScore}
                </Text>
                <Text style={styles.scoreUnit}>total pts</Text>
              </View>
              <View style={styles.scoreDivider} />
              <View style={styles.scoreCol}>
                <Text style={[styles.scoreName, styles.scoreNameRight]} numberOfLines={1}>
                  {params.friendName}
                </Text>
                <Text style={[styles.scoreValue, !myWins && !tied && styles.scoreValueWinner]}>
                  {stats.theirTotalScore}
                </Text>
                <Text style={styles.scoreUnit}>total pts</Text>
              </View>
            </View>

            {/* Stat grid */}
            <View style={styles.statGrid}>
              <StatCard label="Your rounds" value={stats.myRoundsCount} unit="rounds" />
              <StatCard label="Their rounds" value={stats.theirRoundsCount} unit="rounds" />
              <StatCard label="Your avg" value={myAvg} unit="pts/round" highlight={myAvg > theirAvg} />
              <StatCard label="Their avg" value={theirAvg} unit="pts/round" highlight={theirAvg > myAvg} />
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function StatCard({ label, value, unit, highlight }: {
  label: string; value: number; unit: string; highlight?: boolean;
}) {
  return (
    <View style={[statStyles.card, highlight && statStyles.cardHighlight]}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, highlight && statStyles.valueHighlight]}>{value}</Text>
      <Text style={statStyles.unit}>{unit}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: 14,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: C.border,
    gap: 3,
  },
  cardHighlight: {
    borderColor: 'rgba(255,95,31,0.3)',
    backgroundColor: C.primaryMuted,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: C.text3,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  value: {
    fontSize: 26,
    fontWeight: '900',
    color: C.text2,
    letterSpacing: -0.5,
  },
  valueHighlight: {
    color: C.primary,
  },
  unit: {
    fontSize: 10,
    color: C.text3,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loadingRoot: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 8,
  },
  vsName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
  },
  vsNameRight: {
    textAlign: 'right',
  },
  vsBadge: {
    backgroundColor: C.surface2,
    borderRadius: R.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  vsBadgeText: {
    color: C.text3,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  winnerBanner: {
    backgroundColor: C.primaryMuted,
    borderRadius: R.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255,95,31,0.25)',
  },
  winnerEmoji: {
    color: C.accent,
    fontSize: 16,
  },
  winnerText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.primary,
  },
  scoreCard: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: 24,
    flexDirection: 'row',
    borderWidth: 0.5,
    borderColor: C.border,
  },
  scoreCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  scoreName: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text2,
  },
  scoreNameRight: {
    textAlign: 'right',
  },
  scoreValue: {
    fontSize: 52,
    fontWeight: '900',
    color: C.text3,
    letterSpacing: -2,
    lineHeight: 56,
  },
  scoreValueWinner: {
    color: C.primary,
  },
  scoreUnit: {
    fontSize: 11,
    color: C.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreDivider: {
    width: 1,
    backgroundColor: C.border,
    marginHorizontal: 16,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  noGames: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  noGamesText: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text2,
  },
  noGamesSub: {
    fontSize: 14,
    color: C.text3,
    textAlign: 'center',
  },
});
