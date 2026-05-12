import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { COLORS, BORDER_RADIUS } from '../../styles/theme';

/**
 * ForfeitButton — Bouton discret "🏳️" qui ouvre un menu
 * avec les options "Abandonner" et "Quitter la partie".
 */
export const ForfeitButton = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const forfeit = useGameStore((s) => s.forfeit);
  const resetToLobby = useGameStore((s) => s.resetToLobby);
  const turnPhase = useGameStore((s) => s.turnPhase);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const networkRole = useGameStore((s) => s.networkRole);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const players = useGameStore((s) => s.players);

  const currentPlayer = players[currentPlayerIndex];
  const isHostOrLocal = networkRole === 'host' || networkRole === 'local';
  // Host can forfeit any non-bot human player; client can only forfeit themselves
  const controlledPlayerId = isHostOrLocal ? currentPlayer?.id : localPlayerId;
  const localPlayer = players.find(p => p.id === controlledPlayerId);

  // Don't show if game is over or player is already bankrupt
  if (turnPhase === 'GAME_OVER') return null;
  if (localPlayer?.isBankrupt) return null;

  const handleForfeit = () => {
    setShowForfeitConfirm(false);
    setShowMenu(false);
    forfeit();
  };

  const handleQuit = () => {
    setShowQuitConfirm(false);
    setShowMenu(false);
    resetToLobby();
  };

  return (
    <>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => setShowMenu(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.settingsIcon}>🏳️</Text>
      </TouchableOpacity>

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowMenu(false)}
          activeOpacity={1}
        >
          <View style={styles.menuContent}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setShowForfeitConfirm(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>🏳️</Text>
              <Text style={styles.menuText}>Abandonner</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setShowQuitConfirm(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>🚪</Text>
              <Text style={styles.menuText}>Quitter la partie</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Forfeit Confirmation Modal */}
      <Modal
        visible={showForfeitConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForfeitConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>🏳️</Text>
            <Text style={styles.modalTitle}>Abandonner la partie ?</Text>
            <Text style={styles.modalDescription}>
              Vos propriétés retourneront à la banque et vous serez éliminé. Cette action est irréversible.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowForfeitConfirm(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleForfeit}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmText}>Abandonner</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Quit Confirmation Modal */}
      <Modal
        visible={showQuitConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuitConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>🚪</Text>
            <Text style={styles.modalTitle}>Quitter la partie ?</Text>
            <Text style={styles.modalDescription}>
              Vous allez retourner à l'écran d'accueil. La partie continuera sans vous.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowQuitConfirm(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: '#6B7280' }]}
                onPress={handleQuit}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmText}>Quitter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 17,
  },

  // ── Menu ──
  menuContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    paddingVertical: 8,
    width: 220,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 12,
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 28,
    marginHorizontal: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(225, 2, 20, 0.25)',
    shadowColor: '#E10214',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  cancelText: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#E10214',
    alignItems: 'center',
  },
  confirmText: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
});
