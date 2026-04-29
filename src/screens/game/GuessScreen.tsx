import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { calculateScore } from '../../constants/scoring';
import type { Photo, Round } from '../../types';

export default function GuessScreen() {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [guessDate, setGuessDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [result, setResult] = useState<{ points: number; label: string; daysOff: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingRound();
  }, []);

  async function fetchPendingRound() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('rounds')
      .select('*, photos(*)')
      .eq('guesser_id', user.id)
      .is('guess_date', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (data) {
      setRound(data as Round);
      setPhoto((data as any).photos as Photo);
    }
    setLoading(false);
  }

  async function submitGuess() {
    if (!round || !photo) return;

    const scored = calculateScore(photo.actual_date, guessDate.toISOString().split('T')[0]);
    setResult(scored);

    await supabase.from('rounds').update({
      guess_date: guessDate.toISOString().split('T')[0],
      score: scored.points,
      resolved_at: new Date().toISOString(),
    }).eq('id', round.id);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  if (!photo || !round) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No photos waiting for your guess!</Text>
        <Text style={styles.emptySub}>Ask your partner to upload one.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>When was this taken?</Text>

      <Image source={{ uri: photo.storage_url }} style={styles.photo} />

      {result ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>{result.label}</Text>
          <Text style={styles.resultPoints}>{result.points} pts</Text>
          <Text style={styles.resultDays}>
            You were {result.daysOff === 0 ? 'exactly right!' : `${result.daysOff} day${result.daysOff !== 1 ? 's' : ''} off`}
          </Text>
          <Text style={styles.resultActual}>
            Actual date: {new Date(photo.actual_date).toDateString()}
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.label}>Your guess:</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker(true)}>
            <Text style={styles.dateBtnText}>{guessDate.toDateString()}</Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={guessDate}
              mode="date"
              maximumDate={new Date()}
              onChange={(_, date) => {
                setShowPicker(Platform.OS === 'ios');
                if (date) setGuessDate(date);
              }}
            />
          )}

          <TouchableOpacity style={styles.button} onPress={submitGuess}>
            <Text style={styles.buttonText}>Submit Guess</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20, marginTop: 16 },
  photo: { width: '100%', height: 260, borderRadius: 16, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8 },
  dateBtn: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 14, marginBottom: 24,
  },
  dateBtnText: { fontSize: 16 },
  button: {
    backgroundColor: '#4ECDC4', borderRadius: 10,
    padding: 16, alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  resultBox: {
    backgroundColor: '#f9f9f9', borderRadius: 16,
    padding: 24, alignItems: 'center',
  },
  resultLabel: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  resultPoints: { fontSize: 48, fontWeight: '900', color: '#FF6B6B', marginBottom: 8 },
  resultDays: { fontSize: 16, color: '#555', marginBottom: 4 },
  resultActual: { fontSize: 14, color: '#999' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#888' },
});
