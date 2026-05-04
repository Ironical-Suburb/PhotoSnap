import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, Alert, KeyboardAvoidingView, ScrollView, StatusBar,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { C, R } from '../../theme';

type Mode = 'signin' | 'signup' | 'verify';

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [mode, setMode]         = useState<Mode>('signin');

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Sign-in failed', error.message);
    setLoading(false);
  }

  async function signUp() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert('Sign-up failed', error.message);
      return;
    }
    // Supabase sends a 6-digit code to the email — show OTP entry screen
    setMode('verify');
  }

  async function verifyOtp() {
    if (otp.length !== 6) {
      Alert.alert('Invalid code', 'Please enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup',
    });
    setLoading(false);
    if (error) Alert.alert('Verification failed', error.message);
    // On success, onAuthStateChange in App.tsx detects the session automatically
  }

  async function resendCode() {
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Code resent', 'Check your email for a new 6-digit code.');
  }

  // ─── OTP verification screen ────────────────────────────────────────────────
  if (mode === 'verify') {
    return (
      <KeyboardAvoidingView style={styles.root} behavior="padding">
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Image source={require('../../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.tagline}>Send a photo. Let them guess when.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Check your email</Text>
            <Text style={styles.verifySubtitle}>
              We sent a 6-digit code to{'\n'}
              <Text style={styles.verifyEmail}>{email}</Text>
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>CONFIRMATION CODE</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="000000"
                placeholderTextColor={C.text3}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                selectionColor={C.primary}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, (loading || otp.length !== 6) && styles.btnDisabled]}
              onPress={verifyOtp}
              disabled={loading || otp.length !== 6}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? 'Verifying…' : 'Confirm Account'}
              </Text>
            </TouchableOpacity>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Didn't get it?</Text>
              <TouchableOpacity onPress={resendCode} disabled={loading}>
                <Text style={styles.switchLink}>  Resend code</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.backBtn} onPress={() => { setMode('signup'); setOtp(''); }}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── Sign-in / Sign-up screen ────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <View style={styles.hero}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
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
  logo: {
    width: 220,
    height: 220,
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
  verifySubtitle: {
    fontSize: 14,
    color: C.text2,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  verifyEmail: {
    color: C.text,
    fontWeight: '600',
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
  otpInput: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
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
  backBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  backBtnText: {
    color: C.text3,
    fontSize: 14,
  },
});
