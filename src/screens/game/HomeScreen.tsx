import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import type { AppStackParamList } from '../../navigation/types';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [pendingCount, setPendingCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      fetchPendingCount();
    }, [])
  );

  async function fetchPendingCount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase
      .from('rounds')
      .select('id', { count: 'exact', head: true })
      .eq('guesser_id', user.id)
      .is('guess_date', null);
    setPendingCount(count ?? 0);
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
        <Text style={styles.profileBtnText}>Profile</Text>
      </TouchableOpacity>

      <Text style={styles.title}>PhotoSnap</Text>
      <Text style={styles.subtitle}>How well do you know your moments?</Text>

      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Challenges')}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>Guess a Photo</Text>
          {pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardSub}>
          {pendingCount > 0
            ? `${pendingCount} challenge${pendingCount !== 1 ? 's' : ''} waiting`
            : 'No challenges waiting'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.card, styles.cardTeal]} onPress={() => navigation.navigate('Upload')}>
        <Text style={styles.cardTitle}>Challenge a Friend</Text>
        <Text style={styles.cardSub}>Send a memory for them to date-guess</Text>
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('SentChallenges')}>
          <Text style={styles.secondaryBtnText}>Sent</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('History')}>
          <Text style={styles.secondaryBtnText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Friends')}>
          <Text style={styles.secondaryBtnText}>Friends</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Leaderboard')}>
          <Text style={styles.secondaryBtnText}>Scores</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  profileBtn: { position: 'absolute', top: 16, right: 24 },
  profileBtnText: { color: '#FF6B6B', fontWeight: '600', fontSize: 14 },
  title: { fontSize: 32, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#aaa', textAlign: 'center', marginBottom: 40 },
  card: {
    backgroundColor: '#FF6B6B', borderRadius: 18,
    padding: 24, marginBottom: 14,
  },
  cardTeal: { backgroundColor: '#4ECDC4' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 12,
    minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center',
    marginLeft: 10, paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  cardSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  row: { flexDirection: 'row', gap: 10, marginTop: 6 },
  secondaryBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#eee',
    borderRadius: 14, padding: 14, alignItems: 'center',
  },
  secondaryBtnText: { fontWeight: '600', fontSize: 13, color: '#444' },
});
