import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef, useCallback } from 'react';
import { QrCode, Camera, CameraOff, Keyboard, CheckCircle2, XCircle, AlertTriangle, ScanLine, Users } from 'lucide-react';
import { endpoints } from '../../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Spinner } from '../../../components/ui/misc';
import { Avatar } from '../../../components/ui/avatar';
import { fmtTime } from '../../../lib/format';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

const RECENT_KEY = (id) => `es-scans-${id}`;

export default function CheckIn({ event: eventProp }) {
  const outletCtx = useOutletContext();
  const event = eventProp || outletCtx?.event;
  const qc = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [manual, setManual] = useState('');
  const [scanning2, setScanning2] = useState(false);
  const [result, setResult] = useState(null);
  const [recents, setRecents] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY(event._id)) || '[]'); } catch { return []; }
  });
  const scannerRef = useRef(null);
  const scannerElRef = useRef(null);
  const busyRef = useRef(false);

  const regsQ = useQuery({
    queryKey: ['event-registrations', event._id],
    queryFn: () => endpoints.eventRegistrations(event._id),
    refetchInterval: 10000,
  });

  const stopScanner = useCallback(async () => {
    try { await scannerRef.current?.stop(); } catch { /* noop */ }
    scannerRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => () => { scannerRef.current?.stop?.().catch(() => {}); }, []);

  const startScanner = async () => {
    setCameraError(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const elId = 'qr-reader-region';
      const scanner = new Html5Qrcode(elId, { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => handleScan(decoded),
        () => {},
      );
      setScanning(true);
    } catch (e) {
      setCameraError(e?.message || 'Camera unavailable. Use manual entry below.');
      setScanning(false);
    }
  };

  const handleScan = async (rawCode) => {
    if (busyRef.current) return;
    busyRef.current = true;
    const beep = (ok) => {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = ok ? 880 : 220;
        gain.gain.value = 0.08;
        osc.start(); osc.stop(ctx.currentTime + 0.18);
      } catch { /* noop */ }
    };
    let code = String(rawCode || '').trim();
    try {
      // Tickets may encode JSON or a URL containing the code.
      if (code.startsWith('{')) code = JSON.parse(code).code || code;
      const m = code.match(/[A-Z]{2,}-\d{4,}[A-Z0-9-]*/);
      if (m) code = m[0];
    } catch { /* keep raw */ }

    try {
      const res = await endpoints.validateTicket({ code: code.toUpperCase(), eventId: event._id });
      setResult(res);
      beep(res.valid);
      if (res.valid) toast.success(`${res.ticket.attendeeName} checked in ✓`);
      else if (res.reason === 'DUPLICATE') toast.warning('Already checked in');
      else toast.error(res.message);
      setRecents((prev) => [{ ...res, at: new Date().toISOString() }, ...prev].slice(0, 20));
      qc.invalidateQueries({ queryKey: ['event-registrations', event._id] });
    } catch (e) {
      setResult({ valid: false, reason: 'ERROR', message: e.message });
      beep(false);
    } finally {
      setTimeout(() => { busyRef.current = false; }, 1200);
    }
  };

  useEffect(() => {
    localStorage.setItem(RECENT_KEY(event._id), JSON.stringify(recents.slice(0, 10)));
  }, [recents, event._id]);

  const regs = regsQ.data?.registrations || [];
  const checkedIn = regs.filter((r) => r.status === 'checked_in').length;
  const confirmed = regs.filter((r) => r.status === 'confirmed' || r.status === 'pending').length;

  const submitManual = (e) => {
    e.preventDefault();
    if (!manual.trim()) return;
    handleScan(manual);
    setManual('');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><QrCode className="size-5 text-primary" /> QR check-in desk</CardTitle>
            {scanning ? (
              <Button size="sm" variant="destructive" onClick={stopScanner}><CameraOff className="size-4" /> Stop camera</Button>
            ) : (
              <Button size="sm" onClick={startScanner}><Camera className="size-4" /> Start camera</Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border bg-muted">
              <div id="qr-reader-region" ref={scannerElRef} className="mx-auto w-full max-w-md [&_video]:rounded-xl [&_img]:hidden" />
              {!scanning && (
                <div className="grid place-items-center gap-3 py-16 text-center">
                  <span className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <ScanLine className="size-8" />
                  </span>
                  <div>
                    <p className="font-bold">{cameraError ? 'Camera unavailable' : 'Point a ticket QR at the camera'}</p>
                    <p className="text-sm text-muted-foreground">{cameraError || 'Works best on a phone or laptop with a webcam. HTTPS required.'}</p>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={submitManual} className="mt-4 flex gap-2">
              <Keyboard className="mt-2.5 size-5 text-muted-foreground" />
              <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Or type ticket code, e.g. NDM-000123" className="uppercase" />
              <Button type="submit" loading={scanning2}>Check in</Button>
            </form>
          </CardContent>
        </Card>

        {result && <ResultCard result={result} onDismiss={() => setResult(null)} />}
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5 text-primary" /> Live desk stats</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Stat label="Checked in" value={checkedIn} tone="success" />
            <Stat label="Not arrived" value={confirmed} tone="warning" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent scans</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recents.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No scans yet this session.</p>}
            {recents.map((r, i) => (
              <div key={`${r.ticket?.code}-${i}`} className="flex items-center gap-2.5 rounded-lg border p-2">
                {r.valid
                  ? <CheckCircle2 className="size-5 shrink-0 text-success" />
                  : r.reason === 'DUPLICATE'
                    ? <AlertTriangle className="size-5 shrink-0 text-warning" />
                    : <XCircle className="size-5 shrink-0 text-destructive" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.ticket?.attendeeName || 'Unknown ticket'}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.ticket?.code} · {fmtTime(r.at)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ResultCard({ result, onDismiss }) {
  const tone = result.valid ? 'success' : result.reason === 'DUPLICATE' ? 'warning' : 'destructive';
  const Icon = result.valid ? CheckCircle2 : result.reason === 'DUPLICATE' ? AlertTriangle : XCircle;
  const t = result.ticket;
  return (
    <Card className={cn('border-2', tone === 'success' && 'border-success/50 bg-success/5', tone === 'warning' && 'border-warning/50 bg-warning/5', tone === 'destructive' && 'border-destructive/50 bg-destructive/5')}>
      <CardContent className="flex items-center gap-4 p-5">
        <span className={cn('grid size-14 shrink-0 place-items-center rounded-2xl',
          tone === 'success' && 'bg-success/15 text-success',
          tone === 'warning' && 'bg-warning/15 text-warning',
          tone === 'destructive' && 'bg-destructive/15 text-destructive')}>
          <Icon className="size-8" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-extrabold">{result.valid ? 'Check-in successful' : result.reason === 'DUPLICATE' ? 'Already checked in' : 'Check-in rejected'}</p>
          {t ? (
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
              <Avatar name={t.attendeeName} src={t.avatar} className="size-8" />
              <span className="font-bold">{t.attendeeName}</span>
              <Badge variant="secondary">{t.code}</Badge>
              <span className="text-muted-foreground">{t.ticketType}</span>
            </div>
          ) : <p className="text-sm text-muted-foreground">{result.message}</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss}>Dismiss</Button>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-xl border p-4 text-center">
      <p className={cn('font-display text-3xl font-extrabold', tone === 'success' ? 'text-success' : 'text-warning')}>{value}</p>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}
