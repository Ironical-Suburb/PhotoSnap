import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  Alert, ActivityIndicator, Platform, FlatList, Modal, TextInput,
  StatusBar, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { decode } from 'base64-arraybuffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { sendPushNotification } from '../../lib/notifications';
import { toLocalDateString, localMidnight } from '../../lib/dates';
import { encryptFileToBase64 } from '../../lib/crypto';
import type { User } from '../../types';
import TabBar from '../../components/TabBar';
import { C, R } from '../../theme';

const DRAFT_KEY = 'upload_draft';

type Draft = {
  imageUri: string;
  actualDate: string;
  caption: string;
  friendId: string | null;
  friendName: string | null;
  savedAt: string;
};

export default function UploadScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [actualDate, setActualDate] = useState(() => localMidnight());
  const [caption, setCaption] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [friends, setFriends] = useState<(User & { push_token?: string })[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<(User & { push_token?: string }) | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchFriends();
    loadDraft();
  }, []);

  // Auto-save draft whenever key fields change
  useEffect(() => {
    if (!imageUri && !caption && !selectedFriend) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => saveDraft(), 1500);
    return () => { if (draftTimer.current) clearTimeout(draftTimer.current); };
  }, [imageUri, actualDate, caption, selectedFriend]);

  async function loadDraft() {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft: Draft = JSON.parse(raw);
      Alert.alert(
        'Resume draft?',
        `You have an unsent challenge saved ${new Date(draft.savedAt).toLocaleDateString()}.`,
        [
          { text: 'Discard', style: 'destructive', onPress: () => AsyncStorage.removeItem(DRAFT_KEY) },
          {
            text: 'Resume', onPress: () => {
              setImageUri(draft.imageUri);
              setActualDate(new Date(draft.actualDate));
              setCaption(draft.caption);
            },
          },
        ]
      );
    } catch {}
  }

  async function saveDraft() {
    if (!imageUri && !caption) return;
    const draft: Draft = {
      imageUri: imageUri ?? '',
      actualDate: actualDate.toISOString(),
      caption,
      friendId: selectedFriend?.id ?? null,
      friendName: selectedFriend?.display_name ?? null,
      savedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  }

  async function clearDraft() {
    await AsyncStorage.removeItem(DRAFT_KEY);
  }

  async function fetchFriends() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: friendships } = await supabase
      .from('friendships')
      .select('sender_id, receiver_id')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (!friendships?.length) return;

    const otherIds = friendships.map((f) =>
      f.sender_id === user.id ? f.receiver_id : f.sender_id
    );
    const { data: profiles } = await supabase
      .from('users')
      .select('id, display_name, email, avatar_url, created_at, push_token')
      .in('id', otherIds);

    setFriends((profiles ?? []) as (User & { push_token?: string })[]);
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      quality: 0.5,
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

  async function upload() {
    if (!imageUri || !selectedFriend) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `${user.id}/${Date.now()}.enc`;
      const encryptedBase64 = await encryptFileToBase64(imageUri);

      const { error: storageError } = await supabase.storage
        .from('Photos')
        .upload(fileName, decode(encryptedBase64), { contentType: 'application/octet-stream' });

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage.from('Photos').getPublicUrl(fileName);

      const { data: photo, error: dbError } = await supabase
        .from('photos')
        .insert({
          sender_id: user.id,
          receiver_id: selectedFriend.id,
          storage_url: publicUrl,
          actual_date: toLocalDateString(actualDate),
          caption: caption.trim() || null,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      await supabase.from('rounds').insert({
        photo_id: photo.id,
        guesser_id: selectedFriend.id,
      });

      if (selectedFriend.push_token) {
        const { data: sender } = await supabase
          .from('users').select('display_name').eq('id', user.id).single();
        await sendPushNotification(
          selectedFriend.push_token,
          'New photo challenge!',
          `${sender?.display_name ?? 'Someone'} wants you to guess when a photo was taken.`,
          { screen: 'Challenges' }
        );
      }

      await clearDraft();
      Alert.alert('Sent!', `${selectedFriend.display_name} has been challenged.`);
      setImageUri(null);
      setCaption('');
      setSelectedFriend(null);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  }

  const canUpload = !!imageUri && !!selectedFriend && !uploading;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Snap & Send</Text>
              <Text style={styles.subtitle}>Challenge a friend to date your memory</Text>
            </View>
            {(imageUri || caption) && (
              <TouchableOpacity
                style={styles.discardBtn}
                onPress={() => Alert.alert('Discard draft?', 'This will clear your current photo and caption.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Discard', style: 'destructive', onPress: () => {
                    setImageUri(null);
                    setCaption('');
                    setSelectedFriend(null);
                    clearDraft();
                  }},
                ])}
              >
                <Text style={styles.discardBtnText}>Discard</Text>
              </TouchableOpacity>
            )}
          </View>

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
                {/* Viewfinder corners */}
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

          {/* Date */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ACTUAL DATE TAKEN</Text>
            <TouchableOpacity
              style={styles.fieldRow}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}
            >
              <View>
                <Text style={styles.fieldRowHint}>Date</Text>
                <Text style={styles.fieldRowValue}>
                  {actualDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
              <Text style={styles.fieldRowChevron}>›</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={actualDate}
                mode="date"
                maximumDate={new Date()}
                onChange={(_, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) setActualDate(localMidnight(date));
                }}
              />
            )}
          </View>

          {/* Caption */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CAPTION  <Text style={styles.optionalTag}>OPTIONAL</Text></Text>
            <TextInput
              style={styles.captionInput}
              placeholder="Add a hint or a memory clue..."
              placeholderTextColor={C.text3}
              value={caption}
              onChangeText={setCaption}
              maxLength={120}
              multiline
              selectionColor={C.primary}
            />
            <Text style={styles.captionCount}>{caption.length}/120</Text>
          </View>

          {/* Friend */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SEND TO</Text>
            <TouchableOpacity
              style={styles.fieldRow}
              onPress={() => setShowFriendPicker(true)}
              activeOpacity={0.8}
            >
              {selectedFriend ? (
                <View style={styles.selectedFriend}>
                  <View style={styles.selectedFriendAvatar}>
                    <Text style={styles.selectedFriendAvatarText}>
                      {(selectedFriend.display_name?.[0] ?? '?').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.selectedFriendName}>{selectedFriend.display_name}</Text>
                </View>
              ) : (
                <Text style={styles.fieldRowPlaceholder}>Choose a friend...</Text>
              )}
              <Text style={styles.fieldRowChevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Send button */}
          <TouchableOpacity
            style={[styles.sendBtn, !canUpload && styles.sendBtnDisabled]}
            onPress={upload}
            disabled={!canUpload}
            activeOpacity={0.85}
          >
            {uploading ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={styles.sendBtnText}>Send Challenge</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Friend picker modal */}
      <Modal visible={showFriendPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose a Friend</Text>
            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setShowFriendPicker(false)}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={friends}
            keyExtractor={(item, index) => item.id ?? String(index)}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.friendRow, selectedFriend?.id === item.id && styles.friendRowSelected]}
                onPress={() => { setSelectedFriend(item); setShowFriendPicker(false); }}
                activeOpacity={0.8}
              >
                <View style={styles.friendAvatar}>
                  <Text style={styles.friendAvatarText}>
                    {(item.display_name?.[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.friendName}>{item.display_name}</Text>
                {selectedFriend?.id === item.id && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>No friends yet</Text>
                <Text style={styles.modalEmptySub}>Add some friends first!</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      <TabBar />
    </SafeAreaView>
  );
}

const CORNER_SIZE = 20;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  discardBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: R.full,
    backgroundColor: C.surface2,
    marginTop: 4,
  },
  discardBtnText: {
    fontSize: 13,
    color: C.error,
    fontWeight: '600',
  },
  draftBanner: {
    backgroundColor: 'rgba(50,215,75,0.12)',
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    borderWidth: 0.5,
    borderColor: 'rgba(50,215,75,0.3)',
  },
  draftBannerText: {
    fontSize: 12,
    color: C.success,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: C.text2,
  },
  photoPicker: {
    height: 220,
    borderRadius: R.xl,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  photoPickerFilled: {
    borderStyle: 'solid',
    borderColor: 'transparent',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  changeOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: R.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '600',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: C.primary,
  },
  cornerTL: {
    top: 16,
    left: 16,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 16,
    right: 16,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 16,
    left: 16,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 16,
    right: 16,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: 4,
  },
  photoPickerCenter: {
    alignItems: 'center',
    gap: 10,
  },
  snapIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,95,31,0.3)',
  },
  snapIconInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: C.primary,
  },
  photoPickerText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text2,
  },
  photoPickerSub: {
    fontSize: 12,
    color: C.text3,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.text3,
    letterSpacing: 1.5,
  },
  optionalTag: {
    color: C.text3,
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  fieldRow: {
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 0.5,
    borderColor: C.border,
  },
  fieldRowHint: {
    fontSize: 11,
    color: C.text3,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  fieldRowValue: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
  },
  fieldRowPlaceholder: {
    fontSize: 15,
    color: C.text3,
  },
  fieldRowChevron: {
    fontSize: 20,
    color: C.text3,
    lineHeight: 22,
  },
  captionInput: {
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: 16,
    fontSize: 15,
    color: C.text,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 0.5,
    borderColor: C.border,
  },
  captionCount: {
    fontSize: 11,
    color: C.text3,
    textAlign: 'right',
  },
  selectedFriend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedFriendAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedFriendAvatarText: {
    color: C.white,
    fontWeight: '700',
    fontSize: 13,
  },
  selectedFriendName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  sendBtn: {
    backgroundColor: C.primary,
    borderRadius: R.lg,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    marginTop: 4,
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
  sendBtnText: {
    color: C.white,
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.2,
  },
  modal: {
    flex: 1,
    backgroundColor: C.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  modalDoneBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  modalDoneText: {
    color: C.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  modalList: {
    padding: 12,
    gap: 8,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: R.md,
    backgroundColor: C.surface,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  friendRowSelected: {
    borderColor: C.primary,
    backgroundColor: C.primaryMuted,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendAvatarText: {
    color: C.white,
    fontWeight: '700',
    fontSize: 15,
  },
  friendName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: C.text,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '800',
  },
  modalEmpty: {
    alignItems: 'center',
    marginTop: 60,
    gap: 8,
  },
  modalEmptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text2,
  },
  modalEmptySub: {
    fontSize: 14,
    color: C.text3,
  },
});
