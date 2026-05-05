import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, Alert, ActivityIndicator, FlatList,
  Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import EncryptedImage from '../../components/EncryptedImage';
import type { User } from '../../types';
import type { AppStackParamList } from '../../navigation/types';
import { C, R } from '../../theme';

type Nav = NativeStackNavigationProp<AppStackParamList>;

type OwnPost = {
  id: string;
  storage_path: string;
  created_at: string;
};

const TILE_SIZE = Math.floor((Dimensions.get('window').width - 4) / 3);

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<OwnPost[]>([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [])
  );

  async function fetchAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: profileData }, { data: postsData }, { count: fc }] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase
        .from('photos')
        .select('id, storage_path, created_at')
        .eq('sender_id', user.id)
        .eq('is_post', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
    ]);

    if (profileData) {
      setProfile(profileData as User);
      setDisplayName(profileData.display_name);
    }
    setPosts((postsData ?? []) as OwnPost[]);
    setFriendsCount(fc ?? 0);
    setLoading(false);
  }

  async function saveDisplayName() {
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      Alert.alert('Too short', 'Display name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('users').update({ display_name: trimmed }).eq('id', profile!.id);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setProfile((p) => p ? { ...p, display_name: trimmed } : p);
      setEditing(false);
    }
    setSaving(false);
  }

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0].base64) return;

    setAvatarUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { decode } = await import('base64-arraybuffer');
      const filePath = `avatars/${user.id}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(result.assets[0].base64), { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;
      const { error: dbErr } = await supabase.from('users').update({ avatar_url: avatarUrl }).eq('id', user.id);
      if (dbErr) throw dbErr;
      setProfile((p) => p ? { ...p, avatar_url: avatarUrl } : p);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setAvatarUploading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }
  if (!profile) return null;

  const ListHeader = (
    <View style={styles.headerSection}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Me</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={22} color={C.text2} />
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <TouchableOpacity onPress={pickAvatar} activeOpacity={0.85} disabled={avatarUploading} style={styles.avatarWrap}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{(profile.display_name?.[0] ?? '?').toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.avatarEditBadge}>
            {avatarUploading
              ? <ActivityIndicator color={C.white} size="small" />
              : <Ionicons name="camera" size={13} color={C.white} />
            }
          </View>
        </View>
      </TouchableOpacity>

      {/* Name (editable) */}
      {editing ? (
        <View style={styles.editRow}>
          <TextInput
            style={styles.nameInput}
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={30}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={saveDisplayName}
            selectionColor={C.primary}
          />
          <TouchableOpacity onPress={() => { setDisplayName(profile.display_name); setEditing(false); }} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={saveDisplayName}
            disabled={saving}
            style={[styles.saveBtn, saving && styles.btnDisabled]}
          >
            <Text style={styles.saveBtnText}>{saving ? '...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={() => setEditing(true)} activeOpacity={0.7} style={styles.nameRow}>
          <Text style={styles.nameText}>{profile.display_name}</Text>
          <Ionicons name="pencil" size={14} color={C.text3} style={{ marginLeft: 6, marginTop: 3 }} />
        </TouchableOpacity>
      )}

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{posts.length}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{friendsCount}</Text>
          <Text style={styles.statLabel}>Friends</Text>
        </View>
        {(profile.current_streak ?? 0) > 0 && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>🔥 {profile.current_streak}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
          </>
        )}
      </View>

      {/* Posts section label */}
      {posts.length > 0 && (
        <View style={styles.gridHeader}>
          <Ionicons name="grid-outline" size={16} color={C.text3} />
          <Text style={styles.gridHeaderText}>Posts</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <FlatList
        data={posts}
        numColumns={3}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={posts.length === 0 ? styles.emptyContainer : styles.gridContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.tile}>
            <EncryptedImage uri={item.storage_path} style={styles.tileImage} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📸</Text>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySub}>Share photos to have them appear here</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Upload')} activeOpacity={0.85}>
              <Text style={styles.emptyBtnText}>Post a photo</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loadingRoot: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },

  headerSection: {
    backgroundColor: C.bg,
    paddingBottom: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  topBarTitle: { fontSize: 22, fontWeight: '900', color: C.primary, letterSpacing: -0.5 },
  settingsBtn: { padding: 6 },

  avatarWrap: { alignItems: 'center', marginTop: 24, marginBottom: 12 },
  avatarRing: {
    padding: 3,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: C.primary,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarText: { color: C.white, fontSize: 40, fontWeight: '900' },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.bg,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  nameText: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3, textAlign: 'center' },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 4,
  },
  nameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: C.primary,
    borderBottomWidth: 1.5,
    borderBottomColor: C.primary,
    paddingVertical: 4,
    textAlign: 'center',
  },
  cancelBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.sm, backgroundColor: C.surface2 },
  cancelBtnText: { fontSize: 13, color: C.text3, fontWeight: '600' },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: R.sm, backgroundColor: C.primary },
  saveBtnText: { fontSize: 13, color: C.white, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: C.surface,
    marginHorizontal: 24,
    borderRadius: R.xl,
    paddingVertical: 16,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statNumber: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: C.text3, fontWeight: '600', letterSpacing: 0.3 },
  statDivider: { width: 0.5, height: 36, backgroundColor: C.border },

  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  gridHeaderText: { fontSize: 12, fontWeight: '700', color: C.text3, letterSpacing: 0.5 },

  gridContent: { paddingBottom: 90 },
  emptyContainer: { paddingBottom: 90 },

  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    margin: 0.5,
    backgroundColor: C.surface2,
    overflow: 'hidden',
  },
  tileImage: { width: TILE_SIZE, height: TILE_SIZE },

  empty: { alignItems: 'center', paddingVertical: 40, gap: 10, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  emptySub: { fontSize: 14, color: C.text2, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: C.primary,
    borderRadius: R.md,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: { color: C.white, fontWeight: '700', fontSize: 14 },
});
