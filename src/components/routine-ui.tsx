import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export const palette = { ink: '#293E37', muted: '#626E64', paper: '#F8F5ED', card: '#FFFEFA',
  green: '#18765D', mint: '#D5F1E2', peach: '#FFE2CE', line: '#DDDCD0' };

const taskColors = [
  { background: '#DCEEFF', accent: '#3982C4' },
  { background: '#EAE1FA', accent: '#9164BF' },
  { background: '#D6F0EB', accent: '#288F83' },
  { background: '#FFF0C5', accent: '#CE942F' },
  { background: '#FFE0D6', accent: '#CB795C' },
];
export const childColors = [
  { id: 'blue', name: 'Blue', background: '#DCEEFF', accent: '#245C89' },
  { id: 'purple', name: 'Purple', background: '#EAE1FA', accent: '#71459B' },
  { id: 'green', name: 'Green', background: '#D5F1E2', accent: '#18765D' },
  { id: 'orange', name: 'Orange', background: '#FFE2CE', accent: '#934719' },
  { id: 'pink', name: 'Pink', background: '#FADDE8', accent: '#943D61' },
];
export function childColor(color: string | undefined, index: number) {
  return childColors.find(item => item.id === color) ?? childColors[Math.max(0, index) % childColors.length];
}
export function taskColor(index: number) { return taskColors[Math.max(0, index) % taskColors.length]; }
export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper },
  content: { width: '100%', maxWidth: 1140, alignSelf: 'center', padding: 22, paddingBottom: 48, gap: 24 },
  heading: { fontSize: 34, fontWeight: '700', color: palette.ink, letterSpacing: -1 },
  subheading: { fontSize: 23, fontWeight: '600', color: palette.ink },
  body: { fontSize: 17, lineHeight: 25, color: palette.muted },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 2, color: palette.muted },
  card: { backgroundColor: palette.card, padding: 22, borderRadius: 26, gap: 18, borderWidth: 1, borderColor: palette.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  input: { backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, minHeight: 56, fontSize: 22, color: palette.ink },
  centered: { textAlign: 'center' },
});
export function Button({ title, onPress, secondary = false, disabled = false, label }: {
  title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; label?: string;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label ?? title}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ minHeight: secondary ? 54 : 76, borderRadius: 20, padding: 16,
      alignItems: 'center', justifyContent: 'center', backgroundColor: secondary ? palette.mint : palette.green,
      opacity: disabled ? 0.4 : pressed ? 0.75 : 1 })}>
    <Text style={{ fontSize: secondary ? 17 : 24, fontWeight: '700', color: secondary ? palette.ink : '#FFFDF5', textAlign: 'center' }}>{title}</Text>
  </Pressable>;
}
export function TaskIcon({ icon, size = 52 }: { icon: string; size?: number }) {
  if (icon !== 'comb') return <Text accessible={false} style={{ fontSize: size, lineHeight: size * 1.3 }}>{icon}</Text>;
  return <View accessible={false} style={{ width: size * 1.2, height: size * 1.3, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-25deg' }] }}>
    <View style={{ width: size, height: size * 0.17, borderRadius: 5, backgroundColor: '#A36843' }} />
    <View style={{ flexDirection: 'row', gap: size * 0.065 }}>
      {Array.from({ length: 8 }, (_, i) => <View key={i} style={{ width: size * 0.055, height: size * 0.38, backgroundColor: '#A36843', borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }} />)}
    </View>
  </View>;
}
export function Card({ children }: { children: ReactNode }) { return <View style={ui.card}>{children}</View>; }
