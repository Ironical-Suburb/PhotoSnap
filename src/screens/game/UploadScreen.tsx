import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  Alert, ActivityIndicator, Platform, FlatList, Modal, TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../lib/supabase';
import { sendPushNotification } from '../../lib/notifications';
import type { User } from '../../types';

export default function UploadScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [actualDate, setActualDate] = useState(new Date());
  const [caption, setCaption] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [friends, setFriends] = useState<(User & { push_token?: string })[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<(User & { push_token?: string }) | null>(null);
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchFriends();
  }, []);

  async function fetchFriends() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('friendships')
      .select('sender_id, receiver_id, users!friendships_sender_id_fkey(id, display_name, email, avatar_url, created_at, push_token), users!friendships_receiver_id_fkey(id, display_name, email, avatar_url, created_at, push_token)')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (data) {
      setFriends(
        data.map((row: any) =>
          row.sender_id === user.id
            ? row['users!friendships_receiver_id_fkey']
            : row['users!friendships_sender_id_fkey']
        )
      );
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      quality: 0.8,
      exif: true,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      const exifDate = result.assets[0].exif?.DateTimeOriginal;
      if (exifDate) {
        const parsed = new Date(exifDate);
        if (!isNaN(parsed.getTime())) setActualDate(parsed);
      }
    }
  }

  async function upload() {
    if (!imageUri || !selectedFriend) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const ext = imageUri.split('.').pop() ?? 'jpg';
      const fileName = `${user.id}/${Date.now()}.${ext}`;
      const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' as const });

      const { error: storageError } = await supabase.storage
        .from('photos')
        .upload(fileName, decode(base64), { contentType: `image/${ext}` });

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);

      const { data: photo, error: dbError } = await supabase
        .from('photos')
        .insert({
          sender_id: user.id,
          receiver_id: selectedFriend.id,
          storage_url: publicUrl,
          actual_date: actualDate.toISOString().split('T')[0],
          caption: caption.trim() || null,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      await supabase.from('rounds').insert({
        photo_id: photo.id,
        guesser_id: selectedFriend.id,
      });

      // Notify the receiver if they have a push token
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
    <View style={styles.container}>
      <Text style={styles.title}>Upload a Memory</Text>

      <TouchableOpacity style={styles.photoPicker} onPress={pickImage}>
        {imageUri
          ? <Image source={{ uri: imageUri }} style={styles.preview} />
          : <Text style={styles.photoPickerText}>Tap to choose a photo</Text>}
      </TouchableOpacity>

      <Text style={styles.label}>When was this taken?</Text>
      <TouchableOpacity style={styles.fieldBtn} onPress={() => setShowDatePicker(true)}>
        <Text style={styles.fieldBtnText}>{actualDate.toDateString()}</Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={actualDate}
          mode="date"
          maximumDate={new Date()}
          onChange={(_, date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (date) setActualDate(date);
          }}
        />
      )}

      <Text style={styles.label}>Caption (optional)</Text>
      <TextInput
        style={styles.captionInput}
        placeholder="Add a hint or context..."
        value={caption}
        onChangeText={setCaption}
        maxLength={120}
        multiline
      />

      <Text style={styles.label}>Send to</Text>
      <TouchableOpacity style={styles.fieldBtn} onPress={() => setShowFriendPicker(true)}>
        <Text style={[styles.fieldBtnText, !selectedFriend && styles.placeholder]}>
          {selectedFriend ? selectedFriend.display_name : 'Choose a friend...'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, !canUpload && styles.buttonDisabled]}
        onPress={upload}
        disabled={!canUpload}
      >
        {uploading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Send Challenge</Text>}
      </TouchableOpacity>

      <Modal visible={showFriendPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose a Friend</Text>
            <TouchableOpacity onPress={() => setShowFriendPicker(false)}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.friendRow, selectedFriend?.id === item.id && styles.friendRowSelected]}
                onPress={() => { setSelectedFriend(item); setShowFriendPicker(false); }}
              >
                <View style={styles.friendAvatar}>
                  <Text style={styles.friendAvatarText}>{item.display_name[0].toUpperCase()}</Text>
                </View>
                <Text style={styles.friendName}>{item.display_name}</Text>
                {selectedFriend?.id === item.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.noFriends}>No friends yet — add some first!</Text>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20, marginTop: 8 },
  photoPicker: {
    height: 180, borderRadius: 16, backgroundColor: '#f5f5f5',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden',
  },
  photoPickerText: { color: '#bbb', fontSize: 15 },
  preview: { width: '100%', height: '100%' },
  label: { fontSize: 12, fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  fieldBtn: {
    borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10,
    padding: 14, marginBottom: 16,
  },
  fieldBtnText: { fontSize: 15, color: '#111' },
  placeholder: { color: '#bbb' },
  captionInput: {
    borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10,
    padding: 14, marginBottom: 16, fontSize: 15,
    minHeight: 72, textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#FF6B6B', borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 4,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalClose: { color: '#FF6B6B', fontWeight: '600', fontSize: 16 },
  friendRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  friendRowSelected: { backgroundColor: '#fff8f8' },
  friendAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#4ECDC4', justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  friendAvatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  friendName: { flex: 1, fontSize: 16, fontWeight: '500' },
  checkmark: { color: '#FF6B6B', fontWeight: '700', fontSize: 18 },
  noFriends: { textAlign: 'center', color: '#bbb', marginTop: 60, fontSize: 15 },
});
