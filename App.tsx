import 'react-native-url-polyfill/auto';
import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import { registerForPushNotifications } from './src/lib/notifications';
import { hasLocalKey, restoreKeyFromBackup } from './src/lib/crypto';
import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import ProfileSetupScreen from './src/screens/profile/ProfileSetupScreen';

type AppState = 'loading' | 'unauthenticated' | 'needs_profile' | 'ready';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [session, setSession] = useState<Session | null>(null);

  const checkState = useCallback(async (s: Session | null) => {
    if (!s) {
      setAppState('unauthenticated');
      return;
    }
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('id', s.user.id)
      .maybeSingle();
    setAppState(data ? 'ready' : 'needs_profile');
  }, []);

  const handleDeepLink = useCallback(async (url: string) => {
    // PKCE flow: photosnap://?code=XXX  (Supabase v2 default)
    const parsed = Linking.parse(url);
    const code = parsed.queryParams?.code;
    if (code) {
      await supabase.auth.exchangeCodeForSession(String(code));
      return;
    }
    // Implicit flow fallback: photosnap://#access_token=XXX&refresh_token=XXX
    if (url.includes('access_token')) {
      const fragment = url.split('#')[1] ?? '';
      const params = new URLSearchParams(fragment);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      checkState(s);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      checkState(s);
    });

    // Handle deep link when app is already open
    const linkingSub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));

    // Handle deep link when app was opened from a cold start via the link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    return () => {
      subscription.unsubscribe();
      linkingSub.remove();
    };
  }, [checkState, handleDeepLink]);

  useEffect(() => {
    if (appState === 'ready' && session) {
      registerForPushNotifications();
      // Restore encryption key from backup if this device doesn't have one
      hasLocalKey().then((has) => {
        if (!has) restoreKeyFromBackup(session.user.id);
      });
    }
  }, [appState, session]);

  if (appState === 'loading') return null;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor="#0C0C0C" />
        {appState === 'unauthenticated' && <AuthNavigator />}
        {appState === 'needs_profile' && (
          <ProfileSetupScreen onComplete={() => checkState(session)} />
        )}
        {appState === 'ready' && <AppNavigator />}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
