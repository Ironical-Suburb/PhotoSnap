import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import type { User } from '../../types';
import { C, R } from '../../theme';

type RequestRow = { follower: User };

export default function FriendRequestsScreen() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setCurrentUserId(user.id);

    const { data: follows } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', user.id)
      .eq('status', 'pending');

    if (!follows?.length) { setRequests([]); setLoading(false); return; }

    const followerIds = follows.map((f) => f.follower_id);
    const { data: profiles } = await supabase
      .from('users')
      .select('id, display_name, email, avatar_url, created_at')
      .in('id', followerIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p as User]));
    setRequests(
      follows
        .map((f) => ({ follower: profileMap.get(f.follower_id) as User }))
        .filter((r) => r.follower != null)
    );
    setLoading(false);
  }

  async function accept(followerId: string) {
    setActionLoading(followerId);
    await supabase
      .from('follows')
      .update({ status: 'active' })
      .eq('follower_id', followerId)
      .eq('following_id', currentUserId);
    setRequests((prev) => prev.filter((r) => r.follower.id !== followerId));
    setActionLoading(null);
  }

  async function reject(followerId: string) {
    setActionLoading(followerId);
    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', currentUserId);
    setRequests((prev) => prev.filter((r) => r.follower.id !== followerId));
    setActionLoading(null);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <Text style={styles.title}>Follow Requests</Text>
        {requests.length > 0 && (
          <Text style={styles.subtitle}>{requests.length} pending</Text>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.follower.id}
          contentContainerStyle={requests.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                {item.follower.avatar_url ? (
                  <Image source={{ uri: item.follower.avatar_url }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarText}>
                    {(item.follower.display_name?.[0] ?? '?').toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.follower.display_name}</Text>
                <Text style={styles.email}>{item.follower.email}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => accept(item.follower.id)}
                  disabled={actionLoading === item.follower.id}
                  activeOpacity={0.85}
                >
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.declineBtn}
                  onPress={() => reject(item.follower.id)}
                  disabled={actionLoading === item.follower.id}
                  activeOpacity={0.8}
                >
                  <Text style={styles.declineText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No requests</Text>
              <Text style={styles.emptySub}>You're all caught up!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 2 },
  title: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: C.text2 },
  listContent: { paddingHorizontal: 20, paddingBottom: 24, gap: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  card: {
    backgroundColor: C.surface, borderRadius: R.lg, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 0.5, borderColor: C.border, gap: 12,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { color: C.white, fontWeight: '800', fontSize: 17 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: C.text },
  email: { fontSize: 12, color: C.text3, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  acceptBtn: { backgroundColor: C.primary, borderRadius: R.full, paddingHorizontal: 16, paddingVertical: 8 },
  acceptText: { color: C.white, fontWeight: '700', fontSize: 13 },
  declineBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.surface2, justifyContent: 'center', alignItems: 'center',
  },
  declineText: { color: C.text3, fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.text2 },
  emptySub: { fontSize: 14, color: C.text3 },
});
