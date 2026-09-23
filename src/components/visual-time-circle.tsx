import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

interface VisualTimeCircleProps {
  totalDuration: number;
  remainingDuration: number;
  size?: number;
  label?: string;
  color?: string;
}

/** Presentation only: interpolate supplied fractions, never run a task clock.
 * The missing sector sweeps clockwise from 12 o'clock. The remaining sector
 * ends at 12 o'clock, so half remaining fills the LEFT half of the disc.
 */
export function VisualTimeCircle({ totalDuration, remainingDuration, size = 240,
  label = 'Time remaining', color = '#28A17C' }: VisualTimeCircleProps) {
  const target = totalDuration > 0 && Number.isFinite(totalDuration) && Number.isFinite(remainingDuration)
    ? Math.max(0, Math.min(1, remainingDuration / totalDuration)) : 0;
  const animated = useRef(new Animated.Value(target)).current;
  const [fraction, setFraction] = useState(target);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    const listener = animated.addListener(({ value }) => setFraction(value));
    return () => animated.removeListener(listener);
  }, [animated]);
  useEffect(() => {
    // Match the parent's 500ms refresh with a continuous sweep; no ticking or bounce.
    // Empty is immediate, so an expired estimate never retains a sliver of color.
    if (reduceMotion || target === 0) { animated.setValue(target); return; }
    const animation = Animated.timing(animated, {
      toValue: target, duration: 500, easing: Easing.linear, useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [animated, target, reduceMotion]);

  const progress = Math.max(0, Math.min(1, fraction));
  const angle = (1 - progress) * Math.PI * 2 - Math.PI / 2;
  const x = 50 + 48 * Math.cos(angle);
  const y = 50 + 48 * Math.sin(angle);
  const sector = `M 50 50 L ${x} ${y} A 48 48 0 ${progress > 0.5 ? 1 : 0} 1 50 2 Z`;
  return <View accessibilityRole="progressbar" accessibilityLabel={label}
    accessibilityValue={{ min: 0, max: 100, now: Math.round(target * 100) }}
    aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(target * 100)}
    style={{ width: size, maxWidth: '100%', aspectRatio: 1, alignSelf: 'center' }}>
    <Svg width="100%" height="100%" viewBox="0 0 100 100" accessible={false}>
      <Circle cx={50} cy={50} r={48} fill="#E7E5DA" />
      {progress >= 1 ? <Circle cx={50} cy={50} r={48} fill={color} />
        : progress > 0 ? <Path d={sector} fill={color} /> : null}
    </Svg>
  </View>;
}
