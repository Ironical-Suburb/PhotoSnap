import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import EncryptedImage from '../../components/EncryptedImage';
import TabBar from '../../components/TabBar';
import type { FeedPost, ChallengeType, DailyMoment } from '../../types';
import type { AppStackParamList } from '../../navigation/types';
import { C, R } from '../../theme';

type Nav = NativeStackNavigationProp<AppStackParamList>;

type PostWithRound = FeedPost & {
  my_round?: { id: string; score: number | null; resolved_at: string | null } | null;
};

const REACTION_EMOJIS = ['🔥', '😂', '😮', '💀'] as const;
type Emoji = typeof REACTION_EMOJIS[number];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getTimeLeft(createdAt: string): { expired: boolean; label: string; urgent: boolean } {
  const remaining = new Date(createdAt).getTime() + 86400000 - Date.now();
  if (remaining <= 0) return { expired: true, label: 'Ended', urgent: false };
  const hrs = Math.floor(remaining / 3600000);
  const mins = Math.floor((remaining % 3600000) / 60000);
  if (hrs >= 6) return { expired: false, label: '', urgent: false };
  if (hrs > 0) return { expired: false, label: `${hrs}h ${mins}m left`, urgent: hrs < 2 };
  return { expired: false, label: `${mins}m left`, urgent: true };
}

function challengeBadge(type: ChallengeType | undefined) {
  if (!type || type === 'none') return null;
  if (type === 'date') return { icon: 'calendar-outline', label: 'Guess the date', color: '#5E9EFF' };
  if (type === 'location') return { icon: 'location-outline', label: 'Guess the location', color: '#32D74B' };
  if (type === 'both') return { icon: 'compass-outline', label: 'Date + Location', color: C.accent };
  return null;
}

function scoreColor(score: number) {
  if (score >= 800) return C.accent;
  if (score >= 400) return C.success;
  if (score >= 100) return C.text2;
  return C.error;
}

