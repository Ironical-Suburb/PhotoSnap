import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import type { AppStackParamList } from '../../navigation/types';

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

    // My rounds: photos sent by them, guessed by me
    const { data: myRounds } = await supabase
      .from('rounds')
      .select('score')
      .eq('guesser_id', user.id)
      .not('score', 'is', null)
      .in(
        'photo_id',
        (await supabase.from('photos').select('id').eq('sender_id', params.friendId)).data?.map((p) => p.id) ?? []
      );

    // Their rounds: photos sent by me, guessed by them
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

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!stats) return null;

  const myAvg = stats.myRoundsCount > 0
    ? Math.round(stats.myTotalScore / stats.myRoundsCount)
    : 0;
  const theirAvg = stats.theirRoundsCount > 0
    ? Math.round(stats.theirTotalScore / stats.theirRoundsCount)
    : 0;
  const myWins = stats.myTotalScore > stats.theirTotalScore;
  const tied = stats.myTotalScore === stats.theirTotalScore;

  return (
    <View style={styles.container}>
      <Text style={styles.versus}>{myName} vs {params.friendName}</Text>

      {stats.myRoundsCount + stats.theirRoundsCount === 0 ? (
        <Text style={styles.noGames}>No rounds played between you yet.</Text>
      ) : (
        <>
          <Text style={styles.winner}>
            {tied ? 'Tied' : myWins ? `${myName} is winning` : `${params.friendName} is winning`}
          </Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.colName}>{myName}</Text>
              <Text style={styles.colScore}>{stats.myTotalScore}</Text>
              <Text style={styles.colLabel}>total pts</Text>
              <Text style={styles.colStat}>{stats.myRoundsCount} rounds</Text>
              <Text style={styles.colStat}>{myAvg} avg pts</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.col}>
              <Text style={styles.colName}>{params.friendName}</Text>
              <Text style={styles.colScore}>{stats.theirTotalScore}</Text>
              <Text style={styles.colLabel}>total pts</Text>
              <Text style={styles.colStat}>{stats.theirRoundsCount} rounds</Text>
              <Text style={styles.colStat}>{theirAvg} avg pts</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 28 },
  versus: { fontSize: 16, color: '#aaa', fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  winner: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 36, color: '#111' },
  noGames: { fontSize: 16, color: '#bbb', textAlign: 'center', marginTop: 60 },
  row: { flexDirection: 'row', alignItems: 'center' },
  col: { flex: 1, alignItems: 'center' },
  colName: { fontSize: 15, fontWeight: '700', marginBottom: 10, color: '#444' },
  colScore: { fontSize: 48, fontWeight: '900', color: '#FF6B6B' },
  colLabel: { fontSize: 12, color: '#aaa', marginBottom: 8 },
  colStat: { fontSize: 13, color: '#888', marginBottom: 3 },
  divider: { width: 1, height: 120, backgroundColor: '#eee' },
});
