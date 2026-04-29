import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import type { AppStackParamList } from '../../navigation/types';

type PendingRound = {
  id: string;
  photo_id: string;
  created_at: string;
  photos: {
    storage_url: string;
    sender: { display_name: string };
  };
};

export default function ChallengesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [rounds, setRounds] = useState<PendingRound[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchPending();
    }, [])
  );

  async function fetchPending() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('rounds')
      .select('id, photo_id, created_at, photos(storage_url, users!photos_sender_id_fkey(display_name))')
      .eq('guesser_id', user.id)
      .is('guess_date', null)
      .order('created_at', { ascending: true });

    if (data) setRounds(data as any);
    setLoading(false);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={rounds}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Guess', { roundId: item.id })}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.from}>
                From {item.photos?.sender?.display_name ?? 'a friend'}
              </Text>
              <Text style={styles.date}>
                Received {new Date(item.created_at).toDateString()}
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No challenges waiting</Text>
            <Text style={styles.emptySub}>Upload a photo to challenge a friend first.</Text>
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
    padding: 18, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  cardLeft: { flex: 1 },
  from: { fontSize: 16, fontWeight: '600', marginBottom: 3 },
  date: { fontSize: 13, color: '#aaa' },
  arrow: { fontSize: 24, color: '#ccc', fontWeight: '300' },
  empty: { alignItems: 'center', marginTop: 100, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#bbb' },
  emptySub: { fontSize: 14, color: '#ccc', textAlign: 'center' },
});
