import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native';
import { palette } from './routine-ui';

export function CompletionCheck({ label }: { label: string }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let reducedMotion = false;
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { reducedMotion = value; }).catch(() => {});
    AccessibilityInfo.announceForAccessibility(label);
    const timer = setTimeout(() => {
      if (reducedMotion) { setVisible(false); return; }
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true })
        .start(() => { if (mounted) setVisible(false); });
    }, 1000);
    return () => { mounted = false; clearTimeout(timer); opacity.stopAnimation(); };
  }, [label, opacity]);
  if (!visible) return null;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill,
    { alignItems: 'center', justifyContent: 'center' }]}>
    <Animated.View style={{ opacity, width: 150, height: 150, borderRadius: 75,
      backgroundColor: palette.green, alignItems: 'center', justifyContent: 'center' }}>
      <Text accessible={false} style={{ color: 'white', fontSize: 108, fontWeight: '700' }}>✓</Text>
    </Animated.View>
  </View>;
}