// ─── Post card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  currentUserId,
  onGuessTap,
  onReactionTap,
}: {
  post: PostWithRound;
  currentUserId: string;
  onGuessTap: (post: PostWithRound) => void;
  onReactionTap: (post: PostWithRound, emoji: Emoji) => void;
}) {
  const navigation = useNavigation<Nav>();
  const badge = challengeBadge(post.challenge_type);
  const streak = post.sender?.current_streak ?? 0;
  const isOwn = post.sender_id === currentUserId;
  const hasChallenge = post.challenge_type && post.challenge_type !== 'none';
  const { expired, label: expiryLabel, urgent } = getTimeLeft(post.created_at);

  function onSenderPress() {
    if (isOwn) {
      navigation.navigate('Profile');
    } else {
      navigation.navigate('FriendStats', {
        friendId: post.sender_id,
        friendName: post.sender?.display_name ?? 'Friend',
      });
    }
  }

  const myReaction = post.post_reactions?.find((r) => r.user_id === currentUserId)?.emoji ?? null;
  const reactionCounts = REACTION_EMOJIS.reduce<Record<string, number>>((acc, e) => {
    acc[e] = post.post_reactions?.filter((r) => r.emoji === e).length ?? 0;
    return acc;
  }, {});

  return (
    <View style={styles.card}>
      {/* Daily moment banner */}
      {post.is_daily_moment && (
        <View style={styles.dailyBanner}>
          <Text style={styles.dailyBannerText}>📸  DAILY MOMENT</Text>
        </View>
      )}

      {/* Header — tappable to view sender's profile */}
      <TouchableOpacity style={styles.cardHeader} onPress={onSenderPress} activeOpacity={0.7}>
        <View style={styles.cardAvatar}>
          {post.sender?.avatar_url ? (
            <Image source={{ uri: post.sender.avatar_url }} style={styles.cardAvatarImage} />
          ) : (
            <Text style={styles.cardAvatarText}>
              {(post.sender?.display_name?.[0] ?? '?').toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.cardHeaderInfo}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardName}>{post.sender?.display_name ?? 'Unknown'}</Text>
            {streak > 1 && (
              <View style={styles.streakPill}>
                <Text style={styles.streakFire}>🔥</Text>
                <Text style={styles.streakCount}>{streak}</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardTime}>{timeAgo(post.created_at)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={C.text3} />
      </TouchableOpacity>

      {/* Photo */}
      <View style={[styles.cardPhoto, expired && styles.cardPhotoExpired]}>
        <EncryptedImage uri={post.storage_url} style={styles.photo} resizeMode="cover" />
        {expired && <View style={styles.expiredOverlay} />}
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        {badge && (
          <View style={[styles.challengeBadge, { borderColor: badge.color + '40', backgroundColor: badge.color + '18' }]}>
            <Ionicons name={badge.icon as any} size={13} color={badge.color} />
            <Text style={[styles.challengeBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        )}

        {post.caption ? (
          <Text style={styles.caption} numberOfLines={3}>{post.caption}</Text>
        ) : null}

        {/* Emoji reactions */}
        <View style={styles.reactionRow}>
          {REACTION_EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={[styles.reactionBtn, myReaction === emoji && styles.reactionBtnActive]}
              onPress={() => onReactionTap(post, emoji)}
              activeOpacity={0.7}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              {reactionCounts[emoji] > 0 && (
                <Text style={[styles.reactionCount, myReaction === emoji && styles.reactionCountActive]}>
                  {reactionCounts[emoji]}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer: expiry + guess */}
        {hasChallenge && (
          <View style={styles.cardFooter}>
            {expiryLabel ? (
              <Text style={[styles.expiryLabel, urgent && styles.expiryLabelUrgent]}>
                ⏰ {expiryLabel}
              </Text>
            ) : <View />}

            {!isOwn && (
              post.my_round?.resolved_at ? (
                <View style={[styles.scorePill, { borderColor: scoreColor(post.my_round.score ?? 0) + '60' }]}>
                  <Ionicons name="checkmark-circle" size={13} color={scoreColor(post.my_round.score ?? 0)} />
                  <Text style={[styles.scorePillText, { color: scoreColor(post.my_round.score ?? 0) }]}>
                    {post.my_round.score} pts
                  </Text>
                </View>
              ) : expired ? (
                <Text style={styles.expiredLabel}>Challenge ended</Text>
              ) : (
                <TouchableOpacity
                  style={styles.guessBtn}
                  onPress={() => onGuessTap(post)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.guessBtnText}>{post.my_round ? 'Continue' : 'Guess'}</Text>
                  <Text style={styles.guessBtnArrow}>→</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const navigation = useNavigation<Nav>();
  const [posts, setPosts] = useState<PostWithRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [activeDailyMoment, setActiveDailyMoment] = useState<DailyMoment | null>(null);

  // Tick every minute so expiry countdowns stay accurate
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  useFocusEffect(
    useCallback(() => { loadFeed(); }, [])
  );

  async function loadFeed(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const [{ data: friendships }, { data: momentData }] = await Promise.all([
        supabase
          .from('friendships')
          .select('sender_id, receiver_id')
          .eq('status', 'accepted')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
        supabase
          .from('daily_moments')
          .select('*')
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle(),
      ]);

      setActiveDailyMoment((momentData as DailyMoment | null) ?? null);

      const friendIds = (friendships ?? []).map((f) =>
        f.sender_id === user.id ? f.receiver_id : f.sender_id
      );
      const senderIds = [...new Set([...friendIds, user.id])];

      const { data: rawPosts } = await supabase
        .from('photos')
        .select(`
          *,
          sender:users!sender_id(id, display_name, avatar_url, current_streak),
          post_likes(id, user_id),
          post_reactions(id, user_id, emoji)
        `)
        .eq('is_post', true)
        .in('sender_id', senderIds)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!rawPosts?.length) {
        setPosts([]);
        return;
      }

      const postIds = rawPosts.map((p) => p.id);
      const { data: myRounds } = await supabase
        .from('rounds')
        .select('id, photo_id, score, resolved_at')
        .eq('guesser_id', user.id)
        .in('photo_id', postIds);

      const roundByPostId = Object.fromEntries(
        (myRounds ?? []).map((r) => [r.photo_id, r])
      );

      setPosts(
        (rawPosts as any[]).map((p) => ({ ...p, my_round: roundByPostId[p.id] ?? null }))
      );

      const { count } = await supabase
        .from('rounds')
        .select('id', { count: 'exact', head: true })
        .eq('guesser_id', user.id)
        .is('resolved_at', null);
      setPendingCount(count ?? 0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleGuessTap(post: PostWithRound) {
    let roundId = post.my_round?.id;

    if (!roundId) {
      const { data: newRound, error } = await supabase
        .from('rounds')
        .insert({ photo_id: post.id, guesser_id: currentUserId })
        .select('id')
        .single();

      if (error || !newRound) {
        Alert.alert('Error', 'Could not start challenge. Try again.');
        return;
      }
      roundId = newRound.id;
    }

    navigation.navigate('Guess', { roundId });
  }

  async function handleReactionTap(post: PostWithRound, emoji: Emoji) {
    const existing = post.post_reactions?.find((r) => r.user_id === currentUserId);

    if (existing?.emoji === emoji) {
      await supabase.from('post_reactions').delete()
        .eq('post_id', post.id).eq('user_id', currentUserId);
      setPosts((prev) => prev.map((p) => p.id !== post.id ? p : {
        ...p,
        post_reactions: p.post_reactions.filter((r) => r.user_id !== currentUserId),
      }));
    } else {
      await supabase.from('post_reactions').upsert(
        { post_id: post.id, user_id: currentUserId, emoji },
        { onConflict: 'post_id,user_id' }
      );
      const updated = { id: 'temp', post_id: post.id, user_id: currentUserId, emoji, created_at: '' };
      setPosts((prev) => prev.map((p) => p.id !== post.id ? p : {
        ...p,
        post_reactions: [
          ...(p.post_reactions?.filter((r) => r.user_id !== currentUserId) ?? []),
          updated,
        ],
      }));
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  const momentTimeLeft = activeDailyMoment
    ? Math.max(0, Math.floor((new Date(activeDailyMoment.expires_at).getTime() - Date.now()) / 60000))
    : 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* App bar */}
      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>PhotoSnap</Text>
        <TouchableOpacity
          style={styles.inboxBtn}
          onPress={() => navigation.navigate('Challenges')}
          activeOpacity={0.8}
        >
          <Ionicons name="mail-outline" size={22} color={C.text2} />
          {pendingCount > 0 && (
            <View style={styles.inboxBadge}>
              <Text style={styles.inboxBadgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active daily moment banner */}
      {activeDailyMoment && (
        <TouchableOpacity
          style={styles.momentBanner}
          onPress={() => navigation.navigate('Upload')}
          activeOpacity={0.85}
        >
          <Text style={styles.momentBannerText}>
            📸  Daily Moment active — {momentTimeLeft}m left!
          </Text>
          <Text style={styles.momentBannerCta}>Post now →</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={currentUserId}
            onGuessTap={handleGuessTap}
            onReactionTap={handleReactionTap}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadFeed(true)} tintColor={C.primary} />
        }
        contentContainerStyle={posts.length === 0 ? styles.emptyContainer : styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📸</Text>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptySub}>Add friends and start posting to see their photos here</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Upload')} activeOpacity={0.85}>
              <Text style={styles.emptyBtnText}>Post your first photo</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TabBar challengeCount={pendingCount} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loadingRoot: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },

  appBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  appBarTitle: { fontSize: 22, fontWeight: '900', color: C.primary, letterSpacing: -0.5 },
  inboxBtn: { position: 'relative', padding: 4 },
  inboxBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: C.error, borderRadius: 8,
    minWidth: 16, height: 16,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  inboxBadgeText: { color: C.white, fontSize: 9, fontWeight: '800' },

  momentBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 10,
  },
  momentBannerText: { fontSize: 13, fontWeight: '700', color: C.white },
  momentBannerCta: { fontSize: 13, fontWeight: '800', color: C.white, opacity: 0.85 },

  listContent: { paddingBottom: 12 },
  emptyContainer: { flex: 1 },

  card: { backgroundColor: C.bg, marginBottom: 12, borderBottomWidth: 0.5, borderBottomColor: C.border },

  dailyBanner: {
    backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 5,
  },
  dailyBannerText: { fontSize: 11, fontWeight: '900', color: C.white, letterSpacing: 1.5 },

  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
  },
  cardAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  cardAvatarImage: { width: 38, height: 38, borderRadius: 19 },
  cardAvatarText: { color: C.white, fontWeight: '800', fontSize: 15 },
  cardHeaderInfo: { flex: 1 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { fontSize: 14, fontWeight: '700', color: C.text },
  cardTime: { fontSize: 12, color: C.text3, marginTop: 1 },

  streakPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,95,31,0.14)', borderRadius: R.full,
    paddingHorizontal: 6, paddingVertical: 2, gap: 2,
  },
  streakFire: { fontSize: 11 },
  streakCount: { fontSize: 11, fontWeight: '700', color: C.primary },

  cardPhoto: { width: '100%', aspectRatio: 1, backgroundColor: C.surface2, position: 'relative' },
  cardPhotoExpired: { opacity: 0.55 },
  photo: { width: '100%', height: '100%' },
  expiredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },

  cardBody: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, gap: 8 },

  challengeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.full, borderWidth: 0.5,
  },
  challengeBadgeText: { fontSize: 12, fontWeight: '600' },

  caption: { fontSize: 14, color: C.text2, lineHeight: 20 },

  reactionRow: { flexDirection: 'row', gap: 6 },
  reactionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.surface, borderRadius: R.full,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 0.5, borderColor: C.border,
  },
  reactionBtnActive: {
    backgroundColor: 'rgba(255,95,31,0.14)',
    borderColor: 'rgba(255,95,31,0.4)',
  },
  reactionEmoji: { fontSize: 15 },
  reactionCount: { fontSize: 12, fontWeight: '700', color: C.text3 },
  reactionCountActive: { color: C.primary },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2,
  },
  expiryLabel: { fontSize: 12, color: C.text3, fontWeight: '600' },
  expiryLabelUrgent: { color: C.error },
  expiredLabel: { fontSize: 12, color: C.text3, fontStyle: 'italic' },

  guessBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 7, borderRadius: R.full,
  },
  guessBtnText: { color: C.white, fontWeight: '700', fontSize: 13 },
  guessBtnArrow: { color: C.white, fontSize: 14 },

  scorePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.full,
    borderWidth: 0.5, backgroundColor: C.surface,
  },
  scorePillText: { fontSize: 12, fontWeight: '700' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  emptySub: { fontSize: 14, color: C.text3, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { backgroundColor: C.primary, borderRadius: R.full, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  emptyBtnText: { color: C.white, fontWeight: '700', fontSize: 14 },
});
