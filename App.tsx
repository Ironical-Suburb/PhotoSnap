import 'react-native-url-polyfill/auto';
import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import { registerForPushNotifications } from './src/lib/notifications';
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      checkState(s);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      checkState(s);
    });

    return () => subscription.unsubscribe();
  }, [checkState]);

  useEffect(() => {
    if (appState === 'ready') {
      registerForPushNotifications();
    }
  }, [appState]);

  if (appState === 'loading') return null;

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {appState === 'unauthenticated' && <AuthNavigator />}
      {appState === 'needs_profile' && (
        <ProfileSetupScreen onComplete={() => checkState(session)} />
      )}
      {appState === 'ready' && <AppNavigator />}
    </NavigationContainer>
  );
}
