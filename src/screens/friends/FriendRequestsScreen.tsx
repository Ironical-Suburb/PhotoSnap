import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import type { User } from '../../types';
import { C, R } from '../../theme';

type RequestRow = {
  id: string;
  sender: User;
};

export default function FriendRequestsScreen() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: friendships } = await supabase
      .from('friendships')
      .select('id, sender_id')
      .eq('receiver_id', user.id)
      .eq('status', 'pending');

    if (!friendships?.length) { setLoading(false); return; }

    const senderIds = friendships.map((f) => f.sender_id);
    const { data: senders } = await supabase
      .from('users')
      .select('id, display_name, email, avatar_url, created_at')
      .in('id', senderIds);

    const senderMap = new Map((senders ?? []).map((s) => [s.id, s]));
    setRequests(
      friendships
        .map((f) => ({ id: f.id, sender: senderMap.get(f.sender_id) as User }))
        .filter((r) => r.sender != null)
    );
    setLoading(false);
  }

  async function respond(friendshipId: string, status: 'accepted' | 'rejected') {
    setActionLoading(friendshipId);
    await supabase.from('friendships').update({ status }).eq('id', friendshipId);
    setRequests((prev) => prev.filter((r) => r.id !== friendshipId));
    setActionLoading(null);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <Text style={styles.title}>Requests</Text>
        {requests.length > 0 && (
          <Text style={styles.subtitle}>{requests.length} pending</Text>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item, index) => item.id ?? String(index)}
          contentContainerStyle={requests.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.sender.display_name?.[0] ?? '?').toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.sender.display_name}</Text>
                <Text style={styles.email}>{item.sender.email}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => respond(item.id, 'accepted')}
                  disabled={actionLoading === item.id}
                  activeOpacity={0.85}
                >
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.declineBtn}
                  onPress={() => respond(item.id, 'rejected')}
                  disabled={actionLoading === item.id}
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
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 2,
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
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: C.border,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: C.white,
    fontWeight: '800',
    fontSize: 17,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  email: {
    fontSize: 12,
    color: C.text3,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: C.primary,
    borderRadius: R.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  acceptText: {
    color: C.white,
    fontWeight: '700',
    fontSize: 13,
  },
  declineBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineText: {
    color: C.text3,
    fontSize: 13,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text2,
  },
  emptySub: {
    fontSize: 14,
    color: C.text3,
  },
});
