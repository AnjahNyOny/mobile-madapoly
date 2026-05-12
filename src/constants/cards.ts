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
  { id: 'cc_1', type: 'community-chest', text: 'Mandeha amin\'ny kazy Fanombohana (Mahazo 200 AR ianao)', action: { type: 'MOVE_TO', targetId: '0', passGoBonus: true } },
  { id: 'cc_2', type: 'community-chest', text: 'Nisy kaonty diso nataon\'i BOA. Mahazo 200 AR ianao', action: { type: 'RECEIVE', amount: 200 } },
  { id: 'cc_3', type: 'community-chest', text: 'Ekôlazin\'ny zaza tsy maintsy aloha. Mandoa 50 AR ianao', action: { type: 'PAY', amount: 50 } },
  { id: 'cc_4', type: 'community-chest', text: 'Nipoaka ny sera lavanila nataonao sy Rabe. Mahazo 50 AR ianao', action: { type: 'RECEIVE', amount: 50 } },
  { id: 'cc_5', type: 'community-chest', text: 'Mivoka figadrana. Bandy akama ilay mpiambina, omeo azy ity karatra ty de tafavoaka ianao.', action: { type: 'GET_OUT_OF_JAIL' } },
  { id: 'cc_6', type: 'community-chest', text: 'Direction Tsiafaha. Tsisy oe mametraka kely fa tode direct. Tsy mila mandalo depart.', action: { type: 'GO_TO_JAIL' } },
  { id: 'cc_7', type: 'community-chest', text: 'Nivoaka ny didim-pitsarana. Samy manome domazy 50 Ar avokoa ny mpilalao', action: { type: 'RECEIVE_ALL', amount: 50 } },
  { id: 'cc_8', type: 'community-chest', text: 'Nandova 100 AR tamin\'i bebe Julienne an.', action: { type: 'RECEIVE', amount: 100 } },
  { id: 'cc_9', type: 'community-chest', text: 'Nahazo ny ticket bet fa resy Real. Mahazo 100 AR ianao.', action: { type: 'RECEIVE', amount: 100 } },
  { id: 'cc_10', type: 'community-chest', text: 'Hofantrano Boss. Faran\'ny volana nge zao e. 50 AR fotsiny nge e.', action: { type: 'PAY', amount: 50 } },
  { id: 'cc_11', type: 'community-chest', text: 'Izay vao tonga saina i RaPierra. Naveriny ny trosanao 20 AR.', action: { type: 'RECEIVE', amount: 20 } },
  { id: 'cc_12', type: 'community-chest', text: 'Fifaninanana fanaovana ratsy tarehy. Ianao no nandresy ka nahazo 10 AR.', action: { type: 'RECEIVE', amount: 10 } },
  { id: 'cc_13', type: 'community-chest', text: 'Tonga ary ny JIRAMA hitaky facture na dia zara fa nandeha ny jiro. Inona moa no azo atao fa aloavy ny 100 AR.', action: { type: 'PAY', amount: 100 } },
  { id: 'cc_14', type: 'community-chest', text: 'Efa somary rodana ny tranotsika ka mila fanamboarana. Mila mandoa 40 AR isaky trano ary 115 AR isaky Hotely', action: { type: 'STREET_REPAIRS', houseAmount: 40, hotelAmount: 115 } },
  { id: 'cc_15', type: 'community-chest', text: 'Versement kinga avy tamin\'i Patrika 25 AR.', action: { type: 'RECEIVE', amount: 25 } },
  { id: 'cc_16', type: 'community-chest', text: 'Sendra nanasa lamba ianao ka nahita 100 AR tanaty paosy. Avy de afeno sao misy mangalatra.', action: { type: 'RECEIVE', amount: 100 } },
];

