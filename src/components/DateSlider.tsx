import React, { useRef, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { C } from '../theme';

const ITEM_H = 50;
const VISIBLE = 5;
const CONTAINER_H = ITEM_H * VISIBLE;
const PAD = ITEM_H * 2;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CURRENT_YEAR = new Date().getFullYear();

type WheelProps = {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  flex?: number;
};

function Wheel({ items, selectedIndex, onSelect, flex = 1 }: WheelProps) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => {
      ref.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
    }, 80);
  }, []);

  const onScrollEnd = useCallback((e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(Math.round(y / ITEM_H), items.length - 1));
    onSelect(idx);
  }, [items.length, onSelect]);

  return (
    <ScrollView
      ref={ref}
      style={{ flex }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      nestedScrollEnabled={true}
      onMomentumScrollEnd={onScrollEnd}
      onScrollEndDrag={onScrollEnd}
      contentContainerStyle={{ paddingVertical: PAD }}
    >
      {items.map((item, i) => {
        const dist = Math.abs(i - selectedIndex);
        const opacity = dist === 0 ? 1 : dist === 1 ? 0.5 : 0.2;
        const scale = dist === 0 ? 1 : 0.85;
        return (
          <View key={i} style={styles.item}>
            <Text style={[
              styles.itemText,
              dist === 0 && styles.itemTextSelected,
              { opacity, transform: [{ scale }] },
            ]}>
              {item}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

type Props = {
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
};

export default function DateSlider({ value, onChange, maximumDate }: Props) {
  const maxYear = (maximumDate ?? new Date()).getFullYear();
  const years = Array.from({ length: maxYear - 1949 }, (_, i) => String(1950 + i));

  const year = value.getFullYear();
  const month = value.getMonth();
  const day = value.getDate();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));

  const yearIdx = Math.max(0, years.indexOf(String(year)));
  const monthIdx = month;
  const dayIdx = Math.min(day - 1, daysInMonth - 1);

  function update(y: number, m: number, d: number) {
    const maxDay = new Date(y, m + 1, 0).getDate();
    const safeDay = Math.min(d, maxDay);
    const next = new Date(y, m, safeDay);
    if (maximumDate && next > maximumDate) return;
    onChange(next);
  }

  return (
    <View style={styles.root}>
      {/* column labels */}
      <View style={styles.labels} pointerEvents="none">
        <Text style={[styles.label, { flex: 1 }]}>DD</Text>
        <Text style={[styles.label, { flex: 1.4 }]}>MMM</Text>
        <Text style={[styles.label, { flex: 1.5 }]}>YYYY</Text>
      </View>

      <View style={styles.wheelRow}>
        <Wheel
          items={days}
          selectedIndex={dayIdx}
          onSelect={(i) => update(year, month, i + 1)}
          flex={1}
        />
        <View style={styles.separator} />
        <Wheel
          items={MONTHS}
          selectedIndex={monthIdx}
          onSelect={(i) => update(year, i, day)}
          flex={1.4}
        />
        <View style={styles.separator} />
        <Wheel
          items={years}
          selectedIndex={yearIdx}
          onSelect={(i) => update(parseInt(years[i]), month, day)}
          flex={1.5}
        />
      </View>

      {/* selection indicator */}
      <View style={styles.selectionTop} pointerEvents="none" />
      <View style={styles.selectionBottom} pointerEvents="none" />

      {/* fade overlays */}
      <View style={[styles.fade, styles.fadeTop]} pointerEvents="none" />
      <View style={[styles.fade, styles.fadeBottom]} pointerEvents="none" />
    </View>
  );
}

const LABEL_H = 24;

const styles = StyleSheet.create({
  root: {
    height: CONTAINER_H + LABEL_H,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: C.border,
    overflow: 'hidden',
  },
  labels: {
    height: LABEL_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    color: C.text3,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  wheelRow: {
    flexDirection: 'row',
    height: CONTAINER_H,
  },
  separator: {
    width: 0.5,
    backgroundColor: C.border,
    marginVertical: 8,
  },
  item: {
    height: ITEM_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 17,
    color: C.text2,
    fontWeight: '500',
  },
  itemTextSelected: {
    fontSize: 20,
    color: C.text,
    fontWeight: '700',
  },
  selectionTop: {
    position: 'absolute',
    top: LABEL_H + PAD,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: C.primary,
    opacity: 0.6,
  },
  selectionBottom: {
    position: 'absolute',
    top: LABEL_H + PAD + ITEM_H,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: C.primary,
    opacity: 0.6,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: PAD,
  },
  fadeTop: {
    top: LABEL_H,
    backgroundColor: C.surface,
    opacity: 0.55,
  },
  fadeBottom: {
    bottom: 0,
    backgroundColor: C.surface,
    opacity: 0.55,
  },
});
