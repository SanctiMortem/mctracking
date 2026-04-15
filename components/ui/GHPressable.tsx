/**
 * GHPressable — drop-in Pressable replacement using react-native-gesture-handler.
 *
 * Unlike RN's built-in Pressable, RNGH gestures are handled on the native
 * thread and support **simultaneous multi-touch** across different components.
 * This lets two players tap their own +/- buttons at the same time.
 */
import { type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface GHPressableProps {
  onPress?: () => void;
  onLongPress?: () => void;
  onPressOut?: () => void;
  delayLongPress?: number;
  disabled?: boolean;
  hitSlop?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  accessibilityRole?: string;
  accessibilityLabel?: string;
}

export function GHPressable({
  onPress,
  onLongPress,
  onPressOut,
  delayLongPress = 500,
  disabled = false,
  hitSlop,
  style,
  children,
  accessibilityRole,
  accessibilityLabel,
}: GHPressableProps) {
  const opacity = useSharedValue(1);

  const tap = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      'worklet';
      opacity.value = 0.5;
    })
    .onEnd((_e, success) => {
      'worklet';
      if (success && onPress) {
        runOnJS(onPress)();
      }
    })
    .onFinalize(() => {
      'worklet';
      opacity.value = withTiming(1, { duration: 60 });
      if (onPressOut) runOnJS(onPressOut)();
    });

  const longPress = Gesture.LongPress()
    .enabled(!disabled && !!onLongPress)
    .minDuration(delayLongPress)
    .onStart(() => {
      'worklet';
      if (onLongPress) runOnJS(onLongPress)();
    })
    .onFinalize(() => {
      'worklet';
      opacity.value = withTiming(1, { duration: 60 });
      if (onPressOut) runOnJS(onPressOut)();
    });

  // Race: long press wins if held long enough, otherwise tap fires
  const composed = onLongPress
    ? Gesture.Race(longPress, tap)
    : tap;

  if (hitSlop != null) {
    composed.hitSlop({ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop });
  }

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[style, animStyle]}
        accessible
        accessibilityRole={accessibilityRole as any}
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
