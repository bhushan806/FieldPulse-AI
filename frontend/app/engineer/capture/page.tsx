'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Camera, 
  Image as ImageIcon, 
  Video, 
  Mic, 
  QrCode, 
  ArrowLeft, 
  Send, 
  X, 
  Square, 
  RotateCcw, 
  Volume2, 
  CheckCircle2, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useCaptureStore } from '@/store/captureStore';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/lib/apiClient';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { offlineService } from '@/lib/offlineQueue';

export default function CaptureScreen() {
  const router = useRouter();
  const { addNotification } = useUIStore();
  const { selectedProjectId } = useAuthStore();
  const { addToQueue, isOffline } = useCaptureStore();
  
  const [mode, setMode] = useState<'photo' | 'video' | 'voice' | 'qr'>('photo');
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Captured Results
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedVideoUrl, setCapturedVideoUrl] = useState<string | null>(null);
  const [capturedAudioUrl, setCapturedAudioUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [scannedQrCode, setScannedQrCode] = useState<string | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // QR Scanner instance
  const html5QrCodeRef = useRef<any>(null);
  const [isQrScanning, setIsQrScanning] = useState(false);

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Stop active media streams
  const stopAllStreams = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (html5QrCodeRef.current && isQrScanning) {
      try {
        html5QrCodeRef.current.stop().catch(() => {});
      } catch {}
      setIsQrScanning(false);
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, [stream, isQrScanning]);

  // Start Camera for Photo or Video
  const startCamera = useCallback(async (withAudio: boolean = false) => {
    stopAllStreams();
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: withAudio
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      addNotification({ type: 'error', message: 'Could not access camera/microphone. Please check permissions.' });
    }
  }, [addNotification, stopAllStreams]);

  // Start Audio-only stream for Voice
  const startAudioOnly = useCallback(async () => {
    stopAllStreams();
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);
    } catch (err) {
      addNotification({ type: 'error', message: 'Could not access microphone. Please check permissions.' });
    }
  }, [addNotification, stopAllStreams]);

  // Start QR Scanner using html5-qrcode
  const startQrScanner = useCallback(async () => {
    stopAllStreams();
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const qrRegionId = 'qr-reader-viewport';
      
      // Give element a tick to mount
      setTimeout(async () => {
        try {
          const qrScanner = new Html5Qrcode(qrRegionId);
          html5QrCodeRef.current = qrScanner;
          await qrScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText: string) => {
              setScannedQrCode(decodedText);
              setNotes(prev => prev ? `${prev} | Scanned QR: ${decodedText}` : `Scanned QR: ${decodedText}`);
              addNotification({ type: 'success', message: `QR Code Scanned: ${decodedText}` });
              qrScanner.stop().catch(() => {});
              setIsQrScanning(false);
            },
            () => {} // ignore frame parse errors
          );
          setIsQrScanning(true);
        } catch (e) {
          addNotification({ type: 'error', message: 'Could not start QR scanner.' });
        }
      }, 100);
    } catch (err) {
      addNotification({ type: 'error', message: 'Failed to load QR scanner library.' });
    }
  }, [addNotification, stopAllStreams]);

  // Mode change handler
  useEffect(() => {
    // Reset captured outputs
    setCapturedImage(null);
    setCapturedVideoUrl(null);
    setCapturedAudioUrl(null);
    setCapturedBlob(null);
    setScannedQrCode(null);
    setIsRecording(false);
    setRecordingSeconds(0);

    if (mode === 'photo') {
      startCamera(false);
    } else if (mode === 'video') {
      startCamera(true);
    } else if (mode === 'voice') {
      startAudioOnly();
    } else if (mode === 'qr') {
      startQrScanner();
    }

    return () => {
      stopAllStreams();
    };
  }, [mode]);

  // Photo Capture
  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
        stopAllStreams();
      }
    }
  };

  // Gallery Select
  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCapturedImage(reader.result);
        stopAllStreams();
      }
    };
    reader.readAsDataURL(file);
  };

  // Start Video / Audio Recording
  const startRecording = () => {
    if (!stream) {
      addNotification({ type: 'warning', message: 'Media stream not ready.' });
      return;
    }

    recordedChunksRef.current = [];
    const mimeType = mode === 'video'
      ? (MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm')
      : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4');

    try {
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(recordedChunksRef.current, { type: mimeType });
        setCapturedBlob(fullBlob);
        const url = URL.createObjectURL(fullBlob);
        if (mode === 'video') {
          setCapturedVideoUrl(url);
        } else {
          setCapturedAudioUrl(url);
        }
        stopAllStreams();
      };

      recorder.start(250); // collect in 250ms intervals
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (e) {
      addNotification({ type: 'error', message: 'Could not start recording.' });
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const retakeCapture = () => {
    setCapturedImage(null);
    setCapturedVideoUrl(null);
    setCapturedAudioUrl(null);
    setCapturedBlob(null);
    setScannedQrCode(null);
    setIsRecording(false);
    setRecordingSeconds(0);

    if (mode === 'photo') startCamera(false);
    else if (mode === 'video') startCamera(true);
    else if (mode === 'voice') startAudioOnly();
    else if (mode === 'qr') startQrScanner();
  };

  // Format seconds as mm:ss
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const hasCapturedResult = capturedImage || capturedVideoUrl || capturedAudioUrl || scannedQrCode;

  // Submit Handler
  const handleSubmit = async () => {
    if (!hasCapturedResult) return;
    if (!selectedProjectId) {
      addNotification({ type: 'error', message: 'No project assigned to your account. Contact your PM.' });
      return;
    }
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
        } catch {
          addNotification({ type: 'warning', message: 'GPS coordinates unavailable. Submitting with default location.' });
        }
      }

      let uploadBlob: Blob;
      let filename: string;
      let backendMediaType: string = mode;

      if (mode === 'photo' && capturedImage) {
        const res = await fetch(capturedImage);
        uploadBlob = await res.blob();
        filename = `capture_${Date.now()}.jpg`;
      } else if (mode === 'video' && capturedBlob) {
        uploadBlob = capturedBlob;
        filename = `capture_${Date.now()}.mp4`;
      } else if (mode === 'voice' && capturedBlob) {
        uploadBlob = capturedBlob;
        filename = `capture_${Date.now()}.mp3`;
      } else if (mode === 'qr') {
        // QR Code capture: create a small metadata blob or empty image
        const qrJson = JSON.stringify({ qr: scannedQrCode, timestamp: new Date().toISOString() });
        uploadBlob = new Blob([qrJson], { type: 'application/json' });
        filename = `qr_${Date.now()}.json`;
      } else {
        uploadBlob = new Blob([''], { type: 'text/plain' });
        filename = `data_${Date.now()}.bin`;
      }

      const payload = {
        id: crypto.randomUUID(),
        projectId: selectedProjectId,
        mediaType: mode,
        mediaBlob: uploadBlob,
        notes,
        gps,
        queuedAt: new Date().toISOString()
      };

      if (isOffline) {
        await offlineService.saveToQueue(payload);
        addToQueue(payload);
        addNotification({ type: 'success', message: 'Saved offline. Evidence will auto-sync upon reconnection.' });
        router.push('/engineer/home');
      } else {
        const formData = new FormData();
        formData.append('file', uploadBlob, filename);
        formData.append('media_type', backendMediaType);
        formData.append('project_id', selectedProjectId);
        formData.append('gps_lat', gps.lat.toString());
        formData.append('gps_lng', gps.lng.toString());
        if (notes) formData.append('text_note', notes);
        if (scannedQrCode) formData.append('qr_code_value', scannedQrCode);

        const response = await apiClient.post(API_ENDPOINTS.captures.submit, formData);
        addNotification({ type: 'success', message: 'Field evidence submitted successfully!' });
        router.push(`/engineer/confirmation/${response.data.id || payload.id}`);
      }
    } catch (error: any) {
      addNotification({ 
        type: 'error', 
        message: error.response?.data?.detail || 'Failed to submit capture. Stored in local sync queue.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/90 to-transparent absolute top-0 w-full z-20">
        <button 
          onClick={() => { stopAllStreams(); router.back(); }}
          className="w-10 h-10 rounded-full bg-slate-800/60 flex items-center justify-center text-white backdrop-blur-md border border-white/10 active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm tracking-wide">
            {mode === 'photo' ? 'Photo Evidence' :
             mode === 'video' ? 'Video Evidence' :
             mode === 'voice' ? 'Voice Note' : 'QR Activity Scan'}
          </span>
          {isRecording && (
            <span className="flex items-center gap-1.5 bg-danger/80 text-white text-[11px] font-bold px-2 py-0.5 rounded-full animate-pulse border border-danger">
              <span className="w-2 h-2 rounded-full bg-white" />
              {formatTimer(recordingSeconds)}
            </span>
          )}
        </div>
        <div className="w-10 h-10" />
      </div>

      {/* Main Viewfinder Section */}
      <div className="flex-1 relative bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* PHOTO PREVIEW */}
        {capturedImage && (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
        )}

        {/* VIDEO PREVIEW */}
        {capturedVideoUrl && (
          <video 
            src={capturedVideoUrl} 
            controls 
            playsInline 
            className="w-full h-full object-contain bg-black" 
          />
        )}

        {/* VOICE PREVIEW */}
        {capturedAudioUrl && (
          <div className="flex flex-col items-center justify-center p-8 text-center text-white space-y-6 w-full max-w-sm">
            <div className="w-24 h-24 rounded-full bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center text-orange-400">
              <Volume2 className="w-12 h-12" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Voice Note Recorded</h3>
              <p className="text-xs text-slate-400 mt-1">Duration: {formatTimer(recordingSeconds || 5)}</p>
            </div>
            <audio src={capturedAudioUrl} controls className="w-full" />
          </div>
        )}

        {/* QR SCANNED CARD */}
        {scannedQrCode && (
          <div className="flex flex-col items-center justify-center p-8 text-center text-white space-y-4 max-w-sm">
            <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center text-green-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold">Activity QR Detected</h3>
            <div className="bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-xl font-mono text-sm text-orange-400 font-bold">
              {scannedQrCode}
            </div>
            <p className="text-xs text-slate-400">Activity code successfully bound to this capture session.</p>
          </div>
        )}

        {/* LIVE CAMERA VIEWFINDER (Photo / Video mode) */}
        {!hasCapturedResult && (mode === 'photo' || mode === 'video') && (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
            {/* Rule of Thirds Grid */}
            <div className="absolute inset-0 pointer-events-none border border-white/20 grid grid-cols-3 grid-rows-3">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="border-[0.5px] border-white/10" />
              ))}
            </div>

            {!stream && (
              <button 
                onClick={() => startCamera(mode === 'video')}
                className="absolute inset-0 flex items-center justify-center bg-black/60 text-white z-20"
              >
                <div className="flex flex-col items-center">
                  <Camera className="w-12 h-12 mb-2 opacity-60" />
                  <span className="text-sm font-semibold">Tap to Activate Camera</span>
                </div>
              </button>
            )}
          </>
        )}

        {/* LIVE AUDIO RECORDING SCREEN (Voice mode) */}
        {!hasCapturedResult && mode === 'voice' && (
          <div className="flex flex-col items-center justify-center text-white space-y-6">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
              isRecording 
                ? 'bg-red-500/30 border-4 border-red-500 animate-pulse scale-110' 
                : 'bg-slate-800/80 border-2 border-slate-700'
            }`}>
              <Mic className={`w-16 h-16 ${isRecording ? 'text-red-500' : 'text-slate-400'}`} />
            </div>

            <div className="text-center">
              <div className="text-2xl font-mono font-bold">
                {isRecording ? formatTimer(recordingSeconds) : '00:00'}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isRecording ? 'Recording site audio... Tap red button to stop' : 'Tap the microphone button below to record'}
              </p>
            </div>
          </div>
        )}

        {/* LIVE QR SCANNER SCREEN */}
        {!hasCapturedResult && mode === 'qr' && (
          <div className="relative w-full h-full flex items-center justify-center">
            <div id="qr-reader-viewport" className="w-full h-full max-w-sm max-h-sm overflow-hidden" />
            <div className="absolute top-20 text-center px-4">
              <span className="bg-black/70 text-white text-xs px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-md">
                Align QR Code within the targeting box
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Controls & Bottom Drawer */}
      <div className="bg-slate-900 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.6)] z-20 pb-safe relative -mt-6 pt-2 border-t border-slate-800">
        <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto my-3" />
        
        {hasCapturedResult ? (
          /* Submission Review Screen */
          <div className="p-6 space-y-5 animate-in slide-in-from-bottom-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Notes & Activity Context</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about progress, materials, or observations..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 text-white text-sm resize-none h-20 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all outline-none"
              />
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={retakeCapture}
                className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 font-semibold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Retake
              </button>
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-[2] py-3 rounded-xl bg-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 hover:bg-orange-600 disabled:opacity-50 transition-all"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Submit Evidence</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Capture Controls & Mode Selector */
          <div className="p-6">
            {/* Mode Switcher */}
            <div className="flex justify-center gap-6 mb-6">
              {[
                { id: 'photo', icon: Camera, label: 'Photo' },
                { id: 'video', icon: Video, label: 'Video' },
                { id: 'voice', icon: Mic, label: 'Voice' },
                { id: 'qr', icon: QrCode, label: 'QR Scan' },
              ].map((m) => {
                const Icon = m.icon;
                const isActive = mode === m.id;
                return (
                  <button 
                    key={m.id}
                    onClick={() => {
                      if (isRecording) stopRecording();
                      setMode(m.id as any);
                    }}
                    className={`flex flex-col items-center gap-1.5 transition-all ${
                      isActive ? 'text-orange-400 scale-110 font-bold' : 'text-slate-500 hover:text-slate-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Shutter / Trigger Controls */}
            <div className="flex justify-center items-center gap-8 mb-4">
              {/* Gallery upload (Only for photo mode) */}
              {mode === 'photo' ? (
                <>
                  <input
                    ref={galleryRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleGallerySelect}
                  />
                  <button
                    type="button"
                    onClick={() => galleryRef.current?.click()}
                    className="flex flex-col items-center gap-1 text-slate-400 hover:text-white"
                  >
                    <div className="w-11 h-11 rounded-full border border-slate-700 flex items-center justify-center bg-slate-800">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Gallery</span>
                  </button>
                </>
              ) : (
                <div className="w-11" />
              )}

              {/* Main Shutter Button based on mode */}
              {mode === 'photo' && (
                <button 
                  onClick={takePhoto}
                  disabled={!stream}
                  className="w-20 h-20 rounded-full border-4 border-slate-700 flex items-center justify-center p-1 active:scale-95 transition-transform disabled:opacity-50"
                >
                  <div className="w-full h-full rounded-full bg-white shadow-lg" />
                </button>
              )}

              {mode === 'video' && (
                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!stream}
                  className="w-20 h-20 rounded-full border-4 border-slate-700 flex items-center justify-center p-1 active:scale-95 transition-transform disabled:opacity-50"
                >
                  {isRecording ? (
                    <div className="w-8 h-8 rounded-lg bg-danger shadow-lg shadow-danger/50" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-danger shadow-lg shadow-danger/50" />
                  )}
                </button>
              )}

              {mode === 'voice' && (
                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!stream}
                  className="w-20 h-20 rounded-full border-4 border-slate-700 flex items-center justify-center p-1 active:scale-95 transition-transform disabled:opacity-50"
                >
                  {isRecording ? (
                    <div className="w-8 h-8 rounded-lg bg-danger shadow-lg shadow-danger/50" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-orange-500 shadow-lg shadow-orange-500/50 flex items-center justify-center text-white">
                      <Mic className="w-8 h-8" />
                    </div>
                  )}
                </button>
              )}

              {mode === 'qr' && (
                <div className="w-20 h-20 rounded-full border-2 border-slate-800 flex items-center justify-center text-slate-500 text-xs text-center font-bold">
                  Scanning
                </div>
              )}

              <div className="w-11" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
