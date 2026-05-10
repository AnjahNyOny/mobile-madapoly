export type CardType = 'chance' | 'community-chest';

export type CardActionType = 
  | 'PAY' 
  | 'RECEIVE' 
  | 'MOVE_TO' 
  | 'MOVE_RELATIVE' 
  | 'PAY_ALL' 
  | 'RECEIVE_ALL' 
  | 'GET_OUT_OF_JAIL' 
  | 'GO_TO_JAIL'
  | 'STREET_REPAIRS';

export interface CardAction {
  type: CardActionType;
  amount?: number;       // For PAY, RECEIVE, PAY_ALL, RECEIVE_ALL
  houseAmount?: number;  // For STREET_REPAIRS (cost per house)
  hotelAmount?: number;  // For STREET_REPAIRS (cost per hotel)
  targetId?: string;     // For MOVE_TO (e.g. '0', '10', 'jail')
  steps?: number;        // For MOVE_RELATIVE (e.g. -3)
  passGoBonus?: boolean; // For MOVE_TO, whether passing GO gives 200 AR
}

export interface GameCard {
  id: string;
  type: CardType;
  text: string;
  action: CardAction;
}

// ─── ANKAMANTATRA (Caisse de Communauté) ───
export const COMMUNITY_CHEST_CARDS: GameCard[] = [
  { id: 'cc_1', type: 'community-chest', text: 'Avancez jusqu\'à la case Départ (Recevez 200 AR)', action: { type: 'MOVE_TO', targetId: '0', passGoBonus: true } },
  { id: 'cc_2', type: 'community-chest', text: 'Erreur de la banque en votre faveur. Recevez 200 AR', action: { type: 'RECEIVE', amount: 200 } },
  { id: 'cc_3', type: 'community-chest', text: 'Frais médicaux. Payez 50 AR', action: { type: 'PAY', amount: 50 } },
  { id: 'cc_4', type: 'community-chest', text: 'La vente de votre vanille a rapporté 50 AR', action: { type: 'RECEIVE', amount: 50 } },
  { id: 'cc_5', type: 'community-chest', text: 'Libéré de prison. Cette carte peut être conservée jusqu\'à ce qu\'elle soit utilisée.', action: { type: 'GET_OUT_OF_JAIL' } },
  { id: 'cc_6', type: 'community-chest', text: 'Allez en prison. Ne passez pas par la case Départ, ne recevez pas 200 AR.', action: { type: 'GO_TO_JAIL' } },
  { id: 'cc_7', type: 'community-chest', text: 'C\'est la soirée au Kianja Barea. Recevez 50 AR de chaque joueur.', action: { type: 'RECEIVE_ALL', amount: 50 } },
  { id: 'cc_8', type: 'community-chest', text: 'Vous héritez de 100 AR', action: { type: 'RECEIVE', amount: 100 } },
  { id: 'cc_9', type: 'community-chest', text: 'Recevez votre prime annuelle. 100 AR', action: { type: 'RECEIVE', amount: 100 } },
  { id: 'cc_10', type: 'community-chest', text: 'Payez la scolarité. 50 AR', action: { type: 'PAY', amount: 50 } },
  { id: 'cc_11', type: 'community-chest', text: 'Remboursement des impôts. Recevez 20 AR', action: { type: 'RECEIVE', amount: 20 } },
  { id: 'cc_12', type: 'community-chest', text: 'Vous avez gagné le deuxième prix de beauté. Recevez 10 AR', action: { type: 'RECEIVE', amount: 10 } },
  { id: 'cc_13', type: 'community-chest', text: 'Payez l\'amende JIRAMA. 100 AR', action: { type: 'PAY', amount: 100 } },
  { id: 'cc_14', type: 'community-chest', text: 'Vous devez faire des réparations dans vos propriétés. Payez 40 AR par maison et 115 AR par hôtel.', action: { type: 'STREET_REPAIRS', houseAmount: 40, hotelAmount: 115 } },
  { id: 'cc_15', type: 'community-chest', text: 'Retour sur investissement de votre start-up. Recevez 25 AR', action: { type: 'RECEIVE', amount: 25 } },
  { id: 'cc_16', type: 'community-chest', text: 'Votre assurance vie arrive à échéance. Recevez 100 AR', action: { type: 'RECEIVE', amount: 100 } },
];

