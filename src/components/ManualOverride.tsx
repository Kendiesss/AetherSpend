import React, { useState } from 'react';
import { ReceiptData, Category, DEFAULT_DOCUMENT_TYPES } from '../types';
import { Check, X, Calendar, Store, DollarSign, Tag, FileText, FileSpreadsheet } from 'lucide-react';
import { cn } from '../lib/utils';

interface ManualOverrideProps {
  data: ReceiptData;
  documentTypes?: string[];
  spreadsheetName?: string;
  hasSpreadsheetLinked?: boolean;
  onConfirm: (data: ReceiptData) => void;
  onCancel: () => void;
  onOpenSheetsHub?: () => void;
}

const categories: Category[] = ["Groceries", "Dining", "Utilities", "Transport", "Health", "Shopping", "Entertainment", "Misc"];

export default function ManualOverride({ 
  data, 
  documentTypes = DEFAULT_DOCUMENT_TYPES,
  spreadsheetName,
  hasSpreadsheetLinked = true,
  onConfirm, 
  onCancel,
  onOpenSheetsHub
}: ManualOverrideProps) {
  const [editedData, setEditedData] = useState<ReceiptData>({
    ...data,
    documentType: data.documentType || documentTypes[0] || 'Official Receipt (OR)'
  });

  const handleChange = (field: keyof ReceiptData, value: string | number) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="w-full max-w-2xl mx-auto cyber-card overflow-hidden border-cyberse-glow/30 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-cyberse-glow/5 p-8 border-b border-cyberse-glow/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-cyberse-glow flex items-center gap-2 tracking-widest uppercase">
              <Check className="w-6 h-6 text-cyberse-glow" />
              Cyber-Scan Verification
            </h2>
            <p className="text-cyberse-muted mt-1 uppercase text-[10px] font-bold tracking-widest">
              Verify extracted data stream & target destination before archival.
            </p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider bg-cyberse-glow/10 text-cyberse-glow border border-cyberse-glow/30 px-3 py-1 rounded-lg">
            {editedData.documentType}
          </span>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* Destination Tab Pill */}
        {hasSpreadsheetLinked ? (
          <div className="bg-cyberse-darker/90 border border-cyberse-glow/20 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-cyberse-muted">
              <span className="w-2 h-2 rounded-full bg-cyberse-glow animate-pulse" />
              <FileSpreadsheet className="w-4 h-4 text-cyberse-glow" />
              <span className="font-bold uppercase tracking-wider">Live Streaming Destination:</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-right">
              <span className="text-cyberse-muted truncate max-w-[150px]">{spreadsheetName || 'CyberSpend Archive'} &gt;</span>
              <span className="text-cyberse-glow font-black bg-cyberse-glow/10 px-2 py-0.5 rounded border border-cyberse-glow/30 whitespace-nowrap">
                Tab: "{editedData.documentType}"
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-cyberse-darker/70 border border-cyberse-purple/30 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-cyberse-muted">
              <FileSpreadsheet className="w-4 h-4 text-cyberse-purple" />
              <span className="font-bold uppercase tracking-wider text-cyberse-purple">Storage Mode:</span>
              <span className="text-cyberse-muted">Saved to Cloud DB & Local</span>
            </div>
            {onOpenSheetsHub && (
              <button
                type="button"
                onClick={onOpenSheetsHub}
                className="text-[10px] font-black uppercase tracking-wider bg-cyberse-purple/20 hover:bg-cyberse-purple text-white px-2.5 py-1 rounded-lg transition-all"
              >
                Link Sheet
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Document Classification */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black text-cyberse-glow uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyberse-glow" />
              Document Type (Routes to Specific Sheet Tab)
            </label>
            <select
              value={editedData.documentType}
              onChange={(e) => handleChange('documentType', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-cyberse-darker border border-cyberse-glow/30 text-cyberse-text focus:outline-none focus:ring-2 focus:ring-cyberse-glow/30 focus:border-cyberse-glow transition-all font-black tracking-wide"
            >
              {documentTypes.map(docType => (
                <option key={docType} value={docType} className="bg-cyberse-dark text-cyberse-text">
                  {docType}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-cyberse-muted uppercase tracking-widest flex items-center gap-2">
              <Store className="w-4 h-4 text-cyberse-glow/50" />
              Merchant Node
            </label>
            <input
              type="text"
              value={editedData.merchant}
              onChange={(e) => handleChange('merchant', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-cyberse-darker border border-cyberse-glow/20 text-cyberse-text focus:outline-none focus:ring-2 focus:ring-cyberse-glow/20 focus:border-cyberse-glow transition-all font-bold tracking-wide"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-cyberse-muted uppercase tracking-widest flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-cyberse-glow/50" />
              Asset Value
            </label>
            <input
              type="number"
              step="0.01"
              value={editedData.amount}
              onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-xl bg-cyberse-darker border border-cyberse-glow/20 text-cyberse-text focus:outline-none focus:ring-2 focus:ring-cyberse-glow/20 focus:border-cyberse-glow transition-all font-bold tracking-wide"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-cyberse-muted uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyberse-glow/50" />
              Timestamp
            </label>
            <input
              type="date"
              value={editedData.date ? editedData.date.split('T')[0] : new Date().toISOString().split('T')[0]}
              onChange={(e) => handleChange('date', e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString())}
              className="w-full px-4 py-3 rounded-xl bg-cyberse-darker border border-cyberse-glow/20 text-cyberse-text focus:outline-none focus:ring-2 focus:ring-cyberse-glow/20 focus:border-cyberse-glow transition-all font-bold tracking-wide"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-cyberse-muted uppercase tracking-widest flex items-center gap-2">
              <Tag className="w-4 h-4 text-cyberse-glow/50" />
              Sector
            </label>
            <select
              value={editedData.category}
              onChange={(e) => handleChange('category', e.target.value as Category)}
              className="w-full px-4 py-3 rounded-xl bg-cyberse-darker border border-cyberse-glow/20 text-cyberse-text focus:outline-none focus:ring-2 focus:ring-cyberse-glow/20 focus:border-cyberse-glow transition-all font-bold tracking-wide appearance-none"
            >
              {categories.map(cat => (
                <option key={cat} value={cat} className="bg-cyberse-dark text-cyberse-text">{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4">
          <button
            onClick={() => onConfirm(editedData)}
            className="flex-1 bg-cyberse-glow text-cyberse-bg py-4 rounded-xl font-black hover:bg-white transition-all shadow-[0_0_20px_rgba(0,242,255,0.3)] flex items-center justify-center gap-2 uppercase tracking-widest text-sm active:scale-[0.99]"
          >
            <Check className="w-5 h-5" />
            {hasSpreadsheetLinked ? 'Commit & Stream to Sheet' : 'Commit & Archive Record'}
          </button>
          <button
            onClick={onCancel}
            className="px-8 py-4 rounded-xl font-black text-cyberse-muted hover:bg-cyberse-darker hover:text-cyberse-link transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm border border-cyberse-glow/10"
          >
            <X className="w-5 h-5" />
            Abort
          </button>
        </div>
      </div>
    </div>
  );
}
