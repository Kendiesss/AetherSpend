import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Transaction, Category, SpreadsheetConfig } from '../types';
import { cn } from '../lib/utils';
import { DollarSign, TrendingUp, TrendingDown, Wallet, FileSpreadsheet, ExternalLink, RefreshCw, Layers } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  spreadsheetConfig?: SpreadsheetConfig;
  documentTypes?: string[];
  onOpenSheetsHub?: () => void;
}

const COLORS = [
  '#00f2ff', // Cyberse Glow (Cyan)
  '#ff4d00', // Cyberse Link (Orange)
  '#9d4edd', // Cyberse Purple
  '#f72585', // Neon Pink
  '#4361ee', // Electric Blue
  '#4cc9f0', // Sky Blue
  '#3a0ca3', // Deep Indigo
  '#7c8db5'  // Cyberse Muted
];

const CATEGORY_MAP: Record<Category, string> = {
  Groceries: COLORS[0],
  Dining: COLORS[1],
  Utilities: COLORS[2],
  Transport: COLORS[3],
  Health: COLORS[4],
  Shopping: COLORS[5],
  Entertainment: COLORS[6],
  Misc: COLORS[7]
};

export default function Dashboard({ 
  transactions,
  spreadsheetConfig,
  documentTypes = [],
  onOpenSheetsHub
}: DashboardProps) {
  const totalSpending = transactions.reduce((sum, t) => sum + t.amount, 0);
  
  const categoryData = Object.entries(
    transactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* Google Sheets Multi-Tab Live Integration Banner */}
      <div className="cyber-card p-6 bg-gradient-to-r from-cyberse-darker/90 via-cyberse-dark to-cyberse-darker/90 border-cyberse-glow/30 shadow-[0_0_30px_rgba(0,242,255,0.08)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyberse-glow/10 border border-cyberse-glow/30 flex items-center justify-center text-cyberse-glow shrink-0 shadow-[0_0_15px_rgba(0,242,255,0.2)]">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-cyberse-text tracking-wider uppercase">
                Google Sheets Multi-Tab Archive
              </h4>
              <span className={cn(
                "text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border",
                spreadsheetConfig?.spreadsheetId 
                  ? "bg-cyberse-glow/10 text-cyberse-glow border-cyberse-glow/30" 
                  : "bg-cyberse-muted/10 text-cyberse-muted border-cyberse-muted/20"
              )}>
                {spreadsheetConfig?.spreadsheetId ? 'Connected & Routing' : 'Setup Available'}
              </span>
            </div>
            <p className="text-xs text-cyberse-muted mt-0.5">
              {spreadsheetConfig?.spreadsheetId ? (
                <span>
                  Forwarding scans to <strong className="text-cyberse-glow">"{spreadsheetConfig.spreadsheetName || 'CyberSpend Archive'}"</strong> across {documentTypes.length} categorized tabs.
                </span>
              ) : (
                'Auto-organize your receipts (OR, SI, CR, etc.) into designated Google Sheet tabs instantly.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {spreadsheetConfig?.spreadsheetUrl && (
            <a
              href={spreadsheetConfig.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-cyberse-darker hover:bg-cyberse-dark text-cyberse-glow text-xs font-black uppercase tracking-wider border border-cyberse-glow/30 flex items-center justify-center gap-2 transition-all flex-1 md:flex-none"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Sheet ↗
            </a>
          )}
          {onOpenSheetsHub && (
            <button
              onClick={onOpenSheetsHub}
              className="px-5 py-2.5 rounded-xl bg-cyberse-glow text-cyberse-bg text-xs font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_15px_rgba(0,242,255,0.25)] flex items-center justify-center gap-2 flex-1 md:flex-none"
            >
              <Layers className="w-3.5 h-3.5" />
              Manage Tabs & Sheet
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Summary Cards */}
        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="cyber-card p-6 flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-cyberse-glow/10 flex items-center justify-center border border-cyberse-glow/20 group-hover:shadow-[0_0_15px_rgba(0,242,255,0.3)] transition-all">
              <Wallet className="w-6 h-6 text-cyberse-glow" />
            </div>
            <div>
              <p className="text-[10px] font-black text-cyberse-muted uppercase tracking-widest">Total Assets Out</p>
              <p className="text-2xl font-black text-cyberse-text tracking-tight">${totalSpending.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          
          <div className="cyber-card p-6 flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-cyberse-link/10 flex items-center justify-center border border-cyberse-link/20 group-hover:shadow-[0_0_15px_rgba(255,77,0,0.3)] transition-all">
              <TrendingUp className="w-6 h-6 text-cyberse-link" />
            </div>
            <div>
              <p className="text-[10px] font-black text-cyberse-muted uppercase tracking-widest">Data Points</p>
              <p className="text-2xl font-black text-cyberse-text tracking-tight">{transactions.length}</p>
            </div>
          </div>

          <div className="cyber-card p-6 flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-cyberse-purple/10 flex items-center justify-center border border-cyberse-purple/20 group-hover:shadow-[0_0_15px_rgba(157,78,221,0.3)] transition-all">
              <TrendingDown className="w-6 h-6 text-cyberse-purple" />
            </div>
            <div>
              <p className="text-[10px] font-black text-cyberse-muted uppercase tracking-widest">Avg. Protocol</p>
              <p className="text-2xl font-black text-cyberse-text tracking-tight">
                ${transactions.length > 0 ? (totalSpending / transactions.length).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
              </p>
            </div>
          </div>
        </div>

        {/* Spending by Category Chart */}
        <div className="md:col-span-2 cyber-card p-8 min-h-[400px]">
          <h3 className="text-sm font-black text-cyberse-glow mb-6 uppercase tracking-[0.2em]">Sector Allocation</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_MAP[entry.name as Category] || COLORS[7]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0c1631', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(0, 242, 255, 0.2)', 
                    boxShadow: '0 0 20px rgba(0, 242, 255, 0.1)',
                    color: '#e0e7ff'
                  }}
                  itemStyle={{ color: '#e0e7ff' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-[10px] font-bold text-cyberse-muted uppercase tracking-wider">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown List */}
        <div className="cyber-card p-8">
          <h3 className="text-sm font-black text-cyberse-glow mb-6 uppercase tracking-[0.2em]">Data Breakdown</h3>
          <div className="space-y-4">
            {categoryData.sort((a, b) => b.value - a.value).map((item) => (
              <div key={item.name} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" 
                    style={{ backgroundColor: CATEGORY_MAP[item.name as Category], color: CATEGORY_MAP[item.name as Category] }}
                  />
                  <span className="text-[10px] font-bold text-cyberse-muted uppercase tracking-widest group-hover:text-cyberse-text transition-colors">{item.name}</span>
                </div>
                <span className="text-xs font-black text-cyberse-text tracking-wider">${item.value.toFixed(2)}</span>
              </div>
            ))}
            {categoryData.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[10px] text-cyberse-muted uppercase tracking-[0.2em]">No active data streams</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
