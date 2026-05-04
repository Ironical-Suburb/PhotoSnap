import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  Alert, ActivityIndicator, TextInput,
  StatusBar, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateSlider from '../../components/DateSlider';
import { decode } from 'base64-arraybuffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { toLocalDateString, localMidnight } from '../../lib/dates';
import { encryptFileToBase64 } from '../../lib/crypto';
import type { ChallengeType, DailyMoment } from '../../types';
import type { AppStackParamList } from '../../navigation/types';
import TabBar from '../../components/TabBar';
import { C, R } from '../../theme';

export const DRAFTS_KEY = 'upload_drafts_v3';

export type Draft = {
  id: string;
  imageUri: string;
  actualDate: string;
  caption: string;
  challengeType: ChallengeType;
  locationHint: string;
  savedAt: string;
};

export async function getAllDrafts(): Promise<Draft[]> {
  try {
    const raw = await AsyncStorage.getItem(DRAFTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveDraftToStore(draft: Draft): Promise<void> {
  const drafts = await getAllDrafts();
  const idx = drafts.findIndex((d) => d.id === draft.id);
  if (idx >= 0) drafts[idx] = draft;
  else drafts.unshift(draft);
  await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export async function deleteDraft(id: string): Promise<void> {
  const drafts = await getAllDrafts();
  await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.filter((d) => d.id !== id)));
}

async function updateStreak(userId: string) {
  const { data: u } = await supabase
    .from('users')
    .select('current_streak, longest_streak, last_post_date')
    .eq('id', userId)
    .single();
  if (!u) return;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (u.last_post_date === today) return; // already posted today

  const newStreak = u.last_post_date === yesterday ? (u.current_streak ?? 0) + 1 : 1;
  const newLongest = Math.max(newStreak, u.longest_streak ?? 0);

  await supabase.from('users').update({
    current_streak: newStreak,
    longest_streak: newLongest,
    last_post_date: today,
  }).eq('id', userId);
}

type UploadRoute = RouteProp<AppStackParamList, 'Upload'>;

const CHALLENGE_OPTIONS: { type: ChallengeType; label: string; icon: string }[] = [
  { type: 'date',     label: 'Date guess',     icon: '📅' },
  { type: 'location', label: 'Location guess', icon: '📍' },
  { type: 'none',     label: 'No challenge',   icon: '🖼️' },
];

export default function UploadScreen() {
  const route = useRoute<UploadRoute>();
  const incomingDraftId = route.params?.draftId;

  const [draftId] = useState(() => incomingDraftId ?? `draft_${Date.now()}`);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [actualDate, setActualDate] = useState(() => localMidnight());
  const [caption, setCaption] = useState('');
  const [challengeType, setChallengeType] = useState<ChallengeType>('date');
  const [locationHint, setLocationHint] = useState('');
  const [isDailyMoment, setIsDailyMoment] = useState(false);
  const [activeDailyMoment, setActiveDailyMoment] = useState<DailyMoment | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (incomingDraftId) loadSpecificDraft(incomingDraftId);
    checkDailyMoment();
  }, []);

  useEffect(() => {
    if (!imageUri && !caption) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => saveDraft(), 1500);
    return () => { if (draftTimer.current) clearTimeout(draftTimer.current); };
  }, [imageUri, actualDate, caption, challengeType, locationHint]);

  async function checkDailyMoment() {
    const { data } = await supabase
      .from('daily_moments')
      .select('*')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (data) {
      setActiveDailyMoment(data as DailyMoment);
      setIsDailyMoment(true);
    }
  }

  async function loadSpecificDraft(id: string) {
    const drafts = await getAllDrafts();
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return;
    setImageUri(draft.imageUri);
    setActualDate(new Date(draft.actualDate));
    setCaption(draft.caption);
    setChallengeType(draft.challengeType ?? 'date');
    setLocationHint(draft.locationHint ?? '');
  }

  async function saveDraft() {
    if (!imageUri && !caption) return;
    const draft: Draft = {
      id: draftId,
      imageUri: imageUri ?? '',
      actualDate: actualDate.toISOString(),
      caption,
      challengeType,
      locationHint,
      savedAt: new Date().toISOString(),
    };
    await saveDraftToStore(draft);
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  }

  async function clearDraft() {
    await deleteDraft(draftId);
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      quality: 0.6,
      exif: true,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      const exifDate = result.assets[0].exif?.DateTimeOriginal;
      if (exifDate) {
        const parsed = new Date(exifDate);
        if (!isNaN(parsed.getTime())) setActualDate(localMidnight(parsed));
      }
    }
  }

  async function post() {
    if (!imageUri) return;

    if (challengeType === 'date' && !actualDate) {
      Alert.alert('Date required', 'Pick the date the photo was taken.');
      return;
    }
    if (challengeType === 'location' && !locationHint.trim()) {
      Alert.alert('Location required', 'Enter where this photo was taken.');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `${user.id}/${Date.now()}.enc`;
      const encryptedBase64 = await encryptFileToBase64(imageUri);

      const { error: storageError } = await supabase.storage
        .from('Photos')
        .upload(fileName, decode(encryptedBase64), { contentType: 'image/jpeg' });
      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage.from('Photos').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('photos').insert({
        sender_id: user.id,
        receiver_id: null,
        storage_url: publicUrl,
        actual_date: (challengeType === 'date' || challengeType === 'both')
          ? toLocalDateString(actualDate)
          : null,
        caption: caption.trim() || null,
        is_post: true,
        challenge_type: challengeType,
        location_hint: locationHint.trim() || null,
        is_daily_moment: isDailyMoment,
      });
      if (dbError) throw dbError;

      await updateStreak(user.id);
      await clearDraft();

      Alert.alert('Posted!', 'Your photo is now on your friends\' feeds.');
      setImageUri(null);
      setCaption('');
      setLocationHint('');
      setChallengeType('date');
    } catch (e: any) {
      Alert.alert('Post failed', e.message);
    } finally {
      setUploading(false);
    }
  }

  const canPost = !!imageUri && !uploading;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>New Post</Text>
              <Text style={styles.subtitle}>Share a memory with your friends</Text>
            </View>
            {(imageUri || caption) && (
              <TouchableOpacity
                style={styles.discardBtn}
                onPress={() => Alert.alert('Discard draft?', 'Clear your current photo and caption?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Discard', style: 'destructive', onPress: () => {
                    setImageUri(null);
                    setCaption('');
                    setLocationHint('');
                    clearDraft();
                  }},
                ])}
              >
                <Text style={styles.discardBtnText}>Discard</Text>
              </TouchableOpacity>
            )}
          </View>

          {activeDailyMoment && (
            <TouchableOpacity
              style={[styles.momentToggle, isDailyMoment && styles.momentToggleActive]}
              onPress={() => setIsDailyMoment((v) => !v)}
              activeOpacity={0.8}
            >
              <Text style={styles.momentToggleIcon}>📸</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.momentToggleLabel, isDailyMoment && styles.momentToggleLabelActive]}>
                  Daily Moment {isDailyMoment ? 'ON' : 'OFF'}
                </Text>
                <Text style={styles.momentToggleSub}>
                  {Math.max(0, Math.floor((new Date(activeDailyMoment.expires_at).getTime() - Date.now()) / 60000))}m left in today's window
                </Text>
              </View>
              <View style={[styles.momentDot, isDailyMoment && styles.momentDotActive]} />
            </TouchableOpacity>
          )}

          {draftSaved && (
            <View style={styles.draftBanner}>
              <Text style={styles.draftBannerText}>Draft saved</Text>
            </View>
          )}

          {/* Photo picker */}
          <TouchableOpacity
            style={[styles.photoPicker, imageUri && styles.photoPickerFilled]}
            onPress={pickImage}
            activeOpacity={0.85}
          >
            {imageUri ? (
              <>
                <Image source={{ uri: imageUri }} style={styles.preview} />
                <View style={styles.changeOverlay}>
                  <Text style={styles.changeText}>Change Photo</Text>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
                <View style={styles.photoPickerCenter}>
                  <View style={styles.snapIcon}>
                    <View style={styles.snapIconInner} />
                  </View>
                  <Text style={styles.photoPickerText}>Tap to choose a photo</Text>
                  <Text style={styles.photoPickerSub}>from your gallery</Text>
                </View>
              </>
            )}
          </TouchableOpacity>

          {/* Caption */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              CAPTION  <Text style={styles.optionalTag}>OPTIONAL</Text>
            </Text>
            <TextInput
              style={styles.captionInput}
              placeholder="Add a memory or a clue..."
              placeholderTextColor={C.text3}
              value={caption}
              onChangeText={setCaption}
              maxLength={120}
              multiline
              selectionColor={C.primary}
            />
            <Text style={styles.captionCount}>{caption.length}/120</Text>
          </View>

          {/* Challenge type */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CHALLENGE TYPE</Text>
            <View style={styles.challengeRow}>
              {CHALLENGE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.type}
                  style={[styles.challengeOption, challengeType === opt.type && styles.challengeOptionActive]}
                  onPress={() => setChallengeType(opt.type)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.challengeOptionIcon}>{opt.icon}</Text>
                  <Text style={[styles.challengeOptionLabel, challengeType === opt.type && styles.challengeOptionLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date slider — only for date/both */}
          {(challengeType === 'date' || challengeType === 'both') && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>ACTUAL DATE TAKEN</Text>
              <DateSlider
                value={actualDate}
                onChange={(d) => setActualDate(localMidnight(d))}
                maximumDate={new Date()}
              />
            </View>
          )}

          {/* Location hint — only for location/both */}
          {(challengeType === 'location' || challengeType === 'both') && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                WHERE WAS THIS TAKEN?  <Text style={styles.requiredTag}>ANSWER</Text>
              </Text>
              <TextInput
                style={styles.captionInput}
                placeholder="e.g. Eiffel Tower, Paris"
                placeholderTextColor={C.text3}
                value={locationHint}
                onChangeText={setLocationHint}
                maxLength={80}
                selectionColor={C.primary}
              />
              <Text style={styles.captionCount}>{locationHint.length}/80</Text>
            </View>
          )}

          {/* Post button */}
          <TouchableOpacity
            style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
            onPress={post}
            disabled={!canPost}
            activeOpacity={0.85}
          >
            {uploading ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={styles.postBtnText}>Post to Feed</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      <TabBar />
    </SafeAreaView>
  );
}

