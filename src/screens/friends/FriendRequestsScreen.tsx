import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import type { User } from '../../types';

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
    if (!user) return;

    const { data } = await supabase
      .from('friendships')
      .select('id, users!friendships_sender_id_fkey(id, display_name, email, avatar_url, created_at)')
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) {
      setRequests(
        data.map((row: any) => ({
          id: row.id,
          sender: row['users!friendships_sender_id_fkey'] as User,
        }))
      );
    }
    setLoading(false);
  }

  async function respond(friendshipId: string, status: 'accepted' | 'rejected') {
    setActionLoading(friendshipId);
    await supabase.from('friendships').update({ status }).eq('id', friendshipId);
    setRequests((prev) => prev.filter((r) => r.id !== friendshipId));
    setActionLoading(null);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.sender.display_name[0].toUpperCase()}</Text>
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
              >
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.declineBtn}
                onPress={() => respond(item.id, 'rejected')}
                disabled={actionLoading === item.id}
              >
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No pending requests</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FF6B6B', justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  email: { fontSize: 13, color: '#999' },
  actions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    backgroundColor: '#4ECDC4', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  acceptText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  declineBtn: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  declineText: { color: '#999', fontWeight: '600', fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 17, color: '#bbb', fontWeight: '500' },
});
