import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Image,
  StyleSheet, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { C, R } from '../../theme';

type HistoryRound = {
  id: string;
  guess_date: string;
  score: number;
  resolved_at: string;
  photo_id: string;
  photo: {
    storage_url: string;
    actual_date: string;
    caption: string | null;
    sender_id: string;
    sender: { display_name: string } | null;
  };
};

export default function HistoryScreen() {
  const [rounds, setRounds] = useState<HistoryRound[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  async function fetchHistory() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: roundRows } = await supabase
      .from('rounds')
      .select('id, guess_date, score, resolved_at, photo_id')
      .eq('guesser_id', user.id)
      .not('resolved_at', 'is', null)
      .order('resolved_at', { ascending: false });

    if (!roundRows?.length) { setRounds([]); setLoading(false); return; }

    const photoIds = roundRows.map((r) => r.photo_id);
    const { data: photos } = await supabase
      .from('photos')
      .select('id, storage_url, actual_date, caption, sender_id')
      .in('id', photoIds);

    const senderIds = [...new Set((photos ?? []).map((p) => p.sender_id))];
    const { data: senders } = await supabase
      .from('users')
      .select('id, display_name')
      .in('id', senderIds);

    const photoMap = new Map((photos ?? []).map((p) => [p.id, p]));
    const senderMap = new Map((senders ?? []).map((s) => [s.id, s]));

    setRounds(
      roundRows.map((r) => {
        const photo = photoMap.get(r.photo_id);
        return {
          ...r,
          photo: photo
            ? { ...photo, sender: senderMap.get(photo.sender_id) ?? null }
            : null,
        };
      }).filter((r) => r.photo != null) as HistoryRound[]
    );
    setLoading(false);
  }

  const totalScore = rounds.reduce((sum, r) => sum + (r.score ?? 0), 0);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>{rounds.length} rounds played</Text>
        </View>
        {rounds.length > 0 && (
          <View style={styles.totalScore}>
            <Text style={styles.totalScoreValue}>{totalScore}</Text>
            <Text style={styles.totalScoreLabel}>total pts</Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={rounds}
          keyExtractor={(item, index) => item.id ?? String(index)}
          contentContainerStyle={rounds.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const daysOff = Math.abs(
              Math.round(
                (new Date(item.photo.actual_date).getTime() - new Date(item.guess_date).getTime()) /
                (1000 * 60 * 60 * 24)
              )
            );
            const isExact = daysOff === 0;
            const scoreColor = item.score >= 800 ? C.accent
              : item.score >= 400 ? C.success
              : item.score >= 100 ? C.text2
              : C.error;
            return (
              <View style={styles.card}>
                <View style={styles.thumbWrap}>
                  <Image source={{ uri: item.photo.storage_url }} style={styles.thumb} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardFrom}>
                    From {item.photo.sender?.display_name ?? 'friend'}
                  </Text>
                  <View style={styles.datesRow}>
                    <View style={styles.dateItem}>
                      <Text style={styles.dateLabel}>ACTUAL</Text>
                      <Text style={styles.dateValue}>
                        {new Date(item.photo.actual_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                    <View style={styles.dateDivider} />
                    <View style={styles.dateItem}>
                      <Text style={styles.dateLabel}>YOUR GUESS</Text>
                      <Text style={styles.dateValue}>
                        {new Date(item.guess_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.accuracy, isExact && styles.accuracyExact]}>
                    {isExact ? 'Exact!' : `${daysOff}d off`}
                  </Text>
                </View>
                <View style={styles.scoreWrap}>
                  <Text style={[styles.score, { color: scoreColor }]}>{item.score}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No rounds yet</Text>
              <Text style={styles.emptySub}>Your completed guesses will appear here.</Text>
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
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
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
    marginTop: 2,
  },
  totalScore: {
    alignItems: 'flex-end',
  },
  totalScoreValue: {
    fontSize: 28,
    fontWeight: '900',
    color: C.primary,
    letterSpacing: -0.5,
  },
  totalScoreLabel: {
    fontSize: 10,
    color: C.text3,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  thumbWrap: {
    borderRadius: R.sm,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: C.white,
  },
  thumb: {
    width: 60,
    height: 60,
  },
  cardInfo: {
    flex: 1,
    gap: 6,
  },
  cardFrom: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text2,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateItem: {
    gap: 2,
  },
  dateLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: C.text3,
    letterSpacing: 0.8,
  },
  dateValue: {
    fontSize: 12,
    fontWeight: '600',
    color: C.text,
  },
  dateDivider: {
    width: 1,
    height: 24,
    backgroundColor: C.border,
  },
  accuracy: {
    fontSize: 12,
    fontWeight: '600',
    color: C.text3,
  },
  accuracyExact: {
    color: C.accent,
  },
  scoreWrap: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
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
