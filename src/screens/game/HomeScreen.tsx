import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/types';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
        <Text style={styles.profileBtnText}>Profile</Text>
      </TouchableOpacity>

      <Text style={styles.title}>PhotoSnap</Text>
      <Text style={styles.subtitle}>How well do you know your moments?</Text>

      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Guess')}>
        <Text style={styles.cardTitle}>Guess a Photo</Text>
        <Text style={styles.cardSub}>A friend is waiting for your answer</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.card, styles.cardTeal]} onPress={() => navigation.navigate('Upload')}>
        <Text style={styles.cardTitle}>Challenge a Friend</Text>
        <Text style={styles.cardSub}>Send a memory for them to date-guess</Text>
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Friends')}>
          <Text style={styles.secondaryBtnText}>Friends</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Leaderboard')}>
          <Text style={styles.secondaryBtnText}>Leaderboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#aaa', textAlign: 'center', marginBottom: 40 },
  card: {
    backgroundColor: '#FF6B6B', borderRadius: 18,
    padding: 24, marginBottom: 14,
  },
  cardTeal: { backgroundColor: '#4ECDC4' },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  cardSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  row: { flexDirection: 'row', gap: 12, marginTop: 6 },
  secondaryBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#eee',
    borderRadius: 14, padding: 16, alignItems: 'center',
  },
  secondaryBtnText: { fontWeight: '600', fontSize: 15, color: '#444' },
  profileBtn: { position: 'absolute', top: 16, right: 24 },
  profileBtnText: { color: '#FF6B6B', fontWeight: '600', fontSize: 14 },
});
