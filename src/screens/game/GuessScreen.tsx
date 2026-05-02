import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform, Modal, StatusBar, ScrollView,
} from 'react-native';
import EncryptedImage from '../../components/EncryptedImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { calculateScore } from '../../constants/scoring';
import { toLocalDateString, localMidnight } from '../../lib/dates';
import type { Photo, Round } from '../../types';
import type { AppStackParamList } from '../../navigation/types';
import { C, R } from '../../theme';

type GuessRoute = RouteProp<AppStackParamList, 'Guess'>;

export default function GuessScreen() {
  const route = useRoute<GuessRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const roundId = route.params?.roundId;
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [guessDate, setGuessDate] = useState(() => localMidnight());
  const [showPicker, setShowPicker] = useState(false);
  const [result, setResult] = useState<{ points: number; label: string; daysOff: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoZoomed, setPhotoZoomed] = useState(false);

  useEffect(() => {
    fetchRound();
  }, [roundId]);

  async function fetchRound() {
    setLoading(true);
    const { data } = await supabase
      .from('rounds')
      .select('*, photos(*)')
      .eq('id', roundId)
      .single();

    if (data) {
      setRound(data as Round);
      setPhoto((data as any).photos as Photo);
    }
    setLoading(false);
  }

  async function submitGuess() {
    if (!round || !photo) return;

    const guessStr = toLocalDateString(guessDate);
    const scored = calculateScore(photo.actual_date, guessStr);
    setResult(scored);

    await supabase.from('rounds').update({
      guess_date: guessStr,
      score: scored.points,
      resolved_at: new Date().toISOString(),
    }).eq('id', round.id);
  }

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  if (!photo || !round) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.errorText}>Challenge not found.</Text>
      </View>
    );
  }

  const scoreColor = result
    ? result.points >= 800 ? C.accent
    : result.points >= 400 ? C.success
    : result.points >= 100 ? C.text2
    : C.error
    : C.primary;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>←</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Photo with polaroid frame */}
        <TouchableOpacity
          onPress={() => setPhotoZoomed(true)}
          activeOpacity={0.95}
          style={styles.polaroidWrap}
        >
          <View style={styles.polaroid}>
            <EncryptedImage uri={photo.storage_url} style={styles.photo} resizeMode="cover" />
          </View>
          <Text style={styles.zoomHint}>Tap to enlarge</Text>
        </TouchableOpacity>

        {photo.caption ? (
          <View style={styles.captionWrap}>
            <Text style={styles.captionQuote}>"</Text>
            <Text style={styles.caption}>{photo.caption}</Text>
          </View>
        ) : null}

        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>{result.label}</Text>
            <Text style={[styles.resultPoints, { color: scoreColor }]}>{result.points}</Text>
            <Text style={styles.resultPtsLabel}>points</Text>
            <View style={styles.resultDivider} />
            <Text style={styles.resultDays}>
              {result.daysOff === 0 ? 'Exactly right!' : `${result.daysOff} day${result.daysOff !== 1 ? 's' : ''} off`}
            </Text>
            <Text style={styles.resultActual}>
              Actual date: {new Date(photo.actual_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => navigation.navigate('Challenges')}
              activeOpacity={0.85}
            >
              <Text style={styles.doneBtnText}>Back to Inbox</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.guessCard}>
            <Text style={styles.guessLabel}>WHEN WAS THIS TAKEN?</Text>

            <TouchableOpacity
              style={styles.datePicker}
              onPress={() => setShowPicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.datePickerLeft}>
                <Text style={styles.datePickerHint}>Your guess</Text>
                <Text style={styles.datePickerValue}>
                  {guessDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
              <Text style={styles.datePickerEdit}>Change ›</Text>
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker
                value={guessDate}
                mode="date"
                maximumDate={new Date()}
                onChange={(_, date) => {
                  setShowPicker(Platform.OS === 'ios');
                  if (date) setGuessDate(localMidnight(date));
                }}
              />
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={submitGuess} activeOpacity={0.85}>
              <Text style={styles.submitBtnText}>Submit Guess</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* Fullscreen zoom modal */}
      <Modal visible={photoZoomed} animationType="fade" statusBarTranslucent>
        <View style={styles.zoomModal}>
          <TouchableOpacity style={styles.zoomClose} onPress={() => setPhotoZoomed(false)}>
            <Text style={styles.zoomCloseText}>✕</Text>
          </TouchableOpacity>
          <EncryptedImage
            uri={photo.storage_url}
            style={styles.zoomImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loadingRoot: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: C.text2,
    fontSize: 16,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtnText: {
    fontSize: 22,
    color: C.text2,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 16,
  },
  polaroidWrap: {
    alignItems: 'center',
  },
  polaroid: {
    backgroundColor: C.white,
    padding: 8,
    paddingBottom: 32,
    borderRadius: R.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 2,
  },
  zoomHint: {
    fontSize: 11,
    color: C.text3,
    marginTop: 8,
    letterSpacing: 0.3,
  },
  captionWrap: {
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
    flexDirection: 'row',
    gap: 8,
  },
  captionQuote: {
    fontSize: 28,
    color: C.primary,
    lineHeight: 24,
    fontWeight: '800',
  },
  caption: {
    flex: 1,
    fontSize: 15,
    color: C.text2,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  guessCard: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: 22,
    gap: 16,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  guessLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.text3,
    letterSpacing: 1.5,
  },
  datePicker: {
    backgroundColor: C.surface2,
    borderRadius: R.md,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerLeft: {
    gap: 3,
  },
  datePickerHint: {
    fontSize: 11,
    color: C.text3,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  datePickerValue: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  datePickerEdit: {
    fontSize: 13,
    color: C.primary,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: C.primary,
    borderRadius: R.md,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnText: {
    color: C.white,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  resultCard: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  resultLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  resultPoints: {
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: -2,
    lineHeight: 76,
  },
  resultPtsLabel: {
    fontSize: 14,
    color: C.text3,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  resultDivider: {
    width: 40,
    height: 1,
    backgroundColor: C.border,
    marginVertical: 8,
  },
  resultDays: {
    fontSize: 16,
    color: C.text2,
    fontWeight: '600',
  },
  resultActual: {
    fontSize: 13,
    color: C.text3,
    marginTop: 2,
  },
  doneBtn: {
    backgroundColor: C.surface2,
    borderRadius: R.md,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  doneBtnText: {
    color: C.text2,
    fontWeight: '700',
    fontSize: 14,
  },
  zoomModal: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  zoomClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomCloseText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
  },
  zoomImage: {
    width: '100%',
    height: '100%',
  },
});
