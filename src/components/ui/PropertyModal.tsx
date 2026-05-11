import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useGameStore } from '../../store/useGameStore';
import { STATIC_BOARD } from '../../constants';
import { COLORS, SPACING, BORDER_RADIUS } from '../../styles/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TIMER_SECONDS = 15;

// Icons per property type
const TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  property: { icon: '🏘️', label: 'Propriété' },
  railroad: { icon: '🚂', label: 'Gare' },
  utility: { icon: '⚡', label: 'Service Public' },
};

/**
 * PropertyModal — Premium purchase decision modal.
 * Appears when a human player lands on an unowned purchasable tile.
 * Features: animated slide-up, property card, countdown timer, buy/skip buttons.
 */
export const PropertyModal = () => {
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const turnPhase = useGameStore((s) => s.turnPhase);
  const buyProperty = useGameStore((s) => s.buyProperty);
  const skipPurchase = useGameStore((s) => s.skipPurchase);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const networkRole = useGameStore((s) => s.networkRole);
  const connectedClients = useGameStore((s) => s.connectedClients);

  const currentPlayer = players[currentPlayerIndex];
  // Host/local controls all non-bot players; client only controls their own assigned player
  const isHostOrLocal = networkRole === 'host' || networkRole === 'local';
  const isRemoteClientPlayer = connectedClients.some(c => c.playerId === currentPlayer?.id);
  const isLocalPlayer = isHostOrLocal
    ? !currentPlayer?.isBot && !isRemoteClientPlayer
    : currentPlayer?.id === localPlayerId;
  const isVisible = turnPhase === 'WAITING_FOR_DECISION' && currentPlayer && !currentPlayer.isBot && isLocalPlayer;
  const space = currentPlayer ? STATIC_BOARD[currentPlayer.position] : null;
  const shouldShow = isVisible && space;

  // ── Animation shared values ──
  const slideProgress = useSharedValue(0); // 0 = hidden, 1 = visible
  
  // ── Timer state ──
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (shouldShow) {
      // Animate modal in
      slideProgress.value = withSpring(1, { damping: 18, stiffness: 140, mass: 0.8 });

      // Start countdown timer
      setTimeLeft(TIMER_SECONDS);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            // IMPORTANT: Defer skipPurchase to avoid "Cannot update a component 
            // while rendering a different component". Calling a Zustand action 
            // inside a setState updater causes cascading renders.
            setTimeout(() => skipPurchase(), 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Animate modal out
      slideProgress.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.ease) });

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [shouldShow]);

  // ── Animated styles ──
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(slideProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    pointerEvents: slideProgress.value > 0.1 ? 'auto' as const : 'none' as const,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(slideProgress.value, [0, 1], [SCREEN_HEIGHT * 0.5, 0], Extrapolation.CLAMP) },
      { scale: interpolate(slideProgress.value, [0, 0.5, 1], [0.8, 0.95, 1], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(slideProgress.value, [0, 0.3, 1], [0, 1, 1], Extrapolation.CLAMP),
  }));

  if (!space) return null;

  const typeInfo = TYPE_LABELS[space.type] || { icon: '🏠', label: 'Propriété' };
  const timerPercent = (timeLeft / TIMER_SECONDS) * 100;
  const timerColor = timeLeft <= 5 ? '#E10214' : timeLeft <= 10 ? '#EB8A13' : '#1FB25A';
  const balanceAfter = (currentPlayer?.balance || 0) - (space.price || 0);

  return (
    <>
      {/* ── Backdrop ── */}
      <Animated.View style={[styles.backdrop, backdropStyle]} />

      {/* ── Modal Card ── */}
      <Animated.View style={[styles.modalWrapper, cardStyle]} pointerEvents={shouldShow ? 'auto' : 'none'}>
        <View style={styles.card}>
          {/* Color strip header */}
          {space.color && (
            <View style={[styles.colorStrip, { backgroundColor: space.color }]} />
          )}
          {!space.color && (
            <View style={[styles.colorStrip, { backgroundColor: '#666' }]} />
          )}

          {/* Type badge */}
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeIcon}>{typeInfo.icon}</Text>
            <Text style={styles.typeBadgeLabel}>{typeInfo.label}</Text>
          </View>

          {/* Property name */}
          <Text style={styles.propertyName}>{space.name}</Text>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Prix d'achat</Text>
            <Text style={styles.priceValue}>{space.price} AR</Text>
          </View>

          {/* Balance info */}
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Votre solde</Text>
              <Text style={styles.balanceValue}>{currentPlayer?.balance?.toLocaleString()} AR</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Après achat</Text>
              <Text style={[
                styles.balanceValue, 
                { color: balanceAfter < 200 ? '#E10214' : COLORS.accent }
              ]}>
                {balanceAfter.toLocaleString()} AR
              </Text>
            </View>
          </View>

          {/* Timer bar */}
          <View style={styles.timerContainer}>
            <View style={styles.timerTrack}>
              <View style={[styles.timerFill, { width: `${timerPercent}%`, backgroundColor: timerColor }]} />
            </View>
            <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}s</Text>
          </View>

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.buyButton}
              onPress={buyProperty}
              activeOpacity={0.85}
            >
              <Text style={styles.buyButtonEmoji}>🏠</Text>
              <Text style={styles.buyButtonText}>ACHETER</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={skipPurchase}
              activeOpacity={0.85}
            >
              <Text style={styles.skipButtonText}>PASSER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: 200,
  },
  modalWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 201,
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  // ── Color strip ──
  colorStrip: {
    height: 8,
    width: '100%',
  },

  // ── Type badge ──
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 16,
    gap: 6,
  },
  typeBadgeIcon: {
    fontSize: 14,
  },
  typeBadgeLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // ── Property name ──
  propertyName: {
    color: COLORS.white,
    fontSize: 26,
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
  },

  // ── Price ──
  priceContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  priceLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  priceValue: {
    color: COLORS.accent,
    fontSize: 34,
    fontFamily: 'Inter_900Black',
    marginTop: 2,
  },

  // ── Balance ──
  balanceRow: {
    flexDirection: 'row',
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceValue: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginTop: 4,
  },

  // ── Timer ──
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    gap: 10,
  },
  timerTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: 3,
  },
  timerText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    minWidth: 30,
    textAlign: 'right',
  },

  // ── Buttons ──
  buttonRow: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  buyButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1FB25A',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    // Glow
    shadowColor: '#1FB25A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buyButtonEmoji: {
    fontSize: 18,
  },
  buyButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontFamily: 'Inter_900Black',
    letterSpacing: 2,
  },
  skipButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  skipButtonText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
});
