import { MenuItem } from '../types';

export const INITIAL_MENU: Omit<MenuItem, 'id'>[] = [
  // Entrées
  { name: "Coban salatasi", description: "Salade bergère: Tomate, concombre, oignons, persil", price: 7.00, category: "Entrées" },
  { name: "Ezmé", description: "Purée de tomate: Tomate, oignon, ail, piment, poivron", price: 6.00, category: "Entrées" },
  { name: "Haydari", description: "Yaourt, feta, menthe, huile d'olive", price: 6.00, category: "Entrées" },
  { name: "Tarator", description: "Carotte râpée, yaourt, mayonnaise, ail", price: 6.00, category: "Entrées" },
  { name: "Assortiment meze", description: "Ezme, haydari, tarator", price: 8.00, category: "Entrées" },
  { name: "Mercimek corbasi", description: "Soupe aux lentilles rouges", price: 6.50, category: "Entrées" },
  { name: "Iskembe", price: 8.50, category: "Entrées" },

  // Pidé
  { name: "Kaşarli", description: "Fromage", price: 10.00, category: "Pidé" },
  { name: "Sucuklu", price: 12.50, category: "Pidé" },
  { name: "Kiymali", description: "Viande hachée, fromage", price: 12.50, category: "Pidé" },
  { name: "Kuş başi", description: "Agneau marinée, poivron", price: 14.50, category: "Pidé" },
  { name: "Légumes (végétarien)", price: 11.50, category: "Pidé" },
  { name: "Karişik", description: "Viande hachée, sucuk, fromage", price: 14.00, category: "Pidé" },
  { name: "Lahmacun", description: "Pizza turc à la viande hachée", price: 5.90, category: "Pidé" },

  // Plats
  { name: "Assiette döner", price: 16.00, category: "Plats" },
  { name: "Adana kebap", description: "Brochette de viande hachée épicée", price: 17.50, category: "Plats" },
  { name: "Izgara kofte", description: "Boulette de viande hachée", price: 17.50, category: "Plats" },
  { name: "Tavuk Şiş", description: "Brochette de poulet marinée", price: 15.50, category: "Plats" },
  { name: "Kuzu Pirzola", description: "Côtelette d'agneau", price: 21.00, category: "Plats" },
  { name: "Kuzu Şiş", description: "Brochette d'agneau", price: 19.50, category: "Plats" },
  { name: "Beyti kebap", description: "Adana enroulé dans une galette, sauce tomate, fromage", price: 21.00, category: "Plats" },
  { name: "Iskender", description: "Döner, sauce tomate, pain grillé, yaourt, beurre fondu", price: 19.00, category: "Plats" },
  { name: "Assiette GA", description: "Servie sur pierrade: Poulet, côtelette, agneau, adana ou köfte", price: 25.50, category: "Plats" },

  // Grillades (Sandwichs)
  { name: "Sandwich Seul", description: "Choix du pain: Galette traditionnelle ou pain maison. Choix de viande: Poulet / Adana / Kofte / Agneau", price: 8.50, category: "Grillades" },
  { name: "Formule Essentiel (Sandwich)", description: "Sandwich + Frites", price: 10.00, category: "Grillades" },
  { name: "Formule Plaisir (Sandwich)", description: "Sandwich + Frites + Boisson 33cl", price: 12.00, category: "Grillades" },
  { name: "Formule Délice (Sandwich)", description: "Sandwich + Frites + Boisson 33cl + Dessert", price: 16.00, category: "Grillades" },

  // Kebab
  { name: "Kebab Seul", description: "Choix du pain: Galette traditionnelle ou pain maison", price: 8.50, category: "Kebab" },
  { name: "Formule Essentiel (Kebab)", description: "Kebab + Frites", price: 10.00, category: "Kebab" },
  { name: "Formule Plaisir (Kebab)", description: "Kebab + Frites + Boisson 33cl", price: 12.00, category: "Kebab" },
  { name: "Formule Délice (Kebab)", description: "Kebab + Frites + Boisson 33cl + Dessert", price: 16.00, category: "Kebab" },

  // Bowl
  { name: "Bowl Kebab", price: 13.00, category: "Bowl" },
  { name: "Bowl Végétarien", price: 13.00, category: "Bowl" },
  { name: "Bowl Poulet", price: 13.00, category: "Bowl" },
  { name: "Formule Essentiel (Bowl)", description: "Bowl + Boisson 33cl", price: 15.00, category: "Bowl" },
  { name: "Formule Délice (Bowl)", description: "Bowl + Boisson 33cl + Dessert", price: 19.00, category: "Bowl" },

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
  { name: "Baklava", description: "3 pièces", price: 6.00, category: "Desserts" },
  { name: "Moelleux au chocolat", price: 4.50, category: "Desserts" },
  { name: "Kunefe", description: "Supplément boule de glace vanille (+0,50€)", price: 8.00, category: "Desserts" },
  { name: "Tiramisu", price: 4.50, category: "Desserts" },
  { name: "Boule de glace (x2)", description: "Vanille, chocolat, fraise ou pistache", price: 3.50, category: "Desserts" },
];
