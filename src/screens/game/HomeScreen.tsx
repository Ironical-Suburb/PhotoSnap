import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import type { AppStackParamList } from '../../navigation/types';
import TabBar from '../../components/TabBar';
import { Ionicons } from '@expo/vector-icons';
import { C, R } from '../../theme';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [pendingCount, setPendingCount] = useState(0);
  const [displayName, setDisplayName] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ count }, { data: profile }] = await Promise.all([
      supabase.from('rounds').select('id', { count: 'exact', head: true })
        .eq('guesser_id', user.id).is('guess_date', null),
      supabase.from('users').select('display_name').eq('id', user.id).single(),
    ]);

    setPendingCount(count ?? 0);
    if (profile) setDisplayName(profile.display_name);
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.name}>{displayName || '—'}</Text>
          </View>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarText}>
              {displayName ? displayName[0].toUpperCase() : '?'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Challenges card */}
        <TouchableOpacity
          style={[styles.mainCard, pendingCount > 0 && styles.mainCardActive]}
          onPress={() => navigation.navigate('Challenges')}
          activeOpacity={0.85}
        >
          <View style={styles.mainCardTop}>
            <View style={styles.mainCardLabelRow}>
              <View style={styles.dot} />
              <Text style={styles.mainCardLabel}>CHALLENGES</Text>
            </View>
            {pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.mainCardTitle}>
            {pendingCount > 0
              ? `${pendingCount} photo${pendingCount !== 1 ? 's' : ''} waiting`
              : "You're all caught up"}
          </Text>
          <Text style={styles.mainCardSub}>
            {pendingCount > 0
              ? 'Guess when each memory was taken'
              : 'Check back later for new challenges'}
          </Text>
          <View style={styles.mainCardFooter}>
            <Text style={styles.mainCardAction}>
              {pendingCount > 0 ? 'Guess now' : 'View inbox'}
            </Text>
            <Text style={styles.mainCardArrow}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Quick grid — 2×2 */}
        <View style={styles.grid}>
          {([
            { label: 'Sent', sub: 'Challenges', screen: 'SentChallenges' as const, icon: 'arrow-up-circle-outline' },
            { label: 'History', sub: 'My rounds', screen: 'History' as const, icon: 'time-outline' },
            { label: 'Scores', sub: 'Leaderboard', screen: 'Leaderboard' as const, icon: 'trophy-outline' },
            { label: 'Drafts', sub: 'Saved posts', screen: 'Drafts' as const, icon: 'document-text-outline' },
          ] as const).map(({ label, sub, screen, icon }) => (
            <TouchableOpacity
              key={screen}
              style={styles.gridItem}
              onPress={() => navigation.navigate(screen)}
              activeOpacity={0.7}
            >
              <Ionicons name={icon as any} size={22} color={C.text2} style={{ marginBottom: 4 }} />
              <Text style={styles.gridLabel}>{label}</Text>
              <Text style={styles.gridSub}>{sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      <TabBar challengeCount={pendingCount} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingVertical: 4,
  },
  greeting: {
    fontSize: 13,
    color: C.text2,
    fontWeight: '500',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    color: C.white,
    fontWeight: '800',
    fontSize: 17,
  },
  mainCard: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: 22,
    borderWidth: 0.5,
    borderColor: C.border,
    minHeight: 156,
  },
  mainCardActive: {
    backgroundColor: '#1E1614',
    borderColor: 'rgba(255,95,31,0.3)',
  },
  mainCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  mainCardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.primary,
  },
  mainCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.text3,
    letterSpacing: 1.5,
  },
  badge: {
    backgroundColor: C.primary,
    borderRadius: R.full,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 7,
  },
  badgeText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '800',
  },
  mainCardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  mainCardSub: {
    fontSize: 14,
    color: C.text2,
    lineHeight: 20,
  },
  mainCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  mainCardAction: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },
  mainCardArrow: {
    fontSize: 14,
    color: C.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: '47.5%',
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'flex-start',
    borderWidth: 0.5,
    borderColor: C.border,
  },
  gridLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginTop: 2,
  },
  gridSub: {
    fontSize: 11,
    color: C.text3,
    marginTop: 2,
  },
});
