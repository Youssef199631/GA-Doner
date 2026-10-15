import React, { useState } from 'react';
import { MenuItem, KebabOptions } from '../types';
import { X, Plus, Minus, Check, Flame, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export const KEBAB_CRUDITES = [
  'Salade',
  'Tomate',
  'Oignons',
  'Choux rouge',
  'Çoban',
] as const;

export const KEBAB_SAUCES = [
  'Ketchup',
  'Mayonnaise',
  'Cocktail maison',
  'Algérienne',
  'Blanche maison',
  'Andalouse',
] as const;

export const KEBAB_SUPPLEMENTS = [
  { 
    name: 'Cheddar', 
    price: 1.50, 
    desc: 'Tranches fondantes & savoureuses', 
    icon: '🧀' 
  },
  { 
    name: 'Feta', 
    price: 1.50, 
    desc: 'Fromage frais émietté traditionnel', 
    icon: '🥗' 
  },
  { 
    name: 'Légumes grillés', 
    price: 1.00, 
    desc: 'Poivrons & courgettes marinés', 
    icon: '🫑' 
  },
] as const;

interface KebabCustomizerModalProps {
  item: MenuItem;
  onClose: () => void;
  onConfirm: (customized: {
    item: MenuItem;
    quantity: number;
    kebabOptions: KebabOptions;
    totalPrice: number;
    comment: string;
  }) => void;
}

export const KebabCustomizerModal: React.FC<KebabCustomizerModalProps> = ({
  item,
  onClose,
  onConfirm,
}) => {
  // Crudités state: UNCHECKED by default as requested by user
  const [selectedCrudites, setSelectedCrudites] = useState<string[]>([]);

  // Sauces state: Blanche maison by default, 1 or 2 included, 3rd sauce and above = +0.50 €
  const [selectedSauces, setSelectedSauces] = useState<string[]>(['Blanche maison']);

  // Suppléments state
  const [selectedSupplements, setSelectedSupplements] = useState<{ name: string; price: number }[]>([]);

  // Special instructions
  const [specialNote, setSpecialNote] = useState('');

  // Quantity
  const [quantity, setQuantity] = useState(1);

  // Toggle Crudité
  const toggleCrudite = (c: string) => {
    setSelectedCrudites(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
  };

  // Toggle Sauce: allow selecting freely; 1 & 2 included, from 3rd sauce +0.50 € each
  const toggleSauce = (s: string) => {
    setSelectedSauces(prev => {
      if (prev.includes(s)) {
        return prev.filter(x => x !== s);
      }
      return [...prev, s];
    });
  };

  // Toggle Supplement
  const toggleSupplement = (supp: { name: string; price: number }) => {
    setSelectedSupplements(prev => {
      const exists = prev.some(x => x.name === supp.name);
      if (exists) {
        return prev.filter(x => x.name !== supp.name);
      }
      return [...prev, { name: supp.name, price: supp.price }];
    });
  };

  // Presets for crudités (Sans oignons removed as requested)
  const selectAllCrudites = () => setSelectedCrudites([...KEBAB_CRUDITES]);
  const selectNoCrudites = () => setSelectedCrudites([]);

  // Calculate extra sauce pricing: 1 or 2 sauces included, 3rd and more = +0.50 € each
  const extraSaucesCount = Math.max(0, selectedSauces.length - 2);
  const extraSaucesTotal = extraSaucesCount * 0.50;

  // Calculate pricing
  const supplementsTotal = selectedSupplements.reduce((sum, s) => sum + s.price, 0);
  const unitPrice = item.price + supplementsTotal + extraSaucesTotal;
  const totalPrice = unitPrice * quantity;

  // Handle submit
  const handleSubmit = () => {
    // Format descriptive comment for receipts, SMS, and kitchen
    const parts: string[] = [];
    if (selectedSauces.length > 0) {
      if (extraSaucesCount > 0) {
        parts.push(`Sauces: ${selectedSauces.join(', ')} (+${extraSaucesTotal.toFixed(2)}€)`);
      } else {
        parts.push(`Sauces: ${selectedSauces.join(', ')}`);
      }
    } else {
      parts.push('Sans sauce');
    }

    if (selectedCrudites.length === KEBAB_CRUDITES.length) {
      parts.push('Crudités: Complètes (Salade, Tomate, Oignons, Choux rouge, Çoban)');
    } else if (selectedCrudites.length === 0) {
      parts.push('Sans crudités');
    } else {
      parts.push(`Crudités: ${selectedCrudites.join(', ')}`);
    }

    if (selectedSupplements.length > 0) {
      parts.push(`Suppléments: ${selectedSupplements.map(s => `${s.name} (+${s.price.toFixed(2)}€)`).join(', ')}`);
    }

    if (specialNote.trim()) {
      parts.push(`Note: ${specialNote.trim()}`);
    }

    const comment = parts.join(' | ');

    const kebabOptions: KebabOptions = {
      crudites: selectedCrudites,
      sauces: selectedSauces,
      supplements: selectedSupplements,
    };
    if (specialNote.trim()) {
      kebabOptions.specialNote = specialNote.trim();
    }

    onConfirm({
      item,
      quantity,
      kebabOptions,
      totalPrice,
      comment,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden my-6 border border-gray-100 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="relative bg-logo-bordeaux text-white p-5 sm:p-6 shrink-0">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Fermer"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-logo-cream text-logo-text text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Flame size={12} className="text-logo-bordeaux" /> Personnalisation Kebab
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
            {item.name}
          </h2>
          <p className="text-logo-cream/90 text-sm font-semibold mt-1">
            Base : {item.price.toFixed(2)} €
          </p>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-logo-text flex-1">
          
          {/* SECTION 1: CRUDITÉS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-extrabold text-base text-logo-text flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  1. Choix des crudités
                </h3>
                <p className="text-xs text-gray-500 font-medium">Cochez les crudités désirées (décochées par défaut)</p>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={selectAllCrudites}
                  className="text-[11px] font-bold px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
                >
                  Tout cocher
                </button>
                <button
                  type="button"
                  onClick={selectNoCrudites}
                  className="text-[11px] font-bold px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
                >
                  Tout décocher
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {KEBAB_CRUDITES.map(crudite => {
                const isChecked = selectedCrudites.includes(crudite);
                return (
                  <label
                    key={crudite}
                    onClick={() => toggleCrudite(crudite)}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                        isChecked
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-2xs'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check size={14} strokeWidth={3} />}
                    </div>
                    <span className="text-sm font-semibold capitalize">{crudite}</span>
                  </label>
                );
              })}
            </div>
            {selectedCrudites.length === 0 && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-2.5 mt-2 font-medium border border-gray-100">
                Aucune crudité cochée (votre kebab sera préparé sans crudités).
              </p>
            )}
          </div>

          {/* SECTION 2: SAUCES */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-extrabold text-base text-logo-text flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  2. Choix des sauces
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Jusqu'à 2 sauces incluses • <span className="font-bold text-amber-700">3ᵉ sauce et + : +0,50 €</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSauces([])}
                className="text-[11px] font-bold px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
              >
                Sans sauce
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {KEBAB_SAUCES.map(sauce => {
                const isSelected = selectedSauces.includes(sauce);
                const sauceIndex = selectedSauces.indexOf(sauce);
                const isExtra = isSelected && sauceIndex >= 2;
                const willBeExtra = !isSelected && selectedSauces.length >= 2;

                return (
                  <button
                    key={sauce}
                    type="button"
                    onClick={() => toggleSauce(sauce)}
                    className={`flex items-center justify-between p-3 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? isExtra
                          ? 'border-amber-500 bg-amber-50/70 text-amber-950 font-bold shadow-sm'
                          : 'border-logo-bordeaux bg-logo-bordeaux/5 text-logo-bordeaux font-bold shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                    }`}
                  >
                    <div className="flex flex-col pr-1 min-w-0">
                      <span className="text-sm font-medium leading-tight truncate">{sauce}</span>
                      {isExtra && (
                        <span className="text-[10px] font-extrabold text-amber-700 mt-0.5">
                          +0,50 € (3ᵉ sauce)
                        </span>
                      )}
                      {!isSelected && willBeExtra && (
                        <span className="text-[10px] font-extrabold text-gray-400 mt-0.5">
                          +0,50 €
                        </span>
                      )}
                      {!isSelected && !willBeExtra && (
                        <span className="text-[10px] font-medium text-emerald-600 mt-0.5">
                          Inclus
                        </span>
                      )}
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ml-1.5 border transition-all ${
                        isSelected
                          ? isExtra
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-logo-bordeaux border-logo-bordeaux text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Extra sauce summary badge */}
            {extraSaucesCount > 0 && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300/80 flex items-center justify-between text-xs font-bold text-amber-950 shadow-2xs">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-600 shrink-0" />
                  <span>{selectedSauces.length} sauces choisies ({extraSaucesCount} en supplément)</span>
                </span>
                <span className="bg-amber-200 text-amber-950 px-2 py-0.5 rounded-md font-black">
                  +{extraSaucesTotal.toFixed(2)} €
                </span>
              </div>
            )}

            {selectedSauces.length === 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-2.5 mt-2 font-medium">
                Aucune sauce sélectionnée (votre kebab sera préparé sans sauce).
              </p>
            )}
          </div>

          {/* SECTION 3: SUPPLÉMENTS GOURMANDS (Amélioration des boutons +1.50 €) */}
          <div className="pt-2 border-t border-gray-100">
            <div className="mb-3">
              <h3 className="font-extrabold text-base text-logo-text flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-logo-bordeaux"></span>
                3. Suppléments gourmands
              </h3>
              <p className="text-xs text-gray-500 font-medium">Sublimez votre kebab avec nos garnitures chaudes & fromages</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {KEBAB_SUPPLEMENTS.map(supp => {
                const isSelected = selectedSupplements.some(s => s.name === supp.name);
                return (
                  <div
                    key={supp.name}
                    onClick={() => toggleSupplement(supp)}
                    className={`group p-3.5 rounded-2xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
                      isSelected
                        ? 'border-logo-bordeaux bg-gradient-to-b from-logo-bordeaux/5 via-amber-500/5 to-white ring-2 ring-logo-bordeaux/20 shadow-md'
                        : 'border-gray-200 hover:border-amber-300/80 bg-white hover:bg-amber-50/20 shadow-2xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl" role="img" aria-label={supp.name}>
                            {supp.icon}
                          </span>
                          <div>
                            <h4 className="font-black text-sm text-logo-text leading-tight group-hover:text-logo-bordeaux transition-colors">
                              {supp.name}
                            </h4>
                            <p className="text-[11px] text-gray-500 font-medium leading-snug mt-0.5">
                              {supp.desc}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced +1.50 € button */}
                    <div className="mt-3">
                      <div
                        className={`w-full py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                          isSelected
                            ? 'bg-logo-bordeaux text-white shadow-xs scale-[1.01]'
                            : 'bg-amber-50 group-hover:bg-amber-100 text-amber-950 border border-amber-300/90'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check size={14} strokeWidth={3} className="text-white" />
                            <span>Ajouté (+{supp.price.toFixed(2)} €)</span>
                          </>
                        ) : (
                          <>
                            <Plus size={14} strokeWidth={3} className="text-amber-800" />
                            <span>+{supp.price.toFixed(2)} €</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: NOTE SPÉCIALE */}
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Instruction spéciale (optionnel)
            </label>
            <input
              type="text"
              value={specialNote}
              onChange={e => setSpecialNote(e.target.value)}
              placeholder="ex: Bien cuit, sauce à part, etc."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-logo-bordeaux focus:ring-2 focus:ring-logo-bordeaux/20 outline-none text-sm font-medium text-logo-text"
            />
          </div>

        </div>

        {/* Footer with Price & Add to Cart button */}
        <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* Quantity Controls */}
          <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-2xl border border-gray-200 shadow-sm w-full sm:w-auto justify-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-1">Qté</span>
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-logo-text flex items-center justify-center transition-colors cursor-pointer"
            >
              <Minus size={16} />
            </button>
            <span className="w-7 text-center font-black text-lg text-logo-text tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-logo-text flex items-center justify-center transition-colors cursor-pointer"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Confirm Button styled with user preference */}
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-logo-cream text-logo-text font-black text-sm sm:text-base uppercase tracking-[0.12em] shadow-xl hover:scale-[1.02] hover:brightness-105 active:scale-95 transition-all duration-300 border-2 border-logo-cream flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Plus size={20} strokeWidth={3} className="text-logo-text" />
            <span>Ajouter au panier</span>
            <span className="text-xs sm:text-sm font-black opacity-90">
              • {totalPrice.toFixed(2)} €
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
