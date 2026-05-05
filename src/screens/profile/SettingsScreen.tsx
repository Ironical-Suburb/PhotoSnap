import React, { useState, useEffect } from 'react';
import {
  View, Text, Switch, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { backupKey } from '../../lib/crypto';
import type { User } from '../../types';
import { C, R } from '../../theme';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState<User | null>(null);
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
    if (data) {
      setProfile(data as User);
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
        'Your encryption key will be saved to your account so you can restore photos on a new device.',
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

  async function signOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Account section */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>EMAIL</Text>
              <Text style={styles.rowValue}>{profile?.email ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>MEMBER SINCE</Text>
              <Text style={styles.rowValue}>
                {profile ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Privacy section */}
        <Text style={styles.sectionLabel}>PRIVACY & SECURITY</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>KEY BACKUP</Text>
              <Text style={styles.rowSubValue}>
                {backupEnabled
                  ? 'Key saved to account — restores on new device'
                  : 'Off — photos only exist on this device'}
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

        {/* Danger zone */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.8}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loadingRoot: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 8 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.text3,
    letterSpacing: 1.2,
    marginTop: 8,
    marginBottom: 4,
    marginLeft: 4,
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
  rowLeft: { flex: 1, gap: 4 },
  rowLabel: { fontSize: 10, fontWeight: '700', color: C.text3, letterSpacing: 1.2 },
  rowValue: { fontSize: 15, fontWeight: '500', color: C.text },
  rowSubValue: { fontSize: 12, color: C.text3, marginTop: 2, lineHeight: 16, flexShrink: 1 },
  divider: { height: 0.5, backgroundColor: C.border, marginHorizontal: 18 },
  signOutBtn: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.error,
    marginTop: 16,
  },
  signOutText: { color: C.error, fontWeight: '700', fontSize: 16 },
});
