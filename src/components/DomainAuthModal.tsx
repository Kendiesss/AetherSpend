import React, { useState } from 'react';
import { ShieldAlert, Copy, Check, ExternalLink, RefreshCw, X, AlertTriangle, Globe } from 'lucide-react';
import firebaseConfigJson from '../../firebase-applet-config.json';

interface DomainAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
}

export default function DomainAuthModal({ isOpen, onClose, onRetry }: DomainAuthModalProps) {
  const [copied, setCopied] = useState(false);
  const currentHostname = window.location.hostname || 'ais-dev-yvrhh2ok5mucyz4bfek6y6-10815185130.asia-southeast1.run.app';
  const projectId = firebaseConfigJson.projectId || 'gen-lang-client-0729584554';
  const firebaseSettingsUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentHostname);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-cyberse-bg/90 backdrop-blur-xl animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl cyber-card p-6 md:p-8 border-cyberse-link/40 shadow-[0_0_50px_rgba(255,77,0,0.25)] z-10 my-8 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-cyberse-muted hover:text-white rounded-lg hover:bg-cyberse-darker transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-cyberse-link/10 border border-cyberse-link/30 flex items-center justify-center text-cyberse-link shrink-0 shadow-[0_0_20px_rgba(255,77,0,0.2)]">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-cyberse-link uppercase tracking-wider">
                Firebase Domain Authorization Required
              </h3>
            </div>
            <p className="text-xs text-cyberse-muted uppercase tracking-wider mt-1">
              Error code: <code className="text-cyberse-link font-mono font-bold">auth/unauthorized-domain</code>
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-4 text-xs text-cyberse-muted leading-relaxed mb-6">
          <p>
            Firebase Authentication requires the app domain to be added to your Firebase project's 
            <strong className="text-cyberse-text"> Authorized Domains</strong> whitelist to permit Google Sign-In popups.
          </p>

          {/* Current Domain Box */}
          <div className="bg-cyberse-darker/90 border border-cyberse-glow/20 p-4 rounded-xl space-y-2">
            <span className="text-[10px] font-black text-cyberse-glow uppercase tracking-widest block">
              1. Copy Current App Domain:
            </span>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-cyberse-bg px-3 py-2 rounded-lg border border-cyberse-glow/10 font-mono text-[11px] text-cyberse-text truncate">
                {currentHostname}
              </div>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-cyberse-glow text-cyberse-bg font-black uppercase tracking-wider rounded-lg text-[11px] hover:bg-white transition-all flex items-center gap-1.5 shrink-0 shadow-[0_0_10px_rgba(0,242,255,0.3)]"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-cyberse-bg" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-cyberse-darker/60 border border-cyberse-glow/10 p-4 rounded-xl space-y-2.5">
            <span className="text-[10px] font-black text-cyberse-muted uppercase tracking-widest block">
              2. Add to Firebase Console:
            </span>
            <ol className="list-decimal list-inside space-y-1.5 text-cyberse-text text-[11px]">
              <li>
                Open the <strong className="text-cyberse-glow">Firebase Auth Settings</strong> page for project <code className="text-cyberse-glow font-mono font-bold">{projectId}</code>.
              </li>
              <li>
                Scroll down to the <strong className="text-cyberse-glow">Authorized domains</strong> section.
              </li>
              <li>
                Click <strong className="text-cyberse-text">Add domain</strong>, paste <code className="text-cyberse-glow font-mono font-bold">{currentHostname}</code>, and save.
              </li>
            </ol>

            <a
              href={firebaseSettingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-lg bg-cyberse-glow/10 hover:bg-cyberse-glow hover:text-cyberse-bg text-cyberse-glow border border-cyberse-glow/30 font-black uppercase tracking-wider text-[11px] transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Firebase Console Settings ↗
            </a>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onRetry}
            className="flex-1 bg-cyberse-glow text-cyberse-bg py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(0,242,255,0.3)] flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Sign In
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3.5 bg-cyberse-darker hover:bg-cyberse-dark text-cyberse-muted hover:text-cyberse-text rounded-xl font-black text-xs uppercase tracking-wider border border-cyberse-glow/20 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
