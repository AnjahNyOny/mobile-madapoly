/**
 * rentCalculator.ts — Calcul avancé des loyers selon les règles officielles du Monopoly.
 *
 * 3 mécaniques distinctes :
 *   1. Propriétés (Villes)   → Loyer de base × 2 si monopole sur la couleur
 *   2. Gares (Transports)    → Loyer basé sur le nombre de gares possédées (25/50/100/200)
 *   3. Services (JIRAMA)     → Somme des dés × 4 (1 service) ou × 10 (2 services)
 */

import { BoardSpace, STATIC_BOARD, COLOR_GROUPS, RAILROAD_IDS, UTILITY_IDS } from '../constants';
import { BoardDynamicState } from '../types';

// ───────────────────────────────────────────
// 1. MONOPOLY CHECK
// ───────────────────────────────────────────

/**
 * Checks if a player owns ALL properties of a given color group.
 *
 * @param ownerId   - The player's ID to check
 * @param color     - The hex color of the property group (e.g., '#955436')
 * @param board     - The current dynamic board state (which properties are owned)
 * @returns true if the player owns every property in that color group
 */
export const hasMonopoly = (
  ownerId: string,
  color: string,
  board: BoardDynamicState
): boolean => {
  const groupIds = COLOR_GROUPS[color];
  if (!groupIds || groupIds.length === 0) return false;

  return groupIds.every((spaceId) => {
    const record = board[spaceId];
    return record && record.ownerId === ownerId;
  });
};

// ───────────────────────────────────────────
// 2. COUNT OWNED IN CATEGORY
// ───────────────────────────────────────────

/**
 * Counts how many spaces from a given list the owner possesses.
 *
 * @param ownerId   - The player's ID
 * @param spaceIds  - Array of space IDs to check (e.g., RAILROAD_IDS)
 * @param board     - The current dynamic board state
 * @returns Number of spaces owned (0 to spaceIds.length)
 */
export const countOwned = (
  ownerId: string,
  spaceIds: string[],
  board: BoardDynamicState
): number => {
  return spaceIds.filter((id) => {
    const record = board[id];
    return record && record.ownerId === ownerId;
  }).length;
};

// ───────────────────────────────────────────
// 3. RENT CALCULATOR
// ───────────────────────────────────────────

/**
 * Calculates the exact rent a player must pay when landing on an owned space.
 * Follows official Monopoly rules for each space type.
 *
 * @param space         - The static board space data
 * @param ownerId       - The owner's player ID
 * @param houseCount    - Number of houses on the property (0-5, 5 = hotel)
 * @param board         - The current dynamic board state
 * @param lastDiceRoll  - The dice roll that brought the player here (for utilities)
 * @returns The rent amount in AR
 */
export const calculateRent = (
  space: BoardSpace,
  ownerId: string,
  houseCount: number,
  board: BoardDynamicState,
  lastDiceRoll: [number, number] | null
): number => {
  // ── HYPOTHÈQUE ──
  // Si la propriété est hypothéquée, le loyer est toujours de 0.
  if (board[space.id]?.isMortgaged) {
    return 0;
  }

  switch (space.type) {
    // ── PROPRIÉTÉS (Villes) ──
    // Loyer de base (index 0 du tableau rent) ou selon le nombre de maisons.
    // Si le propriétaire a le monopole ET 0 maisons → loyer × 2.
    case 'property': {
      if (!space.rent || space.rent.length === 0) {
        // Fallback: 10% du prix d'achat
        return Math.floor((space.price || 0) * 0.1);
      }

      if (houseCount > 0 && houseCount < space.rent.length) {
        // Loyer avec maisons/hôtel — pas de bonus monopole supplémentaire
        return space.rent[houseCount];
      }

      // Terrain nu (0 maisons)
      const baseRent = space.rent[0];
      
      // Vérifier le monopole
      if (space.color && hasMonopoly(ownerId, space.color, board)) {
        return baseRent * 2; // Règle officielle : loyer doublé sur terrain nu avec monopole
      }

      return baseRent;
    }

    // ── GARES (Transports) ──
    // Loyer = rent[nbGaresPossédées - 1]
    // 1 gare = 25 AR, 2 = 50, 3 = 100, 4 = 200
    case 'railroad': {
      const railroadsOwned = countOwned(ownerId, RAILROAD_IDS, board);
      
      if (railroadsOwned === 0) return 0; // Should never happen if called correctly

      if (space.rent && railroadsOwned <= space.rent.length) {
        return space.rent[railroadsOwned - 1];
      }

      // Fallback standard Monopoly railroad rents
      const STANDARD_RAILROAD_RENTS = [25, 50, 100, 200];
      return STANDARD_RAILROAD_RENTS[Math.min(railroadsOwned, 4) - 1];
    }

    // ── SERVICES PUBLICS (JIRAMA) ──
    // 1 service possédé : somme des dés × 4
    // 2 services possédés : somme des dés × 10
    case 'utility': {
      const utilitiesOwned = countOwned(ownerId, UTILITY_IDS, board);
      const diceSum = lastDiceRoll ? lastDiceRoll[0] + lastDiceRoll[1] : 7; // Fallback 7

      if (utilitiesOwned >= 2) {
        return diceSum * 10;
      }
      return diceSum * 4;
    }

    default:
      return 0;
  }
};
