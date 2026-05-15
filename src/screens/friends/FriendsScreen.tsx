import React, { useCallback, useState } from 'react';
import {
  View, Text, Image, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import type { AppStackParamList } from '../../navigation/types';
import type { User } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { C, R } from '../../theme';

type Tab = 'followers' | 'following';
type PersonRow = { user: User; isFollowing: boolean };

const AVATAR_COLORS = [C.primary, '#5E5CE6', '#32D74B', '#64D2FF', '#FF375F', '#FF9F0A'];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function FriendsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, 'Friends'>>();
  const initialTab: Tab = route.params?.initialTab ?? 'followers';

  const [tab, setTab] = useState<Tab>(initialTab);
  const [followers, setFollowers] = useState<PersonRow[]>([]);
  const [following, setFollowing] = useState<PersonRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [])
  );

  async function fetchAll() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setCurrentUserId(user.id);

    const [
      { data: followerRows },
      { data: followingRows },
      { count },
    ] = await Promise.all([
      supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id)
        .eq('status', 'active'),
      supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .eq('status', 'active'),
      supabase
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('following_id', user.id)
        .eq('status', 'pending'),
    ]);

    setPendingCount(count ?? 0);

    const followerIds = (followerRows ?? []).map((r) => r.follower_id);
    const followingIds = (followingRows ?? []).map((r) => r.following_id);
    const allIds = Array.from(new Set([...followerIds, ...followingIds]));

    if (allIds.length === 0) {
      setFollowers([]);
      setFollowing([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from('users')
      .select('id, display_name, avatar_url, email, created_at, is_private')
      .in('id', allIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p as User]));
    const followingSet = new Set(followingIds);

    setFollowers(
      followerIds
        .map((id) => profileMap.get(id))
        .filter((u): u is User => !!u)
        .map((u) => ({ user: u, isFollowing: followingSet.has(u.id) }))
    );
    setFollowing(
      followingIds
        .map((id) => profileMap.get(id))
        .filter((u): u is User => !!u)
        .map((u) => ({ user: u, isFollowing: true })),
    );
    setLoading(false);
  }

  async function unfollow(targetId: string, name: string) {
    Alert.alert('Unfollow', `Unfollow ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unfollow', style: 'destructive', onPress: async () => {
          await supabase
            .from('follows')
            .delete()
            .eq('follower_id', currentUserId)
            .eq('following_id', targetId);
          fetchAll();
        },
      },
    ]);
  }

  async function removeFollower(followerId: string, name: string) {
    Alert.alert('Remove follower', `Remove ${name} from your followers?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          await supabase
            .from('follows')
            .delete()
            .eq('follower_id', followerId)
            .eq('following_id', currentUserId);
          fetchAll();
        },
      },
    ]);
  }

  async function followBack(targetId: string) {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: currentUserId, following_id: targetId });
    if (error) { Alert.alert('Error', error.message); return; }
    fetchAll();
  }

  async function startDuel(opponentId: string) {
    const { data, error } = await supabase
      .from('duels')
      .insert({ challenger_id: currentUserId, opponent_id: opponentId })
      .select('id')
      .single();
    if (error || !data) { Alert.alert('Error', 'Could not start duel'); return; }
    navigation.navigate('Duel', { duelId: data.id });
  }

  const data = tab === 'followers' ? followers : following;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <Text style={styles.title}>People</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.requestsBtn}
            onPress={() => navigation.navigate('FriendRequests')}
            activeOpacity={0.8}
          >
            <Text style={styles.requestsBtnText}>Requests</Text>
            {pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('FriendSearch')}
            activeOpacity={0.85}
          >
            <Text style={styles.addBtnText}>+ Find</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'followers' && styles.tabActive]}
          onPress={() => setTab('followers')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, tab === 'followers' && styles.tabTextActive]}>
            {followers.length} Followers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'following' && styles.tabActive]}
          onPress={() => setTab('following')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, tab === 'following' && styles.tabTextActive]}>
            {following.length} Following
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.user.id}
          contentContainerStyle={data.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('FriendStats', {
                friendId: item.user.id,
                friendName: item.user.display_name,
              })}
              activeOpacity={0.85}
            >
              <View style={[styles.avatarWrap, { backgroundColor: avatarColor(item.user.display_name) }]}>
                {item.user.avatar_url ? (
                  <Image source={{ uri: item.user.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>
                    {(item.user.display_name?.[0] ?? '?').toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.user.display_name}</Text>
                <Text style={styles.hint}>
                  {tab === 'followers'
                    ? (item.isFollowing ? 'You follow each other' : 'Follows you')
                    : 'You follow them'}
                </Text>
              </View>
              <View style={styles.rowActions}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => navigation.navigate('Chat', {
                    friendId: item.user.id,
                    friendName: item.user.display_name,
                  })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chatbubble-outline" size={20} color={C.text2} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => startDuel(item.user.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ fontSize: 18 }}>⚔️</Text>
                </TouchableOpacity>
                {tab === 'followers' && !item.isFollowing && (
                  <TouchableOpacity
                    style={styles.followBackBtn}
                    onPress={() => followBack(item.user.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.followBackText}>Follow back</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => tab === 'following'
                    ? unfollow(item.user.id, item.user.display_name)
                    : removeFollower(item.user.id, item.user.display_name)
                  }
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close-circle" size={20} color={C.text3} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {tab === 'followers' ? 'No followers yet' : 'Not following anyone'}
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('FriendSearch')}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyBtnText}>Find people to follow</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  requestsBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 0.5, borderColor: C.border, borderRadius: R.full,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: C.surface,
  },
  requestsBtnText: { fontSize: 13, fontWeight: '600', color: C.text2 },
  badge: {
    backgroundColor: C.error, borderRadius: R.full,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
    marginLeft: 6, paddingHorizontal: 4,
  },
  badgeText: { color: C.white, fontSize: 10, fontWeight: '800' },
  addBtn: {
    backgroundColor: C.primary, borderRadius: R.full,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  addBtnText: { color: C.white, fontWeight: '700', fontSize: 13 },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: C.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: C.text3 },
  tabTextActive: { color: C.text, fontWeight: '700' },

  listContent: { paddingBottom: 90 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingBottom: 90 },

  row: {
    paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  avatarWrap: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  avatarImage: { width: 52, height: 52, borderRadius: 26 },
  avatarText: { color: C.white, fontWeight: '800', fontSize: 20 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '700', color: C.text },
  hint: { fontSize: 12, color: C.text3 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { padding: 2 },
  followBackBtn: {
    backgroundColor: C.primary, borderRadius: R.full,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  followBackText: { color: C.white, fontWeight: '700', fontSize: 12 },

  empty: { alignItems: 'center', gap: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.text2 },
  emptyBtn: {
    backgroundColor: C.primary, borderRadius: R.full,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  emptyBtnText: { color: C.white, fontWeight: '700', fontSize: 14 },
});
