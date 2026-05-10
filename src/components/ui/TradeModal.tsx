import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { COLORS, BORDER_RADIUS } from '../../styles/theme';
import { STATIC_BOARD } from '../../constants';
import { TradeOffer } from '../../types';

interface TradeModalProps {
  visible: boolean;
  onClose: () => void;
  onCounterOffer?: () => void;
}

export const TradeModal = ({ visible, onClose, onCounterOffer }: TradeModalProps) => {
  const players = useGameStore(s => s.players);
  const board = useGameStore(s => s.board);
  const localPlayerId = useGameStore(s => s.localPlayerId);
  const activeTradeOffer = useGameStore(s => s.activeTradeOffer);
  const proposeTrade = useGameStore(s => s.proposeTrade);
  const respondToTrade = useGameStore(s => s.respondToTrade);
  const cancelTrade = useGameStore(s => s.cancelTrade);

  const localPlayer = players.find(p => p.id === localPlayerId);

  // ── CREATE MODE STATE ──
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [offerMoney, setOfferMoney] = useState<string>('');
  const [requestMoney, setRequestMoney] = useState<string>('');
  const [offerProperties, setOfferProperties] = useState<string[]>([]);
  const [requestProperties, setRequestProperties] = useState<string[]>([]);

  // ── COMPUTED PROPERTIES FOR CREATE MODE ──
  const targetPlayer = players.find(p => p.id === selectedTargetId);

  const myProperties = useMemo(() => {
    return Object.keys(board).filter(id => board[id].ownerId === localPlayerId);
  }, [board, localPlayerId]);

  const targetProperties = useMemo(() => {
    if (!selectedTargetId) return [];
    return Object.keys(board).filter(id => board[id].ownerId === selectedTargetId);
  }, [board, selectedTargetId]);

  // Handle closing and resetting state
  const handleClose = () => {
    setSelectedTargetId(null);
    setOfferMoney('');
    setRequestMoney('');
    setOfferProperties([]);
    setRequestProperties([]);
    onClose();
  };

  const handlePropose = () => {
    if (!localPlayerId || !selectedTargetId) return;

    const offerVal = parseInt(offerMoney, 10) || 0;
    const reqVal = parseInt(requestMoney, 10) || 0;

    // Check balances
    if (localPlayer && localPlayer.balance < offerVal) {
      alert("Vous n'avez pas assez d'argent.");
      return;
    }

    if (targetPlayer && targetPlayer.balance < reqVal) {
      alert("Le joueur cible n'a pas assez d'argent.");
      return;
    }

    // Check houses
    const hasHouses = (props: string[]) => props.some(id => (board[id]?.houseCount || 0) > 0);
    if (hasHouses(offerProperties) || hasHouses(requestProperties)) {
      alert("Impossible d'échanger des propriétés avec des maisons. Vendez les maisons d'abord.");
      return;
    }

    proposeTrade({
      fromPlayerId: localPlayerId,
      toPlayerId: selectedTargetId,
      offerMoney: offerVal,
      offerProperties,
      requestMoney: reqVal,
      requestProperties,
    });
    handleClose();
  };

  const toggleProperty = (id: string, isOffer: boolean) => {
    if (isOffer) {
      setOfferProperties(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
    } else {
      setRequestProperties(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
    }
  };

  const handleCounterOffer = () => {
    if (!activeTradeOffer) return;
    
    // Switch sides
    setSelectedTargetId(activeTradeOffer.fromPlayerId);
    setOfferMoney(activeTradeOffer.requestMoney > 0 ? activeTradeOffer.requestMoney.toString() : '');
    setRequestMoney(activeTradeOffer.offerMoney > 0 ? activeTradeOffer.offerMoney.toString() : '');
    setOfferProperties([...activeTradeOffer.requestProperties]);
    setRequestProperties([...activeTradeOffer.offerProperties]);
    
    cancelTrade();
    onCounterOffer?.();
  };

  // ── RENDER RESPOND MODE ──
  if (activeTradeOffer) {
    // If I am the target, I can accept or reject
    const amITarget = activeTradeOffer.toPlayerId === localPlayerId;
    // If I am the proposer, I can cancel
    const amIProposer = activeTradeOffer.fromPlayerId === localPlayerId;

    if (!amITarget && !amIProposer) return null;

    const fromP = players.find(p => p.id === activeTradeOffer.fromPlayerId);
    const toP = players.find(p => p.id === activeTradeOffer.toPlayerId);

    const renderTradeDetails = () => (
      <View style={styles.tradeDetails}>
        <View style={styles.tradeSide}>
          <Text style={styles.sideTitle}>{fromP?.name} offre :</Text>
          <Text style={styles.moneyText}>{activeTradeOffer.offerMoney} AR</Text>
          {activeTradeOffer.offerProperties.map(pid => {
            const sp = STATIC_BOARD.find(s => s.id === pid);
            return <Text key={pid} style={styles.propText}>- {sp?.name}</Text>;
          })}
        </View>
        <View style={styles.dividerVertical} />
        <View style={styles.tradeSide}>
          <Text style={styles.sideTitle}>{fromP?.name} demande :</Text>
          <Text style={styles.moneyText}>{activeTradeOffer.requestMoney} AR</Text>
          {activeTradeOffer.requestProperties.map(pid => {
            const sp = STATIC_BOARD.find(s => s.id === pid);
            return <Text key={pid} style={styles.propText}>- {sp?.name}</Text>;
          })}
        </View>
      </View>
    );

    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.title}>Proposition d'Échange</Text>
            {renderTradeDetails()}

            {amITarget && (
              <View style={styles.actionButtons}>
                <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={() => respondToTrade(false)}>
                  <Text style={styles.btnText}>Refuser</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnCounter]} onPress={handleCounterOffer}>
                  <Text style={styles.btnText}>Contre-offre</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnAccept]} onPress={() => respondToTrade(true)}>
                  <Text style={styles.btnText}>Accepter</Text>
                </TouchableOpacity>
              </View>
            )}

            {amIProposer && (
              <View style={styles.actionButtons}>
                <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={() => cancelTrade()}>
                  <Text style={styles.btnText}>Annuler l'offre</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  }

  // ── RENDER CREATE MODE ──
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalCreate}>
          <Text style={styles.title}>Nouvel Échange</Text>

          {/* Select Target Player */}
          {!selectedTargetId ? (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Choisir un joueur :</Text>
              {players.filter(p => p.id !== localPlayerId && !p.isBankrupt).map(p => (
                <TouchableOpacity key={p.id} style={styles.playerBtn} onPress={() => setSelectedTargetId(p.id)}>
                  <Text style={styles.playerBtnText}>{p.avatar} {p.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={handleClose}>
                <Text style={styles.btnText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.tradeBuilder} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.stepTitle}>Échange avec {targetPlayer?.name}</Text>

              {/* My Offer */}
              <View style={styles.offerSection}>
                <Text style={styles.sectionTitle}>Je propose :</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Argent à offrir (AR)"
                  keyboardType="numeric"
                  value={offerMoney}
                  onChangeText={setOfferMoney}
                />
                <Text style={styles.subLabel}>Mes Propriétés :</Text>
                <View style={styles.propsContainer}>
                  {myProperties.length === 0 && <Text style={styles.emptyText}>Aucune propriété</Text>}
                  {myProperties.map(pid => {
                    const sp = STATIC_BOARD.find(s => s.id === pid);
                    const isSelected = offerProperties.includes(pid);
                    return (
                      <TouchableOpacity 
                        key={pid} 
                        style={[styles.propChip, isSelected && styles.propChipSelected]}
                        onPress={() => toggleProperty(pid, true)}
                      >
                        <Text style={[styles.propChipText, isSelected && styles.propChipTextSelected]}>
                          {sp?.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.dividerHorizontal} />

              {/* What I want */}
              <View style={styles.offerSection}>
                <Text style={styles.sectionTitle}>Je demande :</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Argent demandé (AR)"
                  keyboardType="numeric"
                  value={requestMoney}
                  onChangeText={setRequestMoney}
                />
                <Text style={styles.subLabel}>Ses Propriétés :</Text>
                <View style={styles.propsContainer}>
                  {targetProperties.length === 0 && <Text style={styles.emptyText}>Aucune propriété</Text>}
                  {targetProperties.map(pid => {
                    const sp = STATIC_BOARD.find(s => s.id === pid);
                    const isSelected = requestProperties.includes(pid);
                    return (
                      <TouchableOpacity 
                        key={pid} 
                        style={[styles.propChip, isSelected && styles.propChipSelected]}
                        onPress={() => toggleProperty(pid, false)}
                      >
                        <Text style={[styles.propChipText, isSelected && styles.propChipTextSelected]}>
                          {sp?.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={handleClose}>
                  <Text style={styles.btnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnAccept]} onPress={handlePropose}>
                  <Text style={styles.btnText}>Proposer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: BORDER_RADIUS.lg,
    padding: 20,
  },
  modalCreate: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFF',
    borderRadius: BORDER_RADIUS.lg,
    padding: 20,
  },
  title: {
    fontFamily: 'Inter_900Black',
    fontSize: 22,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  tradeDetails: {
    flexDirection: 'row',
    backgroundColor: '#F9F9F9',
    borderRadius: BORDER_RADIUS.md,
    padding: 15,
    marginBottom: 20,
  },
  tradeSide: {
    flex: 1,
  },
  dividerVertical: {
    width: 1,
    backgroundColor: '#DDD',
    marginHorizontal: 15,
  },
  dividerHorizontal: {
    height: 1,
    backgroundColor: '#DDD',
    marginVertical: 15,
  },
  sideTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  moneyText: {
    fontFamily: 'Inter_900Black',
    fontSize: 16,
    color: COLORS.primary,
    marginBottom: 5,
  },
  propText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  btnReject: { backgroundColor: '#E10214' },
  btnAccept: { backgroundColor: '#1FB25A' },
  btnCounter: { backgroundColor: '#F39C12' },
  btnCancel: { backgroundColor: '#888' },
  btnText: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  stepContainer: {
    width: '100%',
  },
  stepTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  playerBtn: {
    backgroundColor: '#F0F0F0',
    padding: 15,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: 10,
    alignItems: 'center',
  },
  playerBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#333',
  },
  tradeBuilder: {
    width: '100%',
  },
  offerSection: {
    width: '100%',
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#111',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: BORDER_RADIUS.sm,
    padding: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    marginBottom: 15,
  },
  subLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  propsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    color: '#888',
    fontStyle: 'italic',
  },
  propChip: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  propChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  propChipText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#333',
  },
  propChipTextSelected: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
  },
});
