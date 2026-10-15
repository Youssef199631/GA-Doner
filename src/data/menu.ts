import { MenuItem } from '../types';

export const INITIAL_MENU: Omit<MenuItem, 'id'>[] = [
  // Entrées
  { name: "Coban salatasi", description: "Salade bergère: Tomate, concombre, oignons, persil", price: 7.00, category: "Entrées" },
  { name: "Ezmé", description: "Purée de tomate: Tomate, oignon, ail, piment, poivron", price: 6.00, category: "Entrées" },
  { name: "Haydari", description: "Yaourt, feta, menthe, huile d'olive", price: 6.00, category: "Entrées" },
  { name: "Tarator", description: "Carotte râpée, yaourt, mayonnaise, ail", price: 6.00, category: "Entrées" },
  { 
    name: "Assortiment meze", 
    description: "Plateau de 3 mezzés: Ezmé (tomates épicées), Haydari (yaourt & menthe), Tarator (carottes & ail), servi avec corbeille de pain turc chaud", 
    price: 8.00, 
    category: "Entrées",
    image: "/menu/meze-plateau.png",
    images: ["/menu/meze-plateau.png", "/menu/assortiment-meze.png"]
  },
  { name: "Mercimek corbasi", description: "Soupe aux lentilles rouges", price: 6.50, category: "Entrées" },
  { name: "Iskembe", price: 8.50, category: "Entrées" },

  // Pidé
  { 
    name: "Kaşarli", 
    description: "Pidé traditionnelle au four avec fromage fondant", 
    price: 10.00, 
    category: "Pidé",
    image: "/menu/pide-kiymali.png",
    images: ["/menu/pide-kiymali.png"]
  },
  { name: "Sucuklu", description: "Saucisse turque épicée (sucuk), fromage fondant", price: 12.50, category: "Pidé" },
  { 
    name: "Kiymali", 
    description: "Pidé traditionnelle au four en forme de barque, viande hachée assaisonnée et fromage fondant, accompagnée de salade", 
    price: 12.50, 
    category: "Pidé",
    image: "/menu/pide-kiymali.png",
    images: ["/menu/pide-kiymali.png"]
  },
  { name: "Kuş başi", description: "Agneau marinée, poivron", price: 14.50, category: "Pidé" },
  { name: "Légumes (végétarien)", description: "Légumes du soleil grillés et fromage", price: 11.50, category: "Pidé" },
  { 
    name: "Karişik", 
    description: "Pidé mixte: viande hachée, sucuk et fromage fondant", 
    price: 14.00, 
    category: "Pidé",
    image: "/menu/pide-kiymali.png",
    images: ["/menu/pide-kiymali.png"]
  },
  { 
    name: "Lahmacun", 
    description: "Fine galette artisanale croustillante garnie de viande hachée épicée, tomates, ail et persil, servie avec salade fraîche, oignons rouges au sumac et citron", 
    price: 5.90, 
    category: "Pidé",
    image: "/menu/lahmacun.png",
    images: ["/menu/lahmacun.png"]
  },

  // Plats
  { 
    name: "Assiette döner", 
    description: "Émincé de viande döner dorée servi avec frites croustillantes ou boulgour pilaf, salade composée fraîche assaisonnée et corbeille de pain turc chaud", 
    price: 16.00, 
    category: "Plats",
    image: "/menu/assiette-doner-frites.png",
    images: ["/menu/assiette-doner-frites.png", "/menu/assiette-doner.png"]
  },
  { 
    name: "Adana kebap", 
    description: "Deux brochettes de viande hachée épicée sur pain lavash, frites dorées, tomate et piment doux grillés, salade composée", 
    price: 17.50, 
    category: "Plats",
    image: "/menu/adana-kebap.png",
    images: ["/menu/adana-kebap.png"]
  },
  { 
    name: "Izgara kofte", 
    description: "Boulettes de viande hachée assaisonnées et grillées (köfte) posées sur pain plat, servies avec dôme de boulgour turc, piment doux grillé, tomate et salade fraîche", 
    price: 17.50, 
    category: "Plats",
    image: "/menu/izgara-kofte.png",
    images: ["/menu/izgara-kofte.png"]
  },
  { 
    name: "Tavuk Şiş", 
    description: "Brochettes de poulet mariné grillées au feu, servies avec frites croustillantes ou boulgour pilaf, salade composée, piment vert grillé et sauce blanche", 
    price: 15.50, 
    category: "Plats",
    image: "/menu/tavuk-sis.png",
    images: ["/menu/tavuk-sis.png", "/menu/tavuk-sis-bulgur.png"]
  },
  { 
    name: "Kuzu Pirzola", 
    description: "Délicieuses côtelettes d'agneau grillées à la braise, servies avec portion généreuse de frites, piment vert grillé, tomate fraîche et salade composée", 
    price: 21.00, 
    category: "Plats",
    image: "/menu/kuzu-pirzola.png",
    images: ["/menu/kuzu-pirzola.png"]
  },
  { 
    name: "Kuzu Şiş", 
    description: "Brochettes d'agneau mariné grillées sur pain lavash, tomate & piment doux grillés, crudités, frites ou boulgour pilaf", 
    price: 19.50, 
    category: "Plats",
    image: "/menu/kuzu-sis.png",
    images: ["/menu/kuzu-sis.png"]
  },
  { name: "Beyti kebap", description: "Adana enroulé dans une galette, sauce tomate, fromage", price: 21.00, category: "Plats" },
  { 
    name: "Iskender", 
    description: "Spécialité emblématique: fines lamelles de viande döner sur lit de pain turc doré, nappées d'une sauce tomate maison parfumée, beurre fondu chaud, yaourt turc épais et piment grillé", 
    price: 19.00, 
    category: "Plats",
    image: "/menu/iskender.png",
    images: ["/menu/iskender.png"]
  },
  { 
    name: "Assiette GA", 
    description: "Servie sur pierrade en fonte: Côtelette d'agneau, brochette d'agneau, köfte, poulet mariné, boulgour pilaf & légumes grillés", 
    price: 25.50, 
    category: "Plats",
    image: "/menu/assiette-ga.png",
    images: ["/menu/assiette-ga.png"]
  },

  // Grillades (Sandwichs) - 2 photos systématiques : Sandwich Köfte & Sandwich Adana
  { 
    name: "Sandwich Seul", 
    description: "Choix de viande: Köfte, Adana épicé, Poulet mariné ou Agneau. Pain artisanal ou galette traditionnelle, crudités fraîches et sauce", 
    price: 8.50, 
    category: "Grillades",
    image: "/menu/sandwich-kofte.png",
    images: ["/menu/sandwich-kofte.png", "/menu/sandwich-adana.png"]
  },
  { 
    name: "Formule Essentiel (Sandwich)", 
    description: "Sandwich grillades au choix (Köfte, Adana, Poulet ou Agneau) + Frites dorées et sauce", 
    price: 10.00, 
    category: "Grillades",
    image: "/menu/sandwich-kofte.png",
    images: ["/menu/sandwich-kofte.png", "/menu/sandwich-adana.png"]
  },
  { 
    name: "Formule Plaisir (Sandwich)", 
    description: "Sandwich grillades au choix (Köfte, Adana, Poulet ou Agneau) + Frites dorées + Boisson 33cl", 
    price: 12.00, 
    category: "Grillades",
    image: "/menu/sandwich-kofte.png",
    images: ["/menu/sandwich-kofte.png", "/menu/sandwich-adana.png"]
  },
  { 
    name: "Formule Délice (Sandwich)", 
    description: "Sandwich grillades au choix (Köfte, Adana, Poulet ou Agneau) + Frites dorées + Boisson 33cl + Dessert", 
    price: 16.00, 
    category: "Grillades",
    image: "/menu/sandwich-kofte.png",
    images: ["/menu/sandwich-kofte.png", "/menu/sandwich-adana.png"]
  },

  // Kebab - 2 photos systématiques : Planche Kebab & Sandwich Döner avec frites
  { 
    name: "Kebab Seul", 
    description: "Pain croustillant ou galette garni de viande döner émincée, légumes grillés, salade fraîche et sauce blanche", 
    price: 8.50, 
    category: "Kebab",
    image: "/menu/kebab-seul.png",
    images: ["/menu/kebab-seul.png", "/menu/sandwich-doner.png"]
  },
  { 
    name: "Formule Essentiel (Kebab)", 
    description: "Sandwich Kebab döner garni avec crudités et sauce blanche, servi sur planche GA avec frites dorées et sauce", 
    price: 10.00, 
    category: "Kebab",
    image: "/menu/formule-kebab.png",
    images: ["/menu/formule-kebab.png", "/menu/sandwich-doner.png"]
  },
  { 
    name: "Formule Plaisir (Kebab)", 
    description: "Kebab döner garni + Frites dorées + Boisson 33cl au choix", 
    price: 12.00, 
    category: "Kebab",
    image: "/menu/formule-kebab.png",
    images: ["/menu/formule-kebab.png", "/menu/sandwich-doner.png"]
  },
  { 
    name: "Formule Délice (Kebab)", 
    description: "Kebab döner garni + Frites dorées + Boisson 33cl + Dessert au choix", 
    price: 16.00, 
    category: "Kebab",
    image: "/menu/formule-kebab.png",
    images: ["/menu/formule-kebab.png", "/menu/sandwich-doner.png"]
  },

  // Bowl
  { 
    name: "Bowl Kebab", 
    description: "Bol complet et généreux composé d'émincé de viande döner kebab, boulgour turc parfumé, légumes grillés, salade fraîche nappée de sauce blanche au sumac", 
    price: 13.00, 
    category: "Bowl",
    image: "/menu/bowl-kebab.png",
    images: ["/menu/bowl-kebab.png"]
  },
  { name: "Bowl Végétarien", price: 13.00, category: "Bowl" },
  { name: "Bowl Poulet", price: 13.00, category: "Bowl" },
  { 
    name: "Formule Essentiel (Bowl)", 
    description: "Bowl au choix + Boisson 33cl fraîche", 
    price: 15.00, 
    category: "Bowl",
    image: "/menu/bowl-kebab.png",
    images: ["/menu/bowl-kebab.png"]
  },
  { 
    name: "Formule Délice (Bowl)", 
    description: "Bowl au choix + Boisson 33cl fraîche + Dessert au choix", 
    price: 19.00, 
    category: "Bowl",
    image: "/menu/bowl-kebab.png",
    images: ["/menu/bowl-kebab.png"]
  },

  // Americain
  { name: "Americain Seul", description: "Pain garni de steak haché façon bouchère, frites et sauce(s)", price: 9.00, category: "Americain" },
  { name: "Formule Essentiel (Americain)", description: "Americain + Boisson 33cl", price: 11.00, category: "Americain" },
  { name: "Formule Délice (Americain)", description: "Americain + Boisson 33cl + Dessert", price: 15.00, category: "Americain" },

  // Boissons
  { name: "Boisson 33cl", description: "Coca-cola, orangina, oasis, fanta, fuztea...", price: 2.50, category: "Boissons" },
  { name: "Coca bouteille", price: 3.80, category: "Boissons" },
  { name: "San Pellegrino 50cl", price: 4.00, category: "Boissons" },
  { name: "San Pellegrino 1L", price: 4.90, category: "Boissons" },
  { name: "Carola 50cl", price: 3.00, category: "Boissons" },
  { name: "Carola 1L", price: 4.00, category: "Boissons" },

  // Desserts
  { 
    name: "Baklava", 
    description: "Pâtisserie traditionnelle turque: trois généreuses portions feuilletées pur beurre et miellées, saupoudrées de pistaches concassées", 
    price: 6.00, 
    category: "Desserts",
    image: "/menu/baklava.png",
    images: ["/menu/baklava.png"]
  },
  { name: "Moelleux au chocolat", price: 4.50, category: "Desserts" },
  { name: "Kunefe", description: "Supplément boule de glace vanille (+0,50€)", price: 8.00, category: "Desserts" },
  { name: "Tiramisu", price: 4.50, category: "Desserts" },
  { name: "Boule de glace (x2)", description: "Vanille, chocolat, fraise ou pistache", price: 3.50, category: "Desserts" },
];

