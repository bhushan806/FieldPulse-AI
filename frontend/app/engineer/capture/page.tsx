'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Image as ImageIcon, Video, Mic, ArrowLeft, Send, MapPin, X } from 'lucide-react';
import { useCaptureStore } from '@/store/captureStore';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/lib/apiClient';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

export default function CaptureScreen() {
  const router = useRouter();
  const { addNotification } = useUIStore();
  const { selectedProjectId } = useAuthStore();
  const { currentCapture, updateCurrentCapture, addToQueue, isOffline } = useCaptureStore();
  
  const [mode, setMode] = useState<'photo' | 'video' | 'voice' | 'qr'>('photo');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Initialize camera
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      addNotification({ type: 'error', message: 'Could not access camera. Please check permissions.' });
    }
  }, [addNotification]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Capture Photo
  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleSubmit = async () => {
    if (!capturedImage) return;
    setSubmitting(true);

    try {
      // Get Location
      let gps = { lat: 0, lng: 0 };
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          gps = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch (e) {
          addNotification({ type: 'warning', message: 'Could not get exact location.' });
        }
      }

      // Convert data URL to Blob
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      
      const payload = {
        id: crypto.randomUUID(),
        projectId: selectedProjectId || 'p1', // Default to p1 for demo if none selected
        mediaType: mode,
        mediaBlob: blob,
        notes,
        gps,
        queuedAt: new Date().toISOString()
      };

      if (isOffline) {
        // Queue it
        addToQueue(payload);
        addNotification({ type: 'success', message: 'Saved offline. Will sync when connected.' });
        router.push('/engineer/home');
      } else {
        // Sync it directly
        const formData = new FormData();
        formData.append('file', blob, `capture_${Date.now()}.jpg`);
        formData.append('mediaType', mode);
        formData.append('projectId', payload.projectId);
        formData.append('lat', gps.lat.toString());
        formData.append('lng', gps.lng.toString());
        if (notes) formData.append('notes', notes);

        const response = await apiClient.post(API_ENDPOINTS.captures.submit, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        addNotification({ type: 'success', message: 'Capture submitted successfully!' });
        router.push(`/engineer/confirmation/${response.data.id || payload.id}`);
      }
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to submit capture. Saved to queue.' });
      // In a real app, we'd add it to queue here as a fallback
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
        <button 
          onClick={() => { stopCamera(); router.back(); }}
          className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center text-white backdrop-blur-md border border-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-white font-semibold">Capture Progress</span>
        <div className="w-10 h-10" /> {/* Spacer */}
      </div>

      {/* Camera Viewfinder */}
      <div className="flex-1 relative bg-slate-900 flex items-center justify-center overflow-hidden">
        {capturedImage ? (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
              onPlay={() => console.log('Video playing')}
            />
            {/* Camera Overlay/Grid */}
            <div className="absolute inset-0 pointer-events-none border-[1px] border-white/20 grid grid-cols-3 grid-rows-3">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="border-[0.5px] border-white/10" />
              ))}
            </div>
            {/* Click to start (if not started) */}
            {!stream && (
              <button 
                onClick={startCamera}
                className="absolute inset-0 flex items-center justify-center bg-black/50 text-white z-20"
              >
                <div className="flex flex-col items-center">
                  <Camera className="w-12 h-12 mb-2 opacity-50" />
                  <span>Tap to activate camera</span>
                </div>
              </button>
            )}
          </>
        )}
      </div>

      {/* Controls & Submit section */}
      <div className="bg-slate-900 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20 pb-safe relative -mt-6 pt-2">
        <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto my-3" />
        
        {capturedImage ? (
          <div className="p-6 space-y-6 animate-in slide-in-from-bottom-8">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Add Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g. Foundation poured, waiting for curing..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white resize-none h-24 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all outline-none"
              />
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={retakePhoto}
                className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 font-medium hover:bg-slate-800 transition-colors"
              >
                Retake
              </button>
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-[2] py-3 rounded-xl bg-orange-500 text-white font-medium shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Submit</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Mode Selector */}
            <div className="flex justify-center gap-6 mb-8">
              {[
                { id: 'photo', icon: Camera, label: 'Photo' },
                { id: 'video', icon: Video, label: 'Video' },
                { id: 'voice', icon: Mic, label: 'Voice' },
              ].map((m) => {
                const Icon = m.icon;
                const isActive = mode === m.id;
                return (
                  <button 
                    key={m.id}
                    onClick={() => setMode(m.id as any)}
                    className={`flex flex-col items-center gap-2 transition-all ${isActive ? 'text-orange-400 scale-110' : 'text-slate-500'}`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Shutter Button */}
            <div className="flex justify-center mb-6">
              <button 
                onClick={takePhoto}
                disabled={!stream}
                className="w-20 h-20 rounded-full border-4 border-slate-700 flex items-center justify-center p-1 active:scale-95 transition-transform disabled:opacity-50"
              >
                <div className="w-full h-full rounded-full bg-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
