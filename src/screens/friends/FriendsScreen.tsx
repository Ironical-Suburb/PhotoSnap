import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import type { AppStackParamList } from '../../navigation/types';
import type { User } from '../../types';
import TabBar from '../../components/TabBar';
import { Ionicons } from '@expo/vector-icons';
import { C, R } from '../../theme';

type FriendRow = {
  id: string;
  other_user: User;
};

const AVATAR_COLORS = [C.primary, '#5E5CE6', '#32D74B', '#64D2FF', '#FF375F', '#FF9F0A'];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function FriendsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchFriends();
    }, [])
  );

  async function fetchFriends() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [{ data: friendships }, { count }] = await Promise.all([
      supabase
        .from('friendships')
        .select('id, sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
      supabase
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending'),
    ]);

    setPendingCount(count ?? 0);

    if (friendships?.length) {
      const otherIds = friendships.map((f) =>
        f.sender_id === user.id ? f.receiver_id : f.sender_id
      );
      const { data: profiles } = await supabase
        .from('users')
        .select('id, display_name, avatar_url, email, created_at, push_token')
        .in('id', otherIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      setFriends(
        friendships
          .map((f) => {
            const otherId = f.sender_id === user.id ? f.receiver_id : f.sender_id;
            return { id: f.id, other_user: profileMap.get(otherId) as User };
          })
          .filter((f) => f.other_user != null)
      );
    } else {
      setFriends([]);
    }

    setLoading(false);
  }

  async function removeFriend(friendshipId: string, name: string) {
    Alert.alert('Remove Friend', `Remove ${name} from your friends?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          await supabase.from('friendships').delete().eq('id', friendshipId);
          fetchFriends();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
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
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item, index) => item.id ?? String(index)}
          contentContainerStyle={friends.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('FriendStats', {
                friendId: item.other_user.id,
                friendName: item.other_user.display_name,
              })}
              activeOpacity={0.8}
            >
              <View style={[styles.avatar, { backgroundColor: avatarColor(item.other_user.display_name) }]}>
                <Text style={styles.avatarText}>
                  {(item.other_user.display_name?.[0] ?? '?').toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.other_user.display_name}</Text>
                <Text style={styles.hint}>Tap to view stats</Text>
              </View>
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() => navigation.navigate('Chat', {
                  friendId: item.other_user.id,
                  friendName: item.other_user.display_name,
                })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chatbubble-outline" size={18} color={C.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeFriend(item.id, item.other_user.display_name)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={14} color={C.text3} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No friends yet</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('FriendSearch')}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyBtnText}>Find people to add</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <TabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  requestsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.surface,
  },
  requestsBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text2,
  },
  badge: {
    backgroundColor: C.error,
    borderRadius: R.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '800',
  },
  addBtn: {
    backgroundColor: C.primary,
    borderRadius: R.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addBtnText: {
    color: C.white,
    fontWeight: '700',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  row: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: C.border,
    gap: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
  },
  hint: {
    fontSize: 12,
    color: C.text3,
    marginTop: 2,
  },
  chatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text2,
  },
  emptyBtn: {
    backgroundColor: C.primary,
    borderRadius: R.full,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: {
    color: C.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
