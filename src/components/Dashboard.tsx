import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Transaction, Category } from '../types';
import { cn } from '../lib/utils';
import { DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
}

const COLORS = [
  '#3b82f6', // Groceries
  '#ef4444', // Dining
  '#10b981', // Utilities
  '#f59e0b', // Transport
  '#8b5cf6', // Health
  '#ec4899', // Shopping
  '#06b6d4', // Entertainment
  '#64748b'  // Misc
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

export default function Dashboard({ transactions }: DashboardProps) {
  const totalSpending = transactions.reduce((sum, t) => sum + t.amount, 0);
  
  const categoryData = Object.entries(
    transactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Summary Cards */}
      <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Spent</p>
            <p className="text-2xl font-bold text-slate-900">${totalSpending.toFixed(2)}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Transactions</p>
            <p className="text-2xl font-bold text-slate-900">{transactions.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Avg. Transaction</p>
            <p className="text-2xl font-bold text-slate-900">
              ${transactions.length > 0 ? (totalSpending / transactions.length).toFixed(2) : '0.00'}
            </p>
          </div>
        </div>
      </div>

      {/* Spending by Category Chart */}
      <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm min-h-[400px]">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Spending by Category</h3>
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
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CATEGORY_MAP[entry.name as Category] || COLORS[7]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spent']}
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown List */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Breakdown</h3>
        <div className="space-y-4">
          {categoryData.sort((a, b) => b.value - a.value).map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: CATEGORY_MAP[item.name as Category] }}
                />
                <span className="text-sm font-medium text-slate-700">{item.name}</span>
              </div>
              <span className="text-sm font-bold text-slate-900">${item.value.toFixed(2)}</span>
            </div>
          ))}
          {categoryData.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-12">No data to display</p>
          )}
        </div>
      </div>
    </div>
  );
}
