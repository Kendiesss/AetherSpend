import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, AlertCircle, Camera, Sparkles, Plus, FileText, Check } from 'lucide-react';
import { processReceipt } from '../services/geminiService';
import { ReceiptData, DEFAULT_DOCUMENT_TYPES } from '../types';
import { cn } from '../lib/utils';
import CameraCapture from './CameraCapture';

interface ReceiptUploadProps {
  onProcessed: (data: ReceiptData) => void;
  documentTypes?: string[];
  onAddDocumentType?: (type: string) => Promise<void>;
}

export default function ReceiptUpload({ 
  onProcessed,
  documentTypes = DEFAULT_DOCUMENT_TYPES,
  onAddDocumentType
}: ReceiptUploadProps) {
  const [selectedType, setSelectedType] = useState<string>(documentTypes[0] || 'Official Receipt (OR)');
  const [isAddingType, setIsAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateNewType = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTypeName.trim();
    if (!trimmed) return;
    if (onAddDocumentType) {
      await onAddDocumentType(trimmed);
    }
    setSelectedType(trimmed);
    setNewTypeName('');
    setIsAddingType(false);
  };

  const handleProcessImage = async (base64: string, mimeType: string = 'image/jpeg') => {
    setIsProcessing(true);
    setError(null);
    setIsCameraActive(false);

    try {
      const data = await processReceipt(base64, mimeType);
      onProcessed({
        ...data,
        documentType: selectedType
      });
    } catch (err) {
      console.error('Error processing receipt:', err);
      setError('Failed to process receipt. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      handleProcessImage(base64, file.type);
    };
    reader.readAsDataURL(file);
  }, [selectedType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    multiple: false,
    disabled: isProcessing
  } as any);

  if (isCameraActive) {
    return (
      <CameraCapture 
        onCapture={(base64) => handleProcessImage(base64)}
        onClose={() => setIsCameraActive(false)}
      />
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Document Type Selection Protocol */}
      <div className="bg-cyberse-darker/70 p-4 rounded-2xl border border-cyberse-glow/20 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black text-cyberse-glow uppercase tracking-widest flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" />
            1. Select Document Classification (Target Sheet Tab)
          </label>
          {!isAddingType && (
            <button
              type="button"
              onClick={() => setIsAddingType(true)}
              className="text-[10px] font-black text-cyberse-glow hover:text-white uppercase tracking-wider flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Option
            </button>
          )}
        </div>

        {isAddingType ? (
          <form onSubmit={handleCreateNewType} className="flex gap-2 animate-in fade-in duration-200">
            <input
              type="text"
              autoFocus
              placeholder="e.g. Travel Voucher, Petty Cash..."
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              className="flex-1 bg-cyberse-bg border border-cyberse-glow/30 rounded-xl px-3 py-2 text-xs text-cyberse-text focus:outline-none focus:border-cyberse-glow"
            />
            <button
              type="submit"
              disabled={!newTypeName.trim()}
              className="bg-cyberse-glow text-cyberse-bg px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-white transition-all disabled:opacity-50"
            >
              Save & Select
            </button>
            <button
              type="button"
              onClick={() => setIsAddingType(false)}
              className="bg-cyberse-darker text-cyberse-muted px-3 py-2 rounded-xl text-xs font-bold hover:text-cyberse-text"
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
            {documentTypes.map((type) => {
              const isSelected = selectedType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-1.5",
                    isSelected
                      ? "bg-cyberse-glow text-cyberse-bg border-cyberse-glow shadow-[0_0_10px_rgba(0,242,255,0.4)] scale-[1.02]"
                      : "bg-cyberse-bg/60 text-cyberse-muted border-cyberse-glow/15 hover:border-cyberse-glow/40 hover:text-cyberse-text"
                  )}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  {type}
                </button>
              );
            })}
          </div>
        )}

        <div className="text-[10px] text-cyberse-muted flex items-center justify-between pt-1 border-t border-cyberse-glow/10 font-mono">
          <span>Routing Data To:</span>
          <span className="text-cyberse-glow font-bold">Tab '{selectedType}'</span>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-3xl p-12 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-4 group overflow-hidden",
          isDragActive ? "border-cyberse-glow bg-cyberse-glow/5 scale-[1.02]" : "border-cyberse-glow/20 hover:border-cyberse-glow/50 hover:bg-cyberse-glow/5",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        
        {isProcessing ? (
          <>
            <div className="relative">
              <Loader2 className="w-16 h-16 text-cyberse-glow animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-cyberse-glow/40" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-cyberse-text tracking-[0.2em] uppercase">Cyber-Scanning...</p>
              <p className="text-xs text-cyberse-muted font-bold uppercase tracking-widest mt-2">
                Extracting {selectedType} via Gemini Protocol
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-2xl bg-cyberse-glow/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform border border-cyberse-glow/20 shadow-[0_0_15px_rgba(0,242,255,0.1)]">
              <Upload className="w-10 h-10 text-cyberse-glow" />
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-cyberse-text tracking-widest uppercase">
                {isDragActive ? "Release Data" : `Scan ${selectedType}`}
              </p>
              <p className="text-xs text-cyberse-muted mt-2 font-bold uppercase tracking-widest">
                Drag & drop receipt image or click to initialize
              </p>
            </div>
          </>
        )}

        {error && (
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-2 text-cyberse-link text-[10px] font-black bg-cyberse-link/10 py-2 rounded-lg border border-cyberse-link/20 uppercase tracking-widest">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyberse-glow/30" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyberse-glow/30" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyberse-glow/30" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyberse-glow/30" />
      </div>

      {!isProcessing && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-cyberse-glow/10" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-cyberse-dark px-4 text-cyberse-muted font-black tracking-[0.3em]">or</span>
          </div>
        </div>
      )}

      {!isProcessing && (
        <button
          onClick={() => setIsCameraActive(true)}
          className="w-full bg-cyberse-darker text-cyberse-text py-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-cyberse-glow hover:text-cyberse-bg transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)] active:scale-[0.98] uppercase tracking-[0.2em] border border-cyberse-glow/20"
        >
          <Camera className="w-6 h-6" />
          Use Cyber-Lens Camera
        </button>
      )}
    </div>
  );
}
