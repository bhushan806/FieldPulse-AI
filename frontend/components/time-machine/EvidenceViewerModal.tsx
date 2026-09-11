'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Camera,
  Mic,
  Video,
  QrCode,
  AlertTriangle,
  FileText,
  User,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { EvidenceDetails, TimelineEvent } from '@/types/api';
import { getActivityEvidence } from '@/lib/api/timeMachine';

interface EvidenceViewerModalProps {
  activityId: string;
  evidenceId: string | null;
  event: TimelineEvent | null;
  onClose: () => void;
}

export function EvidenceViewerModal({
  activityId,
  evidenceId,
  event,
  onClose,
}: EvidenceViewerModalProps) {
  const [evidence, setEvidence] = useState<EvidenceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!evidenceId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getActivityEvidence(activityId, evidenceId)
      .then((data) => {
        if (isMounted) {
          setEvidence(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.detail || 'Evidence file could not be retrieved.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activityId, evidenceId]);

  if (!evidenceId && !event) return null;

  const eventType = event?.eventType || '';
  const mediaType = evidence?.mediaType || (
    eventType.includes('PHOTO') ? 'photo' :
    eventType.includes('VOICE') ? 'voice' :
    eventType.includes('VIDEO') ? 'video' :
    eventType.includes('QR') ? 'qr' : 'document'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-bg-muted/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              mediaType === 'photo' ? 'bg-blue-500/10 text-blue-500' :
              mediaType === 'voice' ? 'bg-amber-500/10 text-amber-500' :
              mediaType === 'video' ? 'bg-purple-500/10 text-purple-500' :
              mediaType === 'qr' ? 'bg-emerald-500/10 text-emerald-500' :
              'bg-brand-500/10 text-brand-500'
            }`}>
              {mediaType === 'photo' && <Camera className="w-5 h-5" />}
              {mediaType === 'voice' && <Mic className="w-5 h-5" />}
              {mediaType === 'video' && <Video className="w-5 h-5" />}
              {mediaType === 'qr' && <QrCode className="w-5 h-5" />}
              {mediaType !== 'photo' && mediaType !== 'voice' && mediaType !== 'video' && mediaType !== 'qr' && (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 id="evidence-modal-title" className="text-base font-bold text-text-primary">
                {event ? event.eventType.replace(/_/g, ' ') : 'Verified Evidence Inspection'}
              </h2>
              <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-2">
                <span>Evidence ID: <span className="font-mono">{evidenceId ? evidenceId.slice(-8) : 'Direct Event'}</span></span>
                {event?.integrityHash && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3" /> Tamper-Evident Hash: {event.integrityHash.slice(0, 8)}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-muted transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
              <p className="text-xs font-semibold text-text-secondary">Retrieving evidence from secure storage...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-danger-bg rounded-xl border border-danger/20 text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-danger mx-auto" />
              <h3 className="text-sm font-bold text-danger">Evidence Retrieval Issue</h3>
              <p className="text-xs text-text-secondary">{error}</p>
              {event?.description && (
                <div className="mt-4 p-3 bg-surface rounded-lg text-left text-xs text-text-primary border border-border">
                  <span className="font-bold block mb-1">Timeline Record Summary:</span>
                  {event.description}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Media Display */}
              {evidence?.mediaUrl && (
                <div className="rounded-xl overflow-hidden border border-border bg-black/95 flex items-center justify-center min-h-[220px]">
                  {mediaType === 'photo' && (
                    <img
                      src={evidence.mediaUrl}
                      alt="Field capture evidence"
                      className="w-full max-h-[360px] object-contain"
                    />
                  )}
                  {mediaType === 'video' && (
                    <video
                      src={evidence.mediaUrl}
                      controls
                      playsInline
                      className="w-full max-h-[360px]"
                    />
                  )}
                  {mediaType === 'voice' && (
                    <div className="w-full p-6 flex flex-col items-center justify-center space-y-4 bg-surface text-center">
                      <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center">
                        <Mic className="w-8 h-8" />
                      </div>
                      <audio src={evidence.mediaUrl} controls className="w-full max-w-md" />
                    </div>
                  )}
                </div>
              )}

              {/* Transcribed Text / Field Note */}
              {(evidence?.transcribedText || event?.description) && (
                <div className="p-4 rounded-xl bg-bg-muted border border-border space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                    {evidence?.transcribedText ? 'Whisper Speech Transcription' : 'Event Description'}
                  </span>
                  <p className="text-sm text-text-primary font-medium italic">
                    &ldquo;{evidence?.transcribedText || event?.description}&rdquo;
                  </p>
                </div>
              )}

              {/* AI Classification & Detection Details */}
              {evidence?.cvClassification && (
                <div className="p-4 rounded-xl bg-brand-500/5 border border-brand-500/20 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Vision Analysis (CLIP / YOLO)
                  </span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary font-medium">Classified Activity / Stage:</span>
                    <span className="font-bold text-text-primary capitalize">{evidence.cvClassification.label}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary font-medium">Confidence Score:</span>
                    <span className="font-bold text-brand-600">{Math.round(evidence.cvClassification.confidence * 100)}%</span>
                  </div>
                </div>
              )}

              {/* Extracted NLP Entities */}
              {evidence?.extractedEntities && Object.values(evidence.extractedEntities).some(Boolean) && (
                <div className="p-4 rounded-xl bg-bg-muted border border-border space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                    NLP Extracted Field Entities
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {evidence.extractedEntities.activity && (
                      <div>
                        <span className="text-text-muted block text-[10px] uppercase font-bold">Activity</span>
                        <span className="font-semibold text-text-primary">{evidence.extractedEntities.activity}</span>
                      </div>
                    )}
                    {evidence.extractedEntities.location && (
                      <div>
                        <span className="text-text-muted block text-[10px] uppercase font-bold">Location</span>
                        <span className="font-semibold text-text-primary">{evidence.extractedEntities.location}</span>
                      </div>
                    )}
                    {evidence.extractedEntities.quantity && (
                      <div>
                        <span className="text-text-muted block text-[10px] uppercase font-bold">Quantity</span>
                        <span className="font-semibold text-text-primary">{evidence.extractedEntities.quantity}</span>
                      </div>
                    )}
                    {evidence.extractedEntities.status && (
                      <div>
                        <span className="text-text-muted block text-[10px] uppercase font-bold">Status</span>
                        <span className="font-semibold text-text-primary">{evidence.extractedEntities.status}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 bg-surface border border-border rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1 mb-1">
                    <Clock className="w-3 h-3" /> Timestamp
                  </span>
                  <p className="font-semibold text-text-primary">
                    {new Date(evidence?.createdAt || event?.timestamp || '').toLocaleString()}
                  </p>
                </div>

                <div className="p-3 bg-surface border border-border rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1 mb-1">
                    <User className="w-3 h-3" /> Submitted By
                  </span>
                  <p className="font-semibold text-text-primary">
                    {evidence?.uploaderName || 'Site Engineer'} 
                    {evidence?.uploaderRole && <span className="text-[10px] text-text-muted block">({evidence.uploaderRole})</span>}
                  </p>
                </div>

                {evidence?.gps && (
                  <div className="p-3 bg-surface border border-border rounded-xl col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1 mb-1">
                      <MapPin className="w-3 h-3" /> GPS Location
                    </span>
                    <p className="font-semibold font-mono text-text-primary">
                      {evidence.gps.coordinates[1].toFixed(4)}, {evidence.gps.coordinates[0].toFixed(4)}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-bg-muted/50 flex items-center justify-between">
          <span className="text-xs text-text-muted">
            FieldPulse AI • Cryptographic Integrity Verified
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-text-primary text-surface rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
