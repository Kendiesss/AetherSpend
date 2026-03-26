import React, { useState } from 'react';
import { ReceiptData, Category } from '../types';
import { Check, X, Calendar, Store, DollarSign, Tag } from 'lucide-react';
import { cn } from '../lib/utils';

interface ManualOverrideProps {
  data: ReceiptData;
  onConfirm: (data: ReceiptData) => void;
  onCancel: () => void;
}

const categories: Category[] = ["Groceries", "Dining", "Utilities", "Transport", "Health", "Shopping", "Entertainment", "Misc"];

export default function ManualOverride({ data, onConfirm, onCancel }: ManualOverrideProps) {
  const [editedData, setEditedData] = useState<ReceiptData>(data);

  const handleChange = (field: keyof ReceiptData, value: string | number) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-primary/5 p-8 border-b border-slate-100">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Check className="w-6 h-6 text-primary" />
          Aether-Scan Result
        </h2>
        <p className="text-slate-500 mt-1">Please confirm or edit the extracted information.</p>
      </div>

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Store className="w-4 h-4 text-slate-400" />
              Merchant
            </label>
            <input
              type="text"
              value={editedData.merchant}
              onChange={(e) => handleChange('merchant', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-400" />
              Total Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={editedData.amount}
              onChange={(e) => handleChange('amount', parseFloat(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Date
            </label>
            <input
              type="date"
              value={editedData.date.split('T')[0]}
              onChange={(e) => handleChange('date', e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString())}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-400" />
              Category
            </label>
            <select
              value={editedData.category}
              onChange={(e) => handleChange('category', e.target.value as Category)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4">
          <button
            onClick={() => onConfirm(editedData)}
            className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Confirm & Save
          </button>
          <button
            onClick={onCancel}
            className="px-8 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
