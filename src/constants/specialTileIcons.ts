/**
 * Maps board space IDs to their custom WEBP icon assets.
 * All icons are WEBP for native Image rendering — no SVG transformer needed.
 */

import { ImageSourcePropType } from 'react-native';

/** Map space ID → WEBP image source */
export const SPECIAL_TILE_SOURCES: Record<string, ImageSourcePropType> = {
  // ── Corners ──
  '10': require('../../assets/images/special-icons/special-cards/prison.webp'),     // Tsiafahy (Jail)
  '20': require('../../assets/images/special-icons/special-cards/park.webp'),      // Misy sera aty (Free Parking)
  '30': require('../../assets/images/special-icons/special-cards/gotojail.webp'),  // Miditra gagazo (Go to Jail)

  // ── Community Chest (Magie-Magie) ──
  '2':  require('../../assets/images/special-icons/special-cards/comunity_chest.webp'),
  '17': require('../../assets/images/special-icons/special-cards/comunity_chest.webp'),
  '33': require('../../assets/images/special-icons/special-cards/comunity_chest.webp'),

  // ── Chance (Ankamantatra) ──
  '7':  require('../../assets/images/special-icons/special-cards/chance.webp'),
  '22': require('../../assets/images/special-icons/special-cards/chance.webp'),
  '36': require('../../assets/images/special-icons/special-cards/chance.webp'),

  // ── Tax ──
  '4':  require('../../assets/images/special-icons/special-cards/fokontany.webp'), // Fokontany
  '38': require('../../assets/images/special-icons/special-cards/hetra.webp'),    // Hetra

  // ── Railroads ──
  '5':  require('../../assets/images/special-icons/special-cards/air_madagascar.webp'), // Air Madagascar
  '15': require('../../assets/images/special-icons/special-cards/kinga.webp'),          // Kinga
  '25': require('../../assets/images/special-icons/special-cards/possy-possy.webp'),    // Posy-posy
  '35': require('../../assets/images/special-icons/special-cards/cotisse.webp'),       // Cotisse

  // ── Utilities (JIRAMA) ──
  '12': require('../../assets/images/special-icons/special-cards/jirama.webp'), // Jiro JIRAMA
  '28': require('../../assets/images/special-icons/special-cards/jirama.webp'), // Rano JIRAMA
};

/** Check if a given space ID has a custom icon */
export const hasSpecialIcon = (spaceId: string): boolean =>
  !!SPECIAL_TILE_SOURCES[spaceId];
