import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import type { User } from '../../types';
import TabBar from '../../components/TabBar';
import { C, R } from '../../theme';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    }
    setLoading(false);
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
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(profile.display_name?.[0] ?? '?').toUpperCase()}
                </Text>
              </View>
            </View>
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
  avatarText: {
    color: C.white,
    fontSize: 38,
    fontWeight: '900',
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
