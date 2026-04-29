import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../../lib/supabase';

type Props = {
  onComplete: () => void;
};

export default function ProfileSetupScreen({ onComplete }: Props) {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  async function save() {
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      Alert.alert('Too short', 'Display name must be at least 2 characters.');
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { error } = await supabase.from('users').upsert({
      id: user.id,
      email: user.email!,
      display_name: trimmed,
    });

    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
    } else {
      onComplete();
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Welcome to PhotoSnap</Text>
        <Text style={styles.subtitle}>Choose a display name so your friends can find you.</Text>

        <TextInput
          style={styles.input}
          placeholder="e.g. Alex or PhotoKing99"
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={30}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={save}
        />
        <Text style={styles.hint}>{displayName.trim().length}/30</Text>

        <TouchableOpacity
          style={[styles.button, (displayName.trim().length < 2 || loading) && styles.buttonDisabled]}
          onPress={save}
          disabled={displayName.trim().length < 2 || loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Get Started'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, justifyContent: 'center', padding: 28 },
  title: { fontSize: 30, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 40, lineHeight: 22 },
  input: {
    borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12,
    padding: 16, fontSize: 17, marginBottom: 6,
  },
  hint: { fontSize: 12, color: '#ccc', textAlign: 'right', marginBottom: 28 },
  button: {
    backgroundColor: '#FF6B6B', borderRadius: 12,
    padding: 17, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