export const MENU_DATA_MAP: Record<string, { image: string; images?: string[]; description?: string }> = {
  // Entrées
  "Assortiment meze": {
    image: "/menu/meze-plateau.png",
    images: ["/menu/meze-plateau.png", "/menu/assortiment-meze.png"],
    description: "Plateau de 3 mezzés: Ezmé (tomates épicées), Haydari (yaourt & menthe), Tarator (carottes & ail), servi avec corbeille de pain turc chaud"
  },

  // Plats
  "Assiette döner": {
    image: "/menu/assiette-doner-frites.png",
    images: ["/menu/assiette-doner-frites.png", "/menu/assiette-doner.png"],
    description: "Émincé de viande döner dorée servi avec frites croustillantes ou boulgour pilaf, salade composée fraîche assaisonnée et corbeille de pain turc chaud"
  },
  "Izgara kofte": {
    image: "/menu/izgara-kofte.png",
    images: ["/menu/izgara-kofte.png"],
    description: "Boulettes de viande hachée assaisonnées et grillées (köfte) posées sur pain plat, servies avec dôme de boulgour turc, piment doux grillé, tomate et salade fraîche"
  },
  "Iskender": {
    image: "/menu/iskender.png",
    images: ["/menu/iskender.png"],
    description: "Spécialité emblématique: fines lamelles de viande döner sur lit de pain turc doré, nappées d'une sauce tomate maison parfumée, beurre fondu chaud, yaourt turc épais et piment grillé"
  },
  "Kuzu Pirzola": {
    image: "/menu/kuzu-pirzola.png",
    images: ["/menu/kuzu-pirzola.png"],
    description: "Délicieuses côtelettes d'agneau grillées à la braise, servies avec portion généreuse de frites, piment vert grillé, tomate fraîche et salade composée"
  },
  "Assiette GA": {
    image: "/menu/assiette-ga.png",
    images: ["/menu/assiette-ga.png"],
    description: "Servie sur pierrade en fonte: Côtelette d'agneau, brochette d'agneau, köfte, poulet mariné, boulgour pilaf & légumes grillés"
  },
  "Adana kebap": {
    image: "/menu/adana-kebap.png",
    images: ["/menu/adana-kebap.png"],
    description: "Deux brochettes de viande hachée épicée sur pain lavash, frites dorées, tomate et piment doux grillés, salade composée"
  },
  "Kuzu Şiş": {
    image: "/menu/kuzu-sis.png",
    images: ["/menu/kuzu-sis.png"],
    description: "Brochettes d'agneau mariné grillées sur pain lavash, tomate & piment doux grillés, crudités, frites ou boulgour pilaf"
  },
  "Tavuk Şiş": {
    image: "/menu/tavuk-sis.png",
    images: ["/menu/tavuk-sis.png", "/menu/tavuk-sis-bulgur.png"],
    description: "Brochettes de poulet mariné grillées au feu, servies avec frites croustillantes ou boulgour pilaf, salade composée, piment vert grillé et sauce blanche"
  },

  // Pidé
  "Lahmacun": {
    image: "/menu/lahmacun.png",
    images: ["/menu/lahmacun.png"],
    description: "Fine galette artisanale croustillante garnie de viande hachée épicée, tomates, ail et persil, servie avec salade fraîche, oignons rouges au sumac et citron"
  },
  "Kiymali": {
    image: "/menu/pide-kiymali.png",
    images: ["/menu/pide-kiymali.png"],
    description: "Pidé traditionnelle au four en forme de barque, viande hachée assaisonnée et fromage fondant, accompagnée de salade"
  },
  "Kaşarli": {
    image: "/menu/pide-kiymali.png",
    images: ["/menu/pide-kiymali.png"],
    description: "Pidé traditionnelle au four avec fromage fondant"
  },
  "Karişik": {
    image: "/menu/pide-kiymali.png",
    images: ["/menu/pide-kiymali.png"],
    description: "Pidé mixte: viande hachée, sucuk et fromage fondant"
  },

  // Sandwich / Grillades - 2 images (Sandwich Köfte & Sandwich Adana) pour toutes les formules
  "Sandwich Seul": {
    image: "/menu/sandwich-kofte.png",
    images: ["/menu/sandwich-kofte.png", "/menu/sandwich-adana.png"],
    description: "Choix de viande: Köfte, Adana épicé, Poulet mariné ou Agneau. Pain artisanal ou galette traditionnelle, crudités fraîches et sauce"
  },
  "Formule Essentiel (Sandwich)": {
    image: "/menu/sandwich-kofte.png",
    images: ["/menu/sandwich-kofte.png", "/menu/sandwich-adana.png"],
    description: "Sandwich grillades au choix (Köfte, Adana, Poulet ou Agneau) + Frites dorées et sauce"
  },
  "Formule Plaisir (Sandwich)": {
    image: "/menu/sandwich-kofte.png",
    images: ["/menu/sandwich-kofte.png", "/menu/sandwich-adana.png"],
    description: "Sandwich grillades au choix (Köfte, Adana, Poulet ou Agneau) + Frites dorées + Boisson 33cl"
  },
  "Formule Délice (Sandwich)": {
    image: "/menu/sandwich-kofte.png",
    images: ["/menu/sandwich-kofte.png", "/menu/sandwich-adana.png"],
    description: "Sandwich grillades au choix (Köfte, Adana, Poulet ou Agneau) + Frites dorées + Boisson 33cl + Dessert"
  },

  // Kebab - 2 images (Kebab & Sandwich Döner avec frites) pour toutes les formules
  "Kebab Seul": {
    image: "/menu/kebab-seul.png",
    images: ["/menu/kebab-seul.png", "/menu/sandwich-doner.png"],
    description: "Pain croustillant ou galette garni de viande döner émincée, légumes grillés, salade fraîche et sauce blanche"
  },
  "Formule Essentiel (Kebab)": {
    image: "/menu/formule-kebab.png",
    images: ["/menu/formule-kebab.png", "/menu/sandwich-doner.png"],
    description: "Sandwich Kebab döner garni avec crudités et sauce blanche, servi sur planche GA avec frites dorées et sauce"
  },
  "Formule Plaisir (Kebab)": {
    image: "/menu/formule-kebab.png",
    images: ["/menu/formule-kebab.png", "/menu/sandwich-doner.png"],
    description: "Kebab döner garni + Frites dorées + Boisson 33cl au choix"
  },
  "Formule Délice (Kebab)": {
    image: "/menu/formule-kebab.png",
    images: ["/menu/formule-kebab.png", "/menu/sandwich-doner.png"],
    description: "Kebab döner garni + Frites dorées + Boisson 33cl + Dessert au choix"
  },

  // Bowl
  "Bowl Kebab": {
    image: "/menu/bowl-kebab.png",
    images: ["/menu/bowl-kebab.png"],
    description: "Bol complet et généreux composé d'émincé de viande döner kebab, boulgour turc parfumé, légumes grillés, salade fraîche nappée de sauce blanche au sumac"
  },
  "Formule Essentiel (Bowl)": {
    image: "/menu/bowl-kebab.png",
    images: ["/menu/bowl-kebab.png"],
    description: "Bowl au choix + Boisson 33cl fraîche"
  },
  "Formule Délice (Bowl)": {
    image: "/menu/bowl-kebab.png",
    images: ["/menu/bowl-kebab.png"],
    description: "Bowl au choix + Boisson 33cl fraîche + Dessert au choix"
  },

  // Desserts
  "Baklava": {
    image: "/menu/baklava.png",
    images: ["/menu/baklava.png"],
    description: "Pâtisserie traditionnelle turque: trois généreuses portions feuilletées pur beurre et miellées, saupoudrées de pistaches concassées"
  }
};
