import React, { useState } from 'react';
import { Restaurant } from '../types';
import { X, UserPlus } from 'lucide-react';
import { playClickSound } from '../services/sound';

interface WalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: Restaurant;
  onAddWalkIn: (restaurantId: string, partySize: number, customerName?: string, notes?: string) => void;
}

export const WalkInModal: React.FC<WalkInModalProps> = ({
  isOpen,
  onClose,
  restaurant,
  onAddWalkIn,
}) => {
  const [partySize, setPartySize] = useState(2);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    onAddWalkIn(
      restaurant.id,
      partySize,
      customerName.trim() || `Walk-in Guest (${partySize}p)`,
      notes.trim() || undefined
    );
    setCustomerName('');
    setNotes('');
    setPartySize(2);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-7 shadow-2xl space-y-6"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Issue Walk-in Token</h2>
              <p className="text-xs text-slate-500">{restaurant.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Party Size
            </label>
            <div className="grid grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setPartySize(num);
                  }}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    partySize === num
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/25'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {num}{num === 6 ? '+' : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="walkin-name-input" className="text-xs font-semibold text-slate-600">
              Customer Name / Identifier
            </label>
            <input
              id="walkin-name-input"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Liam T. / Blue jacket"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:outline-none text-sm text-slate-900 placeholder-slate-400"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="walkin-notes-input" className="text-xs font-semibold text-slate-600">
              Staff Notes (Optional)
            </label>
            <input
              id="walkin-notes-input"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. High chair needed, patio table"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:outline-none text-sm text-slate-900 placeholder-slate-400"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              Generate &amp; Enqueue Token
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
