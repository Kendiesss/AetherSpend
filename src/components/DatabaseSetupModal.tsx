import React from 'react';
import { Database, ExternalLink, RefreshCw, X, HardDrive, CheckCircle2 } from 'lucide-react';
import firebaseConfigJson from '../../firebase-applet-config.json';

interface DatabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onUseLocalMode: () => void;
}

export default function DatabaseSetupModal({
  isOpen,
  onClose,
  onRetry,
  onUseLocalMode
}: DatabaseSetupModalProps) {
  const projectId = firebaseConfigJson.projectId || 'gen-lang-client-0729584554';
  const firestoreConsoleUrl = `https://console.firebase.google.com/project/${projectId}/firestore`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-cyberse-bg/90 backdrop-blur-xl animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl cyber-card p-6 md:p-8 border-cyberse-glow/40 shadow-[0_0_50px_rgba(0,242,255,0.25)] z-10 my-8 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-cyberse-muted hover:text-white rounded-lg hover:bg-cyberse-darker transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-cyberse-glow/10 border border-cyberse-glow/30 flex items-center justify-center text-cyberse-glow shrink-0 shadow-[0_0_20px_rgba(0,242,255,0.2)]">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-cyberse-glow uppercase tracking-wider">
              Cloud Database Connection
            </h3>
            <p className="text-xs text-cyberse-muted uppercase tracking-wider mt-1">
              Connected to: <code className="text-cyberse-glow font-mono font-bold">{firebaseConfigJson.firestoreDatabaseId || 'ai-studio-d6d0fcef-64e3-4b6a-8e8a-3804f6cf5c4d'}</code>
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-4 text-xs text-cyberse-muted leading-relaxed mb-6">
          <p>
            Your Google Account is signed in. CyberSpend is configured to connect to your project database <code className="text-cyberse-glow font-mono font-bold">ai-studio-d6d0fcef-64e3-4b6a-8e8a-3804f6cf5c4d</code> in <code className="text-white font-mono">{projectId}</code>.
          </p>

          <div className="bg-cyberse-darker/90 border border-cyberse-glow/20 p-4 rounded-xl space-y-3">
            <span className="text-[10px] font-black text-cyberse-glow uppercase tracking-widest block">
              Database Configuration Updated:
            </span>
            <p className="text-cyberse-text text-[11px] leading-relaxed">
              Your database <strong className="text-cyberse-glow font-mono">ai-studio-d6d0fcef-64e3-4b6a-8e8a-3804f6cf5c4d</strong> is already active in your project. We have configured the app to connect directly to it.
            </p>

            <a
              href={firestoreConsoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-2 px-4 py-2.5 rounded-lg bg-cyberse-glow/10 hover:bg-cyberse-glow hover:text-cyberse-bg text-cyberse-glow border border-cyberse-glow/30 font-black uppercase tracking-wider text-[11px] transition-all w-full justify-center shadow-[0_0_15px_rgba(0,242,255,0.15)]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Database in Firebase Console ↗
            </a>
          </div>

          <div className="bg-cyberse-darker/50 border border-cyberse-glow/10 p-3.5 rounded-xl flex items-start gap-3">
            <HardDrive className="w-4 h-4 text-cyberse-purple shrink-0 mt-0.5" />
            <div className="text-[11px] text-cyberse-muted leading-relaxed">
              <strong className="text-cyberse-text">Local Storage Mode Available:</strong> You can continue using CyberSpend right now. Scanned receipts, OCR data, and categories will be securely saved in your browser until Firestore is activated.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onRetry}
            className="w-full sm:flex-1 bg-cyberse-glow text-cyberse-bg py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(0,242,255,0.3)] flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Check Connection Again
          </button>
          <button
            onClick={onUseLocalMode}
            className="w-full sm:w-auto px-5 py-3.5 bg-cyberse-darker hover:bg-cyberse-dark text-cyberse-text hover:text-white rounded-xl font-black text-xs uppercase tracking-wider border border-cyberse-glow/20 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-cyberse-glow" />
            Use Local Mode
          </button>
        </div>
      </div>
    </div>
  );
}
