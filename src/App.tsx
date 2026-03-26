import React, { useState, useEffect } from 'react';
import { Transaction, ReceiptData, UserProfile } from './types';
import ReceiptUpload from './components/ReceiptUpload';
import ManualOverride from './components/ManualOverride';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import { Wallet, LogIn, LogOut, Plus, X, LayoutDashboard, History, Sparkles, Loader2 } from 'lucide-react';
import { cn } from './lib/utils';
import { auth, db, signInWithGoogle, logout, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

// Initial empty state for transactions
const INITIAL_TRANSACTIONS: Transaction[] = [];

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');
  const [showUpload, setShowUpload] = useState(false);
  const [pendingReceipt, setPendingReceipt] = useState<ReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'User',
          photoURL: firebaseUser.photoURL || undefined,
          role: 'user'
        };
        setUser(userProfile);
        
        // Sync user profile to Firestore
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), userProfile, { merge: true });
        } catch (error) {
          console.error('Error syncing user profile:', error);
        }
      } else {
        setUser(null);
      }
      setIsAuthReady(true);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Transactions Listener
  useEffect(() => {
    if (!isAuthReady || !user) {
      setTransactions(INITIAL_TRANSACTIONS);
      return;
    }

    const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => doc.data() as Transaction);
      setTransactions(txs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);

  const handleReceiptProcessed = (data: ReceiptData) => {
    setPendingReceipt(data);
  };

  const handleConfirmTransaction = async (data: ReceiptData) => {
    if (!user) return;

    const transactionId = Math.random().toString(36).substr(2, 9);
    const newTransaction: Transaction = {
      id: transactionId,
      userId: user.uid,
      merchant: data.merchant,
      amount: data.amount,
      category: data.category,
      date: new Date(data.date).toISOString(),
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'transactions', transactionId), newTransaction);
      setPendingReceipt(null);
      setShowUpload(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `transactions/${transactionId}`);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">AetherSpend</span>
          </div>

          <div className="flex items-center gap-6">
            {user && (
              <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-2xl">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                    activeTab === 'dashboard' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                    activeTab === 'history' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <History className="w-4 h-4" />
                  History
                </button>
              </div>
            )}

            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-900">{user.displayName}</p>
                  <button 
                    onClick={logout}
                    className="text-[10px] text-slate-500 hover:text-primary transition-colors flex items-center gap-1 justify-end"
                  >
                    <LogOut className="w-2 h-2" />
                    Sign Out
                  </button>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
                  {user.photoURL ? <img src={user.photoURL} alt="Profile" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">U</div>}
                </div>
              </div>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="bg-primary text-white px-6 py-2 rounded-2xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {!user ? (
          <div className="text-center py-24 bg-white rounded-[40px] border border-slate-100 shadow-sm">
            <div className="w-24 h-24 rounded-[32px] bg-primary/10 flex items-center justify-center mx-auto mb-8">
              <Wallet className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Welcome to AetherSpend</h2>
            <p className="text-slate-500 text-lg max-w-md mx-auto mb-12">
              Sign in to start scanning receipts and tracking your spending with AI-powered insights.
            </p>
            <button 
              onClick={signInWithGoogle}
              className="bg-primary text-white px-12 py-5 rounded-3xl font-bold flex items-center gap-3 hover:bg-primary/90 transition-all shadow-2xl shadow-primary/20 mx-auto text-xl"
            >
              <LogIn className="w-6 h-6" />
              Get Started with Google
            </button>
          </div>
        ) : (
          <>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                  {activeTab === 'dashboard' ? 'Financial Overview' : 'Transaction History'}
                </h1>
                <p className="text-slate-500 mt-2 text-lg">
                  {activeTab === 'dashboard' 
                    ? 'Track your spending habits with AI-powered insights.' 
                    : 'A complete record of your Aether-Scanned transactions.'}
                </p>
              </div>
              
              <button
                onClick={() => setShowUpload(true)}
                className="bg-primary text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-6 h-6" />
                Scan New Receipt
              </button>
            </div>

            {/* Main Content */}
            <div className="space-y-12">
              {activeTab === 'dashboard' ? (
                <>
                  <Dashboard transactions={transactions} />
                  <TransactionList transactions={transactions.slice(0, 5)} onDelete={handleDeleteTransaction} />
                </>
              ) : (
                <TransactionList transactions={transactions} onDelete={handleDeleteTransaction} />
              )}
            </div>
          </>
        )}
      </main>

      {/* Modal Overlay for Upload/Override */}
      {(showUpload || pendingReceipt) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => {
              if (!pendingReceipt) setShowUpload(false);
            }}
          />
          
          <div className="relative w-full max-w-2xl z-10">
            {!pendingReceipt ? (
              <div className="bg-white rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-slate-900">Scan Receipt</h3>
                  <button 
                    onClick={() => setShowUpload(false)}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <ReceiptUpload onProcessed={handleReceiptProcessed} />
              </div>
            ) : (
              <ManualOverride 
                data={pendingReceipt} 
                onConfirm={handleConfirmTransaction}
                onCancel={() => setPendingReceipt(null)}
              />
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-200 mt-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-bold tracking-tight text-slate-900">AetherSpend</span>
        </div>
        <p className="text-sm text-slate-400">© 2026 AetherSpend AI. Frictionless budgeting for the modern era.</p>
      </footer>
    </div>
  );
}
