import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { COLORS, BORDER_RADIUS } from '../../styles/theme';

/**
 * ForfeitButton — Bouton discret "⚙️" qui ouvre un menu
 * avec l'option "Abandonner la partie".
 * Inclut une modale de confirmation pour éviter les clics accidentels.
 */
export const ForfeitButton = () => {
  const [showConfirm, setShowConfirm] = useState(false);
  const forfeit = useGameStore((s) => s.forfeit);
  const turnPhase = useGameStore((s) => s.turnPhase);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const players = useGameStore((s) => s.players);

  const localPlayer = players.find(p => p.id === localPlayerId);
  
  // Don't show if game is over or player is already bankrupt
  if (turnPhase === 'GAME_OVER') return null;
  if (localPlayer?.isBankrupt) return null;

  const handleForfeit = () => {
    setShowConfirm(false);
    forfeit();
  };

  return (
    <>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => setShowConfirm(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.settingsIcon}>⚙️</Text>
      </TouchableOpacity>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
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
                onPress={() => setShowConfirm(false)}
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
    </>
  );
};

const styles = StyleSheet.create({
  settingsButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  settingsIcon: {
    fontSize: 20,
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
