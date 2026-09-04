import React, { useState, useEffect } from 'react';
import { Transaction, ReceiptData, UserProfile, SpreadsheetConfig, DEFAULT_DOCUMENT_TYPES } from './types';
import ReceiptUpload from './components/ReceiptUpload';
import ManualOverride from './components/ManualOverride';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import AdminDashboard from './components/AdminDashboard';
import GoogleSheetsHub from './components/GoogleSheetsHub';
import DomainAuthModal from './components/DomainAuthModal';
import DatabaseSetupModal from './components/DatabaseSetupModal';
import { 
  Wallet, 
  LogIn, 
  LogOut, 
  Plus, 
  X, 
  LayoutDashboard, 
  History, 
  Sparkles, 
  Loader2, 
  ShieldCheck,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Zap,
  Database,
  ExternalLink
} from 'lucide-react';
import { cn } from './lib/utils';
import { auth, db, signInWithGoogle, logout, handleFirestoreError, OperationType, getCachedAccessToken, isDatabaseNotFoundError } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { appendTransactionToSheet, ensureSheetTabExists } from './services/googleSheetsService';

// Initial empty state for transactions
const INITIAL_TRANSACTIONS: Transaction[] = [];

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'admin'>('dashboard');
  const [showUpload, setShowUpload] = useState(false);
  const [showSheetsHub, setShowSheetsHub] = useState(false);
  const [showDomainAuthModal, setShowDomainAuthModal] = useState(false);
  const [showDatabaseSetupModal, setShowDatabaseSetupModal] = useState(false);
  const [isFirestoreAvailable, setIsFirestoreAvailable] = useState<boolean | null>(null);
  const [pendingReceipt, setPendingReceipt] = useState<ReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Document types & Google Sheets configuration state with local persistence hydration
  const [customDocumentTypes, setCustomDocumentTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cyberspend_custom_doc_types');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [spreadsheetConfig, setSpreadsheetConfig] = useState<SpreadsheetConfig>(() => {
    try {
      const saved = localStorage.getItem('cyberspend_active_spreadsheet_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.spreadsheetId) return parsed;
      }
    } catch (e) {}
    return { autoSync: true };
  });

  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Combine default and custom document types (deduplicated)
  const allDocumentTypes = Array.from(new Set([...DEFAULT_DOCUMENT_TYPES, ...customDocumentTypes]));

  // Auto-dismiss toast after 5s
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Presence Tracking
  useEffect(() => {
    if (!user || user.uid === 'demo-guest-user' || isFirestoreAvailable === false) return;

    const updatePresence = async () => {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          lastActive: new Date().toISOString()
        }, { merge: true });
      } catch (error) {
        // Non-blocking presence update error
      }
    };

    // Initial update
    updatePresence();

    // Update every 2 minutes
    const interval = setInterval(updatePresence, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, isFirestoreAvailable]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let userProfile: UserProfile | null = null;
        const localKey = `cyberspend_profile_${firebaseUser.uid}`;
        const localSheetKey = `cyberspend_spreadsheet_config_${firebaseUser.uid}`;

        // Attempt reading user profile from Firestore, handling missing database gracefully
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            userProfile = userDoc.data() as UserProfile;
            userProfile = {
              ...userProfile,
              displayName: firebaseUser.displayName || userProfile.displayName,
              photoURL: firebaseUser.photoURL || userProfile.photoURL,
              email: firebaseUser.email || userProfile.email,
              role: firebaseUser.email === "jkenangeles9@gmail.com" ? 'admin' : (userProfile.role || 'user')
            };

            if (userProfile.spreadsheetConfig?.spreadsheetId) {
              setSpreadsheetConfig(userProfile.spreadsheetConfig);
              try {
                localStorage.setItem('cyberspend_active_spreadsheet_config', JSON.stringify(userProfile.spreadsheetConfig));
                localStorage.setItem(localSheetKey, JSON.stringify(userProfile.spreadsheetConfig));
              } catch (e) {}
            }

            if (userProfile.customDocumentTypes && userProfile.customDocumentTypes.length > 0) {
              setCustomDocumentTypes(userProfile.customDocumentTypes);
              try {
                localStorage.setItem('cyberspend_custom_doc_types', JSON.stringify(userProfile.customDocumentTypes));
              } catch (e) {}
            }
          }
          setIsFirestoreAvailable(true);
        } catch (error) {
          if (isDatabaseNotFoundError(error)) {
            console.warn("Firestore database '(default)' not found in Firebase. Running in local mode.");
            setIsFirestoreAvailable(false);
            setShowDatabaseSetupModal(true);
          }
        }

        // Recover local spreadsheet config if Firestore didn't have one yet
        let activeSheet = userProfile?.spreadsheetConfig;
        if (!activeSheet?.spreadsheetId) {
          try {
            const localSaved = localStorage.getItem(localSheetKey) || localStorage.getItem('cyberspend_active_spreadsheet_config');
            if (localSaved) {
              const parsed = JSON.parse(localSaved);
              if (parsed?.spreadsheetId) {
                activeSheet = parsed;
                setSpreadsheetConfig(parsed);
              }
            }
          } catch (e) {}
        }

        // If not loaded from Firestore, check local storage or create new default profile
        if (!userProfile) {
          const cached = localStorage.getItem(localKey);
          if (cached) {
            try {
              userProfile = JSON.parse(cached);
            } catch (e) {
              userProfile = null;
            }
          }

          if (!userProfile) {
            const isAdmin = firebaseUser.email === "jkenangeles9@gmail.com";
            userProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              photoURL: firebaseUser.photoURL || undefined,
              role: isAdmin ? 'admin' : 'user',
              lastActive: new Date().toISOString(),
              spreadsheetConfig: activeSheet || { autoSync: true },
              customDocumentTypes: customDocumentTypes.length > 0 ? customDocumentTypes : []
            };
          }
        }

        // Preserve active sheet in userProfile
        if (activeSheet?.spreadsheetId) {
          userProfile = {
            ...userProfile,
            spreadsheetConfig: activeSheet
          };
        }

        setUser(userProfile);
        try {
          localStorage.setItem(localKey, JSON.stringify(userProfile));
        } catch (e) {}
        
        // Sync user profile to Firestore if available
        if (isFirestoreAvailable !== false) {
          try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            await setDoc(userDocRef, userProfile, { merge: true });
          } catch (error) {
            if (isDatabaseNotFoundError(error)) {
              setIsFirestoreAvailable(false);
              setShowDatabaseSetupModal(true);
            }
          }
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

    const localTxsKey = `cyberspend_txs_${user.uid}`;

    if (user.uid === 'demo-guest-user') {
      const saved = localStorage.getItem(localTxsKey);
      if (saved) {
        try {
          setTransactions(JSON.parse(saved));
        } catch (e) {}
      }
      return;
    }

    // Load cached local records first for immediate UI display
    const cachedTxs = localStorage.getItem(localTxsKey);
    if (cachedTxs) {
      try {
        setTransactions(JSON.parse(cachedTxs));
      } catch (e) {}
    }

    // If Firestore has already been flagged as not found, skip continuous onSnapshot reconnects
    if (isFirestoreAvailable === false) {
      return;
    }

    try {
      const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setIsFirestoreAvailable(true);
        const txs = snapshot.docs.map(doc => doc.data() as Transaction);
        setTransactions(txs);
        try {
          localStorage.setItem(localTxsKey, JSON.stringify(txs));
        } catch (e) {}
      }, (error) => {
        if (isDatabaseNotFoundError(error)) {
          console.warn("Firestore database '(default)' not found in Firebase. Utilizing local archive.");
          setIsFirestoreAvailable(false);
          setShowDatabaseSetupModal(true);
        } else {
          handleFirestoreError(error, OperationType.LIST, 'transactions');
        }
      });

      return () => unsubscribe();
    } catch (err) {
      if (isDatabaseNotFoundError(err)) {
        setIsFirestoreAvailable(false);
        setShowDatabaseSetupModal(true);
      }
    }
  }, [isAuthReady, user, isFirestoreAvailable]);

  // Handlers for Sign In
  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
      setShowDomainAuthModal(false);
      setToast({
        type: 'success',
        text: 'Google Authorization successful! Welcome to CyberSpend.'
      });
    } catch (err: any) {
      console.error('Sign-in error details:', err);
      const isUnauthorizedDomain = 
        err?.code === 'auth/unauthorized-domain' || 
        (typeof err?.message === 'string' && err.message.includes('auth/unauthorized-domain'));

      if (isUnauthorizedDomain) {
        setShowDomainAuthModal(true);
        setToast({
          type: 'error',
          text: 'Firebase Auth requires this domain to be authorized in Firebase Console.'
        });
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setToast({
          type: 'info',
          text: 'Sign-in popup was closed.'
        });
      } else {
        setToast({
          type: 'error',
          text: `Sign-in error: ${err?.message || 'Authentication failed'}`
        });
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleDemoAccess = () => {
    // Allows testing full receipt scanning and local archiving in case Firebase Auth domain is pending
    const demoUser: UserProfile = {
      uid: 'demo-guest-user',
      displayName: 'Commander Guest',
      email: 'guest@cyberspend.ai',
      role: 'admin',
      lastActive: new Date().toISOString(),
      spreadsheetConfig: { autoSync: true },
      customDocumentTypes: []
    };
    setUser(demoUser);
    setToast({
      type: 'info',
      text: 'Entered in Guest Protocol mode. Full AI extraction and scanner operational!'
    });
  };

  const handleUpdateSpreadsheetConfig = async (newConfig: SpreadsheetConfig) => {
    setSpreadsheetConfig(newConfig);

    // Save immediately to persistent LocalStorage
    try {
      localStorage.setItem('cyberspend_active_spreadsheet_config', JSON.stringify(newConfig));
      if (user) {
        localStorage.setItem(`cyberspend_spreadsheet_config_${user.uid}`, JSON.stringify(newConfig));
      }

      // Track recent sheets list for easy recovery
      if (newConfig.spreadsheetId) {
        const recentStr = localStorage.getItem('cyberspend_recent_sheets');
        let recent: Array<{ id: string; name: string; url?: string; updated: string }> = [];
        try {
          if (recentStr) recent = JSON.parse(recentStr);
        } catch (e) {}
        recent = recent.filter(r => r.id !== newConfig.spreadsheetId);
        recent.unshift({
          id: newConfig.spreadsheetId,
          name: newConfig.spreadsheetName || 'CyberSpend Financial Archive',
          url: newConfig.spreadsheetUrl,
          updated: new Date().toISOString()
        });
        localStorage.setItem('cyberspend_recent_sheets', JSON.stringify(recent.slice(0, 5)));
      }
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    // Keep user profile state in sync
    setUser(prev => prev ? { ...prev, spreadsheetConfig: newConfig } : null);

    // Persist to Cloud Firestore user record
    if (user && user.uid !== 'demo-guest-user') {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          spreadsheetConfig: newConfig
        }, { merge: true });
      } catch (err) {
        console.error('Error persisting spreadsheet config to Firestore:', err);
      }
    }

    if (newConfig.spreadsheetId) {
      setToast({
        type: 'success',
        text: `Connected to "${newConfig.spreadsheetName || 'Google Sheet'}". Future scans will stream automatically!`
      });
    } else {
      setToast({
        type: 'info',
        text: 'Google Sheet disconnected. Receipts will be saved locally and to Cloud DB.'
      });
    }
  };

  const handleAddDocumentType = async (newType: string) => {
    const trimmed = newType.trim();
    if (!trimmed) return;
    if (allDocumentTypes.includes(trimmed)) return;

    const updatedCustom = [...customDocumentTypes, trimmed];
    setCustomDocumentTypes(updatedCustom);

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          customDocumentTypes: updatedCustom
        }, { merge: true });
      } catch (err) {
        console.error('Error saving custom document type:', err);
      }
    }

    // If Google Sheet is connected, create the tab in Google Sheets!
    if (spreadsheetConfig.spreadsheetId) {
      const token = getCachedAccessToken();
      if (token) {
        try {
          await ensureSheetTabExists(token, spreadsheetConfig.spreadsheetId, trimmed);
          setToast({
            type: 'success',
            text: `Added option "${trimmed}" and created tab in Google Sheet!`
          });
        } catch (e: any) {
          console.warn('Could not auto-create tab in sheets:', e);
          setToast({
            type: 'info',
            text: `Added option "${trimmed}". (Will auto-create sheet tab upon next scan)`
          });
        }
      }
    } else {
      setToast({
        type: 'success',
        text: `Added document option "${trimmed}"`
      });
    }
  };

  const handleRemoveDocumentType = async (typeToRemove: string) => {
    const updatedCustom = customDocumentTypes.filter(t => t !== typeToRemove);
    setCustomDocumentTypes(updatedCustom);

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          customDocumentTypes: updatedCustom
        }, { merge: true });
      } catch (err) {
        console.error('Error removing document type:', err);
      }
    }
  };

  const handleReceiptProcessed = (data: ReceiptData) => {
    setPendingReceipt(data);
  };

  const handleConfirmTransaction = async (data: ReceiptData) => {
    if (!user) return;

    const docType = data.documentType || allDocumentTypes[0] || 'Official Receipt (OR)';
    const transactionId = Math.random().toString(36).substr(2, 9);
    
    let formattedDate = new Date().toISOString();
    try {
      if (data.date) {
        const parsed = new Date(data.date);
        if (!isNaN(parsed.getTime())) {
          formattedDate = parsed.toISOString();
        }
      }
    } catch (e) {}

    const newTransaction: Transaction = {
      id: transactionId,
      userId: user.uid,
      merchant: data.merchant || 'Unknown Merchant',
      amount: typeof data.amount === 'number' ? data.amount : (parseFloat(String(data.amount)) || 0),
      category: data.category || 'Misc',
      documentType: docType,
      date: formattedDate,
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Save to Firestore (or local state in Guest/offline mode)
      if (user.uid === 'demo-guest-user' || isFirestoreAvailable === false) {
        const updated = [newTransaction, ...transactions];
        setTransactions(updated);
        try {
          localStorage.setItem(`cyberspend_txs_${user.uid}`, JSON.stringify(updated));
        } catch (e) {}
      } else {
        try {
          await setDoc(doc(db, 'transactions', transactionId), newTransaction);
        } catch (dbErr) {
          if (isDatabaseNotFoundError(dbErr)) {
            console.warn("Firestore database '(default)' not found. Saving transaction locally.");
            setIsFirestoreAvailable(false);
            setShowDatabaseSetupModal(true);
            const updated = [newTransaction, ...transactions];
            setTransactions(updated);
            try {
              localStorage.setItem(`cyberspend_txs_${user.uid}`, JSON.stringify(updated));
            } catch (e) {}
          } else {
            throw dbErr;
          }
        }
      }
      setPendingReceipt(null);
      setShowUpload(false);

      // 2. Real-Time Streaming to Google Sheet tab!
      if (spreadsheetConfig.spreadsheetId && spreadsheetConfig.autoSync !== false) {
        let token = getCachedAccessToken();
        if (token) {
          try {
            await appendTransactionToSheet(token, spreadsheetConfig.spreadsheetId, docType, newTransaction);
            setToast({
              type: 'success',
              text: `Archived & streamed to Google Sheet > Tab: "${docType}"`
            });
          } catch (sheetErr: any) {
            console.error('Error streaming transaction to Google Sheet:', sheetErr);
            setToast({
              type: 'info',
              text: `Archived to records. (Sheet sync notice: ${sheetErr.message || 'Check Google authorization'})`
            });
          }
        } else {
          setToast({
            type: 'info',
            text: `Archived to records. Re-authenticate Google to stream to sheet.`
          });
        }
      } else {
        setToast({
          type: 'success',
          text: isFirestoreAvailable === false 
            ? 'Transaction archived in Local Storage (Cloud DB pending setup).'
            : 'Transaction archived successfully.'
        });
      }
    } catch (error: any) {
      console.error('Commit failed:', error);
      setToast({
        type: 'info',
        text: `Transaction save failed: ${error?.message || 'Database write denied'}`
      });
      handleFirestoreError(error, OperationType.WRITE, `transactions/${transactionId}`);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      if (user?.uid === 'demo-guest-user' || isFirestoreAvailable === false) {
        const updated = transactions.filter(t => t.id !== id);
        setTransactions(updated);
        if (user) {
          try {
            localStorage.setItem(`cyberspend_txs_${user.uid}`, JSON.stringify(updated));
          } catch (e) {}
        }
      } else {
        try {
          await deleteDoc(doc(db, 'transactions', id));
        } catch (dbErr) {
          if (isDatabaseNotFoundError(dbErr)) {
            const updated = transactions.filter(t => t.id !== id);
            setTransactions(updated);
            if (user) {
              try {
                localStorage.setItem(`cyberspend_txs_${user.uid}`, JSON.stringify(updated));
              } catch (e) {}
            }
          } else {
            throw dbErr;
          }
        }
      }
      setToast({ type: 'info', text: 'Transaction record deleted from archive.' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cyberse-bg">
        <Loader2 className="w-12 h-12 text-cyberse-glow animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyberse-bg font-sans text-cyberse-text">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-20 right-6 z-[110] max-w-md animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={cn(
            "p-4 rounded-2xl border shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-start gap-3 text-xs font-black uppercase tracking-wider backdrop-blur-xl",
            toast.type === 'success' && "bg-cyberse-dark/95 border-cyberse-glow text-cyberse-glow shadow-[0_0_20px_rgba(0,242,255,0.2)]",
            toast.type === 'error' && "bg-cyberse-dark/95 border-cyberse-link text-cyberse-link",
            toast.type === 'info' && "bg-cyberse-dark/95 border-cyberse-purple text-cyberse-purple"
          )}>
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 text-cyberse-glow mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0 text-cyberse-link mt-0.5" />}
            {toast.type === 'info' && <FileSpreadsheet className="w-5 h-5 shrink-0 text-cyberse-purple mt-0.5" />}
            <div className="flex-1 leading-relaxed">{toast.text}</div>
            <button onClick={() => setToast(null)} className="text-cyberse-muted hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-cyberse-sidebar/90 backdrop-blur-xl border-b border-cyberse-glow/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-cyberse-glow flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.4)] group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6 text-cyberse-bg" />
            </div>
            <span className="text-xl font-black tracking-[0.2em] text-cyberse-glow uppercase">CyberSpend</span>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            {user && (
              <>
                <div className="hidden md:flex items-center bg-cyberse-darker/50 p-1 rounded-xl border border-cyberse-glow/5">
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={cn(
                      "px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 uppercase tracking-wider",
                      activeTab === 'dashboard' ? "bg-cyberse-glow text-cyberse-bg shadow-[0_0_10px_rgba(0,242,255,0.3)]" : "text-cyberse-muted hover:text-cyberse-glow"
                    )}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={cn(
                      "px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 uppercase tracking-wider",
                      activeTab === 'history' ? "bg-cyberse-glow text-cyberse-bg shadow-[0_0_10px_rgba(0,242,255,0.3)]" : "text-cyberse-muted hover:text-cyberse-glow"
                    )}
                  >
                    <History className="w-4 h-4" />
                    History
                  </button>
                  {user.role === 'admin' && (
                    <button
                      onClick={() => setActiveTab('admin')}
                      className={cn(
                        "px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 uppercase tracking-wider",
                        activeTab === 'admin' ? "bg-cyberse-glow text-cyberse-bg shadow-[0_0_10px_rgba(0,242,255,0.3)]" : "text-cyberse-muted hover:text-cyberse-glow"
                      )}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Admin
                    </button>
                  )}
                </div>

                {/* Google Sheets Quick Hub Button */}
                {spreadsheetConfig.spreadsheetId ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShowSheetsHub(true)}
                      className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border bg-cyberse-glow/10 text-cyberse-glow border-cyberse-glow/40 hover:bg-cyberse-glow hover:text-cyberse-bg shadow-[0_0_15px_rgba(0,242,255,0.15)] transition-all max-w-[170px] sm:max-w-[240px]"
                      title={`Active Spreadsheet: ${spreadsheetConfig.spreadsheetName || 'CyberSpend Archive'}`}
                    >
                      <span className="w-2 h-2 rounded-full bg-cyberse-glow animate-pulse shrink-0" />
                      <FileSpreadsheet className="w-4 h-4 shrink-0" />
                      <span className="truncate">
                        {spreadsheetConfig.spreadsheetName || 'Connected Sheet'}
                      </span>
                    </button>
                    {spreadsheetConfig.spreadsheetUrl && (
                      <a
                        href={spreadsheetConfig.spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:flex p-2 rounded-xl bg-cyberse-darker border border-cyberse-glow/20 text-cyberse-glow hover:bg-cyberse-glow hover:text-cyberse-bg transition-colors shrink-0"
                        title="Open Google Sheet in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSheetsHub(true)}
                    className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border bg-cyberse-darker text-cyberse-muted border-cyberse-glow/10 hover:border-cyberse-glow/40 hover:text-cyberse-text transition-all"
                    title="Link or Create Google Sheet"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="hidden sm:inline">Link Sheet</span>
                  </button>
                )}
              </>
            )}

            {user ? (
              <div className="flex items-center gap-4">
                {isFirestoreAvailable === false && (
                  <button
                    onClick={() => setShowDatabaseSetupModal(true)}
                    className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyberse-purple/10 border border-cyberse-purple/30 text-[10px] font-black text-cyberse-purple uppercase tracking-wider hover:bg-cyberse-purple hover:text-white transition-all shadow-[0_0_10px_rgba(188,19,254,0.2)]"
                    title="Cloud Firestore database pending creation. Click for 1-minute setup guide."
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Cloud DB Pending</span>
                  </button>
                )}

                <div className="hidden sm:block text-right">
                  <div className="flex items-center justify-end gap-2">
                    {user.role === 'admin' && (
                      <span className="text-[10px] font-black text-cyberse-bg bg-cyberse-glow px-2 py-0.5 rounded-sm uppercase tracking-widest">Admin</span>
                    )}
                    <p className="text-xs font-bold text-cyberse-text tracking-wide">{user.displayName}</p>
                  </div>
                  <button 
                    onClick={logout}
                    className="text-[10px] text-cyberse-muted hover:text-cyberse-link transition-colors flex items-center gap-1 justify-end uppercase tracking-tighter"
                  >
                    <LogOut className="w-2 h-2" />
                    Disconnect
                  </button>
                </div>
                <div className="w-10 h-10 rounded-lg border border-cyberse-glow/30 shadow-[0_0_10px_rgba(0,242,255,0.2)] overflow-hidden">
                  {user.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-cyberse-darker text-cyberse-glow font-bold">U</div>}
                </div>
              </div>
            ) : (
              <button 
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="bg-cyberse-glow text-cyberse-bg px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-white transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] uppercase text-xs tracking-widest disabled:opacity-50"
              >
                {isSigningIn ? (
                  <Loader2 className="w-4 h-4 animate-spin text-cyberse-bg" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                Initialize
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {!user ? (
          <div className="text-center py-20 px-6 cyber-card border-cyberse-glow/20 max-w-3xl mx-auto shadow-[0_0_50px_rgba(0,242,255,0.1)]">
            <div className="w-24 h-24 rounded-3xl bg-cyberse-glow/10 flex items-center justify-center mx-auto mb-8 border border-cyberse-glow/20 shadow-[0_0_30px_rgba(0,242,255,0.1)]">
              <Wallet className="w-12 h-12 text-cyberse-glow" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-cyberse-text tracking-[0.25em] mb-4 uppercase">
              Welcome to CyberSpend
            </h2>
            <p className="text-cyberse-muted text-base max-w-lg mx-auto mb-10 font-light leading-relaxed">
              Authorize Google connection to scan receipts (OR, SI, CR, etc.) with Gemini AI and automatically stream financial records directly into dedicated Google Sheets tabs.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-8">
              <button 
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="w-full sm:w-auto flex-1 bg-cyberse-glow text-cyberse-bg px-8 py-4 rounded-xl font-black flex items-center justify-center gap-3 hover:bg-white transition-all shadow-[0_0_30px_rgba(0,242,255,0.3)] text-sm uppercase tracking-widest disabled:opacity-50"
              >
                {isSigningIn ? (
                  <Loader2 className="w-5 h-5 animate-spin text-cyberse-bg" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                Sign In With Google
              </button>

              <button
                onClick={handleDemoAccess}
                className="w-full sm:w-auto px-6 py-4 rounded-xl font-black flex items-center justify-center gap-2 bg-cyberse-darker hover:bg-cyberse-dark text-cyberse-text border border-cyberse-glow/20 text-xs uppercase tracking-wider transition-all"
                title="Bypass auth to test scanning and manual classification immediately"
              >
                <Zap className="w-4 h-4 text-cyberse-purple" />
                Guest Mode
              </button>
            </div>

            {/* Quick troubleshooting notice */}
            <div className="pt-6 border-t border-cyberse-glow/10 flex items-center justify-center gap-2 text-xs text-cyberse-muted">
              <ShieldAlert className="w-4 h-4 text-cyberse-glow shrink-0" />
              <span>
                Seeing domain authorization prompt?{' '}
                <button
                  onClick={() => setShowDomainAuthModal(true)}
                  className="text-cyberse-glow underline hover:text-white font-bold tracking-wider uppercase ml-1"
                >
                  View Setup Steps
                </button>
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <h1 className="text-4xl font-black text-cyberse-glow tracking-[0.2em] uppercase">
                  {activeTab === 'dashboard' ? 'System Overview' : 
                   activeTab === 'history' ? 'Data Archives' : 'Admin Terminal'}
                </h1>
                <p className="text-cyberse-muted mt-2 text-lg font-light tracking-wide">
                  {activeTab === 'dashboard' 
                    ? 'Monitoring financial activity and Google Sheets multi-tab sync.' 
                    : activeTab === 'history'
                    ? 'Accessing Cyber-Scanned transaction database with document classification.'
                    : 'System monitoring and user management portal.'}
                </p>
              </div>
              
              {activeTab !== 'admin' && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowSheetsHub(true)}
                    className="bg-cyberse-darker hover:bg-cyberse-dark text-cyberse-glow px-6 py-4 rounded-xl font-black flex items-center justify-center gap-2 border border-cyberse-glow/30 transition-all uppercase tracking-widest text-xs"
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                    Sheets Hub
                  </button>
                  <button
                    onClick={() => setShowUpload(true)}
                    className="bg-cyberse-glow text-cyberse-bg px-8 py-4 rounded-xl font-black flex items-center justify-center gap-3 hover:bg-white transition-all shadow-[0_0_25px_rgba(0,242,255,0.3)] hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest text-sm"
                  >
                    <Plus className="w-6 h-6" />
                    New Scan
                  </button>
                </div>
              )}
            </div>

            {/* Main Content */}
            <div className="space-y-12">
              {activeTab === 'dashboard' ? (
                <>
                  <Dashboard 
                    transactions={transactions} 
                    spreadsheetConfig={spreadsheetConfig}
                    documentTypes={allDocumentTypes}
                    onOpenSheetsHub={() => setShowSheetsHub(true)}
                  />
                  <TransactionList 
                    transactions={transactions.slice(0, 8)} 
                    onDelete={handleDeleteTransaction}
                    documentTypes={allDocumentTypes}
                  />
                </>
              ) : activeTab === 'history' ? (
                <TransactionList 
                  transactions={transactions} 
                  onDelete={handleDeleteTransaction}
                  documentTypes={allDocumentTypes}
                />
              ) : (
                <AdminDashboard currentUser={user} />
              )}
            </div>
          </>
        )}
      </main>

      {/* Google Sheets Hub Modal */}
      {showSheetsHub && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-cyberse-bg/85 backdrop-blur-xl animate-in fade-in duration-300"
            onClick={() => setShowSheetsHub(false)}
          />
          <div className="relative w-full max-w-3xl z-10 my-8">
            <GoogleSheetsHub
              config={spreadsheetConfig}
              documentTypes={allDocumentTypes}
              transactions={transactions}
              onUpdateConfig={handleUpdateSpreadsheetConfig}
              onAddDocumentType={handleAddDocumentType}
              onRemoveDocumentType={handleRemoveDocumentType}
              onClose={() => setShowSheetsHub(false)}
            />
          </div>
        </div>
      )}

      {/* Modal Overlay for Upload/Override */}
      {(showUpload || pendingReceipt) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-cyberse-bg/85 backdrop-blur-xl animate-in fade-in duration-300"
            onClick={() => {
              if (!pendingReceipt) setShowUpload(false);
            }}
          />
          
          <div className="relative w-full max-w-2xl z-10 my-8">
            {!pendingReceipt ? (
              <div className="cyber-card p-8 border-cyberse-glow/30 shadow-[0_0_50px_rgba(0,242,255,0.2)]">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-cyberse-glow tracking-widest uppercase">Scanner Interface</h3>
                    <p className="text-[10px] text-cyberse-muted uppercase tracking-widest mt-1">Select receipt document type & scan</p>
                  </div>
                  <button 
                    onClick={() => setShowUpload(false)}
                    className="p-2 rounded-lg hover:bg-cyberse-darker text-cyberse-muted hover:text-cyberse-glow transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <ReceiptUpload 
                  onProcessed={handleReceiptProcessed} 
                  documentTypes={allDocumentTypes}
                  spreadsheetName={spreadsheetConfig.spreadsheetName}
                  hasSpreadsheetLinked={Boolean(spreadsheetConfig.spreadsheetId)}
                  onAddDocumentType={handleAddDocumentType}
                  onOpenSheetsHub={() => {
                    setShowUpload(false);
                    setShowSheetsHub(true);
                  }}
                />
              </div>
            ) : (
              <ManualOverride 
                data={pendingReceipt} 
                documentTypes={allDocumentTypes}
                spreadsheetName={spreadsheetConfig.spreadsheetName}
                hasSpreadsheetLinked={Boolean(spreadsheetConfig.spreadsheetId)}
                onConfirm={handleConfirmTransaction}
                onCancel={() => setPendingReceipt(null)}
                onOpenSheetsHub={() => {
                  setPendingReceipt(null);
                  setShowSheetsHub(true);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Domain Authorization Helper Modal */}
      <DomainAuthModal
        isOpen={showDomainAuthModal}
        onClose={() => setShowDomainAuthModal(false)}
        onRetry={handleSignIn}
      />

      {/* Cloud Firestore Setup Helper Modal */}
      <DatabaseSetupModal
        isOpen={showDatabaseSetupModal}
        onClose={() => setShowDatabaseSetupModal(false)}
        onRetry={() => {
          setShowDatabaseSetupModal(false);
          setIsFirestoreAvailable(null); // Triggers re-check
        }}
        onUseLocalMode={() => setShowDatabaseSetupModal(false)}
      />

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-cyberse-glow/10 mt-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
          <Sparkles className="w-5 h-5 text-cyberse-glow" />
          <span className="font-bold tracking-[0.3em] text-cyberse-glow uppercase">CyberSpend</span>
        </div>
        <p className="text-xs text-cyberse-muted uppercase tracking-widest">© 2026 CyberSpend AI // Google Sheets Protocol Integration</p>
      </footer>
    </div>
  );
}
