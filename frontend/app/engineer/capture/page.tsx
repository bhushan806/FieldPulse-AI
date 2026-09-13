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
  Loader2,
  FileText,
  Upload,
  FileUp,
  ExternalLink,
  MapPin
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
  
  const [mode, setMode] = useState<'photo' | 'video' | 'voice' | 'qr' | 'document'>('photo');
  const [stream, setStream] = useState<MediaStream | null>(null);

  // GPS State (Auto pre-fetched on mount)
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'ready' | 'fallback'>('acquiring');
  
  // Captured Results
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedVideoUrl, setCapturedVideoUrl] = useState<string | null>(null);
  const [capturedAudioUrl, setCapturedAudioUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [scannedQrCode, setScannedQrCode] = useState<string | null>(null);
  const [capturedDocument, setCapturedDocument] = useState<{
    name: string;
    size: number;
    type: string;
    url?: string;
  } | null>(null);

  // Auto pre-fetch GPS immediately on screen load
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsCoords({ lat: 27.47, lng: 94.92 });
      setGpsStatus('fallback');
      return;
    }

    // Fast cached or network location
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        setGpsStatus('ready');
      },
      () => {
        // Fallback to project site coordinates silently
        setGpsCoords({ lat: 27.47, lng: 94.92 });
        setGpsStatus('fallback');
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
    );

    // Background watcher to refine if GPS sensor is active
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsCoords({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        setGpsStatus('ready');
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

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
  const documentRef = useRef<HTMLInputElement>(null);

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
    setCapturedDocument(null);
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
    } else if (mode === 'document') {
      stopAllStreams();
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
        setCapturedDocument(null);
        stopAllStreams();
      }
    }
  };

  // Gallery Select (Image Upload)
  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedBlob(file);
    setCapturedDocument(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCapturedImage(reader.result);
        stopAllStreams();
      }
    };
    reader.readAsDataURL(file);
  };

  // Document Select (PDF, Word, Excel, Text)
  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopAllStreams();
    setCapturedBlob(file);
    setCapturedImage(null);
    setCapturedVideoUrl(null);
    setCapturedAudioUrl(null);
    setScannedQrCode(null);

    let objectUrl: string | undefined = undefined;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {}

    setCapturedDocument({
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      url: objectUrl,
    });
    addNotification({ type: 'success', message: `Document attached: ${file.name}` });
  };

  // Helper to format file sizes
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
    setCapturedDocument(null);
    setIsRecording(false);
    setRecordingSeconds(0);

    if (mode === 'photo') startCamera(false);
    else if (mode === 'video') startCamera(true);
    else if (mode === 'voice') startAudioOnly();
    else if (mode === 'qr') startQrScanner();
    else if (mode === 'document') stopAllStreams();
  };

  // Format seconds as mm:ss
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const hasCapturedResult = capturedImage || capturedVideoUrl || capturedAudioUrl || scannedQrCode || capturedDocument;

  // Submit Handler
  const handleSubmit = async () => {
    if (!hasCapturedResult) return;
    if (!selectedProjectId) {
      addNotification({ type: 'error', message: 'No project assigned to your account. Contact your PM.' });
      return;
    }
    setSubmitting(true);
    let payload: any = null;

    try {
      // Get Location (uses pre-fetched device GPS or project site fallback)
      let gps = gpsCoords || { lat: 27.47, lng: 94.92 };
      if (!gpsCoords && typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 2000,
              maximumAge: 600000,
            });
          });
          gps = {
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          };
          setGpsCoords(gps);
        } catch {
          // Silently default to project site coordinates
          gps = { lat: 27.47, lng: 94.92 };
        }
      }

      let uploadBlob: Blob;
      let filename: string;
      let backendMediaType: string = mode;

      if (capturedDocument && capturedBlob) {
        uploadBlob = capturedBlob;
        filename = capturedDocument.name;
        backendMediaType = 'document';
      } else if (mode === 'photo' && capturedImage) {
        if (capturedBlob) {
          uploadBlob = capturedBlob;
          filename = `capture_${Date.now()}.jpg`;
        } else {
          const res = await fetch(capturedImage);
          uploadBlob = await res.blob();
          filename = `capture_${Date.now()}.jpg`;
        }
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
      } else if (capturedBlob) {
        uploadBlob = capturedBlob;
        filename = `data_${Date.now()}.bin`;
      } else {
        uploadBlob = new Blob([''], { type: 'text/plain' });
        filename = `data_${Date.now()}.bin`;
      }

      payload = {
        id: crypto.randomUUID(),
        projectId: selectedProjectId,
        mediaType: backendMediaType,
        mediaBlob: uploadBlob,
        notes,
        gps,
        queuedAt: new Date().toISOString(),
        filename
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
      const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error');
      if (isNetworkError && payload) {
        try {
          await offlineService.saveToQueue(payload);
          addToQueue(payload);
          addNotification({ 
            type: 'warning', 
            message: 'Server unreachable. Capture safely stored in local sync queue.' 
          });
          router.push('/engineer/home');
          return;
        } catch (queueErr) {
          console.error('Failed to store in offline queue:', queueErr);
        }
      }

      let errorMsg = 'Failed to submit capture.';
      if (typeof error.response?.data?.detail === 'string') {
        errorMsg = error.response.data.detail;
      } else if (Array.isArray(error.response?.data?.detail)) {
        errorMsg = error.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
      } else if (error.message) {
        errorMsg = error.message;
      }

      addNotification({ 
        type: 'error', 
        message: errorMsg,
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
             mode === 'voice' ? 'Voice Note' : 
             mode === 'qr' ? 'QR Activity Scan' : 'Site Document'}
          </span>
          {isRecording && (
            <span className="flex items-center gap-1.5 bg-danger/80 text-white text-[11px] font-bold px-2 py-0.5 rounded-full animate-pulse border border-danger">
              <span className="w-2 h-2 rounded-full bg-white" />
              {formatTimer(recordingSeconds)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-end">
          <div className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-800/80 border border-white/10 backdrop-blur-md">
            <MapPin className={`w-3 h-3 ${gpsStatus === 'ready' ? 'text-emerald-400' : 'text-sky-400'}`} />
            <span className={gpsStatus === 'ready' ? 'text-emerald-300 font-semibold text-[10px]' : 'text-slate-300 text-[10px]'}>
              {gpsStatus === 'ready' ? 'GPS Active' : 'Site GPS'}
            </span>
          </div>
        </div>
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

        {/* DOCUMENT PREVIEW CARD */}
        {capturedDocument && (
          <div className="flex flex-col items-center justify-center p-6 text-center text-white space-y-4 max-w-sm w-full animate-in zoom-in-95">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-blue-500/20 border-2 border-blue-500/40 flex items-center justify-center text-blue-400 shadow-xl shadow-blue-500/10">
                <FileText className="w-10 h-10" />
              </div>
              <div className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-white/20">
                {capturedDocument.name.split('.').pop() || 'DOC'}
              </div>
            </div>

            <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-left space-y-2 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Document Attached</span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Ready to Submit
                </span>
              </div>
              <p className="font-semibold text-white text-sm truncate" title={capturedDocument.name}>
                {capturedDocument.name}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{formatFileSize(capturedDocument.size)}</span>
                <span>•</span>
                <span className="uppercase">{capturedDocument.name.split('.').pop() || 'File'}</span>
              </div>

              {capturedDocument.url && (
                <div className="pt-2 border-t border-slate-800">
                  <a 
                    href={capturedDocument.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span>Preview Document</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            <button
              onClick={() => documentRef.current?.click()}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Choose different file</span>
            </button>
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

            {/* Quick action floating pills on top of camera for Photo mode */}
            {mode === 'photo' && (
              <div className="absolute top-16 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/15">
                <button 
                  onClick={() => startCamera(false)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 bg-white text-black transition-all shadow"
                >
                  <Camera className="w-3 h-3" />
                  <span>Live Camera</span>
                </button>
                <button 
                  type="button"
                  onClick={() => galleryRef.current?.click()}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/10 flex items-center gap-1.5 transition-all"
                >
                  <ImageIcon className="w-3 h-3 text-sky-400" />
                  <span>Upload Image</span>
                </button>
                <button 
                  type="button"
                  onClick={() => documentRef.current?.click()}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/10 flex items-center gap-1.5 transition-all"
                >
                  <FileText className="w-3 h-3 text-emerald-400" />
                  <span>Upload Doc</span>
                </button>
              </div>
            )}

            {!stream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white z-20 p-6">
                <div className="w-14 h-14 rounded-full bg-slate-800/90 border border-slate-700 flex items-center justify-center mb-3 text-orange-400 shadow-lg">
                  <Camera className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold mb-1">Camera Stream Inactive</h3>
                <p className="text-xs text-slate-400 text-center max-w-xs mb-5">
                  Activate camera to snap live evidence, or upload a photo or document directly from your device.
                </p>
                <div className="flex flex-col gap-2.5 w-full max-w-xs">
                  <button 
                    onClick={() => startCamera(mode === 'video')}
                    className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/25"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Activate Camera</span>
                  </button>
                  <div className="flex gap-2 w-full">
                    <button 
                      type="button"
                      onClick={() => galleryRef.current?.click()}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-all"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                      <span>Upload Image</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => documentRef.current?.click()}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-all"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Upload Doc</span>
                    </button>
                  </div>
                </div>
              </div>
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

        {/* DOCUMENT MODE DROPZONE / BROWSER */}
        {!hasCapturedResult && mode === 'document' && (
          <div className="flex flex-col items-center justify-center p-6 text-center text-white space-y-5 max-w-sm w-full">
            <div 
              onClick={() => documentRef.current?.click()}
              className="w-full p-8 border-2 border-dashed border-slate-700 hover:border-orange-500/70 bg-slate-900/60 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-900/90 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 mb-4 group-hover:scale-105 transition-transform">
                <FileUp className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Select Site Document</h3>
              <p className="text-xs text-slate-400 max-w-xs mb-4">
                Inspection reports, delivery challans, drawings, or test certificates
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                {['PDF', 'DOCX', 'XLSX', 'CSV', 'TXT'].map((ext) => (
                  <span key={ext} className="text-[10px] font-bold font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    {ext}
                  </span>
                ))}
              </div>
              <button 
                type="button" 
                className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold shadow-lg shadow-orange-500/20 group-hover:bg-orange-600 transition-colors"
              >
                Browse Files
              </button>
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
            <div className="flex justify-center gap-5 mb-6">
              {[
                { id: 'photo', icon: Camera, label: 'Photo' },
                { id: 'video', icon: Video, label: 'Video' },
                { id: 'voice', icon: Mic, label: 'Voice' },
                { id: 'qr', icon: QrCode, label: 'QR Scan' },
                { id: 'document', icon: FileText, label: 'Document' },
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
            <div className="flex justify-center items-center gap-7 mb-4">
              {/* Hidden file inputs */}
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleGallerySelect}
              />
              <input
                ref={documentRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,application/pdf"
                className="hidden"
                onChange={handleDocumentSelect}
              />

              {/* Photo Mode Controls: Upload Image (Left) + Shutter (Center) + Upload Document (Right) */}
              {mode === 'photo' && (
                <>
                  {/* Upload Image Button */}
                  <button
                    type="button"
                    onClick={() => galleryRef.current?.click()}
                    className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors group"
                    title="Upload existing image"
                  >
                    <div className="w-12 h-12 rounded-full border border-slate-700 flex items-center justify-center bg-slate-800 group-hover:bg-slate-700 group-hover:border-sky-500/50 transition-all shadow-md">
                      <ImageIcon className="w-5 h-5 group-hover:text-sky-400 transition-colors" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Image</span>
                  </button>

                  {/* Main Shutter Button */}
                  <button 
                    onClick={takePhoto}
                    disabled={!stream}
                    className="w-20 h-20 rounded-full border-4 border-slate-700 flex items-center justify-center p-1 active:scale-95 transition-transform disabled:opacity-50 hover:border-orange-500/50 shadow-xl"
                    title="Take live photo"
                  >
                    <div className="w-full h-full rounded-full bg-white shadow-lg" />
                  </button>

                  {/* Upload Document Button */}
                  <button
                    type="button"
                    onClick={() => documentRef.current?.click()}
                    className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors group"
                    title="Upload document (PDF, Word, Excel)"
                  >
                    <div className="w-12 h-12 rounded-full border border-slate-700 flex items-center justify-center bg-slate-800 group-hover:bg-slate-700 group-hover:border-emerald-500/50 transition-all shadow-md">
                      <FileText className="w-5 h-5 group-hover:text-emerald-400 transition-colors" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Document</span>
                  </button>
                </>
              )}

              {/* Video Mode Controls */}
              {mode === 'video' && (
                <>
                  <div className="w-12" />
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
                  <div className="w-12" />
                </>
              )}

              {/* Voice Mode Controls */}
              {mode === 'voice' && (
                <>
                  <div className="w-12" />
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
                  <div className="w-12" />
                </>
              )}

              {/* QR Mode Controls */}
              {mode === 'qr' && (
                <>
                  <div className="w-12" />
                  <div className="w-20 h-20 rounded-full border-2 border-slate-800 flex items-center justify-center text-slate-500 text-xs text-center font-bold">
                    Scanning
                  </div>
                  <div className="w-12" />
                </>
              )}

              {/* Document Mode Controls */}
              {mode === 'document' && (
                <>
                  <div className="w-12" />
                  <button 
                    type="button"
                    onClick={() => documentRef.current?.click()}
                    className="w-20 h-20 rounded-full border-4 border-slate-700 flex items-center justify-center p-1 active:scale-95 transition-transform hover:border-orange-500/50 bg-slate-800 text-orange-400 shadow-xl"
                    title="Upload document"
                  >
                    <Upload className="w-8 h-8" />
                  </button>
                  <div className="w-12" />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
