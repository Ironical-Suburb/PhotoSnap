import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { C, R } from '../../theme';

const REDIRECT_URL = 'https://mhjthroclnjnqzdkinwt.supabase.co';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Error', error.message);
    setLoading(false);
  }

  async function signUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: REDIRECT_URL },
    });
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Check your email', 'We sent you a confirmation link. Open it to activate your account.');
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <View style={styles.hero}>
          <View style={styles.cameraIcon}>
            <View style={styles.cameraLens} />
            <View style={styles.cameraFlash} />
          </View>
          <Text style={styles.title}>PhotoSnap</Text>
          <Text style={styles.tagline}>Send a photo. Let them guess when.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={C.text3}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              selectionColor={C.primary}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={C.text3}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              selectionColor={C.primary}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={mode === 'signin' ? signIn : signUp}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
            </Text>
            <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
              <Text style={styles.switchLink}>
                {mode === 'signin' ? '  Sign Up' : '  Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 48,
  },
  cameraIcon: {
    width: 80,
    height: 80,
    borderRadius: R.lg,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  cameraLens: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: C.white,
  },
  cameraFlash: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.accent,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: C.text2,
    letterSpacing: 0.1,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: 24,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: C.text3,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  input: {
    backgroundColor: C.surface2,
    borderRadius: R.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: C.text,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  primaryBtn: {
    backgroundColor: C.primary,
    borderRadius: R.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    flexWrap: 'wrap',
  },
  switchText: {
    color: C.text2,
    fontSize: 14,
  },
  switchLink: {
    color: C.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
