import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Share, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { decryptToLocalUri } from '../../lib/crypto';
import EncryptedImage from '../../components/EncryptedImage';
import type { AppStackParamList } from '../../navigation/types';
import type { FeedPost, PostComment, PostReaction } from '../../types';
import { timeAgo } from './FeedScreen';
import { C, R } from '../../theme';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type DetailRoute = RouteProp<AppStackParamList, 'PostDetail'>;

const REACTION_EMOJIS = ['🔥', '😂', '😮', '💀'] as const;
type Emoji = typeof REACTION_EMOJIS[number];

type DetailPost = FeedPost & { post_comments_count?: number };

export default function PostDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const { postId } = route.params;

  const [post, setPost] = useState<DetailPost | null>(null);
  const [recentComments, setRecentComments] = useState<PostComment[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useFocusEffect(
    useCallback(() => { load(); }, [postId])
  );

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const [{ data: photo }, { data: comments }, { count }] = await Promise.all([
      supabase
        .from('photos')
        .select(`
          *,
          sender:users!sender_id(id, display_name, avatar_url, current_streak),
          post_likes(id, user_id),
          post_reactions(id, user_id, emoji)
        `)
        .eq('id', postId)
        .single(),
      supabase
        .from('post_comments')
        .select('id, post_id, user_id, text, created_at, user:users!user_id(id, display_name, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(2),
      supabase
        .from('post_comments')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId),
    ]);

    if (photo) {
      setPost({ ...(photo as any), post_comments_count: count ?? 0 } as DetailPost);
    }
    setRecentComments(((comments ?? []) as any[]).reverse() as PostComment[]);
    setLoading(false);
  }

  async function handleReactionTap(emoji: Emoji) {
    if (!post) return;
    const existing = post.post_reactions?.find((r) => r.user_id === currentUserId);

    if (existing?.emoji === emoji) {
      await supabase.from('post_reactions').delete()
        .eq('post_id', post.id).eq('user_id', currentUserId);
      setPost((p) => p ? {
        ...p,
        post_reactions: p.post_reactions.filter((r) => r.user_id !== currentUserId),
      } : p);
    } else {
      await supabase.from('post_reactions').upsert(
        { post_id: post.id, user_id: currentUserId, emoji },
        { onConflict: 'post_id,user_id' }
      );
      const updated: PostReaction = {
        id: 'temp', post_id: post.id, user_id: currentUserId, emoji, created_at: '',
      };
      setPost((p) => p ? {
        ...p,
        post_reactions: [
          ...(p.post_reactions?.filter((r) => r.user_id !== currentUserId) ?? []),
          updated,
        ],
      } : p);
    }
  }

  async function handleShare() {
    if (!post || sharing) return;
    setSharing(true);
    try {
      const localUri = await decryptToLocalUri(post.storage_url);
      const senderName = post.sender?.display_name ?? 'PhotoSnap user';
      const message = post.caption
        ? `${senderName} on PhotoSnap: ${post.caption}`
        : `Photo by ${senderName} on PhotoSnap`;
      await Share.share({ message, url: localUri });
    } catch (e: any) {
      Alert.alert('Share failed', e?.message ?? 'Could not share this post.');
    } finally {
      setSharing(false);
    }
  }

  function onSenderPress() {
    if (!post) return;
    if (post.sender_id === currentUserId) {
      navigation.navigate('Profile');
    } else {
      navigation.navigate('FriendStats', {
        friendId: post.sender_id,
        friendName: post.sender?.display_name ?? 'Friend',
      });
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Post not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const myReaction = post.post_reactions?.find((r) => r.user_id === currentUserId)?.emoji ?? null;
  const reactionCounts = REACTION_EMOJIS.reduce<Record<string, number>>((acc, e) => {
    acc[e] = post.post_reactions?.filter((r) => r.emoji === e).length ?? 0;
    return acc;
  }, {});
  const totalReactions = post.post_reactions?.length ?? 0;
  const commentsCount = post.post_comments_count ?? 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <TouchableOpacity onPress={handleShare} hitSlop={10} disabled={sharing}>
          {sharing
            ? <ActivityIndicator color={C.text} size="small" />
            : <Ionicons name="share-outline" size={24} color={C.text} />
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Sender header */}
        <TouchableOpacity style={styles.senderRow} onPress={onSenderPress} activeOpacity={0.85}>
          <View style={styles.avatar}>
            {post.sender?.avatar_url ? (
              <Image source={{ uri: post.sender.avatar_url }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{(post.sender?.display_name?.[0] ?? '?').toUpperCase()}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.senderName}>{post.sender?.display_name ?? 'Unknown'}</Text>
            <Text style={styles.senderTime}>{timeAgo(post.created_at)}</Text>
          </View>
        </TouchableOpacity>

        {/* Photo */}
        <View style={styles.photoWrap}>
          <EncryptedImage uri={post.storage_url} style={styles.photo} resizeMode="cover" />
        </View>

        {/* Action bar */}
        <View style={styles.actionBar}>
          <View style={styles.reactionsRow}>
            {REACTION_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[styles.reactionBtn, myReaction === emoji && styles.reactionBtnActive]}
                onPress={() => handleReactionTap(emoji)}
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
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Comments', { postId: post.id })}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={22} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleShare}
            activeOpacity={0.7}
            disabled={sharing}
          >
            <Ionicons name="paper-plane-outline" size={22} color={C.text} />
          </TouchableOpacity>
        </View>

        {/* Likes/reactions summary */}
        {totalReactions > 0 && (
          <Text style={styles.likesText}>
            {totalReactions} {totalReactions === 1 ? 'reaction' : 'reactions'}
          </Text>
        )}

        {/* Caption */}
        {post.caption ? (
          <View style={styles.captionRow}>
            <Text style={styles.captionName}>{post.sender?.display_name ?? 'Unknown'}</Text>
            <Text style={styles.captionText}>{post.caption}</Text>
          </View>
        ) : null}

        {/* Comments preview */}
        {commentsCount > 0 && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Comments', { postId: post.id })}
            activeOpacity={0.7}
            style={styles.viewCommentsBtn}
          >
            <Text style={styles.viewCommentsText}>
              View {commentsCount === 1 ? '1 comment' : `all ${commentsCount} comments`}
            </Text>
          </TouchableOpacity>
        )}
        {recentComments.map((c) => (
          <View key={c.id} style={styles.commentRow}>
            <Text style={styles.commentName}>{c.user?.display_name ?? 'Unknown'}</Text>
            <Text style={styles.commentText} numberOfLines={2}>{c.text}</Text>
          </View>
        ))}

        {commentsCount === 0 && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Comments', { postId: post.id })}
            activeOpacity={0.7}
            style={styles.addCommentBtn}
          >
            <Text style={styles.addCommentText}>Add a comment...</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: C.text3, fontSize: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.text },

  scrollContent: { paddingBottom: 40 },

  senderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 40, height: 40, borderRadius: 20 },
  avatarText: { color: C.white, fontWeight: '800', fontSize: 16 },
  senderName: { fontSize: 14, fontWeight: '700', color: C.text },
  senderTime: { fontSize: 12, color: C.text3, marginTop: 1 },

  photoWrap: { width: '100%', aspectRatio: 4 / 5, backgroundColor: C.surface2 },
  photo: { width: '100%', height: '100%' },

  actionBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, gap: 6,
  },
  reactionsRow: { flexDirection: 'row', gap: 6, flex: 1 },
  reactionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: C.surface, borderRadius: R.full,
    paddingHorizontal: 9, paddingVertical: 5,
  },
  reactionBtnActive: { backgroundColor: 'rgba(255,95,31,0.15)' },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 11, fontWeight: '700', color: C.text3 },
  reactionCountActive: { color: C.primary },
  iconBtn: { padding: 6 },

  likesText: {
    fontSize: 13, fontWeight: '700', color: C.text,
    paddingHorizontal: 14, marginTop: 2,
  },

  captionRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: 14, paddingTop: 6,
  },
  captionName: { fontSize: 14, fontWeight: '700', color: C.text },
  captionText: { fontSize: 14, color: C.text2, lineHeight: 19, flexShrink: 1 },

  viewCommentsBtn: { paddingHorizontal: 14, paddingTop: 8 },
  viewCommentsText: { fontSize: 13, color: C.text3 },

  commentRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: 14, paddingTop: 4,
  },
  commentName: { fontSize: 13, fontWeight: '700', color: C.text },
  commentText: { fontSize: 13, color: C.text2, lineHeight: 18, flexShrink: 1 },

  addCommentBtn: { paddingHorizontal: 14, paddingTop: 10 },
  addCommentText: { fontSize: 13, color: C.text3 },
});
