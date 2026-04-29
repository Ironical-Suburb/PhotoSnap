import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import type { AppStackParamList } from '../../navigation/types';
import type { User } from '../../types';

type FriendRow = {
  id: string;
  other_user: User;
};

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
    if (!user) return;

    const { data } = await supabase
      .from('friendships')
      .select('id, sender_id, receiver_id, users!friendships_sender_id_fkey(id, display_name, avatar_url), users!friendships_receiver_id_fkey(id, display_name, avatar_url)')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (data) {
      setFriends(
        data.map((row: any) => ({
          id: row.id,
          other_user: row.sender_id === user.id
            ? row['users!friendships_receiver_id_fkey']
            : row['users!friendships_sender_id_fkey'],
        }))
      );
    }

    const { count } = await supabase
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('status', 'pending');

    setPendingCount(count ?? 0);
    setLoading(false);
  }

  async function removeFriend(friendshipId: string, name: string) {
    Alert.alert('Remove Friend', `Remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          await supabase.from('friendships').delete().eq('id', friendshipId);
          fetchFriends();
        },
      },
    ]);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.requestsBtn}
            onPress={() => navigation.navigate('FriendRequests')}
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
          >
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('FriendStats', {
              friendId: item.other_user.id,
              friendName: item.other_user.display_name,
            })}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.other_user.display_name[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.other_user.display_name}</Text>
              <Text style={styles.hint}>Tap to view head-to-head stats</Text>
            </View>
            <TouchableOpacity onPress={() => removeFriend(item.id, item.other_user.display_name)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No friends yet</Text>
            <TouchableOpacity onPress={() => navigation.navigate('FriendSearch')}>
              <Text style={styles.emptyAction}>Find people to add →</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 24, paddingBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8 },
  requestsBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  requestsBtnText: { fontSize: 14, fontWeight: '600', color: '#444' },
  badge: {
    backgroundColor: '#FF6B6B', borderRadius: 10,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
    marginLeft: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  addBtn: {
    backgroundColor: '#FF6B6B', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#4ECDC4', justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '500' },
  hint: { fontSize: 12, color: '#bbb', marginTop: 2 },
  removeText: { fontSize: 14, color: '#ddd' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#bbb', marginBottom: 12 },
  emptyAction: { color: '#FF6B6B', fontSize: 15, fontWeight: '600' },
});
