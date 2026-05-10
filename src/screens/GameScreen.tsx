import React, { useEffect, useCallback } from 'react';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { useGameStore } from '../store/useGameStore';
import { COLORS } from '../styles/theme';
import { BOARD_SIZE, getTileCenter } from '../utils/mathHelpers';

import { BoardLayer } from '../components/board/BoardLayer';
import { TokenLayer } from '../components/board/TokenLayer';
import { HUDLayer } from '../components/ui/HUDLayer';
import { useBotLogic } from '../hooks/useBotLogic';

const { width: _width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCREEN_WIDTH = Platform.OS === 'web' ? Math.min(_width, 480) : _width;

// Camera animation configuration
const SPRING_CONFIG = { damping: 15, stiffness: 90, mass: 1 };

export const GameScreen = () => {
  // ── Zustand selectors (only what GameScreen needs) ──
  const turnPhase = useGameStore((s) => s.turnPhase);
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);

  // ── Bot AI: all auto-play logic is handled by this hook ──
  useBotLogic();

  // ─────────────────────────────────────────────────
  // CAMÉRA DYNAMIQUE : Shared values for board translation
  // ─────────────────────────────────────────────────
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  // Saved offsets for pan gesture continuity
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  /**
   * Smoothly center the camera on a given board position index.
   * Translates the board container so the tile's center aligns with
   * the center of the screen.
   */
  const centerOnPosition = useCallback((position: number) => {
    const center = getTileCenter(position);
    translateX.value = withSpring(
      SCREEN_WIDTH / 2 - center.x,
      SPRING_CONFIG
    );
    translateY.value = withSpring(
      SCREEN_HEIGHT / 2 - center.y,
      SPRING_CONFIG
    );
  }, []);

  /**
   * Pan gesture for manual board exploration.
   * The player can drag the board freely to look around.
   * Camera auto-recenters on the next turn or animation.
   */
  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    })
    .onUpdate((e) => {
      'worklet';
      translateX.value = savedX.value + e.translationX;
      translateY.value = savedY.value + e.translationY;
    });

  /**
   * Animated style applied to the board container.
   * Uses translateX/Y for GPU-accelerated rendering (no layout recalc).
   */
  const boardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  // ── Center camera on DÉPART when GameScreen mounts ──
  // Game is already initialized by LobbyScreen before we get here.
  useEffect(() => {
    centerOnPosition(0);
  }, []);

  // ── Camera follow: center on active player ──
  useEffect(() => {
    if (players.length === 0) return;

    const currentPlayer = players[currentPlayerIndex];

    // On new turn start → smooth pan to player's position
    if (turnPhase === 'WAITING_FOR_DICE') {
      centerOnPosition(currentPlayer.position);
    }
    // On movement → follow the token to its new position
    if (turnPhase === 'ANIMATING_MOVEMENT') {
      centerOnPosition(currentPlayer.position);
    }
  }, [turnPhase, currentPlayerIndex, players.length]);

  return (
    <View style={styles.container}>
      {/* Layer 1: Pannable & animated board container */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.boardContainer, boardAnimatedStyle]}>
          <BoardLayer />
          <TokenLayer />
        </Animated.View>
      </GestureDetector>

      {/* Layer 2: Fixed HUD overlay (passes through touches to board) */}
      <HUDLayer />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: 'hidden', // Clip the board when it extends beyond screen
  },
  boardContainer: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    position: 'absolute', // Absolute so translations work correctly
  },
});
