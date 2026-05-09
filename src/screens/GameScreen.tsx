import React, { useEffect, useCallback } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Animated } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { COLORS } from '../styles/theme';
import { BOARD_SIZE, getTileCenter } from '../utils/mathHelpers';

import { BoardLayer } from '../components/board/BoardLayer';
import { TokenLayer } from '../components/board/TokenLayer';
import { HUDLayer } from '../components/ui/HUDLayer';
import { useBotLogic } from '../hooks/useBotLogic';
import { useGameHaptics } from '../hooks/useGameHaptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Camera animation configuration
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 90,
  mass: 1,
  useNativeDriver: true,
};

export const GameScreen = () => {
  // ── Zustand selectors (only what GameScreen needs) ──
  const initGame = useGameStore((s) => s.initGame);
  const turnPhase = useGameStore((s) => s.turnPhase);
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);

  // ── Bot AI: all auto-play logic is handled by this hook ──
  useBotLogic();

  // ── Game Feel: haptic vibrations ──
  useGameHaptics();

  // ─────────────────────────────────────────────────
  // CAMÉRA DYNAMIQUE : Shared values for board translation
  // ─────────────────────────────────────────────────
  const translateX = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(0)).current;
  
  // Track current values manually for gesture continuity
  const currentTranslate = React.useRef({ x: 0, y: 0 });
  
  useEffect(() => {
    const xId = translateX.addListener(({ value }) => { currentTranslate.current.x = value; });
    const yId = translateY.addListener(({ value }) => { currentTranslate.current.y = value; });
    return () => {
      translateX.removeListener(xId);
      translateY.removeListener(yId);
    };
  }, [translateX, translateY]);

  /**
   * Smoothly center the camera on a given board position index.
   * Translates the board container so the tile's center aligns with
   * the center of the screen.
   */
  const centerOnPosition = useCallback((position: number) => {
    const center = getTileCenter(position);
    Animated.spring(translateX, {
      toValue: SCREEN_WIDTH / 2 - center.x,
      ...SPRING_CONFIG,
    }).start();
    Animated.spring(translateY, {
      toValue: SCREEN_HEIGHT / 2 - center.y,
      ...SPRING_CONFIG,
    }).start();
  }, [translateX, translateY]);

  /**
   * Pan gesture for manual board exploration.
   * The player can drag the board freely to look around.
   * Camera auto-recenters on the next turn or animation.
   */
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      // Stop ongoing animations when user touches
      translateX.stopAnimation();
      translateY.stopAnimation();
    })
    .onUpdate((e) => {
      translateX.setValue(currentTranslate.current.x + e.translationX);
      translateY.setValue(currentTranslate.current.y + e.translationY);
    });

  // ── Initialize the game on mount ──
  useEffect(() => {
    initGame([
      { id: 'player-1', name: 'Zaka', isBot: false },
      { id: 'bot-1', name: 'Bot Mada', isBot: true },
    ]);
    // Initial camera position: center on DÉPART
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
        <Animated.View style={[styles.boardContainer, { transform: [{ translateX }, { translateY }] }]}>
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
