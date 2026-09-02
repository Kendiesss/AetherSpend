import React, { useState } from 'react';
import { Transaction, Category } from '../types';
import { format } from 'date-fns';
import { Store, Calendar, DollarSign, Tag, Trash2, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete?: (id: string) => void;
  documentTypes?: string[];
}

const CATEGORY_STYLES: Record<Category, string> = {
  Groceries: 'bg-cyberse-glow/10 text-cyberse-glow border-cyberse-glow/20',
  Dining: 'bg-cyberse-link/10 text-cyberse-link border-cyberse-link/20',
  Utilities: 'bg-cyberse-purple/10 text-cyberse-purple border-cyberse-purple/20',
  Transport: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  Health: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  Shopping: 'bg-pink-400/10 text-pink-400 border-pink-400/20',
  Entertainment: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20',
  Misc: 'bg-cyberse-muted/10 text-cyberse-muted border-cyberse-muted/20'
};

export default function TransactionList({ transactions, onDelete, documentTypes = [] }: TransactionListProps) {
  const [selectedDocFilter, setSelectedDocFilter] = useState<string>('all');

  const filteredTransactions = transactions.filter(t => {
    if (selectedDocFilter === 'all') return true;
    return (t.documentType || 'Official Receipt (OR)') === selectedDocFilter;
  });

  return (
    <div className="cyber-card overflow-hidden">
      <div className="p-6 md:p-8 border-b border-cyberse-glow/10 bg-cyberse-darker/30 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-black text-cyberse-glow uppercase tracking-[0.2em]">Transaction Archives</h3>
            <span className="text-[10px] font-bold text-cyberse-bg bg-cyberse-glow px-2 py-0.5 rounded-sm uppercase tracking-widest">
              {filteredTransactions.length} of {transactions.length}
            </span>
          </div>
          <span className="text-[10px] font-bold text-cyberse-muted uppercase tracking-widest hidden sm:inline">
            Multi-Tab Categorization
          </span>
        </div>

        {/* Filter by Document Type Pills */}
        {documentTypes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedDocFilter('all')}
              className={cn(
                "px-3 py-1 rounded-lg font-black uppercase tracking-wider text-[10px] border whitespace-nowrap transition-all",
                selectedDocFilter === 'all'
                  ? "bg-cyberse-glow text-cyberse-bg border-cyberse-glow shadow-[0_0_10px_rgba(0,242,255,0.3)]"
                  : "bg-cyberse-darker text-cyberse-muted border-cyberse-glow/10 hover:text-cyberse-text"
              )}
            >
              All Types ({transactions.length})
            </button>
            {documentTypes.map(docType => {
              const count = transactions.filter(t => (t.documentType || 'Official Receipt (OR)') === docType).length;
              return (
                <button
                  key={docType}
                  onClick={() => setSelectedDocFilter(docType)}
                  className={cn(
                    "px-3 py-1 rounded-lg font-black uppercase tracking-wider text-[10px] border whitespace-nowrap transition-all",
                    selectedDocFilter === docType
                      ? "bg-cyberse-glow text-cyberse-bg border-cyberse-glow shadow-[0_0_10px_rgba(0,242,255,0.3)]"
                      : "bg-cyberse-darker text-cyberse-muted border-cyberse-glow/10 hover:text-cyberse-text"
                  )}
                >
                  {docType} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="divide-y divide-cyberse-glow/5">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-xs text-cyberse-muted uppercase tracking-widest">
              No transactions found {selectedDocFilter !== 'all' ? `under tab "${selectedDocFilter}"` : 'in database'}.
            </p>
          </div>
        ) : (
          filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t) => (
            <div key={t.id} className="p-6 hover:bg-cyberse-glow/5 transition-all group relative overflow-hidden">
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center border transition-all group-hover:scale-110",
                    CATEGORY_STYLES[t.category] || CATEGORY_STYLES.Misc
                  )}>
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-cyberse-text tracking-wide uppercase text-sm">{t.merchant}</h4>
                      {/* Document Type Badge */}
                      <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-cyberse-dark border border-cyberse-glow/30 text-cyberse-glow">
                        Tab: {t.documentType || 'Official Receipt (OR)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-[10px] text-cyberse-muted uppercase tracking-tighter font-mono">
                        <Calendar className="w-3 h-3 text-cyberse-glow/50" />
                        {format(new Date(t.date), 'yyyy.MM.dd')}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-[0.2em] border",
                        CATEGORY_STYLES[t.category] || CATEGORY_STYLES.Misc
                      )}>
                        {t.category}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-lg font-black text-cyberse-glow tracking-tighter drop-shadow-[0_0_8px_rgba(0,242,255,0.3)]">
                      ${t.amount.toFixed(2)}
                    </p>
                  </div>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(t.id)}
                      className="p-2 rounded-lg text-cyberse-muted hover:text-cyberse-link hover:bg-cyberse-link/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
              {/* Decorative side bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyberse-glow/0 group-hover:bg-cyberse-glow transition-all" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
