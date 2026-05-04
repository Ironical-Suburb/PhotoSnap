import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, StatusBar,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { C, R } from '../../theme';

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

  const ready = displayName.trim().length >= 2 && !loading;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior="padding"
    >
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.inner}>

        <View style={styles.top}>
          <View style={styles.iconWrap}>
            <Text style={styles.iconText}>
              {displayName.trim() ? displayName.trim()[0].toUpperCase() : '?'}
            </Text>
          </View>
          <Text style={styles.title}>Pick your name</Text>
          <Text style={styles.subtitle}>
            This is how friends will find and challenge you.
          </Text>
        </View>

        <View style={styles.fieldWrap}>
          <TextInput
            style={styles.input}
            placeholder="e.g. Alex or SnapKing99"
            placeholderTextColor={C.text3}
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={30}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={save}
            selectionColor={C.primary}
          />
          <View style={styles.charRow}>
            <Text style={styles.charCount}>{displayName.trim().length}/30</Text>
            {displayName.trim().length >= 2 && (
              <Text style={styles.charOk}>Looks good!</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btn, !ready && styles.btnDisabled]}
          onPress={save}
          disabled={!ready}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{loading ? 'Saving...' : 'Get Started'}</Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
    gap: 24,
  },
  top: {
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 8,
  },
  iconText: {
    fontSize: 34,
    fontWeight: '800',
    color: C.white,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: C.text2,
    textAlign: 'center',
    lineHeight: 22,
  },
  fieldWrap: {
    gap: 6,
  },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 18,
    color: C.text,
  },
  charRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  charCount: {
    fontSize: 12,
    color: C.text3,
  },
  charOk: {
    fontSize: 12,
    color: C.success,
    fontWeight: '600',
  },
  btn: {
    backgroundColor: C.primary,
    borderRadius: R.lg,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  btnText: {
    color: C.white,
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.2,
  },
});
