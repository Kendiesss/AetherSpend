import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { processReceipt } from '../services/geminiService';
import { ReceiptData } from '../types';
import { cn } from '../lib/utils';

interface ReceiptUploadProps {
  onProcessed: (data: ReceiptData) => void;
}

export default function ReceiptUpload({ onProcessed }: ReceiptUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const data = await processReceipt(base64, file.type);
        onProcessed(data);
        setIsProcessing(false);
      };
      reader.onerror = () => {
        setError('Failed to read file');
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error processing receipt:', err);
      setError('Failed to process receipt. Please try again.');
      setIsProcessing(false);
    }
  }, [onProcessed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    multiple: false,
    disabled: isProcessing
  } as any);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-4",
          isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-slate-300 hover:border-primary/50 hover:bg-slate-50",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        
        {isProcessing ? (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-lg font-medium text-slate-900">Aether-Scanning...</p>
              <p className="text-sm text-slate-500">Extracting merchant, amount, and category</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-slate-900">
                {isDragActive ? "Drop your receipt here" : "Upload your receipt"}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Drag and drop or click to select a PNG or JPG
              </p>
            </div>
          </>
        )}

        {error && (
          <div className="absolute -bottom-12 left-0 right-0 flex items-center justify-center gap-2 text-destructive text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
