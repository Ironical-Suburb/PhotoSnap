import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Image,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

type SentPhoto = {
  id: string;
  storage_url: string;
  actual_date: string;
  caption: string | null;
  created_at: string;
  receiver: { display_name: string };
  round: { guess_date: string | null; score: number | null } | null;
};

export default function SentChallengesScreen() {
  const [photos, setPhotos] = useState<SentPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchSent();
    }, [])
  );

  async function fetchSent() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('photos')
      .select('id, storage_url, actual_date, caption, created_at, users!photos_receiver_id_fkey(display_name), rounds(guess_date, score)')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setPhotos(
        data.map((row: any) => ({
          ...row,
          receiver: row['users!photos_receiver_id_fkey'],
          round: row.rounds?.[0] ?? null,
        }))
      );
    }
    setLoading(false);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={photos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const guessed = item.round?.guess_date != null;
          return (
            <View style={styles.card}>
              <Image source={{ uri: item.storage_url }} style={styles.thumb} />
              <View style={styles.info}>
                <Text style={styles.to}>To {item.receiver?.display_name ?? 'friend'}</Text>
                <Text style={styles.actual}>Taken {new Date(item.actual_date).toDateString()}</Text>
                {guessed ? (
                  <>
                    <Text style={styles.guessed}>
                      Guessed: {new Date(item.round!.guess_date!).toDateString()}
                    </Text>
                    <Text style={styles.score}>{item.round!.score} pts</Text>
                  </>
                ) : (
                  <Text style={styles.pending}>Waiting for guess...</Text>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No challenges sent yet</Text>
            <Text style={styles.emptySub}>Upload a photo to challenge a friend.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  card: {
    flexDirection: 'row', padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  thumb: { width: 72, height: 72, borderRadius: 10, marginRight: 14 },
  info: { flex: 1, justifyContent: 'center' },
  to: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  actual: { fontSize: 13, color: '#888', marginBottom: 4 },
  guessed: { fontSize: 13, color: '#555' },
  score: { fontSize: 18, fontWeight: '800', color: '#FF6B6B', marginTop: 2 },
  pending: { fontSize: 13, color: '#bbb', fontStyle: 'italic' },
  empty: { alignItems: 'center', marginTop: 100, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#bbb', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#ccc', textAlign: 'center' },
});
