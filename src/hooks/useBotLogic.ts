/**
 * useBotLogic.ts — Le cerveau IA des bots.
 *
 * Custom Hook qui s'abonne à l'état Zustand et automatise
 * les actions des joueurs bots selon la turnPhase courante.
 *
 * Séparé du store pour respecter la règle "pas de setTimeout dans Zustand"
 * et garder le moteur de jeu pur et testable.
 *
 * Timing des actions (pour le réalisme) :
 *   - WAITING_FOR_DICE  → 1.5s puis rollDice()
 *   - WAITING_FOR_DECISION → 2s si achat, 1s si skip
 *   - END_OF_TURN → 1.5s puis endTurn()
 */

import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { STATIC_BOARD } from '../constants';

// ── Timing constants (ms) ──
const DELAY_ROLL = 1500;        // Temps avant que le bot lance les dés
const DELAY_BUY = 2000;         // Temps de "réflexion" avant un achat
const DELAY_SKIP = 1000;        // Temps avant de passer
const DELAY_END_TURN = 1500;    // Temps entre la fin du tour et le passage au suivant
const SAFETY_MARGIN = 150;      // Marge de sécurité : le bot garde toujours ≥150 AR en réserve

/**
 * Hook principal. À appeler une seule fois dans GameScreen.
 * Gère entièrement le cycle de jeu des bots.
 */
export const useBotLogic = () => {
  // ── Zustand subscriptions ──
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const turnPhase = useGameStore((s) => s.turnPhase);
  const players = useGameStore((s) => s.players);
  const board = useGameStore((s) => s.board);
  const rollDice = useGameStore((s) => s.rollDice);
  const buyProperty = useGameStore((s) => s.buyProperty);
  const skipPurchase = useGameStore((s) => s.skipPurchase);
  const endTurn = useGameStore((s) => s.endTurn);

  // Ref pour stocker le timeout actif (cleanup-safe)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // ── Cleanup du timeout précédent ──
    // Appelé à chaque changement de dépendance ET au démontage du composant.
    // Empêche les fuites de mémoire et les actions fantômes.
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // ── Guards ──
    if (players.length === 0) return;
    if (turnPhase === 'GAME_OVER') return; // Partie terminée — rien à faire

    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer) return;
    if (currentPlayer.isBankrupt) return; // Le joueur en faillite ne joue plus

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // END_OF_TURN → Avancer au joueur suivant
    // S'applique à TOUS les joueurs (humains et bots)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (turnPhase === 'END_OF_TURN') {
      timeoutRef.current = setTimeout(() => {
        endTurn();
      }, DELAY_END_TURN);
      return;
    }

    // ── Les actions suivantes ne concernent que les bots ──
    if (!currentPlayer.isBot) return;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // WAITING_FOR_DICE → Le bot "réfléchit" puis lance
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (turnPhase === 'WAITING_FOR_DICE') {
      timeoutRef.current = setTimeout(() => {
        rollDice();
      }, DELAY_ROLL);
      return;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // WAITING_FOR_DECISION → Décision d'achat IA
    // Stratégie : acheter si balance >= prix + marge de sécurité
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (turnPhase === 'WAITING_FOR_DECISION') {
      const space = STATIC_BOARD[currentPlayer.position];
      const price = space?.price || 0;
      const canAfford = currentPlayer.balance >= price + SAFETY_MARGIN;

      if (canAfford) {
        // Le bot "réfléchit" plus longtemps avant un achat
        timeoutRef.current = setTimeout(() => {
          buyProperty();
        }, DELAY_BUY);
      } else {
        // Skip rapide si trop cher
        timeoutRef.current = setTimeout(() => {
          skipPurchase();
        }, DELAY_SKIP);
      }
      return;
    }

    // ── Cleanup function ──
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [turnPhase, currentPlayerIndex, players, board]);
};
