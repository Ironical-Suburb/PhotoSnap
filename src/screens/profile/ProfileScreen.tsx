import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Switch, Image,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { backupKey } from '../../lib/crypto';
import type { User } from '../../types';
import TabBar from '../../components/TabBar';
import { C, R } from '../../theme';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
    if (data) {
      setProfile(data as User);
      setDisplayName(data.display_name);
      setBackupEnabled(data.backup_enabled ?? false);
    }
    setLoading(false);
  }

  async function toggleBackup(enabled: boolean) {
    if (!profile) return;
    setBackupLoading(true);
    if (enabled) {
      Alert.alert(
        'Enable Key Backup',
        'Your encryption key will be saved to your account so you can restore photos on a new device. It is stored securely and only you can access it.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setBackupLoading(false) },
          {
            text: 'Enable',
            onPress: async () => {
              await backupKey(profile.id);
              await supabase.from('users').update({ backup_enabled: true }).eq('id', profile.id);
              setBackupEnabled(true);
              setProfile((p) => p ? { ...p, backup_enabled: true } : p);
              setBackupLoading(false);
            },
          },
        ]
      );
    } else {
      await supabase.from('users').update({ backup_enabled: false, encryption_key: null }).eq('id', profile.id);
      setBackupEnabled(false);
      setProfile((p) => p ? { ...p, backup_enabled: false } : p);
      setBackupLoading(false);
    }
  }

  async function saveDisplayName() {
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      Alert.alert('Too short', 'Display name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({ display_name: trimmed })
      .eq('id', profile!.id);

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
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo library access to set a profile picture.'); return; }

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

  async function signOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: () => supabase.auth.signOut(),
      },
    ]);
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

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

          {/* Avatar hero */}
          <View style={styles.hero}>
            <TouchableOpacity onPress={pickAvatar} activeOpacity={0.85} disabled={avatarUploading}>
              <View style={styles.avatarRing}>
                <View style={styles.avatar}>
                  {profile.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>
                      {(profile.display_name?.[0] ?? '?').toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.avatarEditBadge}>
                  {avatarUploading
                    ? <ActivityIndicator color={C.white} size="small" />
                    : <Text style={styles.avatarEditBadgeText}>✎</Text>
                  }
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.heroName}>{profile.display_name}</Text>
            <Text style={styles.heroEmail}>{profile.email}</Text>
          </View>

          {/* Info card */}
          <View style={styles.card}>

            {/* Display name row */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>DISPLAY NAME</Text>
                {editing ? (
                  <TextInput
                    style={styles.rowInput}
                    value={displayName}
                    onChangeText={setDisplayName}
                    maxLength={30}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={saveDisplayName}
                    selectionColor={C.primary}
                  />
                ) : (
                  <Text style={styles.rowValue}>{profile.display_name}</Text>
                )}
              </View>
              {editing ? (
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => { setDisplayName(profile.display_name); setEditing(false); }}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.btnDisabled]}
                    onPress={saveDisplayName}
                    disabled={saving}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.saveBtnText}>{saving ? '...' : 'Save'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.divider} />

            {/* Email row */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>EMAIL</Text>
                <Text style={styles.rowValue}>{profile.email}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Member since */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>MEMBER SINCE</Text>
                <Text style={styles.rowValue}>
                  {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Encryption key backup */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>KEY BACKUP</Text>
                <Text style={styles.rowSubValue}>
                  {backupEnabled ? 'Key saved to account — restores on new device' : 'Off — photos only exist on this device'}
                </Text>
              </View>
              {backupLoading ? (
                <ActivityIndicator color={C.primary} size="small" style={{ marginLeft: 8 }} />
              ) : (
                <Switch
                  value={backupEnabled}
                  onValueChange={toggleBackup}
                  trackColor={{ false: C.surface3, true: C.primary }}
                  thumbColor={C.white}
                />
              )}
            </View>

          </View>

          {/* Sign out */}
          <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.8}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      <TabBar />
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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
    paddingTop: 8,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: C.primary,
    marginBottom: 8,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarText: {
    color: C.white,
    fontSize: 38,
    fontWeight: '900',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.bg,
  },
  avatarEditBadgeText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '700',
  },
  heroName: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  heroEmail: {
    fontSize: 14,
    color: C.text3,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderColor: C.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  rowLeft: {
    flex: 1,
    gap: 4,
  },
  rowLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.text3,
    letterSpacing: 1.2,
  },
  rowValue: {
    fontSize: 16,
    fontWeight: '500',
    color: C.text,
  },
  rowSubValue: {
    fontSize: 12,
    color: C.text3,
    marginTop: 2,
    lineHeight: 16,
    flexShrink: 1,
  },
  rowInput: {
    fontSize: 16,
    fontWeight: '500',
    color: C.primary,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: C.primary,
    paddingBottom: 2,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: R.sm,
    backgroundColor: C.surface2,
  },
  cancelBtnText: {
    fontSize: 13,
    color: C.text3,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: R.sm,
    backgroundColor: C.primary,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 13,
    color: C.white,
    fontWeight: '700',
  },
  editBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginLeft: 8,
  },
  editBtnText: {
    fontSize: 14,
    color: C.primary,
    fontWeight: '700',
  },
  divider: {
    height: 0.5,
    backgroundColor: C.border,
    marginHorizontal: 18,
  },
  signOutBtn: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.error,
    marginTop: 8,
  },
  signOutText: {
    color: C.error,
    fontWeight: '700',
    fontSize: 16,
  },
});
