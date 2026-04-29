import React, { useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import type { User } from '../../types';

type SearchResult = User & { friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'accepted' };

export default function FriendSearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (query.trim().length < 2) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: users } = await supabase
      .from('users')
      .select('*')
      .ilike('display_name', `%${query.trim()}%`)
      .neq('id', user.id)
      .limit(20);

    if (!users) { setLoading(false); return; }

    // Fetch all friendships involving this user in one query
    const { data: friendships } = await supabase
      .from('friendships')
      .select('sender_id, receiver_id, status')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    const friendMap = new Map<string, SearchResult['friendshipStatus']>();
    for (const f of friendships ?? []) {
      const otherId = f.sender_id === user.id ? f.receiver_id : f.sender_id;
      if (f.status === 'accepted') friendMap.set(otherId, 'accepted');
      else if (f.status === 'pending' && f.sender_id === user.id) friendMap.set(otherId, 'pending_sent');
      else if (f.status === 'pending' && f.receiver_id === user.id) friendMap.set(otherId, 'pending_received');
    }

    setResults(users.map((u) => ({ ...u, friendshipStatus: friendMap.get(u.id) ?? 'none' })));
    setLoading(false);
  }

  async function sendRequest(targetId: string, name: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('friendships').insert({
      sender_id: user.id,
      receiver_id: targetId,
      status: 'pending',
    });

    if (error) Alert.alert('Error', error.message);
    else {
      Alert.alert('Request sent', `Friend request sent to ${name}.`);
      setResults((prev) =>
        prev.map((r) => r.id === targetId ? { ...r, friendshipStatus: 'pending_sent' } : r)
      );
    }
  }

  function statusButton(item: SearchResult) {
    switch (item.friendshipStatus) {
      case 'accepted': return <Text style={styles.statusFriend}>Friends</Text>;
      case 'pending_sent': return <Text style={styles.statusPending}>Sent</Text>;
      case 'pending_received': return <Text style={styles.statusPending}>Requested you</Text>;
      default:
        return (
          <TouchableOpacity style={styles.addBtn} onPress={() => sendRequest(item.id, item.display_name)}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        );
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search by display name..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          returnKeyType="search"
          autoFocus
        />
        <TouchableOpacity style={styles.searchBtn} onPress={search}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading
        ? <ActivityIndicator style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.display_name[0].toUpperCase()}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.display_name}</Text>
                  <Text style={styles.email}>{item.email}</Text>
                </View>
                {statusButton(item)}
              </View>
            )}
            ListEmptyComponent={
              query.length > 0
                ? <Text style={styles.noResults}>No users found</Text>
                : null
            }
          />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchRow: {
    flexDirection: 'row', padding: 16, gap: 10,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#ddd',
    borderRadius: 10, padding: 12, fontSize: 15,
  },
  searchBtn: {
    backgroundColor: '#FF6B6B', borderRadius: 10,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '600' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#4ECDC4', justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  email: { fontSize: 13, color: '#999' },
  addBtn: {
    backgroundColor: '#FF6B6B', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  statusFriend: { color: '#4ECDC4', fontWeight: '600', fontSize: 13 },
  statusPending: { color: '#bbb', fontWeight: '500', fontSize: 13 },
  noResults: { textAlign: 'center', color: '#bbb', marginTop: 48, fontSize: 15 },
});
