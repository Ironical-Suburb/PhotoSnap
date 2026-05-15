import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/types';
import { C } from '../theme';

type Nav = NativeStackNavigationProp<AppStackParamList>;

type TabDef = { label: string; icon: string; iconActive: string };

const TABS: TabDef[] = [
  { label: 'Feed',    icon: 'home-outline',          iconActive: 'home' },
  { label: 'Inbox',   icon: 'mail-outline',           iconActive: 'mail' },
  { label: 'People',  icon: 'people-outline',         iconActive: 'people' },
  { label: 'Me',      icon: 'person-circle-outline',  iconActive: 'person-circle' },
];

export default function TabBar({
  currentPage = -1,
  onTabPress,
  challengeCount = 0,
}: {
  currentPage?: number;
  onTabPress?: (page: number) => void;
  challengeCount?: number;
}) {
  const navigation = useNavigation<Nav>();
  const handleTabPress = onTabPress ?? ((_page: number) => navigation.navigate('MainTabs'));

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {TABS.slice(0, 2).map((tab, i) => {
          const active = currentPage === i;
          return (
            <TouchableOpacity key={tab.label} style={styles.tab} onPress={() => handleTabPress(i)} activeOpacity={0.7}>
              <View style={styles.iconWrap}>
                <Ionicons
                  name={(active ? tab.iconActive : tab.icon) as any}
                  size={23}
                  color={active ? C.primary : C.text3}
                />
                {i === 1 && challengeCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{challengeCount > 9 ? '9+' : challengeCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Upload action button — navigates to stack screen, not a pager page */}
        <TouchableOpacity
          style={styles.snapWrap}
          onPress={() => navigation.navigate('Upload')}
          activeOpacity={0.85}
        >
          <View style={styles.snapBtn}>
            <Ionicons name="camera" size={22} color={C.white} />
          </View>
        </TouchableOpacity>

        {TABS.slice(2).map((tab, i) => {
          const pageIndex = i + 2;
          const active = currentPage === pageIndex;
          return (
            <TouchableOpacity key={tab.label} style={styles.tab} onPress={() => handleTabPress(pageIndex)} activeOpacity={0.7}>
              <View style={styles.iconWrap}>
                <Ionicons
                  name={(active ? tab.iconActive : tab.icon) as any}
                  size={23}
                  color={active ? C.primary : C.text3}
                />
              </View>
              <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: C.surface,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : 6,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 6,
  },
  iconWrap: { position: 'relative' },
  label: { fontSize: 10, fontWeight: '500', color: C.text3, letterSpacing: 0.2 },
  labelActive: { color: C.primary, fontWeight: '700' },
  snapWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  snapBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 6,
  },
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: C.error, borderRadius: 8,
    minWidth: 16, height: 16,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: C.white, fontSize: 9, fontWeight: '800' },
});
