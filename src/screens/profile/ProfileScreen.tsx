import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import type { User } from '../../types';

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

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!profile) return null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.display_name[0].toUpperCase()}</Text>
          </View>
        </View>

        {/* Display name */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Display name</Text>
          {editing ? (
            <View>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                maxLength={30}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={saveDisplayName}
              />
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
                >
                  <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.displayRow}>
              <Text style={styles.displayValue}>{profile.display_name}</Text>
              <TouchableOpacity onPress={() => setEditing(true)}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Email (read-only) */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Email</Text>
          <Text style={styles.displayValue}>{profile.email}</Text>
        </View>

        {/* Member since */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Member since</Text>
          <Text style={styles.displayValue}>{new Date(profile.created_at).toDateString()}</Text>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24 },
  avatarWrap: { alignItems: 'center', marginBottom: 32, marginTop: 8 },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#FF6B6B', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '800' },
  section: {
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    paddingVertical: 18,
  },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  displayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  displayValue: { fontSize: 16, color: '#111', fontWeight: '500' },
  editLink: { color: '#FF6B6B', fontWeight: '600', fontSize: 14 },
  input: {
    borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 10,
    padding: 12, fontSize: 16, marginBottom: 10,
  },
  editActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: '#ddd',
    borderRadius: 10, padding: 12, alignItems: 'center',
  },
  cancelBtnText: { color: '#888', fontWeight: '600' },
  saveBtn: {
    flex: 1, backgroundColor: '#FF6B6B',
    borderRadius: 10, padding: 12, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  signOutBtn: {
    marginTop: 48, borderWidth: 1.5, borderColor: '#FF6B6B',
    borderRadius: 12, padding: 16, alignItems: 'center',
  },
  signOutText: { color: '#FF6B6B', fontWeight: '700', fontSize: 16 },
});
