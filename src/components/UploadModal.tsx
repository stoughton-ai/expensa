'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Camera, Upload, FileText, X, CheckCircle, AlertCircle,
  Scan, ArrowLeft, Loader2
} from 'lucide-react';

type Step = 'choose' | 'camera' | 'upload' | 'processing' | 'success' | 'error';

interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Detect mobile/tablet
function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export default function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const [step, setStep] = useState<Step>('choose');
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<{ vendor: string; total: string; category: string } | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraFileInputRef = useRef<HTMLInputElement>(null); // native mobile camera

  // ── Camera ────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    // On mobile: use native camera input (avoids preview mismatch)
    if (isMobileDevice()) {
      cameraFileInputRef.current?.click();
      return;
    }
    // On desktop: use in-browser stream
    setStep('camera');
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setErrorMsg('Camera access denied. Please allow camera access and try again, or upload a file instead.');
      setStep('error');
    }
  }, []);

  // Handle native mobile camera capture (defined after processFile)
  const handleNativeCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file, 'camera');
    if (cameraFileInputRef.current) cameraFileInputRef.current.value = '';
  };

  const stopCamera = useCallback(() => {
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
  }, [cameraStream]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const confirmCapture = useCallback(async () => {
    if (!capturedImage) return;
    const blob = await (await fetch(capturedImage)).blob();
    const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' });
    await processFile(file, 'camera');
  }, [capturedImage]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  // ── File upload ───────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setErrorMsg('Please upload a JPG, PNG, WEBP image or a PDF file.');
      setStep('error');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg('File is too large. Please upload a file under 20MB.');
      setStep('error');
      return;
    }
    await processFile(file, file.type === 'application/pdf' ? 'pdf' : 'upload');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Core processing ───────────────────────────────────────
  const processFile = async (file: File, source: string) => {
    setStep('processing');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('source', source);

      const res = await fetch('/api/receipts/process', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? 'Processing failed');

      const { extracted } = data;
      const curr = extracted.currency === 'GBP' ? '£' : extracted.currency === 'EUR' ? '€' : '$';
      setSuccessData({
        vendor: extracted.vendor_name ?? 'Unknown vendor',
        total: extracted.total_amount != null ? `${curr}${extracted.total_amount.toFixed(2)}` : 'Unknown',
        category: extracted.category ?? 'Uncategorised',
      });
      setStep('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStep('error');
    }
  };

  // ── Cleanup on close ──────────────────────────────────────
  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const handleSuccess = () => {
    stopCamera();
    onSuccess();
  };

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="glass"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          borderRadius: '24px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: step !== 'camera' ? '1px solid var(--border)' : 'none',
          background: 'var(--bg-card)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            {step !== 'choose' && step !== 'processing' && step !== 'success' && (
              <button
                onClick={() => { stopCamera(); setCapturedImage(null); setStep('choose'); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', marginRight: '0.25rem', display: 'flex' }}
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--brand-primary), #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Scan size={16} color="white" />
            </div>
            <h2 style={{ fontSize: '1rem', fontWeight: '700' }}>
              {step === 'choose' ? 'Add Receipt' :
               step === 'camera' ? 'Capture Receipt' :
               step === 'upload' ? 'Upload Receipt' :
               step === 'processing' ? 'Processing…' :
               step === 'success' ? 'Receipt Saved! 🎉' : 'Error'}
            </h2>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* ── CHOOSE step ─── */}
        {step === 'choose' && (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              How would you like to add your receipt?
            </p>

            {/* Camera option */}
            <button
              id="use-camera"
              onClick={startCamera}
              style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1.125rem 1.25rem',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.1))',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: '14px', cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)')}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Camera size={22} color="var(--brand-secondary)" />
              </div>
              <div>
                <p style={{ fontWeight: '700', fontSize: '0.925rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>Take a Photo</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Use your device camera to capture a receipt</p>
              </div>
            </button>

            {/* Upload option */}
            <button
              id="upload-file"
              onClick={() => { setStep('upload'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1.125rem 1.25rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: '14px', cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--brand-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(52,211,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Upload size={22} color="var(--success)" />
              </div>
              <div>
                <p style={{ fontWeight: '700', fontSize: '0.925rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>Upload Image or PDF</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>JPG, PNG, WEBP or PDF — up to 20MB</p>
              </div>
            </button>
          </div>
        )}

        {/* ── CAMERA step ─── */}
        {step === 'camera' && (
          <div style={{ position: 'relative', background: '#000' }}>
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', display: 'block', maxHeight: '60vh', objectFit: 'contain', background: '#000' }}
                />
                {/* Corner-bracket viewfinder — decorative only, doesn't crop */}
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none', padding: '10%',
                }}>
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    {/* Top-left */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: 28, height: 28, borderTop: '3px solid rgba(99,102,241,0.9)', borderLeft: '3px solid rgba(99,102,241,0.9)', borderRadius: '4px 0 0 0' }} />
                    {/* Top-right */}
                    <div style={{ position: 'absolute', top: 0, right: 0, width: 28, height: 28, borderTop: '3px solid rgba(99,102,241,0.9)', borderRight: '3px solid rgba(99,102,241,0.9)', borderRadius: '0 4px 0 0' }} />
                    {/* Bottom-left */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: 28, height: 28, borderBottom: '3px solid rgba(99,102,241,0.9)', borderLeft: '3px solid rgba(99,102,241,0.9)', borderRadius: '0 0 0 4px' }} />
                    {/* Bottom-right */}
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderBottom: '3px solid rgba(99,102,241,0.9)', borderRight: '3px solid rgba(99,102,241,0.9)', borderRadius: '0 0 4px 0' }} />
                  </div>
                </div>
                {/* Capture button */}
                <div style={{ padding: '1.25rem', display: 'flex', justifyContent: 'center', background: 'var(--bg-card)' }}>
                  <button
                    id="capture-photo"
                    onClick={capturePhoto}
                    style={{
                      width: '64px', height: '64px', borderRadius: '50%',
                      background: 'white', border: '4px solid rgba(255,255,255,0.3)',
                      cursor: 'pointer', transition: 'transform 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                    title="Capture photo"
                  />
                </div>
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </>
            ) : (
              <>
                {/* Preview captured image */}
                <img src={capturedImage} alt="Captured receipt" style={{ width: '100%', display: 'block', maxHeight: '60vh', objectFit: 'contain', background: '#000' }} />
                <div style={{ padding: '1.25rem', display: 'flex', gap: '0.75rem', background: 'var(--bg-card)' }}>
                  <button id="retake-photo" className="btn-secondary" style={{ flex: 1 }} onClick={retakePhoto}>
                    <Camera size={14} /> Retake
                  </button>
                  <button id="use-photo" className="btn-primary" style={{ flex: 1 }} onClick={confirmCapture}>
                    <CheckCircle size={14} /> Use Photo
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── UPLOAD step ─── */}
        {step === 'upload' && (
          <div style={{ padding: '1.5rem' }}>
            <div
              id="drop-zone"
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? 'var(--brand-primary)' : 'var(--border-strong)'}`,
                borderRadius: '16px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragging ? 'rgba(99,102,241,0.08)' : 'var(--bg-elevated)',
                transition: 'all 0.2s',
              }}
            >
              <FileText size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
              <p style={{ fontWeight: '600', marginBottom: '0.4rem' }}>
                {isDragging ? 'Drop it here!' : 'Drag & drop or click to browse'}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Supports JPG, PNG, WEBP and PDF · Max 20MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              id="file-input"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {/* Hidden native camera input (mobile only) */}
            <input
              ref={cameraFileInputRef}
              type="file"
              id="camera-input"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleNativeCameraCapture}
            />
          </div>
        )}

        {/* ── PROCESSING step ─── */}
        {step === 'processing' && (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ position: 'relative', width: '64px', height: '64px' }}>
              <div style={{
                width: '64px', height: '64px', border: '3px solid rgba(99,102,241,0.2)',
                borderTop: '3px solid var(--brand-primary)',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              }} />
              <Scan size={24} color="var(--brand-primary)" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
            </div>
            <div>
              <p style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.4rem' }}>AI is reading your receipt…</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Extracting vendor, items, totals, and more</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
              Sending to Telegram once done…
            </div>
          </div>
        )}

        {/* ── SUCCESS step ─── */}
        {step === 'success' && successData && (
          <div style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={30} color="var(--success)" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: '800', fontSize: '1.1rem', marginBottom: '0.3rem' }}>Receipt Saved!</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>A Telegram notification has been sent to your bot.</p>
            </div>
            <div style={{ width: '100%', background: 'var(--bg-elevated)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: 'Vendor', value: successData.vendor },
                { label: 'Total', value: successData.total },
                { label: 'Category', value: successData.category },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: '600' }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              <button id="add-another" className="btn-secondary" style={{ flex: 1 }} onClick={() => { setCapturedImage(null); setStep('choose'); }}>
                Add Another
              </button>
              <button id="done-btn" className="btn-primary" style={{ flex: 1 }} onClick={handleSuccess}>
                Done
              </button>
            </div>
          </div>
        )}

        {/* ── ERROR step ─── */}
        {step === 'error' && (
          <div style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={30} color="var(--danger)" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.4rem' }}>Something went wrong</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{errorMsg}</p>
            </div>
            <button id="try-again" className="btn-primary" onClick={() => setStep('choose')}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
