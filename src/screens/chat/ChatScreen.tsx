import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { sendPushNotification } from '../../lib/notifications';
import type { AppStackParamList } from '../../navigation/types';
import { C, R } from '../../theme';

type ChatRoute = RouteProp<AppStackParamList, 'Chat'>;

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

export default function ChatScreen() {
  const route = useRoute<ChatRoute>();
  const navigation = useNavigation();
  const { friendId, friendName } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [friendPushToken, setFriendPushToken] = useState<string | null>(null);
  const [myDisplayName, setMyDisplayName] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [{ data: msgs }, { data: friendProfile }, { data: myProfile }] = await Promise.all([
      supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true }),
      supabase.from('users').select('push_token').eq('id', friendId).single(),
      supabase.from('users').select('display_name').eq('id', user.id).single(),
    ]);

    setMessages((msgs as Message[]) ?? []);
    setFriendPushToken(friendProfile?.push_token ?? null);
    setMyDisplayName(myProfile?.display_name ?? '');
    setLoading(false);

    // Mark incoming messages as read
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender_id', friendId)
      .eq('receiver_id', user.id)
      .is('read_at', null);

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat_${[user.id, friendId].sort().join('_')}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, (payload) => {
        const msg = payload.new as Message;
        if (msg.sender_id === friendId) {
          setMessages((prev) => [...prev, msg]);
          supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || !userId) return;
    setInput('');

    const { data: msg } = await supabase
      .from('messages')
      .insert({ sender_id: userId, receiver_id: friendId, content: text })
      .select()
      .single();

    if (msg) setMessages((prev) => [...prev, msg as Message]);

    if (friendPushToken) {
      await sendPushNotification(
        friendPushToken,
        myDisplayName || 'New message',
        text,
        { screen: 'Chat', friendId: userId, friendName: myDisplayName }
      );
    }
  }

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isMine = item.sender_id === userId;
    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowTheirs]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
            {item.content}
          </Text>
        </View>
        <Text style={[styles.msgTime, isMine ? styles.msgTimeMine : styles.msgTimeTheirs]}>
          {new Date(item.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </Text>
      </View>
    );
  }, [userId]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{(friendName[0] ?? '?').toUpperCase()}</Text>
          </View>
          <Text style={styles.headerName}>{friendName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <ActivityIndicator color={C.primary} style={{ flex: 1 }} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Say hi to {friendName} 👋</Text>
              </View>
            }
            renderItem={renderMessage}
          />
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Message..."
            placeholderTextColor={C.text3}
            multiline
            maxLength={500}
            selectionColor={C.primary}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!input.trim()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-up" size={18} color={C.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    color: C.white,
    fontWeight: '800',
    fontSize: 15,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
    flexGrow: 1,
  },
  msgRow: {
    maxWidth: '78%',
    gap: 3,
  },
  msgRowMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  msgRowTheirs: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: C.primary,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: C.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextMine: {
    color: C.white,
  },
  bubbleTextTheirs: {
    color: C.text,
  },
  msgTime: {
    fontSize: 10,
    color: C.text3,
    marginHorizontal: 4,
  },
  msgTimeMine: {
    textAlign: 'right',
  },
  msgTimeTheirs: {
    textAlign: 'left',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    color: C.text3,
    fontSize: 15,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    backgroundColor: C.bg,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: C.text,
    maxHeight: 120,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: C.surface2,
    shadowOpacity: 0,
    elevation: 0,
  },
});
