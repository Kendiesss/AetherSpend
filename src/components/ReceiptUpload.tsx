import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, CheckCircle2, AlertCircle, Camera, Sparkles } from 'lucide-react';
import { processReceipt } from '../services/geminiService';
import { ReceiptData } from '../types';
import { cn } from '../lib/utils';
import CameraCapture from './CameraCapture';

interface ReceiptUploadProps {
  onProcessed: (data: ReceiptData) => void;
}

export default function ReceiptUpload({ onProcessed }: ReceiptUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcessImage = async (base64: string, mimeType: string = 'image/jpeg') => {
    setIsProcessing(true);
    setError(null);
    setIsCameraActive(false);

    try {
      const data = await processReceipt(base64, mimeType);
      onProcessed(data);
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
  }, []);

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
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-3xl p-12 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-4",
          isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-slate-200 hover:border-primary/50 hover:bg-slate-50",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        
        {isProcessing ? (
          <>
            <div className="relative">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary/40" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-slate-900 tracking-tight">Aether-Scanning...</p>
              <p className="text-sm text-slate-500 font-medium">Extracting data with Gemini AI</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-[32px] bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Upload className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900 tracking-tight">
                {isDragActive ? "Drop it here" : "Upload Receipt"}
              </p>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                Drag & drop or click to select
              </p>
            </div>
          </>
        )}

        {error && (
          <div className="absolute -bottom-12 left-0 right-0 flex items-center justify-center gap-2 text-destructive text-sm font-bold bg-destructive/10 py-2 rounded-xl">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {!isProcessing && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-4 text-slate-400 font-bold tracking-widest">or</span>
          </div>
        </div>
      )}

      {!isProcessing && (
        <button
          onClick={() => setIsCameraActive(true)}
          className="w-full bg-slate-900 text-white py-5 rounded-3xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
        >
          <Camera className="w-6 h-6" />
          Use Aether-Lens Camera
        </button>
      )}
    </div>
  );
}