// ─── MAGIE-MAGIE (Chance) ───
export const CHANCE_CARDS: GameCard[] = [
  { id: 'ch_1', type: 'chance', text: 'Mandeha amin\'ny kazy Fanombohana (Mahazo 200 AR ianao)', action: { type: 'MOVE_TO', targetId: '0', passGoBonus: true } },
  { id: 'ch_2', type: 'chance', text: 'Mamokatra ony ny seranareo sy Jean-Piera ao Toliara ao. Andehana mamonjy azy. raha mandalo depart dia mahazo 200 AR.', action: { type: 'MOVE_TO', targetId: '23', passGoBonus: true } },
  { id: 'ch_3', type: 'chance', text: 'Nisy nitory ony nareo e. Avy dia miditra violon lony de refveo miresaka.', action: { type: 'GO_TO_JAIL' } },
  { id: 'ch_4', type: 'chance', text: 'Omeo an\'ilay mpiambina ito karatra ito dia afaka mivoaka moramora ianao. ', action: { type: 'GET_OUT_OF_JAIL' } },
  { id: 'ch_5', type: 'chance', text: 'Hoaiza iny eee. Mihemotra kazy 3 aingana.', action: { type: 'MOVE_RELATIVE', steps: -3 } },
  { id: 'ch_6', type: 'chance', text: 'Tara avion fa malaky. Vonjeo ny Air Madagascar farany izay haingana sode hanao otran-dRajao eo. Raha mandalo depart dia mahazo 200 AR.', action: { type: 'MOVE_TO', targetId: '5', passGoBonus: true } },
  { id: 'ch_7', type: 'chance', text: 'Voasakana teo am Rond-point Alarobia koa ny henjana. Mametraka 15 AR kely lony.', action: { type: 'PAY', amount: 15 } },
  { id: 'ch_8', type: 'chance', text: 'Tapitra mitaraina daholo ny mpanofatrano sy ny client, andron\'ny fanavaozana zao hono izao. Mila mandoa 40 AR isaky trano ary 115 AR isaky Hotely amin\'ny fanamboarana', action: { type: 'STREET_REPAIRS', houseAmount: 25, hotelAmount: 100 } },
  { id: 'ch_9', type: 'chance', text: 'Trosa efa ho 5 taona avy amin\'i Jean-Ba. Naveriny ny 50 AR.', action: { type: 'RECEIVE', amount: 50 } },
  { id: 'ch_10', type: 'chance', text: 'Itondray voandalana avy any Ambalavao oe i Nenitoa. Divay ao Soavita defa mety. Raha mandalo depart dia mahazo 200 AR.', action: { type: 'MOVE_TO', targetId: '9', passGoBonus: true } },
  { id: 'ch_11', type: 'chance', text: 'Te hijery an\'izany ranomasina izany hono ilay zanakao farany. Hoento mankany Toamasina izy. Raha mandalo depart dia mahazo 200 AR.', action: { type: 'MOVE_TO', targetId: '11', passGoBonus: true } },
  { id: 'ch_12', type: 'chance', text: 'Fizarana karama ny mpiasanao androany. Samy omeo 50 Ar izy ireo.', action: { type: 'PAY_ALL', amount: 50 } },
  { id: 'ch_13', type: 'chance', text: 'Nanjary ny vente en ligne ny vadinao. Nahazo 150 AR ianareo.', action: { type: 'RECEIVE', amount: 150 } },
  { id: 'ch_14', type: 'chance', text: 'Mila mande mietsena tsika fa Alarobia ny andro. Mamonje Kinga malaky. Raha mandalo depart dia mahazo 200 AR.', action: { type: 'MOVE_TO', targetId: '15', passGoBonus: true } },
  { id: 'ch_15', type: 'chance', text: 'Tsy ampy tsony ny volanao andehanana Kinga. Possy sisa no azo atao. Raha mandalo depart dia mahazo 200 AR.', action: { type: 'MOVE_TO', targetId: '25', passGoBonus: true } },
  { id: 'ch_16', type: 'chance', text: 'Nisy olona diso numero nandefa MVola taminao. Mahazo 100 AR', action: { type: 'RECEIVE', amount: 100 } },
];
