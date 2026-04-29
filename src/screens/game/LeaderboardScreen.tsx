import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import type { LeaderboardEntry } from '../../types';

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  async function fetchLeaderboard() {
    const { data } = await supabase
      .from('leaderboard')
      .select('*')
      .order('total_score', { ascending: false });

    if (data) setEntries(data as LeaderboardEntry[]);
    setLoading(false);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.user_id}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>#{index + 1}</Text>
            <View style={styles.info}>
              <Text style={styles.name}>{item.display_name}</Text>
              <Text style={styles.rounds}>{item.rounds_played} rounds played</Text>
            </View>
            <Text style={styles.score}>{item.total_score}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No scores yet — start guessing!</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 24, marginTop: 16 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  rank: { fontSize: 18, fontWeight: '700', width: 40, color: '#999' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  rounds: { fontSize: 13, color: '#999' },
  score: { fontSize: 22, fontWeight: '900', color: '#FF6B6B' },
  empty: { textAlign: 'center', color: '#999', marginTop: 48, fontSize: 16 },
});
