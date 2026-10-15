import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../types';
import { Clock, CheckCircle2, ChefHat, AlertCircle, Sparkles, BellRing, Flame, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface OrderCountdownCardProps {
  order: Order;
  isOwner?: boolean;
  onExtendPrepTime?: (orderId: string, additionalMinutes: number) => void;
  onSetExactPrepTime?: (orderId: string, exactMinutes: number) => void;
  onSetStatus?: (orderId: string, status: OrderStatus) => void;
}

export const OrderCountdownCard: React.FC<OrderCountdownCardProps> = ({
  order,
  isOwner = false,
  onExtendPrepTime,
  onSetExactPrepTime,
  onSetStatus,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [customMinutes, setCustomMinutes] = useState<string>('20');

  // Calculate target time and update countdown every second
  useEffect(() => {
    if (order.status === 'ready' || order.status === 'completed' || order.status === 'cancelled') {
      setSecondsRemaining(0);
      return;
    }

    const calculateTime = () => {
      const nowMs = Date.now();

      let targetMs: number | null = null;
      if (order.targetReadyAt?.toDate) {
        targetMs = order.targetReadyAt.toDate().getTime();
      } else if (order.targetReadyAt?.seconds) {
        targetMs = order.targetReadyAt.seconds * 1000;
      } else if (typeof order.targetReadyAt === 'number') {
        targetMs = order.targetReadyAt;
      } else if (order.targetReadyAt instanceof Date) {
        targetMs = order.targetReadyAt.getTime();
      } else if (typeof order.targetReadyAt === 'string') {
        targetMs = new Date(order.targetReadyAt).getTime();
      }

      if (!targetMs || isNaN(targetMs)) {
        let createdMs: number;
        if (order.createdAt?.toDate) {
          createdMs = order.createdAt.toDate().getTime();
        } else if (order.createdAt?.seconds) {
          createdMs = order.createdAt.seconds * 1000;
        } else if (order.createdAt instanceof Date) {
          createdMs = order.createdAt.getTime();
        } else if (typeof order.createdAt === 'string') {
          createdMs = new Date(order.createdAt).getTime();
        } else {
          createdMs = nowMs;
        }

        const baseMinutes = order.estimatedMinutes || 20;
        const extraMinutes = order.extraMinutes || 0;
        const totalPrepMs = (baseMinutes + extraMinutes) * 60 * 1000;
        targetMs = createdMs + totalPrepMs;
      }

      // If targetMs is expired for an active order, default to 20 minutes from now so it never stays stuck at 0
      if (targetMs <= nowMs && (order.status === 'pending' || order.status === 'validated')) {
        targetMs = nowMs + 20 * 60 * 1000;
      }

      const diffMs = targetMs - nowMs;
      const remainingSecs = Math.max(0, Math.floor(diffMs / 1000));
      setSecondsRemaining(remainingSecs);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [order.createdAt, order.estimatedMinutes, order.extraMinutes, order.targetReadyAt, order.status, order.pickupTime]);

  const formatCountdown = (secs: number | null) => {
    if (secs === null) return '--:--';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isReady = order.status === 'ready';
  const isCompleted = order.status === 'completed';
  const isCancelled = order.status === 'cancelled';
  const isPending = order.status === 'pending';
  const isValidated = order.status === 'validated';
  const isActive = isPending || isValidated;

  return (
    <div
      className={`rounded-3xl border transition-all duration-300 overflow-hidden shadow-sm ${
        isReady
          ? 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 border-emerald-300 ring-2 ring-emerald-400/30 shadow-emerald-100 shadow-md'
          : isCancelled
          ? 'bg-gray-50 border-gray-200 opacity-70'
          : 'bg-white border-gray-100 shadow-sm'
      }`}
    >
      {/* Top Banner Status */}
      {isReady ? (
        <div className="bg-emerald-600 text-white px-5 py-3 flex items-center justify-between font-black text-xs sm:text-sm uppercase tracking-wider animate-pulse">
          <div className="flex items-center gap-2">
            <BellRing size={18} className="animate-bounce" />
            <span>🎉 Commande prête ! À récupérer au comptoir</span>
          </div>
          <span className="bg-white text-emerald-800 px-2.5 py-0.5 rounded-full text-xs font-black">
            #{order.id.slice(-4).toUpperCase()}
          </span>
        </div>
      ) : isActive ? (
        <div className="bg-logo-bordeaux/90 text-white px-5 py-2.5 flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
            <Flame size={15} className="text-logo-cream animate-pulse" />
            <span>
              {isValidated ? 'En cours de préparation au grill' : 'Commande enregistrée en cuisine'}
            </span>
          </div>
          <span className="text-logo-cream bg-white/10 px-2 py-0.5 rounded-full">
            #{order.id.slice(-4).toUpperCase()}
          </span>
        </div>
      ) : null}

      <div className="p-5 sm:p-6 text-logo-text">
        {/* Header Information */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-lg text-logo-text">
                Commande #{order.id.slice(-4).toUpperCase()}
              </h3>
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                  isReady
                    ? 'bg-emerald-100 text-emerald-800'
                    : isValidated
                    ? 'bg-amber-100 text-amber-800'
                    : isPending
                    ? 'bg-blue-100 text-blue-800'
                    : isCompleted
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {order.status === 'ready'
                  ? 'Prête'
                  : order.status === 'validated'
                  ? 'En préparation'
                  : order.status === 'pending'
                  ? 'Reçue'
                  : order.status === 'completed'
                  ? 'Terminée'
                  : 'Annulée'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('fr-FR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              }) : 'À l\'instant'}
              {order.customerName && isOwner && (
                <span className="font-bold text-gray-600 ml-2">• Client : {order.customerName}</span>
              )}
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Total</span>
            <span className="text-xl font-black text-logo-bordeaux tabular-nums">
              {order.total.toFixed(2)} €
            </span>
          </div>
        </div>

        {/* COUNTDOWN TIMER SECTION (If Active) */}
        {isActive && (
          <div className="my-5 p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 to-orange-50/40 border border-amber-200/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-logo-bordeaux/10 flex items-center justify-center text-logo-bordeaux">
                  <Clock size={20} className="animate-spin-slow" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-logo-text block">
                    Temps restant
                  </span>
                  <span className="text-[11px] text-gray-500 font-semibold">
                    {secondsRemaining && secondsRemaining > 0 ? 'Préparation en cuisine' : 'Presque prêt !'}
                  </span>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-logo-bordeaux tabular-nums tracking-tight font-mono bg-white/80 px-3.5 py-1.5 rounded-xl border border-amber-200/80 shadow-xs">
                {formatCountdown(secondsRemaining)}
              </div>
            </div>

            {/* Prolongation notice if extraMinutes > 0 */}
            {(order.extraMinutes || 0) > 0 && (
              <div className="mt-3 bg-white/90 p-2.5 rounded-xl border border-amber-300 text-xs text-amber-900 font-semibold flex items-center gap-2 shadow-xs">
                <ChefHat size={16} className="text-logo-bordeaux shrink-0" />
                <span>
                  Temps de préparation prolongé de <strong className="text-logo-bordeaux">+{order.extraMinutes} min</strong> par le chef pour assurer la cuisson parfaite de vos viandes.
                </span>
              </div>
            )}
          </div>
        )}

        {/* READY CELEBRATION BOX */}
        {isReady && (
          <div className="my-5 p-4 sm:p-5 rounded-2xl bg-emerald-500 text-white text-center shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-14 h-14 bg-white text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                <CheckCircle2 size={32} strokeWidth={2.5} />
              </div>
              <h4 className="text-xl sm:text-2xl font-black uppercase tracking-tight mb-1">
                Votre festin est prêt !
              </h4>
              <p className="text-emerald-50 text-sm font-medium max-w-md mx-auto mb-3">
                Présentez votre numéro de commande au comptoir pour retirer votre plateau chaud.
              </p>
              <div className="inline-block bg-white text-emerald-900 px-4 py-1.5 rounded-xl font-black text-lg tracking-widest shadow-sm">
                N° #{order.id.slice(-4).toUpperCase()}
              </div>
            </div>
          </div>
        )}

        {/* Stepper Status Indicator */}
        <div className="grid grid-cols-3 gap-2 my-4 pt-2 border-t border-gray-100 text-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                isPending || isValidated || isReady || isCompleted
                  ? 'bg-logo-bordeaux text-white shadow-xs'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              1
            </div>
            <span className="text-[11px] font-bold text-gray-600">Reçue</span>
          </div>

          <div className="flex flex-col items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                isValidated || isReady || isCompleted
                  ? 'bg-logo-bordeaux text-white shadow-xs'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              2
            </div>
            <span className="text-[11px] font-bold text-gray-600">En cuisine</span>
          </div>

          <div className="flex flex-col items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                isReady || isCompleted
                  ? 'bg-emerald-500 text-white shadow-xs animate-bounce'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              3
            </div>
            <span
              className={`text-[11px] font-bold ${
                isReady ? 'text-emerald-700 font-extrabold' : 'text-gray-600'
              }`}
            >
              Prête
            </span>
          </div>
        </div>

        {/* Order Items List with customized kebab options */}
        <div className="bg-gray-50/80 rounded-2xl p-4 my-4 space-y-3 border border-gray-100">
          <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest block">
            Articles commandés ({order.items.reduce((s, i) => s + i.quantity, 0)})
          </span>
          {order.items.map((item, idx) => (
            <div key={idx} className="border-b border-gray-200/50 last:border-0 pb-2.5 last:pb-0">
              <div className="flex justify-between items-start text-sm">
                <span className="font-extrabold text-logo-text">
                  {item.quantity}x {item.name}
                </span>
                <span className="font-black text-logo-bordeaux tabular-nums">
                  {(item.price * item.quantity).toFixed(2)} €
                </span>
              </div>

              {/* Display customized kebab details */}
              {item.kebabOptions && (
                <div className="mt-1.5 space-y-1 text-xs">
                  {item.kebabOptions.sauces && item.kebabOptions.sauces.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-gray-500">Sauce:</span>
                      {item.kebabOptions.sauces.map(s => (
                        <span key={s} className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-md text-[10px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.kebabOptions.crudites && item.kebabOptions.crudites.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-gray-500">Crudités:</span>
                      {item.kebabOptions.crudites.map(c => (
                        <span key={c} className="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-md text-[10px]">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.kebabOptions.supplements && item.kebabOptions.supplements.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-logo-bordeaux">Suppléments:</span>
                      {item.kebabOptions.supplements.map(supp => (
                        <span key={supp.name} className="bg-logo-cream/70 text-logo-text font-black px-2 py-0.5 rounded-md text-[10px]">
                          +{supp.name} ({supp.price.toFixed(2)}€)
                        </span>
                      ))}
                    </div>
                  )}

                  {item.kebabOptions.specialNote && (
                    <p className="text-gray-500 italic text-[11px]">
                      Note: {item.kebabOptions.specialNote}
                    </p>
                  )}
                </div>
              )}

              {/* Standard comment fallback if no structured kebabOptions */}
              {!item.kebabOptions && item.comment && (
                <p className="text-xs text-logo-bordeaux italic mt-1 font-medium bg-white/60 p-1.5 rounded-lg border border-gray-100">
                  {item.comment}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Pickup & Payment Details */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 text-gray-500 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg">
              {order.paymentMethod === 'paypal' ? 'PayPal' : order.paymentMethod === 'wero' ? 'Wero' : order.paymentMethod === 'revolut' ? 'Revolut' : 'Au Comptoir'}
            </span>
            <span className="font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg">
              {order.pickupTime === 'now' ? 'ASAP (au plus vite)' : order.pickupTime === '20min' ? 'Dans ~20 min' : 'Dans ~1h'}
            </span>
          </div>
          {order.pointsEarned ? (
            <span className="text-logo-bordeaux font-bold text-[11px]">
              +{order.pointsEarned} pts fidélité
            </span>
          ) : null}
        </div>

        {/* OWNER CONTROLS */}
        {isOwner && onSetStatus && (
          <div className="mt-5 pt-4 border-t-2 border-dashed border-gray-200 bg-amber-50/50 p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-logo-bordeaux flex items-center gap-1.5">
                <ChefHat size={16} /> Panneau de Contrôle Propriétaire
              </span>
              <span className="text-[11px] font-bold text-gray-500">
                Commande #{order.id.slice(-4).toUpperCase()}
              </span>
            </div>

            {/* Exact Remaining Time Controls (Requested by user) */}
            {isActive && (
              <div className="mb-4 bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-logo-text flex items-center gap-1.5">
                    <Clock size={14} className="text-logo-bordeaux" />
                    Régler le temps exact :
                  </label>
                  <span className="text-[11px] font-bold text-logo-bordeaux bg-amber-100 px-2.5 py-0.5 rounded-md">
                    Temps restant : {formatCountdown(secondsRemaining)}
                  </span>
                </div>

                {/* Quick exact time buttons */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-2.5">
                  {[5, 10, 15, 20, 25, 30].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        setCustomMinutes(mins.toString());
                        onSetExactPrepTime?.(order.id, mins);
                      }}
                      className="py-1.5 px-2 rounded-lg font-black text-xs transition-all border bg-gray-50 hover:bg-logo-bordeaux hover:text-white hover:border-logo-bordeaux text-logo-text border-gray-200 cursor-pointer text-center"
                    >
                      {mins} min
                    </button>
                  ))}
                </div>

                {/* Custom exact minutes input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const val = parseInt(customMinutes, 10);
                    if (!isNaN(val) && val > 0) {
                      onSetExactPrepTime?.(order.id, val);
                    }
                  }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(e.target.value)}
                      placeholder="Minutes..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-logo-text outline-none focus:ring-2 focus:ring-logo-bordeaux/20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400">
                      min
                    </span>
                  </div>
                  <button
                    type="submit"
                    className="py-1.5 px-3 rounded-xl bg-logo-bordeaux hover:bg-logo-bordeaux/90 text-white font-black text-xs shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    Définir exact
                  </button>
                </form>

                {/* Quick Additive Extension */}
                {onExtendPrepTime && (
                  <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-gray-100 flex-wrap">
                    <span className="text-[11px] font-bold text-gray-500">Ou prolonger :</span>
                    <button
                      type="button"
                      onClick={() => onExtendPrepTime(order.id, 5)}
                      className="py-1 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-logo-bordeaux border border-amber-300 font-extrabold text-[11px] transition-colors cursor-pointer"
                    >
                      +5 min
                    </button>
                    <button
                      type="button"
                      onClick={() => onExtendPrepTime(order.id, 10)}
                      className="py-1 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-logo-bordeaux border border-amber-300 font-extrabold text-[11px] transition-colors cursor-pointer"
                    >
                      +10 min
                    </button>
                    <button
                      type="button"
                      onClick={() => onExtendPrepTime(order.id, 15)}
                      className="py-1 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-logo-bordeaux border border-amber-300 font-extrabold text-[11px] transition-colors cursor-pointer"
                    >
                      +15 min
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Status Change Buttons */}
            <div className="flex flex-wrap gap-2">
              {isPending && (
                <button
                  type="button"
                  onClick={() => onSetStatus(order.id, 'validated')}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-logo-bordeaux text-white font-black text-xs uppercase tracking-wider hover:bg-logo-bordeaux/90 transition-colors shadow-sm cursor-pointer"
                >
                  🔥 Valider & Lancer la cuisson
                </button>
              )}

              {isActive && (
                <button
                  type="button"
                  onClick={() => onSetStatus(order.id, 'ready')}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  Mettre en statut PRÊT
                </button>
              )}

              {isReady && (
                <button
                  type="button"
                  onClick={() => onSetStatus(order.id, 'completed')}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider transition-colors shadow-md cursor-pointer"
                >
                  📦 Commande Récupérée / Terminer
                </button>
              )}

              {isActive && (
                <button
                  type="button"
                  onClick={() => onSetStatus(order.id, 'cancelled')}
                  className="py-2.5 px-3 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
