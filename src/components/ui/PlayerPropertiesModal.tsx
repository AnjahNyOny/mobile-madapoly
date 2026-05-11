import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';

import { useGameStore } from '../../store/useGameStore';
import { STATIC_BOARD, COLOR_GROUPS, BoardSpace } from '../../constants';
import { COLORS, BORDER_RADIUS } from '../../styles/theme';
import { calculateRent } from '../../utils/rentCalculator';

const TOKEN_IMAGES: Record<string, any> = {
  'lemur-madagascar': require('../../../assets/images/tokens/lemur-madagascar.png'),
  'cow':              require('../../../assets/images/tokens/cow.png'),
  'chameleon':        require('../../../assets/images/tokens/chameleon.png'),
  'crocodile':        require('../../../assets/images/tokens/crocodile.png'),
  'eagle':            require('../../../assets/images/tokens/eagle.png'),
  'lion':             require('../../../assets/images/tokens/lion.png'),
  'turtle':           require('../../../assets/images/tokens/turtle.png'),
  'frog':             require('../../../assets/images/tokens/frog.png'),
  'angler-fish':      require('../../../assets/images/tokens/angler-fish.png'),
  'anteater':         require('../../../assets/images/tokens/anteater.png'),
  'baboon':           require('../../../assets/images/tokens/baboon.png'),
  'bear':             require('../../../assets/images/tokens/bear.png'),
  'beaver':           require('../../../assets/images/tokens/beaver.png'),
  'bee':              require('../../../assets/images/tokens/bee.png'),
  'bison':            require('../../../assets/images/tokens/bison.png'),
  'boar':             require('../../../assets/images/tokens/boar.png'),
  'butterfly':        require('../../../assets/images/tokens/butterfly.png'),
  'capybara':         require('../../../assets/images/tokens/capybara.png'),
  'cat':              require('../../../assets/images/tokens/cat.png'),
  'chimpanzee':       require('../../../assets/images/tokens/chimpanzee.png'),
  'crab':             require('../../../assets/images/tokens/crab.png'),
  'deer':             require('../../../assets/images/tokens/deer.png'),
  'dolphin':          require('../../../assets/images/tokens/dolphin.png'),
  'dove':             require('../../../assets/images/tokens/dove.png'),
  'elephant':         require('../../../assets/images/tokens/elephant.png'),
  'fennec':           require('../../../assets/images/tokens/fennec.png'),
  'fox':              require('../../../assets/images/tokens/fox.png'),
  'goat':             require('../../../assets/images/tokens/goat.png'),
  'goldfish':         require('../../../assets/images/tokens/goldfish.png'),
  'guinea-pig':       require('../../../assets/images/tokens/guinea-pig.png'),
  'hedgehog':         require('../../../assets/images/tokens/hedgehog.png'),
  'hippopotamus':     require('../../../assets/images/tokens/hippopotamus.png'),
  'horse':            require('../../../assets/images/tokens/horse.png'),
  'hyena':            require('../../../assets/images/tokens/hyena.png'),
  'kangaroo':         require('../../../assets/images/tokens/kangaroo.png'),
  'koala':            require('../../../assets/images/tokens/koala.png'),
  'llama':            require('../../../assets/images/tokens/llama.png'),
  'mouse':            require('../../../assets/images/tokens/mouse.png'),
  'owl':              require('../../../assets/images/tokens/owl.png'),
  'panda-bear-panda': require('../../../assets/images/tokens/panda-bear-panda.png'),
  'penguin-bird':     require('../../../assets/images/tokens/penguin-bird.png'),
  'pig':              require('../../../assets/images/tokens/pig.png'),
  'rabbit':           require('../../../assets/images/tokens/rabbit.png'),
  'raccoon':          require('../../../assets/images/tokens/raccoon.png'),
  'shark':            require('../../../assets/images/tokens/shark.png'),
  'sheep':            require('../../../assets/images/tokens/sheep.png'),
  'sloth':            require('../../../assets/images/tokens/sloth.png'),
  'snake':            require('../../../assets/images/tokens/snake.png'),
  'spider':           require('../../../assets/images/tokens/spider.png'),
  'squirrel':         require('../../../assets/images/tokens/squirrel.png'),
  'tiger':            require('../../../assets/images/tokens/tiger.png'),
  'wolf':             require('../../../assets/images/tokens/wolf.png'),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const HOUSE_ICONS = ['', '🏠', '🏠🏠', '🏠🏠🏠', '🏠🏠🏠🏠', '🏨'];

function getTypeLabel(space: BoardSpace) {
  if (space.type === 'railroad') return '🚂 Gare';
  if (space.type === 'utility')  return '⚡ Service public';
  return null;
}

// Group spaces by color bucket (color for properties, 'railroad', 'utility')
function groupByColor(spaces: BoardSpace[]) {
  const groups: Record<string, BoardSpace[]> = {};
  for (const s of spaces) {
    const key = s.type === 'property' ? (s.color || 'misc') : s.type;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  return groups;
}

// Estimate portfolio value: purchase price of each property + house/hotel build value
function portfolioValue(spaces: BoardSpace[], board: ReturnType<typeof useGameStore.getState>['board']) {
  return spaces.reduce((sum, s) => {
    const record = board[s.id];
    const purchaseVal = record?.isMortgaged ? Math.floor((s.price || 0) / 2) : (s.price || 0);
    const buildVal = record?.houseCount ? (record.houseCount * ((s as any).buildCost || 0)) : 0;
    return sum + purchaseVal + buildVal;
  }, 0);
}

// ── Component ─────────────────────────────────────────────────────────────────

export const PlayerPropertiesModal = () => {
  const selectedPlayerIdForProps = useGameStore(s => s.selectedPlayerIdForProps);
  const setSelectedPlayerIdForProps = useGameStore(s => s.setSelectedPlayerIdForProps);
  const players = useGameStore(s => s.players);
  const board = useGameStore(s => s.board);

  if (!selectedPlayerIdForProps) return null;

  const player = players.find(p => p.id === selectedPlayerIdForProps);
  if (!player) return null;

  const ownedSpaces: BoardSpace[] = STATIC_BOARD.filter(s => board[s.id]?.ownerId === player.id);
  const groups = groupByColor(ownedSpaces);
  const totalValue = portfolioValue(ownedSpaces, board);

  // Sort group keys: colors first (in COLOR_GROUPS order), then railroad, utility
  const colorOrder = Object.keys(COLOR_GROUPS);
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const ia = colorOrder.indexOf(a);
    const ib = colorOrder.indexOf(b);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return (
    <Modal
      visible={true}
      transparent
      animationType="slide"
      onRequestClose={() => setSelectedPlayerIdForProps(null)}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {TOKEN_IMAGES[player.avatar]
                ? <Image source={TOKEN_IMAGES[player.avatar]} style={styles.playerAvatarImg} />
                : <Text style={styles.playerAvatar}>{player.avatar || '🎮'}</Text>
              }
              <View>
                <Text style={styles.title}>{player.name}</Text>
                <Text style={styles.subtitle}>{ownedSpaces.length} propriété{ownedSpaces.length !== 1 ? 's' : ''}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setSelectedPlayerIdForProps(null)} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── Portfolio value ── */}
          {ownedSpaces.length > 0 && (
            <View style={styles.valueRow}>
              <Text style={styles.valueLabel}>Valeur du portefeuille</Text>
              <Text style={styles.valueAmount}>{totalValue.toLocaleString()} AR</Text>
            </View>
          )}

          {/* ── List ── */}
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {ownedSpaces.length === 0 ? (
              <Text style={styles.emptyText}>Aucune propriété possédée.</Text>
            ) : (
              sortedKeys.map(colorKey => {
                const groupSpaces = groups[colorKey];
                // Check if player has full monopoly for this color
                const colorSpaceIds = COLOR_GROUPS[colorKey];
                const hasFullGroup = colorSpaceIds
                  ? colorSpaceIds.every(id => board[id]?.ownerId === player.id)
                  : false;

                return (
                  <View key={colorKey} style={styles.group}>
                    {/* Group header */}
                    <View style={styles.groupHeader}>
                      <View style={[styles.groupColorDot, { backgroundColor: colorKey.startsWith('#') ? colorKey : '#666' }]} />
                      <Text style={styles.groupLabel}>
                        {colorKey === 'railroad' ? '🚂 Gares' : colorKey === 'utility' ? '⚡ Services' : colorKey.startsWith('#') ? 'Groupe' : colorKey}
                      </Text>
                      {hasFullGroup && (
                        <View style={styles.monopolyBadge}>
                          <Text style={styles.monopolyBadgeText}>MONOPOLE ★</Text>
                        </View>
                      )}
                    </View>

                    {/* Properties in group */}
                    {groupSpaces.map(space => {
                      const record = board[space.id];
                      const isMortgaged = record?.isMortgaged ?? false;
                      const houseCount = record?.houseCount ?? 0;
                      const rent = isMortgaged ? 0 : calculateRent(space, player.id, houseCount, board, null);
                      const typeLabel = getTypeLabel(space);

                      return (
                        <View key={space.id} style={[styles.propertyRow, isMortgaged && styles.propertyRowMortgaged]}>
                          <View style={[styles.colorBar, { backgroundColor: colorKey.startsWith('#') ? colorKey : '#555' }]} />
                          <View style={styles.propertyInfo}>
                            <View style={styles.propertyTopRow}>
                              <Text style={[styles.propertyName, isMortgaged && styles.propertyNameMortgaged]} numberOfLines={1}>
                                {space.name}
                              </Text>
                              {isMortgaged && (
                                <View style={styles.mortgagedBadge}>
                                  <Text style={styles.mortgagedText}>HYPOTHÈQUE</Text>
                                </View>
                              )}
                            </View>
                            <View style={styles.propertyBottomRow}>
                              {typeLabel ? (
                                <Text style={styles.propertyMeta}>{typeLabel}</Text>
                              ) : (
                                <Text style={styles.propertyMeta}>
                                  {houseCount === 0 ? 'Terrain nu' : HOUSE_ICONS[houseCount]}
                                </Text>
                              )}
                              {!isMortgaged && (
                                <Text style={styles.rentText}>Loyer : {rent} AR</Text>
                              )}
                              {isMortgaged && (
                                <Text style={styles.mortgagedRent}>Loyer suspendu</Text>
                              )}
                            </View>
                          </View>
                          {space.price && (
                            <Text style={styles.priceTag}>{space.price} AR</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '82%',
    paddingTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playerAvatar: {
    fontSize: 32,
  },
  playerAvatarImg: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'Inter_900Black',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#AAA',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },

  // ── Portfolio value ──
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 12,
    backgroundColor: 'rgba(27, 178, 90, 0.12)',
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(27, 178, 90, 0.3)',
  },
  valueLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  valueAmount: {
    color: '#1FB25A',
    fontSize: 18,
    fontFamily: 'Inter_900Black',
  },

  // ── List ──
  list: { flexGrow: 0 },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 20,
  },

  // ── Color group ──
  group: { gap: 8 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  groupColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  groupLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
  },
  monopolyBadge: {
    backgroundColor: 'rgba(235, 138, 19, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#EB8A13',
  },
  monopolyBadgeText: {
    color: '#EB8A13',
    fontSize: 10,
    fontFamily: 'Inter_900Black',
    letterSpacing: 0.5,
  },

  // ── Property row ──
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  propertyRowMortgaged: {
    opacity: 0.55,
  },
  colorBar: {
    width: 6,
    alignSelf: 'stretch',
  },
  propertyInfo: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  propertyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  propertyName: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    flex: 1,
  },
  propertyNameMortgaged: {
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.5)',
  },
  mortgagedBadge: {
    backgroundColor: 'rgba(225, 2, 20, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mortgagedText: {
    color: '#E10214',
    fontSize: 9,
    fontFamily: 'Inter_900Black',
    letterSpacing: 0.5,
  },
  propertyBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  propertyMeta: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  rentText: {
    color: '#1FB25A',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  mortgagedRent: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
  },
  priceTag: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    paddingRight: 10,
  },

  emptyText: {
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 30,
    fontSize: 15,
  },
});
