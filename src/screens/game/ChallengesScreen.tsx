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

type UnreadConvo = {
  senderId: string;
  senderName: string;
  preview: string;
  count: number;
};

export default function ChallengesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [rounds, setRounds] = useState<PendingRound[]>([]);
  const [unreadDMs, setUnreadDMs] = useState<UnreadConvo[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
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
    setUserId(user.id);

    const [{ data: roundData }, { data: msgs }] = await Promise.all([
      supabase
        .from('rounds')
        .select('id, photo_id, created_at, photos(storage_url, users!photos_sender_id_fkey(display_name))')
        .eq('guesser_id', user.id)
        .is('guess_date', null)
        .order('created_at', { ascending: true }),
      supabase
        .from('messages')
        .select('sender_id, content')
        .eq('receiver_id', user.id)
        .is('read_at', null)
        .order('created_at', { ascending: false }),
    ]);

    if (roundData) setRounds(roundData as any);

    if (msgs?.length) {
      const byS = new Map<string, { preview: string; count: number }>();
      for (const m of msgs) {
        if (!byS.has(m.sender_id)) byS.set(m.sender_id, { preview: m.content, count: 1 });
        else byS.get(m.sender_id)!.count++;
      }
      const senderIds = [...byS.keys()];
      const { data: senders } = await supabase
        .from('users').select('id, display_name').in('id', senderIds);
      const nameMap = new Map((senders ?? []).map((u: any) => [u.id, u.display_name]));
      setUnreadDMs(senderIds.map((id) => ({
        senderId: id,
        senderName: nameMap.get(id) ?? 'Unknown',
        preview: byS.get(id)!.preview,
        count: byS.get(id)!.count,
      })));
    } else {
      setUnreadDMs([]);
    }

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
          contentContainerStyle={rounds.length === 0 && unreadDMs.length === 0 ? styles.emptyContainer : styles.listContent}
          ListHeaderComponent={
            unreadDMs.length > 0 ? (
              <View style={styles.dmSection}>
                <Text style={styles.dmSectionLabel}>MESSAGES</Text>
                {unreadDMs.map((convo) => (
                  <TouchableOpacity
                    key={convo.senderId}
                    style={styles.dmCard}
                    onPress={() => {
                      setUnreadDMs((prev) => prev.filter((d) => d.senderId !== convo.senderId));
                      if (userId) {
                        supabase.from('messages')
                          .update({ read_at: new Date().toISOString() })
                          .eq('sender_id', convo.senderId)
                          .eq('receiver_id', userId)
                          .is('read_at', null);
                      }
                      navigation.navigate('Chat', { friendId: convo.senderId, friendName: convo.senderName });
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dmAvatar}>
                      <Text style={styles.dmAvatarText}>{(convo.senderName[0] ?? '?').toUpperCase()}</Text>
                    </View>
                    <View style={styles.dmInfo}>
                      <Text style={styles.dmName}>{convo.senderName}</Text>
                      <Text style={styles.dmPreview} numberOfLines={1}>{convo.preview}</Text>
                    </View>
                    <View style={styles.dmBadge}>
                      <Text style={styles.dmBadgeText}>{convo.count}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {rounds.length > 0 && <Text style={[styles.dmSectionLabel, { marginTop: 16 }]}>CHALLENGES</Text>}
              </View>
            ) : null
          }
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
            unreadDMs.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <View style={styles.emptyIconInner} />
                </View>
                <Text style={styles.emptyTitle}>All caught up!</Text>
                <Text style={styles.emptySub}>
                  No challenges waiting.{'\n'}Ask a friend to send you one.
                </Text>
              </View>
            ) : null
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
  dmSection: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    gap: 8,
  },
  dmSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.text3,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  dmCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: C.border,
    gap: 12,
  },
  dmAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dmAvatarText: {
    color: C.white,
    fontWeight: '800',
    fontSize: 16,
  },
  dmInfo: {
    flex: 1,
    gap: 3,
  },
  dmName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  dmPreview: {
    fontSize: 13,
    color: C.text2,
  },
  dmBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  dmBadgeText: {
    color: C.white,
    fontSize: 11,
    fontWeight: '800',
  },
});
