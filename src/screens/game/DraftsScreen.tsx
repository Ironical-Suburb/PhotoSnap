import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { getAllDrafts, deleteDraft, type Draft } from './UploadScreen';
import type { AppStackParamList } from '../../navigation/types';
import { C, R } from '../../theme';

export default function DraftsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useFocusEffect(
    useCallback(() => {
      getAllDrafts().then(setDrafts);
    }, [])
  );

  function openDraft(draft: Draft) {
    navigation.navigate('Upload', { draftId: draft.id });
  }

  function confirmDelete(draft: Draft) {
    Alert.alert('Delete draft?', 'This draft will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteDraft(draft.id);
          setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <FlatList
        data={drafts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={drafts.length === 0 ? styles.emptyContainer : styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openDraft(item)} activeOpacity={0.8}>
            {item.imageUri ? (
              <Image source={{ uri: item.imageUri }} style={styles.thumb} resizeMode="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbEmpty]}>
                <Ionicons name="image-outline" size={24} color={C.text3} />
              </View>
            )}
            <View style={styles.cardInfo}>
              <Text style={styles.cardDate}>
                {new Date(item.actualDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
              {item.caption ? (
                <Text style={styles.cardCaption} numberOfLines={1}>"{item.caption}"</Text>
              ) : (
                <Text style={styles.cardCaption} numberOfLines={1}>No caption</Text>
              )}
              {item.friendName ? (
                <Text style={styles.cardFriend}>To {item.friendName}</Text>
              ) : (
                <Text style={styles.cardFriendEmpty}>No friend selected</Text>
              )}
              <Text style={styles.cardSaved}>
                Saved {new Date(item.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openDraft(item)}>
                <Ionicons name="pencil" size={15} color={C.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item)}>
                <Ionicons name="trash-outline" size={15} color={C.error} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-outline" size={48} color={C.text3} />
            <Text style={styles.emptyTitle}>No drafts</Text>
            <Text style={styles.emptySub}>Drafts are auto-saved as you compose a challenge.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 0.5,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: R.sm,
  },
  thumbEmpty: {
    backgroundColor: C.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardDate: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  cardCaption: {
    fontSize: 12,
    color: C.text2,
    fontStyle: 'italic',
  },
  cardFriend: {
    fontSize: 12,
    color: C.primary,
    fontWeight: '600',
  },
  cardFriendEmpty: {
    fontSize: 12,
    color: C.text3,
  },
  cardSaved: {
    fontSize: 10,
    color: C.text3,
    marginTop: 2,
  },
  cardActions: {
    gap: 8,
    alignItems: 'center',
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,69,58,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text2,
  },
  emptySub: {
    fontSize: 14,
    color: C.text3,
    textAlign: 'center',
    lineHeight: 20,
  },
});
