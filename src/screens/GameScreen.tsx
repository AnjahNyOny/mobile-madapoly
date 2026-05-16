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
import { useGameSounds } from '../hooks/useGameSounds';
import { CameraController } from '../utils/CameraController';

const { width: _width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCREEN_WIDTH = Platform.OS === 'web' ? Math.min(_width, 480) : _width;

// Camera animation configuration
const SPRING_CONFIG = { damping: 15, stiffness: 90, mass: 1 };

// HUD bar heights (approximate) — used to offset camera center
const TOP_BAR_HEIGHT = Platform.OS === 'ios' ? 100 : 80;
const BOTTOM_BAR_HEIGHT = Platform.OS === 'ios' ? 90 : 75;

// The "visible" center of the play area (between the two bars)
const VISIBLE_CENTER_Y = TOP_BAR_HEIGHT + (SCREEN_HEIGHT - TOP_BAR_HEIGHT - BOTTOM_BAR_HEIGHT) / 2;

// Extra decorative padding around the board (table surface)
const TABLE_PADDING = SCREEN_WIDTH;

export const GameScreen = () => {
  // ── Zustand selectors (only what GameScreen needs) ──
  const turnPhase = useGameStore((s) => s.turnPhase);
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const networkRole = useGameStore((s) => s.networkRole);
  const isSpectator = networkRole === 'spectator';

  // ── Bot AI: all auto-play logic is handled by this hook ──
  useBotLogic();

  // ── Sound effects: reacts to game state changes (dice, rent, jail, depart) ──
  useGameSounds();

  // ── Network message handler for all game messages ──
  useEffect(() => {
    const handleMessage = (packet: any, clientId?: string) => {
      // Dismiss disconnect modal when host is back or sends any state update
      if (packet.type === 'HOST_REJOINED' || packet.type === 'STATE_UPDATE' || packet.type === 'GAME_START') {
        useGameStore.getState().cancelHostGraceTimer();
        useGameStore.getState().setNetworkStatus('connected');
      }

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

      if (packet.type === 'RETURN_TO_LOBBY') {
        useGameStore.getState().setAppScreen('lobby');
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
   * Centers on VISIBLE_CENTER_Y to account for top/bottom HUD bars.
   * No hard clamp — the decorative table surface fills all visible space.
   */
  const centerOnPosition = useCallback((position: number) => {
    const center = getTileCenter(position);
    // Offset by TABLE_PADDING because the board is shifted inside the wrapper
    const targetX = SCREEN_WIDTH / 2 - (center.x + TABLE_PADDING);
    const targetY = VISIBLE_CENTER_Y - (center.y + TABLE_PADDING);
    translateX.value = withSpring(targetX, SPRING_CONFIG);
    translateY.value = withSpring(targetY, SPRING_CONFIG);
  }, []);

  /**
   * Pan gesture for manual board exploration.
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

  // ── Camera follow: center on active player during ALL active phases ──
  useEffect(() => {
    if (players.length === 0) return;
    const currentPlayer = players[currentPlayerIndex];
    // Follow the player on every phase change except during movement animation
    // (TokenLayer handles camera during ANIMATING_MOVEMENT via CameraController)
    if (turnPhase !== 'ANIMATING_MOVEMENT') {
      centerOnPosition(currentPlayer.position);
    }
  }, [turnPhase, currentPlayerIndex, players.length]);

  // Generate diamond pattern positions for the table surface
  const diamonds = React.useMemo(() => {
    const result = [];
    const rows = 14;
    const cols = 14;
    const totalW = BOARD_SIZE + TABLE_PADDING * 2;
    const sX = totalW / cols;
    const sY = totalW / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        result.push({
          key: `${r}-${c}`,
          left: c * sX + (r % 2 === 0 ? sX / 2 : 0),
          top: r * sY,
        });
      }
    }
    return result;
  }, []);

  return (
    <View style={styles.container}>
      {/* Layer 1: Pannable & animated board container (includes table surface) */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.boardWrapper, boardAnimatedStyle]}>
          {/* Decorative table surface — Sandy terrain */}
          <View style={styles.tableSurface}>
            {/* Diamond motifs */}
            {diamonds.map(d => (
              <View
                key={d.key}
                style={[styles.diamond, { left: d.left, top: d.top }]}
              />
            ))}

            {/* Ocean strips — edges */}
            <View style={[styles.oceanStrip, styles.oceanTop]} />
            <View style={[styles.oceanStrip, styles.oceanLeft]} />

            {/* River curves flowing across the sand */}
            <View style={[styles.river, { top: '30%', left: '10%', width: '35%', transform: [{ rotate: '15deg' }] }]} />
            <View style={[styles.river, { top: '32%', left: '25%', width: '25%', transform: [{ rotate: '-10deg' }] }]} />
            <View style={[styles.river, { top: '60%', right: '5%', width: '40%', transform: [{ rotate: '-20deg' }] }]} />
            <View style={[styles.river, { top: '62%', right: '15%', width: '30%', transform: [{ rotate: '5deg' }] }]} />
            <View style={[styles.riverWide, { bottom: '20%', left: '20%', width: '50%', transform: [{ rotate: '12deg' }] }]} />

            {/* Subtle watermarks */}
            <Text style={[styles.tableWatermark, { top: TABLE_PADDING / 3, left: TABLE_PADDING / 4 }]}>MADAPOLY</Text>
            <Text style={[styles.tableWatermark, { bottom: TABLE_PADDING / 3, right: TABLE_PADDING / 4 }]}>MADAPOLY</Text>
          </View>

          {/* The actual board, offset by TABLE_PADDING */}
          <View style={styles.boardInner}>
            <BoardLayer />
            <TokenLayer />
          </View>
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

const TOTAL_SIZE = BOARD_SIZE + TABLE_PADDING * 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C2A97A',
    overflow: 'hidden',
  },
  boardWrapper: {
    width: TOTAL_SIZE,
    height: TOTAL_SIZE,
    position: 'absolute',
  },
  tableSurface: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#D4C4A0', // Sandy beige
  },
  diamond: {
    position: 'absolute',
    width: 16,
    height: 16,
    backgroundColor: 'rgba(160, 130, 80, 0.08)',
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
  oceanStrip: {
    position: 'absolute',
    backgroundColor: 'rgba(40, 120, 180, 0.12)',
  },
  oceanTop: {
    top: 0,
    left: 0,
    right: 0,
    height: TABLE_PADDING * 0.6,
    borderBottomLeftRadius: 200,
    borderBottomRightRadius: 80,
  },
  oceanLeft: {
    top: 0,
    left: 0,
    bottom: 0,
    width: TABLE_PADDING * 0.5,
    borderTopRightRadius: 100,
    borderBottomRightRadius: 200,
  },
  river: {
    position: 'absolute',
    height: 3,
    backgroundColor: 'rgba(60, 140, 200, 0.15)',
    borderRadius: 4,
  },
  riverWide: {
    position: 'absolute',
    height: 6,
    backgroundColor: 'rgba(50, 130, 190, 0.12)',
    borderRadius: 6,
  },
  tableWatermark: {
    position: 'absolute',
    fontSize: 48,
    fontFamily: 'Inter_900Black',
    color: 'rgba(160, 130, 80, 0.06)',
    letterSpacing: 10,
    transform: [{ rotate: '-30deg' }],
  },
  boardInner: {
    position: 'absolute',
    top: TABLE_PADDING,
    left: TABLE_PADDING,
    width: BOARD_SIZE,
    height: BOARD_SIZE,
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
