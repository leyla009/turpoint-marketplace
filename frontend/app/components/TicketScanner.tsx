'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, LoaderCircle, ScanLine, XCircle } from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { formatDate } from '@/app/lib/format';
import { titleFromI18n } from '@/app/lib/tourContent';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type ScanResult = {
  valid?: boolean;
  already_checked_in?: boolean;
  error?: string;
  checked_in_at?: string;
  booking?: {
    ticket_code: string;
    tour_title: string;
    tour_title_i18n?: string | null;
    tour_date: string;
    traveler_name: string;
    seats: number;
    checked_in_at?: string | null;
  };
};

type BarcodeDetectorLike = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

export default function TicketScanner({ token }: { token: string }) {
  const { t, locale } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [ticketCode, setTicketCode] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [checking, setChecking] = useState(false);

  async function checkTicket(code: string) {
    const cleaned = code.trim();
    if (!cleaned || checking) return;
    setChecking(true);
    setResult(null);
    setTicketCode(cleaned);
    try {
      const response = await fetch(`${API_URL}/api/bookings/scan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleaned }),
      });
      const data = await response.json();
      setResult(data);
    } catch {
      setResult({ error: t('ui.scan.connectionError') });
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!cameraOpen) return;
    let stopped = false;
    let stream: MediaStream | null = null;
    let frame = 0;
    let detecting = false;
    let submitted = false;

    const stopCamera = () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const startCamera = async () => {
      try {
        const detectorCtor = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
        if (!detectorCtor) throw new Error(t('ui.scan.unsupported'));
        if (!navigator.mediaDevices?.getUserMedia) throw new Error(t('ui.scan.cameraUnavailable'));
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const detector = new detectorCtor({ formats: ['qr_code'] });

        const scanFrame = async () => {
          if (stopped || submitted) return;
          if (!detecting && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            detecting = true;
            try {
              const codes = await detector.detect(video);
              const value = codes[0]?.rawValue;
              if (value && !submitted) {
                submitted = true;
                setCameraOpen(false);
                void checkTicket(value);
              }
            } catch {
              // Keep scanning; transient decode misses are normal between frames.
            } finally {
              detecting = false;
            }
          }
          if (!stopped && !submitted) frame = requestAnimationFrame(scanFrame);
        };
        frame = requestAnimationFrame(scanFrame);
      } catch (error) {
        setCameraError(error instanceof Error ? error.message : t('ui.scan.cameraUnavailable'));
        setCameraOpen(false);
      }
    };

    setCameraError('');
    void startCamera();
    return stopCamera;
  }, [cameraOpen]);

  const checkedInTicket = result?.valid ? result.booking : null;
  const rejectedAsUsed = result?.already_checked_in;

  return (
    <section className="max-w-2xl rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-foreground">{t('ui.scan.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('ui.scan.subtitle')}</p>
      </div>

      {cameraOpen ? (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl bg-black aspect-video">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-[16%] rounded-2xl border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.25)]" />
          </div>
          <p className="text-center text-sm text-muted-foreground">{t('ui.scan.pointCamera')}</p>
          <button type="button" onClick={() => setCameraOpen(false)} className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted">
            {t('ui.scan.closeCamera')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setResult(null); setCameraError(''); setCameraOpen(true); }}
          className="mb-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          <Camera size={18} /> {t('ui.scan.openCamera')}
        </button>
      )}

      {cameraError && <p role="alert" className="mb-4 rounded-lg bg-warning/10 p-3 text-sm text-warning">{cameraError}</p>}

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => { event.preventDefault(); void checkTicket(ticketCode); }}
      >
        <label className="sr-only" htmlFor="ticket-code">{t('ui.scan.codeLabel')}</label>
        <input
          id="ticket-code"
          value={ticketCode}
          onChange={(event) => setTicketCode(event.target.value)}
          placeholder="TP-XXXXXXXX"
          autoCapitalize="characters"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground outline-none focus:border-primary"
        />
        <button type="submit" disabled={checking || !ticketCode.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50">
          {checking ? <LoaderCircle size={16} className="animate-spin" /> : <ScanLine size={16} />}
          {t('ui.scan.checkCode')}
        </button>
      </form>

      {result && (
        <div role="status" className={`mt-5 rounded-xl border p-4 ${checkedInTicket ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
          <div className="flex items-start gap-3">
            {checkedInTicket ? <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={22} /> : <XCircle className="mt-0.5 shrink-0 text-destructive" size={22} />}
            <div className="min-w-0">
              <p className={`font-bold ${checkedInTicket ? 'text-success' : 'text-destructive'}`}>
                {checkedInTicket ? t('ui.scan.valid') : rejectedAsUsed ? t('ui.scan.alreadyUsed') : t('ui.scan.invalid')}
              </p>
              {!checkedInTicket && result.error && <p className="mt-1 text-sm text-muted-foreground">{result.error}</p>}
              {checkedInTicket && (
                <div className="mt-2 space-y-1 text-sm text-foreground">
                  <p className="font-semibold">{titleFromI18n(checkedInTicket.tour_title, checkedInTicket.tour_title_i18n, locale)}</p>
                  <p>{checkedInTicket.traveler_name} · {t('ui.book.travelersCount', { count: checkedInTicket.seats })}</p>
                  <p>{formatDate(checkedInTicket.tour_date, locale)} · {checkedInTicket.ticket_code}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
