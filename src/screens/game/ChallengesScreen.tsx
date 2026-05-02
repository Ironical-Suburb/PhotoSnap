import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import type { AppStackParamList } from '../../navigation/types';
import TabBar from '../../components/TabBar';
import { C, R } from '../../theme';

type PendingRound = {
  id: string;
  photo_id: string;
  created_at: string;
  photos: {
    storage_url: string;
    sender: { display_name: string };
  };
};

export default function ChallengesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [rounds, setRounds] = useState<PendingRound[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchPending();
    }, [])
  );

  async function fetchPending() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('rounds')
      .select('id, photo_id, created_at, photos(storage_url, users!photos_sender_id_fkey(display_name))')
      .eq('guesser_id', user.id)
      .is('guess_date', null)
      .order('created_at', { ascending: true });

    if (data) setRounds(data as any);
    setLoading(false);
  }

  const pendingCount = rounds.length;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inbox</Text>
          {pendingCount > 0 && (
            <Text style={styles.subtitle}>{pendingCount} challenge{pendingCount !== 1 ? 's' : ''} waiting</Text>
          )}
        </View>
        {pendingCount > 0 && (
          <View style={styles.countBubble}>
            <Text style={styles.countBubbleText}>{pendingCount}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={rounds}
          keyExtractor={(item, index) => item.id ?? String(index)}
          contentContainerStyle={rounds.length === 0 ? styles.emptyContainer : styles.listContent}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Guess', { roundId: item.id })}
              activeOpacity={0.8}
            >
              <View style={styles.cardNum}>
                <Text style={styles.cardNumText}>{String(index + 1).padStart(2, '0')}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardFrom}>
                  From {item.photos?.sender?.display_name ?? 'a friend'}
                </Text>
                <Text style={styles.cardDate}>
                  Received {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
              <View style={styles.cardArrow}>
                <Text style={styles.cardArrowText}>›</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <View style={styles.emptyIconInner} />
              </View>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySub}>
                No challenges waiting.{'\n'}Ask a friend to send you one.
              </Text>
            </View>
          }
        />
      )}

      <TabBar challengeCount={pendingCount} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: C.text2,
    marginTop: 2,
  },
  countBubble: {
    backgroundColor: C.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBubbleText: {
    color: C.white,
    fontWeight: '800',
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: C.border,
    gap: 14,
  },
  cardNum: {
    width: 36,
    height: 36,
    borderRadius: R.sm,
    backgroundColor: C.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardNumText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: 0.5,
  },
  cardInfo: {
    flex: 1,
  },
  cardFrom: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
    marginBottom: 3,
  },
  cardDate: {
    fontSize: 13,
    color: C.text2,
  },
  cardArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardArrowText: {
    fontSize: 18,
    color: C.text2,
    lineHeight: 20,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  emptyIconInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: C.text3,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text2,
  },
  emptySub: {
    fontSize: 14,
    color: C.text3,
    textAlign: 'center',
    lineHeight: 20,
  },
});
