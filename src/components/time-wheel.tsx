import { useEffect, useRef } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { palette, ui } from './routine-ui';

const rowHeight = 52;
const digits = (value: number) => String(value).padStart(2, '0');

function Wheel({ label, value, count, onChange }: {
  label: string; value: number; count: number; onChange: (value: number) => void;
}) {
  const scroll = useRef<ScrollView>(null);
  const lastEmitted = useRef(value);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (snapTimer.current) clearTimeout(snapTimer.current); }, []);
  useEffect(() => {
    if (lastEmitted.current !== value) {
      lastEmitted.current = value;
      scroll.current?.scrollTo({ y: value * rowHeight, animated: false });
    }
  }, [value]);
  function select(next: number) {
    const bounded = Math.max(0, Math.min(count - 1, next));
    lastEmitted.current = bounded;
    onChange(bounded);
    scroll.current?.scrollTo({ y: bounded * rowHeight, animated: false });
  }
  return <View style={{ flex: 1, gap: 8 }}>
    <Text style={[ui.label, ui.centered]}>{label}</Text>
    <View accessible accessibilityRole="adjustable" accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: count - 1, now: value, text: digits(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={event => select(value + (event.nativeEvent.actionName === 'increment' ? 1 : -1))}
      style={{ height: rowHeight * 3, overflow: 'hidden', borderRadius: 16, backgroundColor: palette.paper }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: rowHeight, left: 0, right: 0,
        height: rowHeight, backgroundColor: palette.mint, borderRadius: 12 }} />
      <ScrollView ref={scroll} nestedScrollEnabled showsVerticalScrollIndicator={false}
        snapToInterval={rowHeight} decelerationRate="fast" scrollEventThrottle={16}
        onLayout={() => scroll.current?.scrollTo({ y: value * rowHeight, animated: false })}
        onScroll={event => {
          const next = Math.max(0, Math.min(count - 1, Math.round(event.nativeEvent.contentOffset.y / rowHeight)));
          if (next !== lastEmitted.current) { lastEmitted.current = next; onChange(next); }
          // Native scroll views snap themselves; align the web wheel after scrolling stops.
          if (Platform.OS === 'web') {
            if (snapTimer.current) clearTimeout(snapTimer.current);
            snapTimer.current = setTimeout(() => scroll.current?.scrollTo({ y: next * rowHeight, animated: false }), 160);
          }
        }}
        contentContainerStyle={{ paddingVertical: rowHeight }}>
        {Array.from({ length: count }, (_, index) => <Pressable key={index}
          accessibilityRole="button" accessibilityLabel={`${label}: ${digits(index)}`}
          onPress={() => select(index)} style={{ height: rowHeight, justifyContent: 'center' }}>
          <Text style={{ textAlign: 'center', fontSize: 36, lineHeight: 46,
            fontWeight: value === index ? '700' : '400', color: value === index ? palette.ink : palette.muted,
            opacity: value === index ? 1 : 0.5, fontVariant: ['tabular-nums'] }}>{digits(index)}</Text>
        </Pressable>)}
      </ScrollView>
    </View>
  </View>;
}

export function TimeWheel({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const validValue = /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : '08:00';
  const [hours, minutes] = validValue.split(':').map(Number);
  useEffect(() => { if (value !== validValue) onChange(validValue); }, [value, validValue, onChange]);
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
    <Wheel label="Hour" value={hours} count={24} onChange={hour => onChange(`${digits(hour)}:${digits(minutes)}`)} />
    <Text style={{ fontSize: 36, color: palette.ink, paddingTop: 24 }}>:</Text>
    <Wheel label="Minute" value={minutes} count={60} onChange={minute => onChange(`${digits(hours)}:${digits(minute)}`)} />
  </View>;
}
