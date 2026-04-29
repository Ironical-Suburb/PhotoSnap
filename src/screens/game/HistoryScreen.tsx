import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Image,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

type HistoryRound = {
  id: string;
  guess_date: string;
  score: number;
  resolved_at: string;
  photo: {
    storage_url: string;
    actual_date: string;
    caption: string | null;
    sender: { display_name: string };
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
    if (!user) return;

    const { data } = await supabase
      .from('rounds')
      .select('id, guess_date, score, resolved_at, photos(storage_url, actual_date, caption, users!photos_sender_id_fkey(display_name))')
      .eq('guesser_id', user.id)
      .not('resolved_at', 'is', null)
      .order('resolved_at', { ascending: false });

    if (data) {
      setRounds(
        data.map((row: any) => ({
          ...row,
          photo: {
            ...row.photos,
            sender: row.photos?.['users!photos_sender_id_fkey'],
          },
        }))
      );
    }
    setLoading(false);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={rounds}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const daysOff = Math.abs(
            Math.round(
              (new Date(item.photo.actual_date).getTime() - new Date(item.guess_date).getTime()) /
              (1000 * 60 * 60 * 24)
            )
          );
          return (
            <View style={styles.card}>
              <Image source={{ uri: item.photo.storage_url }} style={styles.thumb} />
              <View style={styles.info}>
                <Text style={styles.from}>From {item.photo.sender?.display_name ?? 'friend'}</Text>
                <Text style={styles.actual}>Actual: {new Date(item.photo.actual_date).toDateString()}</Text>
                <Text style={styles.guess}>Your guess: {new Date(item.guess_date).toDateString()}</Text>
                <Text style={styles.daysOff}>
                  {daysOff === 0 ? 'Exact!' : `${daysOff} day${daysOff !== 1 ? 's' : ''} off`}
                </Text>
              </View>
              <Text style={styles.score}>{item.score}</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No rounds played yet</Text>
            <Text style={styles.emptySub}>Your completed guesses will appear here.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  thumb: { width: 64, height: 64, borderRadius: 10, marginRight: 14 },
  info: { flex: 1 },
  from: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  actual: { fontSize: 12, color: '#888' },
  guess: { fontSize: 12, color: '#888' },
  daysOff: { fontSize: 12, color: '#4ECDC4', fontWeight: '600', marginTop: 2 },
  score: { fontSize: 22, fontWeight: '900', color: '#FF6B6B', marginLeft: 8 },
  empty: { alignItems: 'center', marginTop: 100, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#bbb', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#ccc', textAlign: 'center' },
});
