import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { Player } from '../../types';
import { COLORS, SPACING, BORDER_RADIUS } from '../../styles/theme';

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

interface PlayerCardProps {
  player: Player;
  isActive: boolean;
}

/**
 * PlayerCard displays a compact player info chip:
 * Name, Balance, and jail icon if applicable.
 * The active player's card is visually highlighted.
 */
export const PlayerCard = React.memo(({ player, isActive }: PlayerCardProps) => {
  const isBankrupt = player.isBankrupt;
  const setSelectedPlayerIdForProps = useGameStore(s => s.setSelectedPlayerIdForProps);

  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={() => setSelectedPlayerIdForProps(player.id)}
      style={[
        styles.card,
        isActive && !isBankrupt && styles.cardActive,
        isBankrupt && styles.cardBankrupt,
      ]}
    >
      {/* Active indicator dot */}
      {isActive && !isBankrupt && <View style={styles.activeDot} />}

      {/* Player avatar circle */}
      <View style={[styles.avatar, isActive && !isBankrupt && styles.avatarActive]}>
        {isBankrupt ? (
          <Text style={styles.avatarText}>💀</Text>
        ) : TOKEN_IMAGES[player.avatar] ? (
          <Image source={TOKEN_IMAGES[player.avatar]} style={styles.avatarImg} />
        ) : (
          <Text style={styles.avatarText}>{player.avatar || (player.isBot ? '🤖' : '👤')}</Text>
        )}
      </View>

      {/* Player info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[
            styles.name, 
            isActive && !isBankrupt && styles.nameActive,
            isBankrupt && styles.nameBankrupt,
          ]} numberOfLines={1}>
            {player.name}
          </Text>
          {player.inJail && !isBankrupt && (
            <Text style={styles.jailIcon}>🔒</Text>
          )}
        </View>
        <Text style={[
          styles.balance, 
          isActive && !isBankrupt && styles.balanceActive,
          isBankrupt && styles.balanceBankrupt,
        ]}>
          {isBankrupt ? 'FAILLITE' : `${player.balance.toLocaleString()} AR`}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.85)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    // Glassmorphism shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    position: 'relative',
  },
  cardActive: {
    backgroundColor: 'rgba(225, 2, 20, 0.15)',
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  activeDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.secondary,
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarActive: {
    backgroundColor: 'rgba(225, 2, 20, 0.25)',
  },
  avatarText: {
    fontSize: 16,
  },
  avatarImg: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  info: {
    flexShrink: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  nameActive: {
    color: COLORS.white,
    fontFamily: 'Inter_700Bold',
  },
  jailIcon: {
    fontSize: 10,
  },
  balance: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  balanceActive: {
    color: COLORS.accent,
    fontFamily: 'Inter_900Black',
  },

  // ─── BANKRUPT STATE ───
  cardBankrupt: {
    opacity: 0.45,
    backgroundColor: 'rgba(60, 10, 10, 0.85)',
    borderColor: 'rgba(225, 2, 20, 0.3)',
  },
  nameBankrupt: {
    color: 'rgba(255,255,255,0.4)',
    textDecorationLine: 'line-through',
  },
  balanceBankrupt: {
    color: '#E10214',
    fontSize: 11,
    fontFamily: 'Inter_900Black',
    letterSpacing: 1,
  },
});
