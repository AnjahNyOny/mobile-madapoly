export interface BoardSpace {
  id: string;
  name: string;
  type: 'property' | 'railroad' | 'utility' | 'tax' | 'go-to-jail' | 'jail' | 'start' | 'free-parking' | 'community-chest' | 'chance';
  price?: number;
  /**
   * Rent tiers for this space:
   *   - property: [base, 1house, 2houses, 3houses, 4houses, hotel]
   *   - railroad: [1owned, 2owned, 3owned, 4owned]
   *   - utility: multipliers handled in-game (×4 for 1 owned, ×10 for 2)
   */
  rent?: number[];
  color?: string;
  buildCost?: number;
}

// ─── Utility: Group color → list of space IDs ───
// Used by hasMonopoly() to check if a player owns all properties of a color.
export const COLOR_GROUPS: Record<string, string[]> = {
  '#955436': ['1', '3'],                     // Marron : Tsingy, Andasibe
  '#38A1DB': ['6', '8', '9'],               // Bleu clair : Isalo, Ranomafana, Masoala
  '#C6318E': ['11', '13', '14'],            // Rose : Nosy Be, Ile Sainte Marie, Anakao
  '#EB8A13': ['16', '18', '19'],            // Orange : Antsirabe, Fianarantsoa, Toamasina
  '#E10214': ['21', '23', '24'],            // Rouge : Mahajanga, Toliara, Antsiranana
  '#FEDB01': ['26', '27', '29'],            // Jaune : Ambohimanga, Avenue des Baobabs, Mantadia
  '#1FB25A': ['31', '32', '34'],            // Vert : Ambositra, Morondava, Manakara
  '#0069AF': ['37', '39'],                   // Bleu foncé : Nosy Iranja, Antananarivo
};

// IDs of all railroad spaces
export const RAILROAD_IDS = ['5', '15', '25', '35'];

// IDs of all utility spaces
export const UTILITY_IDS = ['12', '28'];

export const STATIC_BOARD: BoardSpace[] = [
  // ── CÔTÉ BAS (indices 0-9) ──
  { id: '0', name: 'DÉPART', type: 'start' },
  { id: '1', name: 'Tsingy de Bemaraha', type: 'property', price: 60, color: '#955436',
    rent: [2, 10, 30, 90, 160, 250] },
  { id: '2', name: 'Magie-Magie', type: 'community-chest' },
  { id: '3', name: 'Andasibe', type: 'property', price: 60, color: '#955436',
    rent: [4, 20, 60, 180, 320, 450] },
  { id: '4', name: 'Fokontany', type: 'tax', price: 200 },
  { id: '5', name: 'Air Madagascar', type: 'railroad', price: 200,
    rent: [25, 50, 100, 200] },
  { id: '6', name: 'Isalo', type: 'property', price: 100, color: '#38A1DB',
    rent: [6, 30, 90, 270, 400, 550] },
  { id: '7', name: 'Ankamantatra', type: 'chance' },
  { id: '8', name: 'Ranomafana', type: 'property', price: 100, color: '#38A1DB',
    rent: [6, 30, 90, 270, 400, 550] },
  { id: '9', name: 'Ambalavao', type: 'property', price: 120, color: '#38A1DB',
    rent: [8, 40, 100, 300, 450, 600] },

  // ── CÔTÉ GAUCHE (indices 10-19) ──
  { id: '10', name: 'Tsiafahy', type: 'jail' },
  { id: '11', name: 'Nosy Be', type: 'property', price: 140, color: '#C6318E',
    rent: [10, 50, 150, 450, 625, 750] },
  { id: '12', name: 'Jiro JIRAMA', type: 'utility', price: 150 },
  { id: '13', name: 'Ile Sainte Marie', type: 'property', price: 140, color: '#C6318E',
    rent: [10, 50, 150, 450, 625, 750] },
  { id: '14', name: 'Anakao', type: 'property', price: 160, color: '#C6318E',
    rent: [12, 60, 180, 500, 700, 900] },
  { id: '15', name: 'Kinga', type: 'railroad', price: 200,
    rent: [25, 50, 100, 200] },
  { id: '16', name: 'Antsirabe', type: 'property', price: 180, color: '#EB8A13',
    rent: [14, 70, 200, 550, 750, 950] },
  { id: '17', name: 'Magie-Magie', type: 'community-chest' },
  { id: '18', name: 'Fianarantsoa', type: 'property', price: 180, color: '#EB8A13',
    rent: [14, 70, 200, 550, 750, 950] },
  { id: '19', name: 'Toamasina', type: 'property', price: 200, color: '#EB8A13',
    rent: [16, 80, 220, 600, 800, 1000] },

  // ── CÔTÉ HAUT (indices 20-29) ──
  { id: '20', name: 'Misy sera aty', type: 'free-parking' },
  { id: '21', name: 'Mahajanga', type: 'property', price: 220, color: '#E10214',
    rent: [18, 90, 250, 700, 875, 1050] },
  { id: '22', name: 'Ankamantatra', type: 'chance' },
  { id: '23', name: 'Toliara', type: 'property', price: 220, color: '#E10214',
    rent: [18, 90, 250, 700, 875, 1050] },
  { id: '24', name: 'Antsiranana', type: 'property', price: 240, color: '#E10214',
    rent: [20, 100, 300, 750, 925, 1100] },
  { id: '25', name: 'Posy-posy', type: 'railroad', price: 200,
    rent: [25, 50, 100, 200] },
  { id: '26', name: 'Ambohimanga', type: 'property', price: 260, color: '#FEDB01',
    rent: [22, 110, 330, 800, 975, 1150] },
  { id: '27', name: 'Avenue des Baobabs', type: 'property', price: 260, color: '#FEDB01',
    rent: [22, 110, 330, 800, 975, 1150] },
  { id: '28', name: 'Rano JIRAMA', type: 'utility', price: 150 },
  { id: '29', name: 'Mantadia', type: 'property', price: 280, color: '#FEDB01',
    rent: [24, 120, 360, 850, 1025, 1200] },

  // ── CÔTÉ DROIT (indices 30-39) ──
  { id: '30', name: 'Miditra gagazo', type: 'go-to-jail' },
  { id: '31', name: 'Ambositra', type: 'property', price: 300, color: '#1FB25A',
    rent: [26, 130, 390, 900, 1100, 1275] },
  { id: '32', name: 'Morondava', type: 'property', price: 300, color: '#1FB25A',
    rent: [26, 130, 390, 900, 1100, 1275] },
  { id: '33', name: 'Magie-Magie', type: 'community-chest' },
  { id: '34', name: 'Manakara', type: 'property', price: 320, color: '#1FB25A',
    rent: [28, 150, 450, 1000, 1200, 1400] },
  { id: '35', name: 'Cotisse', type: 'railroad', price: 200,
    rent: [25, 50, 100, 200] },
  { id: '36', name: 'Ankamantatra', type: 'chance' },
  { id: '37', name: 'Nosy Iranja', type: 'property', price: 350, color: '#0069AF',
    rent: [35, 175, 500, 1100, 1300, 1500] },
  { id: '38', name: 'Hetra', type: 'tax', price: 100 },
  { id: '39', name: 'Antananarivo', type: 'property', price: 400, color: '#0069AF',
    rent: [50, 200, 600, 1400, 1700, 2000] },
];
