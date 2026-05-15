import React, { useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import type { User } from '../../types';
import { C, R } from '../../theme';

type FollowState = 'none' | 'following' | 'requested';
type SearchResult = User & { followState: FollowState };

export default function FriendSearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  async function search() {
    if (query.trim().length < 2) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: users } = await supabase
      .from('users')
      .select('id, display_name, email, avatar_url, created_at, is_private')
      .ilike('display_name', `%${query.trim()}%`)
      .neq('id', user.id)
      .limit(20);

    if (!users?.length) { setResults([]); setLoading(false); return; }

    const ids = users.map((u) => u.id);
    const { data: existing } = await supabase
      .from('follows')
      .select('following_id, status')
      .eq('follower_id', user.id)
      .in('following_id', ids);

    const stateMap = new Map<string, FollowState>();
    for (const f of existing ?? []) {
      stateMap.set(f.following_id, f.status === 'active' ? 'following' : 'requested');
    }

    setResults(users.map((u) => ({ ...(u as User), followState: stateMap.get(u.id) ?? 'none' })));
    setLoading(false);
  }

  async function followUser(target: SearchResult) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setActingId(target.id);

    const { error } = await supabase.from('follows').insert({
      follower_id: user.id,
      following_id: target.id,
    });

    setActingId(null);

    if (error) { Alert.alert('Error', error.message); return; }

    // Trigger sets pending automatically for private accounts.
    const nextState: FollowState = target.is_private ? 'requested' : 'following';
    setResults((prev) =>
      prev.map((r) => r.id === target.id ? { ...r, followState: nextState } : r)
    );
  }

  async function unfollowUser(target: SearchResult) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setActingId(target.id);
    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', target.id);
    setActingId(null);
    setResults((prev) =>
      prev.map((r) => r.id === target.id ? { ...r, followState: 'none' } : r)
    );
  }

  function FollowButton({ item }: { item: SearchResult }) {
    const busy = actingId === item.id;
    if (item.followState === 'following') {
      return (
        <TouchableOpacity
          style={[styles.chip, styles.chipFollowing]}
          onPress={() => unfollowUser(item)}
          disabled={busy}
          activeOpacity={0.85}
        >
          <Text style={styles.chipTextFollowing}>{busy ? '...' : 'Following'}</Text>
        </TouchableOpacity>
      );
    }
    if (item.followState === 'requested') {
      return (
        <TouchableOpacity
          style={[styles.chip, styles.chipRequested]}
          onPress={() => unfollowUser(item)}
          disabled={busy}
          activeOpacity={0.85}
        >
          <Text style={styles.chipTextRequested}>{busy ? '...' : 'Requested'}</Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={[styles.chip, styles.chipFollow]}
        onPress={() => followUser(item)}
        disabled={busy}
        activeOpacity={0.85}
      >
        <Text style={styles.chipTextFollow}>{busy ? '...' : 'Follow'}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <Text style={styles.title}>Find People</Text>
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
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatar}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarText}>
                    {(item.display_name?.[0] ?? '?').toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{item.display_name}</Text>
                  {item.is_private && (
                    <Ionicons name="lock-closed" size={11} color={C.text3} />
                  )}
                </View>
                <Text style={styles.email}>{item.email}</Text>
              </View>
              <FollowButton item={item} />
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
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 8,
    backgroundColor: C.surface, borderRadius: R.lg,
    paddingHorizontal: 14,
    borderWidth: 0.5, borderColor: C.border,
  },
  searchIcon: { fontSize: 18, color: C.text3, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: C.text },
  searchBtn: { backgroundColor: C.primary, borderRadius: R.sm, paddingHorizontal: 12, paddingVertical: 6 },
  searchBtnText: { color: C.white, fontWeight: '700', fontSize: 13 },

  listContent: { paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
  row: {
    backgroundColor: C.surface, borderRadius: R.lg, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 0.5, borderColor: C.border,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { color: C.white, fontWeight: '800', fontSize: 17 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '600', color: C.text },
  email: { fontSize: 12, color: C.text3, marginTop: 2 },

  chip: { borderRadius: R.full, paddingHorizontal: 14, paddingVertical: 7, minWidth: 92, alignItems: 'center' },
  chipFollow: { backgroundColor: C.primary },
  chipTextFollow: { color: C.white, fontWeight: '700', fontSize: 13 },
  chipFollowing: { backgroundColor: C.surface2, borderWidth: 0.5, borderColor: C.border },
  chipTextFollowing: { color: C.text2, fontWeight: '600', fontSize: 13 },
  chipRequested: { backgroundColor: C.surface2 },
  chipTextRequested: { color: C.text3, fontWeight: '500', fontSize: 12 },

  noResults: { textAlign: 'center', color: C.text3, marginTop: 48, fontSize: 15 },
});