// ─── MAGIE-MAGIE (Chance) ───
export const CHANCE_CARDS: GameCard[] = [
  { id: 'ch_1', type: 'chance', text: 'Avancez jusqu\'à la case Départ (Recevez 200 AR)', action: { type: 'MOVE_TO', targetId: '0', passGoBonus: true } },
  { id: 'ch_2', type: 'chance', text: 'Rendez-vous à Andilana Beach (Nosy Be). Si vous passez par la case Départ, recevez 200 AR.', action: { type: 'MOVE_TO', targetId: '39', passGoBonus: true } },
  { id: 'ch_3', type: 'chance', text: 'Allez en prison. Ne passez pas par la case Départ, ne recevez pas 200 AR.', action: { type: 'GO_TO_JAIL' } },
  { id: 'ch_4', type: 'chance', text: 'Libéré de prison. Cette carte peut être conservée.', action: { type: 'GET_OUT_OF_JAIL' } },
  { id: 'ch_5', type: 'chance', text: 'Reculez de 3 cases.', action: { type: 'MOVE_RELATIVE', steps: -3 } },
  { id: 'ch_6', type: 'chance', text: 'Rendez-vous à la Gare Soarano. Si vous passez par la case Départ, recevez 200 AR.', action: { type: 'MOVE_TO', targetId: '5', passGoBonus: true } },
  { id: 'ch_7', type: 'chance', text: 'Excès de vitesse sur la RN2. Payez 15 AR', action: { type: 'PAY', amount: 15 } },
  { id: 'ch_8', type: 'chance', text: 'Faites des réparations sur toutes vos propriétés. Payez 25 AR par maison et 100 AR par hôtel.', action: { type: 'STREET_REPAIRS', houseAmount: 25, hotelAmount: 100 } },
  { id: 'ch_9', type: 'chance', text: 'La banque vous verse un dividende de 50 AR.', action: { type: 'RECEIVE', amount: 50 } },
  { id: 'ch_10', type: 'chance', text: 'Avancez jusqu\'à Antsirabe. Si vous passez par la case Départ, recevez 200 AR.', action: { type: 'MOVE_TO', targetId: '24', passGoBonus: true } },
  { id: 'ch_11', type: 'chance', text: 'Avancez jusqu\'à l\'Avenue de l\'Indépendance. Si vous passez par la case Départ, recevez 200 AR.', action: { type: 'MOVE_TO', targetId: '11', passGoBonus: true } },
  { id: 'ch_12', type: 'chance', text: 'Vous avez été élu Président du conseil d\'administration. Payez 50 AR à chaque joueur.', action: { type: 'PAY_ALL', amount: 50 } },
  { id: 'ch_13', type: 'chance', text: 'Votre prêt immobilier rapporte. Recevez 150 AR', action: { type: 'RECEIVE', amount: 150 } },
  { id: 'ch_14', type: 'chance', text: 'Avancez jusqu\'à la Gare Routière Maki. Si vous passez par la case Départ, recevez 200 AR.', action: { type: 'MOVE_TO', targetId: '15', passGoBonus: true } },
  { id: 'ch_15', type: 'chance', text: 'Avancez jusqu\'au Port de Toamasina. Si vous passez par la case Départ, recevez 200 AR.', action: { type: 'MOVE_TO', targetId: '25', passGoBonus: true } },
  { id: 'ch_16', type: 'chance', text: 'Vous gagnez le concours de Famadihana. Recevez 100 AR', action: { type: 'RECEIVE', amount: 100 } },
];
