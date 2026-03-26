import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, X, RefreshCw, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const startCamera = useCallback(async () => {
    setIsInitializing(true);
    setError(null);
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setIsInitializing(false);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera. Please ensure you have granted permission.');
      setIsInitializing(false);
    }
  }, [facingMode, stream]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        onCapture(base64);
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="relative w-full max-w-2xl aspect-[3/4] sm:aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
        {isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="font-bold tracking-tight">Initializing Aether-Lens...</p>
          </div>
        )}

        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center">
              <X className="w-10 h-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Camera Error</h3>
              <p className="text-slate-400">{error}</p>
            </div>
            <button 
              onClick={onClose}
              className="bg-white text-slate-900 px-8 py-3 rounded-2xl font-bold hover:bg-slate-100 transition-all"
            >
              Go Back
            </button>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Camera Controls Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
              <button 
                onClick={onClose}
                className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all"
              >
                <X className="w-6 h-6" />
              </button>

              <button 
                onClick={captureImage}
                className="w-20 h-20 rounded-full bg-white p-1 shadow-2xl hover:scale-110 active:scale-95 transition-all"
              >
                <div className="w-full h-full rounded-full border-4 border-slate-900 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                </div>
              </button>

              <button 
                onClick={toggleCamera}
                className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all"
              >
                <RefreshCw className="w-6 h-6" />
              </button>
            </div>

            {/* Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-12">
              <div className="w-full h-full border-2 border-dashed border-white/30 rounded-2xl" />
            </div>
          </>
        )}
      </div>
      
      <div className="mt-8 text-center text-white/50">
        <p className="text-sm font-medium">Position the receipt within the frame for best results</p>
      </div>
    </div>
  );
}
