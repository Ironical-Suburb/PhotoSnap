import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, Image,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import type { AppStackParamList } from '../../navigation/types';
import type { PostComment, CommentLike } from '../../types';
import { timeAgo } from './FeedScreen';
import { C, R } from '../../theme';

type CommentsRoute = RouteProp<AppStackParamList, 'Comments'>;

const COMMENT_SELECT =
  'id, post_id, user_id, text, created_at, parent_id, user:users!user_id(id, display_name, avatar_url), comment_likes(comment_id, user_id, value)';

type ThreadItem = { comment: PostComment; isReply: boolean };

export default function CommentsScreen() {
  const route = useRoute<CommentsRoute>();
  const navigation = useNavigation();
  const { postId } = route.params;

  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState<string>('');
  const [postOwnerId, setPostOwnerId] = useState<string>('');
  const [postOwnerName, setPostOwnerName] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [{ data: photo }, { data: rows }] = await Promise.all([
      supabase
        .from('photos')
        .select('sender_id, sender:users!sender_id(id, display_name)')
        .eq('id', postId)
        .single(),
      supabase
        .from('post_comments')
        .select(COMMENT_SELECT)
        .eq('post_id', postId)
        .order('created_at', { ascending: true }),
    ]);

    setPostOwnerId(photo?.sender_id ?? '');
    setPostOwnerName((photo as any)?.sender?.display_name ?? '');
    setComments((rows as any[] as PostComment[]) ?? []);
    setLoading(false);
  }

  // Flatten into a render list: each top-level comment followed by its replies.
  // A reply to a reply is rooted at the original top-level ancestor.
  const threaded = useMemo<ThreadItem[]>(() => {
    const byId = new Map(comments.map((c) => [c.id, c]));
    const rootOf = (c: PostComment): string => {
      let cur: PostComment | undefined = c;
      const seen = new Set<string>();
      while (cur?.parent_id && byId.has(cur.parent_id) && !seen.has(cur.id)) {
        seen.add(cur.id);
        cur = byId.get(cur.parent_id);
      }
      return cur?.id ?? c.id;
    };

    const repliesByRoot = new Map<string, PostComment[]>();
    const roots: PostComment[] = [];
    for (const c of comments) {
      if (!c.parent_id) {
        roots.push(c);
      } else {
        const r = rootOf(c);
        if (!repliesByRoot.has(r)) repliesByRoot.set(r, []);
        repliesByRoot.get(r)!.push(c);
      }
    }

    const out: ThreadItem[] = [];
    for (const root of roots) {
      out.push({ comment: root, isReply: false });
      const kids = (repliesByRoot.get(root.id) ?? [])
        .slice()
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      for (const k of kids) out.push({ comment: k, isReply: true });
    }
    return out;
  }, [comments]);

  function startReply(c: PostComment) {
    setReplyingTo({ id: c.id, name: c.user?.display_name ?? 'user' });
    inputRef.current?.focus();
  }

  function cancelReply() {
    setReplyingTo(null);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || !userId || sending) return;
    setSending(true);

    const payload: any = { post_id: postId, user_id: userId, text };
    if (replyingTo) payload.parent_id = replyingTo.id;

    const { data, error } = await supabase
      .from('post_comments')
      .insert(payload)
      .select(COMMENT_SELECT)
      .single();

    setSending(false);

    if (error || !data) {
      console.log('[Comments] insert error:', error);
      Alert.alert('Error', error?.message ?? 'Could not post comment. Try again.');
      return;
    }

    setComments((prev) => [...prev, data as any as PostComment]);
    setInput('');
    setReplyingTo(null);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }

  async function handleVote(comment: PostComment, value: 1) {
    if (!userId) return;
    const existing = comment.comment_likes?.find((l) => l.user_id === userId);

    const applyLocal = (next: CommentLike[]) => {
      setComments((prev) => prev.map((c) => c.id === comment.id ? { ...c, comment_likes: next } : c));
    };
    const without = (comment.comment_likes ?? []).filter((l) => l.user_id !== userId);

    if (existing?.value === value) {
      applyLocal(without);
      const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', comment.id)
        .eq('user_id', userId);
      if (error) {
        applyLocal([...without, existing]);
        Alert.alert('Error', error.message);
      }
    } else {
      const optimistic: CommentLike = { comment_id: comment.id, user_id: userId, value };
      applyLocal([...without, optimistic]);
      const { error } = await supabase
        .from('comment_likes')
        .upsert({ comment_id: comment.id, user_id: userId, value }, { onConflict: 'comment_id,user_id' });
      if (error) {
        applyLocal(comment.comment_likes ?? []);
        Alert.alert('Error', error.message);
      }
    }
  }

  async function handleDelete(comment: PostComment) {
    Alert.alert('Delete comment?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('post_comments').delete().eq('id', comment.id);
          if (error) {
            Alert.alert('Error', 'Could not delete comment.');
            return;
          }
          setComments((prev) => prev.filter((c) => c.id !== comment.id && c.parent_id !== comment.id));
        },
      },
    ]);
  }

  function renderItem({ item }: { item: ThreadItem }) {
    const c = item.comment;
    const canDelete = c.user_id === userId || postOwnerId === userId;
    const likes = c.comment_likes ?? [];
    const likeCount = likes.filter((l) => l.value === 1).length;
    const myLiked = likes.some((l) => l.user_id === userId && l.value === 1);
    const authorLiked =
      postOwnerId &&
      postOwnerId !== c.user_id &&
      likes.some((l) => l.user_id === postOwnerId && l.value === 1);

    return (
      <View style={[styles.row, item.isReply && styles.replyRow]}>
        <View style={[styles.avatar, item.isReply && styles.avatarReply]}>
          {c.user?.avatar_url ? (
            <Image
              source={{ uri: c.user.avatar_url }}
              style={item.isReply ? styles.avatarImgReply : styles.avatarImg}
            />
          ) : (
            <Text style={[styles.avatarText, item.isReply && styles.avatarTextReply]}>
              {(c.user?.display_name?.[0] ?? '?').toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.bubble}>
          <View style={styles.bubbleHeader}>
            <Text style={styles.name}>{c.user?.display_name ?? 'Unknown'}</Text>
            <Text style={styles.time}>{timeAgo(c.created_at)}</Text>
          </View>
          <Text style={styles.text}>{c.text}</Text>
          {authorLiked && (
            <View style={styles.authorLikedRow}>
              <Ionicons name="heart" size={11} color={C.primary} />
              <Text style={styles.authorLikedText}>
                Liked by {postOwnerName || 'author'}
              </Text>
            </View>
          )}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={() => handleVote(c, 1)}
              hitSlop={6}
              style={styles.voteBtn}
              activeOpacity={0.7}
            >
              <Ionicons
                name={myLiked ? 'heart' : 'heart-outline'}
                size={15}
                color={myLiked ? C.primary : C.text3}
              />
              {likeCount > 0 && (
                <Text style={[styles.voteCount, myLiked && styles.voteCountActive]}>
                  {likeCount}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => startReply(c)}
              hitSlop={6}
              activeOpacity={0.7}
            >
              <Text style={styles.replyBtnText}>Reply</Text>
            </TouchableOpacity>
          </View>
        </View>
        {canDelete && (
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(c)} hitSlop={8}>
            <Ionicons name="trash-outline" size={15} color={C.text3} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comments</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <FlatList
            ref={listRef}
            data={threaded}
            keyExtractor={(t) => t.comment.id}
            renderItem={renderItem}
            contentContainerStyle={threaded.length === 0 ? styles.emptyContainer : styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyTitle}>No comments yet</Text>
                <Text style={styles.emptySub}>Be the first to say something</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />

          {replyingTo && (
            <View style={styles.replyingBar}>
              <Text style={styles.replyingText}>
                Replying to <Text style={styles.replyingName}>{replyingTo.name}</Text>
              </Text>
              <TouchableOpacity onPress={cancelReply} hitSlop={8}>
                <Ionicons name="close" size={16} color={C.text3} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputBar}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder={replyingTo ? `Reply to ${replyingTo.name}...` : 'Add a comment...'}
              placeholderTextColor={C.text3}
              style={styles.input}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator color={C.white} size="small" />
              ) : (
                <Ionicons name="arrow-up" size={18} color={C.white} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.text },

  list: { paddingVertical: 10 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  emptySub: { fontSize: 13, color: C.text3 },

  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 8, gap: 10,
  },
  replyRow: { paddingLeft: 52 },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatarReply: { width: 26, height: 26, borderRadius: 13 },
  avatarImg: { width: 34, height: 34, borderRadius: 17 },
  avatarImgReply: { width: 26, height: 26, borderRadius: 13 },
  avatarText: { color: C.white, fontWeight: '800', fontSize: 14 },
  avatarTextReply: { fontSize: 12 },
  bubble: { flex: 1, gap: 2 },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 13, fontWeight: '700', color: C.text },
  time: { fontSize: 11, color: C.text3 },
  text: { fontSize: 14, color: C.text2, lineHeight: 19 },
  deleteBtn: { padding: 4, marginTop: 2 },

  authorLikedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
  },
  authorLikedText: { fontSize: 11, color: C.primary, fontWeight: '600' },

  actionsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 6,
  },
  voteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  voteCount: { fontSize: 11, fontWeight: '700', color: C.text3 },
  voteCountActive: { color: C.primary },
  replyBtnText: { fontSize: 12, fontWeight: '700', color: C.text3 },

  replyingBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: C.surface,
    borderTopWidth: 0.5, borderTopColor: C.border,
  },
  replyingText: { fontSize: 12, color: C.text3 },
  replyingName: { fontWeight: '700', color: C.text2 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 0.5, borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  input: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: R.full,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    color: C.text,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
