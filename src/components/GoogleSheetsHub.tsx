import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Plus, 
  ExternalLink, 
  CheckCircle2, 
  RefreshCw, 
  Layers, 
  Sparkles, 
  AlertCircle, 
  Trash2, 
  X,
  FileText,
  KeyRound,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { SpreadsheetConfig, Transaction } from '../types';
import { 
  createCyberSpendSpreadsheet, 
  getSpreadsheetInfo, 
  ensureSheetTabExists, 
  syncAllTransactionsToSheet,
  extractSpreadsheetId
} from '../services/googleSheetsService';
import { cn } from '../lib/utils';
import { signInWithGoogle, getCachedAccessToken } from '../firebase';

interface GoogleSheetsHubProps {
  config: SpreadsheetConfig;
  documentTypes: string[];
  transactions: Transaction[];
  onUpdateConfig: (newConfig: SpreadsheetConfig) => Promise<void>;
  onAddDocumentType: (type: string) => Promise<void>;
  onRemoveDocumentType: (type: string) => Promise<void>;
  onClose: () => void;
}

export default function GoogleSheetsHub({
  config,
  documentTypes,
  transactions,
  onUpdateConfig,
  onAddDocumentType,
  onRemoveDocumentType,
  onClose
}: GoogleSheetsHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<'sheet' | 'types' | 'sync'>('sheet');
  const [sheetInput, setSheetInput] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);

  const getValidToken = async (): Promise<string> => {
    let token = getCachedAccessToken();
    if (!token) {
      // Prompt user to re-authorize
      setStatusMessage({ type: 'info', text: 'Authorizing Google Workspace credentials...' });
      const res = await signInWithGoogle();
      token = getCachedAccessToken();
      if (!token) {
        throw new Error('Google Workspace authorization required to interact with Google Sheets.');
      }
    }
    return token;
  };

  const handleCreateNewSheet = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const token = await getValidToken();
      setStatusMessage({ type: 'info', text: 'Creating CyberSpend spreadsheet & provisioning category tabs...' });
      
      const res = await createCyberSpendSpreadsheet(token, documentTypes, 'CyberSpend Financial Archive');
      
      await onUpdateConfig({
        ...config,
        spreadsheetId: res.spreadsheetId,
        spreadsheetName: res.spreadsheetName,
        spreadsheetUrl: res.spreadsheetUrl,
        lastSyncedAt: new Date().toISOString()
      });

      setStatusMessage({ 
        type: 'success', 
        text: `Created "${res.spreadsheetName}" with ${res.tabs.length} tabs in your Google Drive!` 
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to create spreadsheet' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkExistingSheet = async () => {
    if (!sheetInput.trim()) return;
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const token = await getValidToken();
      const cleanId = extractSpreadsheetId(sheetInput);
      setStatusMessage({ type: 'info', text: 'Verifying spreadsheet accessibility...' });
      
      const info = await getSpreadsheetInfo(token, cleanId);

      await onUpdateConfig({
        ...config,
        spreadsheetId: cleanId,
        spreadsheetName: info.title,
        spreadsheetUrl: info.url
      });

      setSheetInput('');
      setStatusMessage({ 
        type: 'success', 
        text: `Successfully linked "${info.title}" (${info.tabs.length} existing tabs).` 
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'Could not access spreadsheet' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDocumentType = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTypeName.trim();
    if (!trimmed) return;
    if (documentTypes.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      setStatusMessage({ type: 'error', text: 'This document type already exists.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      // 1. Add to app state & user settings
      await onAddDocumentType(trimmed);
      setNewTypeName('');

      // 2. If spreadsheet is linked, create the tab directly in Google Sheets!
      if (config.spreadsheetId) {
        try {
          const token = await getValidToken();
          setStatusMessage({ type: 'info', text: `Provisioning new tab "${trimmed}" on Google Sheet...` });
          await ensureSheetTabExists(token, config.spreadsheetId, trimmed);
          setStatusMessage({ 
            type: 'success', 
            text: `Added "${trimmed}" and created a corresponding tab in your Google Sheet!` 
          });
        } catch (sheetErr: any) {
          console.warn('Tab creation in sheet skipped or error:', sheetErr);
          setStatusMessage({ 
            type: 'success', 
            text: `Added "${trimmed}". (Sheet tab will be auto-generated upon first scan).` 
          });
        }
      } else {
        setStatusMessage({ type: 'success', text: `Added document type "${trimmed}".` });
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to add document type' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncAll = async () => {
    if (!config.spreadsheetId) {
      setStatusMessage({ type: 'error', text: 'No Google Sheet connected. Connect or create one first.' });
      return;
    }

    if (transactions.length === 0) {
      setStatusMessage({ type: 'info', text: 'No transactions found to sync.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    setSyncProgress({ current: 0, total: transactions.length });

    try {
      const token = await getValidToken();
      const result = await syncAllTransactionsToSheet(
        token,
        config.spreadsheetId,
        transactions,
        documentTypes[0] || 'General Expense',
        (curr, tot) => setSyncProgress({ current: curr, total: tot })
      );

      await onUpdateConfig({
        ...config,
        lastSyncedAt: new Date().toISOString()
      });

      if (result.errors.length > 0) {
        setStatusMessage({ 
          type: 'info', 
          text: `Synced ${result.syncedCount} records with notes: ${result.errors.join(', ')}` 
        });
      } else {
        setStatusMessage({ 
          type: 'success', 
          text: `Successfully synced all ${result.syncedCount} transactions into their categorized Google Sheet tabs!` 
        });
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to sync transactions' });
    } finally {
      setIsLoading(false);
      setSyncProgress(null);
    }
  };

  return (
    <div className="cyber-card p-6 md:p-8 max-w-3xl w-full mx-auto border-cyberse-glow/30 shadow-[0_0_50px_rgba(0,242,255,0.15)] animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between pb-6 border-b border-cyberse-glow/15 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyberse-glow/10 border border-cyberse-glow/30 flex items-center justify-center text-cyberse-glow shadow-[0_0_15px_rgba(0,242,255,0.2)]">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-cyberse-glow tracking-[0.15em] uppercase">
                Google Sheets Protocol
              </h2>
              <span className="text-[10px] bg-cyberse-glow/10 text-cyberse-glow px-2 py-0.5 rounded border border-cyberse-glow/30 font-bold uppercase tracking-wider">
                Live Sync
              </span>
            </div>
            <p className="text-xs text-cyberse-muted uppercase tracking-wider mt-1">
              Automatic receipt classification & dedicated multi-tab spreadsheet archive
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-cyberse-muted hover:text-cyberse-glow hover:bg-cyberse-darker rounded-lg transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-cyberse-darker/60 p-1 rounded-xl border border-cyberse-glow/10">
        <button
          onClick={() => setActiveSubTab('sheet')}
          className={cn(
            "flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
            activeSubTab === 'sheet'
              ? "bg-cyberse-glow text-cyberse-bg shadow-[0_0_15px_rgba(0,242,255,0.3)]"
              : "text-cyberse-muted hover:text-cyberse-text"
          )}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Spreadsheet Link
        </button>
        <button
          onClick={() => setActiveSubTab('types')}
          className={cn(
            "flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
            activeSubTab === 'types'
              ? "bg-cyberse-glow text-cyberse-bg shadow-[0_0_15px_rgba(0,242,255,0.3)]"
              : "text-cyberse-muted hover:text-cyberse-text"
          )}
        >
          <Layers className="w-4 h-4" />
          Document Types & Tabs ({documentTypes.length})
        </button>
        <button
          onClick={() => setActiveSubTab('sync')}
          className={cn(
            "flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
            activeSubTab === 'sync'
              ? "bg-cyberse-glow text-cyberse-bg shadow-[0_0_15px_rgba(0,242,255,0.3)]"
              : "text-cyberse-muted hover:text-cyberse-text"
          )}
        >
          <RefreshCw className="w-4 h-4" />
          Batch Archive Sync
        </button>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div className={cn(
          "mb-6 p-4 rounded-xl flex items-start gap-3 text-xs font-bold tracking-wide uppercase border",
          statusMessage.type === 'success' && "bg-cyberse-glow/10 border-cyberse-glow/40 text-cyberse-glow",
          statusMessage.type === 'error' && "bg-cyberse-link/10 border-cyberse-link/40 text-cyberse-link",
          statusMessage.type === 'info' && "bg-cyberse-purple/10 border-cyberse-purple/40 text-cyberse-purple"
        )}>
          {statusMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />}
          {statusMessage.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          {statusMessage.type === 'info' && <RefreshCw className="w-5 h-5 shrink-0 mt-0.5 animate-spin" />}
          <div className="flex-1 leading-relaxed">{statusMessage.text}</div>
        </div>
      )}

      {/* Tab 1: Spreadsheet Connection */}
      {activeSubTab === 'sheet' && (
        <div className="space-y-6">
          {/* Current Connection Status */}
          <div className="bg-cyberse-darker/70 p-5 rounded-2xl border border-cyberse-glow/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black text-cyberse-muted uppercase tracking-widest block mb-1">
                  Connection Status
                </span>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-3 h-3 rounded-full animate-pulse",
                    config.spreadsheetId ? "bg-cyberse-glow shadow-[0_0_10px_rgba(0,242,255,0.8)]" : "bg-cyberse-muted"
                  )} />
                  <span className="text-sm font-black text-cyberse-text tracking-wide">
                    {config.spreadsheetId ? (config.spreadsheetName || 'Connected CyberSpend Sheet') : 'No Google Sheet Connected'}
                  </span>
                </div>
                {config.spreadsheetId && (
                  <p className="text-[11px] text-cyberse-muted mt-1 font-mono">
                    ID: {config.spreadsheetId.substring(0, 16)}...
                  </p>
                )}
              </div>

              {config.spreadsheetUrl && (
                <a
                  href={config.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-cyberse-glow/10 hover:bg-cyberse-glow hover:text-cyberse-bg text-cyberse-glow px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 border border-cyberse-glow/30 transition-all shadow-[0_0_15px_rgba(0,242,255,0.1)] self-start sm:self-auto"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Live Sheet ↗
                </a>
              )}
            </div>

            {/* Auto-sync setting */}
            {config.spreadsheetId && (
              <div className="mt-4 pt-4 border-t border-cyberse-glow/10 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-cyberse-text uppercase tracking-wider">Instant Scan Forwarding</p>
                  <p className="text-[11px] text-cyberse-muted">Automatically appends confirmed receipt data to the selected document tab immediately.</p>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ ...config, autoSync: !config.autoSync })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative p-1 border",
                    config.autoSync 
                      ? "bg-cyberse-glow border-cyberse-glow" 
                      : "bg-cyberse-dark border-cyberse-glow/20"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full transition-transform",
                    config.autoSync ? "bg-cyberse-bg translate-x-6" : "bg-cyberse-muted translate-x-0"
                  )} />
                </button>
              </div>
            )}
          </div>

          {/* Action 1: Create New Sheet */}
          <div className="bg-cyberse-darker/40 p-5 rounded-2xl border border-cyberse-glow/15 space-y-3">
            <div className="flex items-center gap-2 text-cyberse-glow">
              <Sparkles className="w-4 h-4" />
              <h3 className="text-xs font-black uppercase tracking-widest">Option A: Automatic Generation</h3>
            </div>
            <p className="text-xs text-cyberse-muted leading-relaxed">
              Creates a brand new spreadsheet in your Google Drive named <strong className="text-cyberse-text">"CyberSpend Financial Archive"</strong> with pre-built, formatted tabs for each document type (OR, SI, CR, BS, etc.).
            </p>
            <button
              onClick={handleCreateNewSheet}
              disabled={isLoading}
              className="w-full bg-cyberse-glow text-cyberse-bg py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white transition-all shadow-[0_0_20px_rgba(0,242,255,0.25)] active:scale-[0.99] disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Create & Link CyberSpend Google Sheet
            </button>
          </div>

          {/* Action 2: Link Existing Sheet */}
          <div className="bg-cyberse-darker/40 p-5 rounded-2xl border border-cyberse-glow/15 space-y-3">
            <div className="flex items-center gap-2 text-cyberse-text">
              <FileSpreadsheet className="w-4 h-4 text-cyberse-glow" />
              <h3 className="text-xs font-black uppercase tracking-widest">Option B: Link Existing Sheet</h3>
            </div>
            <p className="text-xs text-cyberse-muted">
              Paste the URL or ID of an existing Google Spreadsheet you own.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetInput}
                onChange={(e) => setSheetInput(e.target.value)}
                className="flex-1 bg-cyberse-bg border border-cyberse-glow/20 rounded-xl px-4 py-2.5 text-xs text-cyberse-text focus:outline-none focus:border-cyberse-glow placeholder:text-cyberse-muted/50 font-mono"
              />
              <button
                onClick={handleLinkExistingSheet}
                disabled={isLoading || !sheetInput.trim()}
                className="bg-cyberse-darker hover:bg-cyberse-glow hover:text-cyberse-bg text-cyberse-glow px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-cyberse-glow/30 transition-all disabled:opacity-50"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Document Types & Tabs Manager */}
      {activeSubTab === 'types' && (
        <div className="space-y-6">
          <div className="bg-cyberse-darker/40 p-4 rounded-2xl border border-cyberse-glow/10">
            <p className="text-xs text-cyberse-muted leading-relaxed">
              Every document type corresponds to a <strong className="text-cyberse-glow">dedicated tab in your Google Sheet</strong>. When you scan an Official Receipt (OR), it streams directly into the OR tab. When you create a new option below, CyberSpend automatically adds that tab to your Google Sheet!
            </p>
          </div>

          {/* Add New Document Type Form */}
          <form onSubmit={handleCreateDocumentType} className="space-y-3 bg-cyberse-darker/60 p-5 rounded-2xl border border-cyberse-glow/20">
            <label className="text-[10px] font-black text-cyberse-glow uppercase tracking-widest flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" />
              Add Custom Document Option (Auto-Creates Tab)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Travel Voucher, Petty Cash, Tax Invoice..."
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                className="flex-1 bg-cyberse-bg border border-cyberse-glow/20 rounded-xl px-4 py-3 text-xs text-cyberse-text focus:outline-none focus:border-cyberse-glow placeholder:text-cyberse-muted/50"
              />
              <button
                type="submit"
                disabled={isLoading || !newTypeName.trim()}
                className="bg-cyberse-glow text-cyberse-bg px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_15px_rgba(0,242,255,0.2)] disabled:opacity-50 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add & Create Tab
              </button>
            </div>
          </form>

          {/* Document Types Grid */}
          <div className="space-y-2">
            <span className="text-[10px] font-black text-cyberse-muted uppercase tracking-widest block mb-2">
              Active Document Types / Sheet Tabs ({documentTypes.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
              {documentTypes.map((type, idx) => (
                <div 
                  key={type}
                  className="bg-cyberse-darker/80 border border-cyberse-glow/15 p-3.5 rounded-xl flex items-center justify-between group hover:border-cyberse-glow/40 transition-all"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-7 h-7 rounded-lg bg-cyberse-glow/10 border border-cyberse-glow/20 flex items-center justify-center text-cyberse-glow shrink-0 font-bold text-xs">
                      {idx + 1}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-cyberse-text tracking-wide truncate">{type}</p>
                      <p className="text-[10px] text-cyberse-muted font-mono truncate">Tab: '{type}'</p>
                    </div>
                  </div>

                  {documentTypes.length > 1 && (
                    <button
                      onClick={() => onRemoveDocumentType(type)}
                      title="Remove option"
                      className="p-1.5 text-cyberse-muted hover:text-cyberse-link hover:bg-cyberse-link/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Batch Archive Sync */}
      {activeSubTab === 'sync' && (
        <div className="space-y-6">
          <div className="bg-cyberse-darker/60 p-5 rounded-2xl border border-cyberse-glow/20 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-cyberse-text uppercase tracking-wider">Historical Archive Migration</p>
                <p className="text-[11px] text-cyberse-muted mt-0.5">
                  Synchronize all {transactions.length} recorded transactions into their corresponding categorized tabs in your Google Sheet.
                </p>
              </div>
              <span className="text-xs font-black text-cyberse-glow bg-cyberse-glow/10 px-3 py-1 rounded-lg border border-cyberse-glow/20">
                {transactions.length} Records
              </span>
            </div>

            {syncProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black text-cyberse-glow uppercase tracking-widest">
                  <span>Uploading to Google Sheets...</span>
                  <span>{syncProgress.current} / {syncProgress.total}</span>
                </div>
                <div className="w-full bg-cyberse-bg h-2 rounded-full overflow-hidden border border-cyberse-glow/20">
                  <div 
                    className="bg-cyberse-glow h-full transition-all duration-300 shadow-[0_0_10px_rgba(0,242,255,0.8)]"
                    style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleSyncAll}
              disabled={isLoading || !config.spreadsheetId || transactions.length === 0}
              className="w-full bg-cyberse-glow text-cyberse-bg py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white transition-all shadow-[0_0_25px_rgba(0,242,255,0.25)] disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              Sync All Transactions to Google Sheet Tabs Now
            </button>
          </div>

          {config.lastSyncedAt && (
            <p className="text-[10px] text-center text-cyberse-muted uppercase tracking-widest font-mono">
              Last Full Protocol Sync: {new Date(config.lastSyncedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
