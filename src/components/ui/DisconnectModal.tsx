import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { NetworkManager } from '../../network/NetworkManager';
import { RELAY_URL } from '../../constants/config';
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
 * - networkStatus === 'disconnected'      → client lost connection (no choice)
 * - networkStatus === 'host_disconnected' → host left (offer: continue with bot OR quit)
 */
export const DisconnectModal = () => {
  const networkStatus = useGameStore((s) => s.networkStatus);
  const networkRole = useGameStore((s) => s.networkRole);
  const resetToLobby = useGameStore((s) => s.resetToLobby);
  const convertHostToBot = useGameStore((s) => s.convertHostToBot);
  const syncState = useGameStore((s) => s.syncState);
  const setNetworkStatus = useGameStore((s) => s.setNetworkStatus);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const localPlayerName = useGameStore((s) => s.localPlayerName);
  const localPlayerAvatar = useGameStore((s) => s.localPlayerAvatar);

  const [countdown, setCountdown] = useState(60);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectError, setReconnectError] = useState<string | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isVisible =
    (networkStatus === 'disconnected' || networkStatus === 'host_disconnected') &&
    networkRole !== 'local';

  const isHostGone = networkStatus === 'host_disconnected';
  // Can reconnect if we are a client and have a room code stored
  const storedRoomCode = NetworkManager.getRoomCode();
  const canReconnect = networkRole === 'client' && !!storedRoomCode && !!localPlayerId && !isHostGone;

  // Start countdown when modal becomes visible
  useEffect(() => {
    if (!isVisible) {
      setCountdown(60);
      setReconnectError(null);
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }
    setCountdown(60);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [isVisible]);

  const handleReconnect = async () => {
    if (!storedRoomCode || !localPlayerId) return;
    setIsReconnecting(true);
    setReconnectError(null);
    try {
      NetworkManager.setTransport('websocket', RELAY_URL);
      await NetworkManager.rejoinRoom(storedRoomCode, localPlayerId, localPlayerName, localPlayerAvatar);
      // Re-register message handler: wait for GAME_START re-sync from host
      NetworkManager.onMessage((packet) => {
        if (packet.type === 'GAME_START' || packet.type === 'STATE_UPDATE') {
          syncState(packet.payload);
          setNetworkStatus('connected');
        }
      });
      setIsReconnecting(false);
    } catch (e: any) {
      setReconnectError(e.message || 'Reconnexion échouée');
      setIsReconnecting(false);
    }
  };

  // ── Animation ──
  const progress = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      progress.value = withSpring(1, { damping: 16, stiffness: 120, mass: 0.9 });
    } else {
      progress.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.ease) });
    }
  }, [isVisible]);

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

  if (!isVisible) return null;

  return (
    <>
      {/* ── Backdrop ── */}
      <Animated.View style={[styles.backdrop, backdropStyle]} />

      {/* ── Modal Card ── */}
      <Animated.View style={[styles.modalWrapper, cardStyle]} pointerEvents={isVisible ? 'auto' : 'none'}>
        <View style={styles.card}>
          {/* Danger strip */}
          <View style={[styles.dangerStrip, isHostGone && styles.dangerStripOrange]} />

          {/* Icon */}
          <Text style={styles.icon}>{isHostGone ? '🚪' : '📡'}</Text>

          {/* Title */}
          <Text style={styles.title}>
            {isHostGone ? "L'hôte a quitté" : 'Connexion perdue'}
          </Text>

          {/* Description */}
          <Text style={styles.description}>
            {isHostGone
              ? "L'hôte s'est déconnecté.\nQue souhaitez-vous faire ?"
              : "La connexion avec l'Hôte a été interrompue.\nLa partie ne peut plus continuer."}
          </Text>

          {isHostGone ? (
            /* ── Host gone: two choices ── */
            <>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, styles.statusDotOrange]} />
                <Text style={[styles.statusText, styles.statusTextOrange]}>Hôte déconnecté</Text>
              </View>

              <TouchableOpacity
                style={[styles.returnButton, styles.continueButton]}
                onPress={convertHostToBot}
                activeOpacity={0.85}
              >
                <Text style={styles.returnButtonEmoji}>🤖</Text>
                <Text style={styles.returnButtonText}>CONTINUER (BOT)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.returnButton, styles.quitButton]}
                onPress={resetToLobby}
                activeOpacity={0.85}
              >
                <Text style={styles.returnButtonEmoji}>🏠</Text>
                <Text style={styles.returnButtonText}>QUITTER</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* ── Disconnected client ── */
            <>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Hôte inaccessible</Text>
              </View>

              {canReconnect && countdown > 0 && (
                <Text style={styles.countdown}>
                  Reconnexion possible pendant {countdown}s
                </Text>
              )}

              {reconnectError && (
                <Text style={styles.errorText}>{reconnectError}</Text>
              )}

              {canReconnect && countdown > 0 && (
                <TouchableOpacity
                  style={[styles.returnButton, styles.reconnectButton]}
                  onPress={handleReconnect}
                  disabled={isReconnecting}
                  activeOpacity={0.85}
                >
                  {isReconnecting
                    ? <ActivityIndicator color="#FFF" size="small" />
                    : <>
                        <Text style={styles.returnButtonEmoji}>🔄</Text>
                        <Text style={styles.returnButtonText}>RECONNECTER</Text>
                      </>
                  }
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.returnButton, canReconnect ? styles.quitButton : undefined]}
                onPress={resetToLobby}
                activeOpacity={0.85}
              >
                <Text style={styles.returnButtonEmoji}>🏠</Text>
                <Text style={styles.returnButtonText}>RETOUR AU LOBBY</Text>
              </TouchableOpacity>
            </>
          )}
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

  // ── Reconnect extras ──
  countdown: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 12,
    textAlign: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  reconnectButton: {
    backgroundColor: '#007A3D',
    shadowColor: '#007A3D',
  },

  // ── Host gone variants ──
  dangerStripOrange: {
    backgroundColor: '#F57C00',
  },
  statusDotOrange: {
    backgroundColor: '#F57C00',
  },
  statusTextOrange: {
    color: '#F57C00',
  },
  continueButton: {
    backgroundColor: '#2E7D32',
    shadowColor: '#2E7D32',
    marginBottom: 8,
  },
  quitButton: {
    backgroundColor: '#424242',
    shadowColor: '#000',
    marginTop: 0,
    marginBottom: 24,
  },
});
