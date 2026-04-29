import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import ProfileSetupScreen from './src/screens/profile/ProfileSetupScreen';

type AppState = 'loading' | 'unauthenticated' | 'needs_profile' | 'ready';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkState(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkState(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkState(session: Session | null) {
    if (!session) {
      setAppState('unauthenticated');
      return;
    }
    // Check whether the user has completed their profile
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle();

    setAppState(data ? 'ready' : 'needs_profile');
  }

  if (appState === 'loading') return null;

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {appState === 'unauthenticated' && <AuthNavigator />}
      {appState === 'needs_profile' && <ProfileSetupScreen />}
      {appState === 'ready' && <AppNavigator />}
    </NavigationContainer>
  );
}
