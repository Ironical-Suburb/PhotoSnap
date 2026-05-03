import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import type { AppStackParamList } from '../../navigation/types';
import { C, R } from '../../theme';

type DuelRow = {
  id: string;
  status: string;
  created_at: string;
  challenger_id: string;
  opponent_id: string;
  challenger_photo_id: string | null;
  opponent_photo_id: string | null;
  challenger_score: number | null;
  opponent_score: number | null;
  winner_id: string | null;
  challenger: { display_name: string };
  opponent: { display_name: string };
};

function statusLabel(duel: DuelRow, userId: string): { text: string; color: string } {
  const isChallenger = duel.challenger_id === userId;
  switch (duel.status) {
    case 'pending':
      if (isChallenger && !duel.challenger_photo_id) return { text: 'Pick your photo', color: C.accent };
      if (!isChallenger) return { text: 'Your turn to accept', color: C.primary };
      return { text: 'Waiting for opponent', color: C.text3 };
    case 'active':
      return { text: 'Guess in progress', color: '#5E9EFF' };
    case 'complete':
      if (duel.winner_id === userId) return { text: 'You won! 🏆', color: C.success };
      if (duel.winner_id) return { text: 'You lost', color: C.error };
      return { text: 'Draw', color: C.text2 };
    case 'rejected':
      return { text: 'Declined', color: C.text3 };
    default:
      return { text: duel.status, color: C.text3 };
  }
}

export default function DuelsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [duels, setDuels] = useState<DuelRow[]>([]);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => { loadDuels(); }, [])
  );

  async function loadDuels() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase
      .from('duels')
      .select(`
        *,
        challenger:users!challenger_id(display_name),
        opponent:users!opponent_id(display_name)
      `)
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .neq('status', 'rejected')
      .order('created_at', { ascending: false });

    setDuels((data ?? []) as DuelRow[]);
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

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.header}>
        <Text style={styles.title}>Duels</Text>
        <Text style={styles.subtitle}>Challenge friends to head-to-head accuracy battles</Text>
      </View>

      <FlatList
        data={duels}
        keyExtractor={(item) => item.id}
        contentContainerStyle={duels.length === 0 ? styles.emptyContainer : styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isChallenger = item.challenger_id === userId;
          const opponent = isChallenger ? item.opponent : item.challenger;
          const { text, color } = statusLabel(item, userId);

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Duel', { duelId: item.id })}
              activeOpacity={0.8}
            >
              <View style={styles.cardLeft}>
                <View style={styles.vsRow}>
                  <Text style={styles.name}>{item.challenger.display_name}</Text>
                  <Text style={styles.vs}>vs</Text>
                  <Text style={styles.name}>{item.opponent.display_name}</Text>
                </View>
                {item.status === 'complete' && item.challenger_score !== null && (
                  <Text style={styles.scores}>
                    {item.challenger_score} – {item.opponent_score}
                  </Text>
                )}
              </View>
              <View style={styles.cardRight}>
                <View style={[styles.statusPill, { borderColor: color + '50' }]}>
                  <Text style={[styles.statusText, { color }]}>{text}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.text3} />
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⚔️</Text>
            <Text style={styles.emptyTitle}>No duels yet</Text>
            <Text style={styles.emptySub}>Challenge a friend from the Friends screen</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loadingRoot: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: C.text3, marginTop: 2 },

  list: { paddingHorizontal: 20, paddingBottom: 24, gap: 8, paddingTop: 4 },
  emptyContainer: { flex: 1 },

  card: {
    backgroundColor: C.surface, borderRadius: R.lg, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 0.5, borderColor: C.border,
  },
  cardLeft: { flex: 1, gap: 4 },
  vsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 14, fontWeight: '600', color: C.text },
  vs: { fontSize: 11, color: C.text3, fontWeight: '500' },
  scores: { fontSize: 12, color: C.text2, fontWeight: '700' },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusPill: {
    borderWidth: 0.5, borderRadius: R.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: C.text },
  emptySub: { fontSize: 14, color: C.text3, textAlign: 'center' },
});
