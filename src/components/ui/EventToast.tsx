import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useGameStore, GameEvent } from '../../store/useGameStore';
import { COLORS, BORDER_RADIUS } from '../../styles/theme';

// Background colors per event type
const EVENT_BG: Record<string, string> = {
  'purchase': 'rgba(31, 178, 90, 0.95)',
  'tax': 'rgba(235, 138, 19, 0.95)',
  'jail': 'rgba(225, 2, 20, 0.95)',
  'go-bonus': 'rgba(31, 178, 90, 0.95)',
  'rent': 'rgba(235, 138, 19, 0.95)',
  'info': 'rgba(56, 161, 219, 0.95)',
  'bankruptcy': 'rgba(120, 10, 10, 0.95)',
  'victory': 'rgba(254, 219, 1, 0.95)',
};

const TOAST_DURATION = 2500; // Auto-dismiss after 2.5s

/**
 * EventToast — Animated pill notification for game events.
 * Reads lastEvent from the store and displays it briefly.
 * Automatically hides after TOAST_DURATION ms.
 */
export const EventToast = () => {
  const lastEvent = useGameStore((s) => s.lastEvent);
  const clearEvent = useGameStore((s) => s.clearEvent);

  const progress = useSharedValue(0); // 0 = hidden, 1 = visible

  useEffect(() => {
    if (lastEvent) {
      // Animate in → hold → animate out
      progress.value = withSequence(
        withTiming(1, { duration: 300, easing: Easing.out(Easing.back(1.5)) }),
        withDelay(TOAST_DURATION, withTiming(0, { duration: 250, easing: Easing.in(Easing.ease) }))
      );

      // Clear event after full animation
      const timeout = setTimeout(() => {
        clearEvent();
      }, 300 + TOAST_DURATION + 250 + 100);

      return () => clearTimeout(timeout);
    } else {
      progress.value = withTiming(0, { duration: 200 });
    }
  }, [lastEvent]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [-30, 0], Extrapolation.CLAMP) },
      { scale: interpolate(progress.value, [0, 1], [0.85, 1], Extrapolation.CLAMP) },
    ],
    pointerEvents: progress.value > 0.5 ? 'auto' as const : 'none' as const,
  }));

  if (!lastEvent) return null;

  const bgColor = EVENT_BG[lastEvent.type] || EVENT_BG.info;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={[styles.toast, { backgroundColor: bgColor }]}>
        <Text style={styles.emoji}>{lastEvent.emoji}</Text>
        <Text style={styles.message} numberOfLines={2}>
          {lastEvent.message}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 70,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 150,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: BORDER_RADIUS.xl,
    gap: 10,
    maxWidth: 400,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  emoji: {
    fontSize: 22,
  },
  message: {
    flex: 1,
    color: COLORS.white,
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    lineHeight: 20,
  },
});