const CORNER_SIZE = 20;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8, gap: 20 },

  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: C.text2 },

  discardBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: R.full, backgroundColor: C.surface2, marginTop: 4,
  },
  discardBtnText: { fontSize: 13, color: C.error, fontWeight: '600' },

  momentToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: R.md, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  momentToggleActive: {
    backgroundColor: C.primaryMuted,
    borderColor: 'rgba(255,95,31,0.4)',
  },
  momentToggleIcon: { fontSize: 22 },
  momentToggleLabel: { fontSize: 14, fontWeight: '700', color: C.text2 },
  momentToggleLabelActive: { color: C.primary },
  momentToggleSub: { fontSize: 11, color: C.text3, marginTop: 2 },
  momentDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: C.surface3,
  },
  momentDotActive: { backgroundColor: C.primary },

  draftBanner: {
    backgroundColor: 'rgba(50,215,75,0.12)',
    borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 8,
    alignSelf: 'flex-start', borderWidth: 0.5, borderColor: 'rgba(50,215,75,0.3)',
  },
  draftBannerText: { fontSize: 12, color: C.success, fontWeight: '600' },

  photoPicker: {
    height: 240, borderRadius: R.xl, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative',
  },
  photoPickerFilled: { borderStyle: 'solid', borderColor: 'transparent' },
  preview: { width: '100%', height: '100%' },
  changeOverlay: {
    position: 'absolute', bottom: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: R.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  changeText: { color: C.white, fontSize: 12, fontWeight: '600' },

  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: C.primary },
  cornerTL: { top: 16, left: 16, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderTopLeftRadius: 4 },
  cornerTR: { top: 16, right: 16, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderTopRightRadius: 4 },
  cornerBL: { bottom: 16, left: 16, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 16, right: 16, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderBottomRightRadius: 4 },

  photoPickerCenter: { alignItems: 'center', gap: 10 },
  snapIcon: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: C.primaryMuted,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,95,31,0.3)',
  },
  snapIconInner: { width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, borderColor: C.primary },
  photoPickerText: { fontSize: 15, fontWeight: '600', color: C.text2 },
  photoPickerSub: { fontSize: 12, color: C.text3 },

  section: { gap: 8 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: C.text3, letterSpacing: 1.5 },
  optionalTag: { color: C.text3, fontSize: 9, fontWeight: '500', letterSpacing: 0.5 },
  requiredTag: { color: C.primary, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  captionInput: {
    backgroundColor: C.surface, borderRadius: R.md, padding: 16,
    fontSize: 15, color: C.text, minHeight: 60, textAlignVertical: 'top',
    borderWidth: 0.5, borderColor: C.border,
  },
  captionCount: { fontSize: 11, color: C.text3, textAlign: 'right' },

  challengeRow: { flexDirection: 'row', gap: 8 },
  challengeOption: {
    flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6,
    borderRadius: R.md, backgroundColor: C.surface,
    borderWidth: 0.5, borderColor: C.border, gap: 4,
  },
  challengeOptionActive: {
    backgroundColor: C.primaryMuted,
    borderColor: 'rgba(255,95,31,0.5)',
  },
  challengeOptionIcon: { fontSize: 18 },
  challengeOptionLabel: { fontSize: 11, fontWeight: '600', color: C.text3, textAlign: 'center' },
  challengeOptionLabelActive: { color: C.primary },

  postBtn: {
    backgroundColor: C.primary, borderRadius: R.lg, paddingVertical: 17,
    alignItems: 'center', shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10,
    elevation: 6, marginTop: 4,
  },
  postBtnDisabled: { opacity: 0.35 },
  postBtnText: { color: C.white, fontWeight: '800', fontSize: 17, letterSpacing: 0.2 },
});
