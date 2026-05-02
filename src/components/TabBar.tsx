import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';

type TabName = 'Home' | 'Challenges' | 'Upload' | 'Friends' | 'Profile';

const TABS: { name: TabName; label: string; icon: string; iconActive: string }[] = [
  { name: 'Home',       label: 'Home',    icon: 'home-outline',          iconActive: 'home' },
  { name: 'Challenges', label: 'Inbox',   icon: 'mail-outline',          iconActive: 'mail' },
  { name: 'Upload',     label: 'Snap',    icon: 'camera',                iconActive: 'camera' },
  { name: 'Friends',    label: 'Friends', icon: 'people-outline',        iconActive: 'people' },
  { name: 'Profile',    label: 'Me',      icon: 'person-circle-outline', iconActive: 'person-circle' },
];

export default function TabBar({ challengeCount = 0 }: { challengeCount?: number }) {
  const navigation = useNavigation();
  const route = useRoute();
  const current = route.name as TabName;

  const goTo = (name: TabName) => {
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name }] })
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {TABS.map((tab) => {
          const active = current === tab.name;
          const isSnap = tab.name === 'Upload';

          if (isSnap) {
            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.snapWrap}
                onPress={() => goTo(tab.name)}
                activeOpacity={0.85}
              >
                <View style={[styles.snapBtn, active && styles.snapBtnActive]}>
                  <Ionicons name="camera" size={22} color={C.white} />
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tab}
              onPress={() => goTo(tab.name)}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={(active ? tab.iconActive : tab.icon) as any}
                  size={23}
                  color={active ? C.primary : C.text3}
                />
                {tab.name === 'Challenges' && challengeCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{challengeCount > 9 ? '9+' : challengeCount}</Text>
                  </View>
                )}
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
  iconWrap: {
    position: 'relative',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: C.text3,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: C.primary,
    fontWeight: '700',
  },
  snapWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  snapBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  snapBtnActive: {
    backgroundColor: '#FF7A45',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: C.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: C.white,
    fontSize: 9,
    fontWeight: '800',
  },
});
