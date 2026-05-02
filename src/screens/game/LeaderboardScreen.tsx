import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import type { LeaderboardEntry } from '../../types';
import { C, R } from '../../theme';

const MEDALS = ['★', '✦', '◆'];
const MEDAL_COLORS = [C.accent, '#C0C0C0', '#CD7F32'];

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [{ data: { user } }, { data }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('leaderboard').select('*').order('total_score', { ascending: false }),
    ]);
    if (user) setMyId(user.id);
    if (data) setEntries(data as LeaderboardEntry[]);
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>Global rankings</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item, index) => item.user_id ?? String(index)}
          contentContainerStyle={entries.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            entries.length >= 3 ? (
              <View style={styles.podium}>
                {/* 2nd place */}
                <View style={[styles.podiumItem, styles.podiumSecond]}>
                  <Text style={styles.podiumMedal}>{MEDALS[1]}</Text>
                  <Text style={styles.podiumName} numberOfLines={1}>{entries[1]?.display_name ?? '—'}</Text>
                  <View style={[styles.podiumBar, styles.podiumBarSecond]}>
                    <Text style={styles.podiumScore}>{entries[1]?.total_score ?? 0}</Text>
                  </View>
                </View>
                {/* 1st place */}
                <View style={[styles.podiumItem, styles.podiumFirst]}>
                  <Text style={[styles.podiumMedal, { fontSize: 24 }]}>{MEDALS[0]}</Text>
                  <Text style={[styles.podiumName, styles.podiumNameFirst]} numberOfLines={1}>
                    {entries[0]?.display_name ?? '—'}
                  </Text>
                  <View style={[styles.podiumBar, styles.podiumBarFirst]}>
                    <Text style={[styles.podiumScore, styles.podiumScoreFirst]}>
                      {entries[0]?.total_score ?? 0}
                    </Text>
                  </View>
                </View>
                {/* 3rd place */}
                <View style={[styles.podiumItem, styles.podiumThird]}>
                  <Text style={styles.podiumMedal}>{MEDALS[2]}</Text>
                  <Text style={styles.podiumName} numberOfLines={1}>{entries[2]?.display_name ?? '—'}</Text>
                  <View style={[styles.podiumBar, styles.podiumBarThird]}>
                    <Text style={styles.podiumScore}>{entries[2]?.total_score ?? 0}</Text>
                  </View>
                </View>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            if (index < 3) return null;
            const isMe = item.user_id === myId;
            return (
              <View style={[styles.row, isMe && styles.rowMe]}>
                <Text style={styles.rank}>#{index + 1}</Text>
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowName, isMe && styles.rowNameMe]}>
                    {item.display_name}{isMe ? '  (you)' : ''}
                  </Text>
                  <Text style={styles.rowRounds}>{item.rounds_played} rounds</Text>
                </View>
                <Text style={[styles.rowScore, isMe && styles.rowScoreMe]}>
                  {item.total_score}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No scores yet</Text>
              <Text style={styles.emptySub}>Be the first to play and top the board!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: C.text2,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
    marginBottom: 16,
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
  },
  podiumFirst: {
    order: 1,
  } as any,
  podiumSecond: {
    order: 0,
  } as any,
  podiumThird: {
    order: 2,
  } as any,
  podiumMedal: {
    fontSize: 18,
    marginBottom: 4,
    color: C.accent,
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text2,
    marginBottom: 6,
    textAlign: 'center',
  },
  podiumNameFirst: {
    color: C.text,
    fontSize: 14,
  },
  podiumBar: {
    width: '100%',
    borderRadius: R.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  podiumBarFirst: {
    backgroundColor: C.primary,
    height: 80,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  podiumBarSecond: {
    backgroundColor: C.surface2,
    height: 60,
  },
  podiumBarThird: {
    backgroundColor: C.surface2,
    height: 44,
  },
  podiumScore: {
    fontSize: 16,
    fontWeight: '900',
    color: C.text2,
  },
  podiumScoreFirst: {
    color: C.white,
    fontSize: 18,
  },
  row: {
    backgroundColor: C.surface,
    borderRadius: R.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: C.border,
  },
  rowMe: {
    borderColor: 'rgba(255,95,31,0.4)',
    backgroundColor: C.primaryMuted,
  },
  rank: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text3,
    width: 36,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  rowNameMe: {
    color: C.primary,
  },
  rowRounds: {
    fontSize: 12,
    color: C.text3,
    marginTop: 1,
  },
  rowScore: {
    fontSize: 20,
    fontWeight: '900',
    color: C.text,
  },
  rowScoreMe: {
    color: C.primary,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text2,
  },
  emptySub: {
    fontSize: 14,
    color: C.text3,
    textAlign: 'center',
  },
});
