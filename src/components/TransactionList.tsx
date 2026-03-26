import React from 'react';
import { Transaction, Category } from '../types';
import { format } from 'date-fns';
import { Store, Calendar, DollarSign, Tag, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete?: (id: string) => void;
}

const CATEGORY_STYLES: Record<Category, string> = {
  Groceries: 'bg-blue-100 text-blue-700',
  Dining: 'bg-red-100 text-red-700',
  Utilities: 'bg-emerald-100 text-emerald-700',
  Transport: 'bg-amber-100 text-amber-700',
  Health: 'bg-violet-100 text-violet-700',
  Shopping: 'bg-pink-100 text-pink-700',
  Entertainment: 'bg-cyan-100 text-cyan-700',
  Misc: 'bg-slate-100 text-slate-700'
};

export default function TransactionList({ transactions, onDelete }: TransactionListProps) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Recent Transactions</h3>
        <span className="text-sm font-medium text-slate-500">{transactions.length} total</span>
      </div>
      
      <div className="divide-y divide-slate-50">
        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500">No transactions yet. Start by scanning a receipt!</p>
          </div>
        ) : (
          transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t) => (
            <div key={t.id} className="p-6 hover:bg-slate-50 transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    CATEGORY_STYLES[t.category] || CATEGORY_STYLES.Misc
                  )}>
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{t.merchant}</h4>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(t.date), 'MMM d, yyyy')}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        CATEGORY_STYLES[t.category] || CATEGORY_STYLES.Misc
                      )}>
                        {t.category}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <p className="text-lg font-bold text-slate-900">${t.amount.toFixed(2)}</p>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(t.id)}
                      className="p-2 rounded-xl text-slate-300 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
