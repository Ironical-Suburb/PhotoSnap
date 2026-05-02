import React, { useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import type { User } from '../../types';
import { C, R } from '../../theme';

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
      setResults((prev) =>
        prev.map((r) => r.id === targetId ? { ...r, friendshipStatus: 'pending_sent' } : r)
      );
    }
  }

  function StatusChip({ item }: { item: SearchResult }) {
    switch (item.friendshipStatus) {
      case 'accepted':
        return <View style={[styles.chip, styles.chipFriend]}><Text style={styles.chipTextFriend}>Friends</Text></View>;
      case 'pending_sent':
        return <View style={[styles.chip, styles.chipPending]}><Text style={styles.chipTextPending}>Sent</Text></View>;
      case 'pending_received':
        return <View style={[styles.chip, styles.chipPending]}><Text style={styles.chipTextPending}>Wants to add you</Text></View>;
      default:
        return (
          <TouchableOpacity
            style={[styles.chip, styles.chipAdd]}
            onPress={() => sendRequest(item.id, item.display_name)}
            activeOpacity={0.85}
          >
            <Text style={styles.chipTextAdd}>+ Add</Text>
          </TouchableOpacity>
        );
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <Text style={styles.title}>Find Friends</Text>
      </View>

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by display name..."
          placeholderTextColor={C.text3}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          returnKeyType="search"
          autoFocus
          selectionColor={C.primary}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={search} style={styles.searchBtn}>
            <Text style={styles.searchBtnText}>Go</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, index) => item.id ?? String(index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.display_name?.[0] ?? '?').toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.display_name}</Text>
                <Text style={styles.email}>{item.email}</Text>
              </View>
              <StatusChip item={item} />
            </View>
          )}
          ListEmptyComponent={
            query.length > 0 ? (
              <Text style={styles.noResults}>No users found for "{query}"</Text>
            ) : null
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
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingHorizontal: 14,
    borderWidth: 0.5,
    borderColor: C.border,
    marginBottom: 8,
  },
  searchIcon: {
    fontSize: 18,
    color: C.text3,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: C.text,
  },
  searchBtn: {
    backgroundColor: C.primary,
    borderRadius: R.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchBtnText: {
    color: C.white,
    fontWeight: '700',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  row: {
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
  chip: {
    borderRadius: R.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipAdd: {
    backgroundColor: C.primary,
  },
  chipTextAdd: {
    color: C.white,
    fontWeight: '700',
    fontSize: 13,
  },
  chipFriend: {
    backgroundColor: 'rgba(50,215,75,0.12)',
  },
  chipTextFriend: {
    color: C.success,
    fontWeight: '600',
    fontSize: 13,
  },
  chipPending: {
    backgroundColor: C.surface2,
  },
  chipTextPending: {
    color: C.text3,
    fontWeight: '500',
    fontSize: 12,
  },
  noResults: {
    textAlign: 'center',
    color: C.text3,
    marginTop: 48,
    fontSize: 15,
  },
});
