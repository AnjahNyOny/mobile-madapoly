import React, { useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Dimensions, Platform } from 'react-native';
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
import { NetworkManager } from '../network/NetworkManager';

import { BoardLayer } from '../components/board/BoardLayer';
import { TokenLayer } from '../components/board/TokenLayer';
import { HUDLayer } from '../components/ui/HUDLayer';
import { useBotLogic } from '../hooks/useBotLogic';
import { CameraController } from '../utils/CameraController';

const { width: _width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCREEN_WIDTH = Platform.OS === 'web' ? Math.min(_width, 480) : _width;

// Camera animation configuration
const SPRING_CONFIG = { damping: 15, stiffness: 90, mass: 1 };

export const GameScreen = () => {
  // ── Zustand selectors (only what GameScreen needs) ──
  const turnPhase = useGameStore((s) => s.turnPhase);
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const networkRole = useGameStore((s) => s.networkRole);
  const isSpectator = networkRole === 'spectator';

  // ── Bot AI: all auto-play logic is handled by this hook ──
  useBotLogic();

  // ── Network message handler for all game messages ──
  useEffect(() => {
    const handleMessage = (packet: any, clientId?: string) => {
      if (packet.type === 'TIMER_UPDATE') {
        useGameStore.getState().setTurnTimeRemaining(packet.payload.turnTimeRemaining);
      }
      
      // Handle client requests on the host side
      if (useGameStore.getState().networkRole === 'host') {
        if (packet.type === 'REQUEST_ROLL_DICE') useGameStore.getState().rollDice();
        if (packet.type === 'REQUEST_BUY_PROPERTY') useGameStore.getState().buyProperty();
        if (packet.type === 'REQUEST_SKIP_PURCHASE') useGameStore.getState().skipPurchase();
        if (packet.type === 'REQUEST_END_TURN') useGameStore.getState().endTurn();
        if (packet.type === 'REQUEST_PAY_BAIL') useGameStore.getState().payBail();
        if (packet.type === 'REQUEST_USE_JAIL_CARD') useGameStore.getState().useJailCard();
        if (packet.type === 'REQUEST_ROLL_JAIL') useGameStore.getState().rollForJailBreak();
        if (packet.type === 'REQUEST_BUILD_HOUSE') useGameStore.getState().buildHouse(packet.payload.propertyId);
        if (packet.type === 'REQUEST_SELL_HOUSE') useGameStore.getState().sellHouse(packet.payload.propertyId);
        if (packet.type === 'REQUEST_MORTGAGE') useGameStore.getState().mortgageProperty(packet.payload.propertyId);
        if (packet.type === 'REQUEST_UNMORTGAGE') useGameStore.getState().unmortgageProperty(packet.payload.propertyId);
      }
      
      // Also handle other important messages that might be needed during gameplay
      if (packet.type === 'STATE_UPDATE') {
        useGameStore.getState().syncState(packet.payload);
      }
      
      if (packet.type === 'GAME_START') {
        useGameStore.getState().syncState(packet.payload);
      }
    };

    NetworkManager.onMessage(handleMessage);

    return () => {
      // Cleanup is handled by NetworkManager internally
    };
  }, []);

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

  // ── Register camera pan callback for TokenLayer to drive during animation ──
  useEffect(() => {
    CameraController.register(centerOnPosition);
    return () => CameraController.unregister();
  }, [centerOnPosition]);

  // ── Center camera on DÉPART when GameScreen mounts ──
  useEffect(() => {
    centerOnPosition(0);
  }, []);

  // ── Camera follow: center on active player (non-animation phases only) ──
  useEffect(() => {
    if (players.length === 0) return;
    const currentPlayer = players[currentPlayerIndex];
    // Pan to player at turn start — TokenLayer handles ANIMATING_MOVEMENT
    if (turnPhase === 'WAITING_FOR_DICE') {
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
      {!isSpectator && <HUDLayer />}

      {/* Layer 3: Spectator banner */}
      {isSpectator && (
        <View style={styles.spectatorBanner}>
          <Text style={styles.spectatorBannerText}>👁  Mode spectateur</Text>
        </View>
      )}
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
    position: 'absolute',
  },
  spectatorBanner: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  spectatorBannerText: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
});
