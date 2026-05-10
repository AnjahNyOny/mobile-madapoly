import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import { useGameStore } from '../../store/useGameStore';
import { COLORS, BORDER_RADIUS } from '../../styles/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * DisconnectModal — Full-screen blocking overlay shown when network
 * connection to the host is lost during gameplay.
 * 
 * Provides a single action: return to the Lobby, which cleans up
 * all network and game state via resetToLobby().
 */
export const DisconnectModal = () => {
  const networkStatus = useGameStore((s) => s.networkStatus);
  const networkRole = useGameStore((s) => s.networkRole);
  const resetToLobby = useGameStore((s) => s.resetToLobby);

  // Only relevant for network games (not local solo)
  const isDisconnected = networkStatus === 'disconnected' && networkRole !== 'local';

  // ── Animation ──
  const progress = useSharedValue(0);

  useEffect(() => {
    if (isDisconnected) {
      progress.value = withSpring(1, { damping: 16, stiffness: 120, mass: 0.9 });
    } else {
      progress.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.ease) });
    }
  }, [isDisconnected]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    pointerEvents: progress.value > 0.1 ? 'auto' as const : 'none' as const,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [80, 0], Extrapolation.CLAMP) },
      { scale: interpolate(progress.value, [0, 0.5, 1], [0.85, 0.95, 1], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(progress.value, [0, 0.3, 1], [0, 1, 1], Extrapolation.CLAMP),
  }));

  if (!isDisconnected) return null;

  return (
    <>
      {/* ── Backdrop ── */}
      <Animated.View style={[styles.backdrop, backdropStyle]} />

      {/* ── Modal Card ── */}
      <Animated.View style={[styles.modalWrapper, cardStyle]} pointerEvents={isDisconnected ? 'auto' : 'none'}>
        <View style={styles.card}>
          {/* Red danger strip */}
          <View style={styles.dangerStrip} />

          {/* Icon */}
          <Text style={styles.icon}>📡</Text>

          {/* Title */}
          <Text style={styles.title}>Connexion perdue</Text>

          {/* Description */}
          <Text style={styles.description}>
            La connexion avec l'Hôte a été interrompue.{'\n'}
            La partie ne peut plus continuer.
          </Text>

          {/* Pulsing signal indicator */}
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Hôte inaccessible</Text>
          </View>

          {/* Return button */}
          <TouchableOpacity
            style={styles.returnButton}
            onPress={resetToLobby}
            activeOpacity={0.85}
          >
            <Text style={styles.returnButtonEmoji}>🏠</Text>
            <Text style={styles.returnButtonText}>RETOUR AU LOBBY</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.80)',
    zIndex: 500,
  },
  modalWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 501,
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 24,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    alignItems: 'center',
    // Premium shadow
    shadowColor: '#E10214',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 25,
    borderWidth: 1,
    borderColor: 'rgba(225, 2, 20, 0.25)',
  },

  // ── Danger strip ──
  dangerStrip: {
    height: 6,
    width: '100%',
    backgroundColor: '#E10214',
  },

  // ── Icon ──
  icon: {
    fontSize: 48,
    marginTop: 28,
  },

  // ── Title ──
  title: {
    color: COLORS.white,
    fontSize: 24,
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },

  // ── Description ──
  description: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
    paddingHorizontal: 28,
  },

  // ── Status indicator ──
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(225, 2, 20, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E10214',
  },
  statusText: {
    color: '#E10214',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },

  // ── Return button ──
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E10214',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    gap: 10,
    marginTop: 28,
    marginBottom: 24,
    marginHorizontal: 20,
    width: '85%',
    // Glow
    shadowColor: '#E10214',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  returnButtonEmoji: {
    fontSize: 18,
  },
  returnButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: 'Inter_900Black',
    letterSpacing: 2,
  },
});
