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
  storage_url: string;
  created_at: string;
};

const TILE_SIZE = Math.floor((Dimensions.get('window').width - 4) / 3);

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<OwnPost[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [])
  );

  async function fetchAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [
      { data: profileData },
      { data: postsData },
      { count: followers },
      { count: following },
    ] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase
        .from('photos')
        .select('id, storage_url, created_at')
        .eq('sender_id', user.id)
        .eq('is_post', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('following_id', user.id)
        .eq('status', 'active'),
      supabase
        .from('follows')
        .select('following_id', { count: 'exact', head: true })
        .eq('follower_id', user.id)
        .eq('status', 'active'),
    ]);

    if (profileData) {
      setProfile(profileData as User);
      setDisplayName(profileData.display_name);
    }
    setPosts((postsData ?? []) as OwnPost[]);
    setFollowersCount(followers ?? 0);
    setFollowingCount(following ?? 0);
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

  async function pickCover() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to set a cover photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets[0].base64) return;

    setCoverUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { decode } = await import('base64-arraybuffer');
      const filePath = `covers/${user.id}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(result.assets[0].base64), { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const coverUrl = `${publicUrl}?t=${Date.now()}`;
      const { error: dbErr } = await supabase.from('users').update({ cover_url: coverUrl }).eq('id', user.id);
      if (dbErr) throw dbErr;
      setProfile((p) => p ? { ...p, cover_url: coverUrl } : p);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setCoverUploading(false);
    }
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

      {/* Cover banner */}
      <TouchableOpacity onPress={pickCover} activeOpacity={0.85} disabled={coverUploading} style={styles.coverWrap}>
        {profile.cover_url ? (
          <Image source={{ uri: profile.cover_url }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name="image-outline" size={28} color={C.text3} />
            <Text style={styles.coverPlaceholderText}>Tap to add a cover photo</Text>
          </View>
        )}
        <View style={styles.coverScrim} />
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.coverSettingsBtn} hitSlop={8}>
          <Ionicons name="settings-outline" size={20} color={C.white} />
        </TouchableOpacity>
        <View style={styles.coverEditBadge}>
          {coverUploading
            ? <ActivityIndicator color={C.white} size="small" />
            : <Ionicons name="camera" size={14} color={C.white} />
          }
        </View>
      </TouchableOpacity>

      {/* Avatar (overlapping the cover) */}
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
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => navigation.navigate('Friends', { initialTab: 'followers' })}
          activeOpacity={0.7}
        >
          <Text style={styles.statNumber}>{followersCount}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => navigation.navigate('Friends', { initialTab: 'following' })}
          activeOpacity={0.7}
        >
          <Text style={styles.statNumber}>{followingCount}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </TouchableOpacity>
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
          <TouchableOpacity
            style={styles.tile}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
          >
            <EncryptedImage uri={item.storage_url} style={styles.tileImage} />
          </TouchableOpacity>
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

  coverWrap: {
    width: '100%',
    height: 160,
    backgroundColor: C.surface,
    position: 'relative',
  },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: C.surface,
  },
  coverPlaceholderText: { fontSize: 12, color: C.text3, fontWeight: '600' },
  coverScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  coverSettingsBtn: {
    position: 'absolute',
    top: 12, right: 12,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  coverEditBadge: {
    position: 'absolute',
    bottom: 10, right: 12,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row', alignItems: 'center',
  },

  avatarWrap: { alignItems: 'center', marginTop: -54, marginBottom: 12 },
  avatarRing: {
    padding: 3,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: C.bg,
    backgroundColor: C.bg,
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
