import { QRCodeSVG } from 'qrcode.react';
import { Award, Download, ShieldCheck, CheckCircle2, Sparkles, ExternalLink } from 'lucide-react';
import { fmtDate } from '../../lib/format';
import { Button } from '../ui/button';

export default function Certificate({ cert }) {
  const verifyUrl = `${window.location.origin}/verify-certificate/${cert.certificateId}`;

  const print = () => window.print();

  const typeLabels = {
    participation: 'CERTIFICATE OF PARTICIPATION',
    winner: 'CERTIFICATE OF EXCELLENCE & ACHIEVEMENT',
    excellence: 'CERTIFICATE OF MERIT & DISTINCTION',
    volunteer: 'CERTIFICATE OF VOLUNTEER APPRECIATION',
    speaker: 'CERTIFICATE OF DISTINGUISHED SPEAKER',
  };

  const titleHeader = typeLabels[cert.type] || 'CERTIFICATE OF RECOGNITION';

  return (
    <div className="space-y-6">
      {/* ─── Premium Certificate Plaque Container ─── */}
      <div
        id="print-area"
        className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl bg-[#0d1117] text-[#f0f6fc] shadow-2xl p-6 sm:p-10 transition-all select-none"
        style={{
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(212, 175, 55, 0.25)',
        }}
      >
        {/* Outer Fine Gold Guilloche / Border */}
        <div
          className="relative rounded-xl p-6 sm:p-10 border-2"
          style={{
            borderColor: 'rgba(212, 175, 55, 0.65)',
            background: 'radial-gradient(ellipse at center, #161b22 0%, #0a0e14 100%)',
          }}
        >
          {/* Ornate Corner Accents */}
          <div className="absolute top-2 left-2 size-8 sm:size-12 border-t-2 border-l-2 border-[#d4af37]" />
          <div className="absolute top-2 right-2 size-8 sm:size-12 border-t-2 border-r-2 border-[#d4af37]" />
          <div className="absolute bottom-2 left-2 size-8 sm:size-12 border-b-2 border-l-2 border-[#d4af37]" />
          <div className="absolute bottom-2 right-2 size-8 sm:size-12 border-b-2 border-r-2 border-[#d4af37]" />

          {/* Subtle Inner Double Border */}
          <div
            className="pointer-events-none absolute inset-3 rounded-lg border"
            style={{ borderColor: 'rgba(212, 175, 55, 0.25)' }}
          />

          {/* Background Watermark Crest */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-5 overflow-hidden">
            <Award className="size-96 text-[#d4af37]" />
          </div>

          {/* ─── Header: Brand & Badge ─── */}
          <div className="relative text-center">
            <div className="mx-auto flex items-center justify-center gap-2 mb-2">
              <div
                className="grid size-12 place-items-center rounded-full shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #d4af37 0%, #aa7c11 50%, #f7e690 100%)',
                  color: '#0a0e14',
                }}
              >
                <Award className="size-7 stroke-[2.5]" />
              </div>
            </div>

            <p
              className="tracking-[0.4em] text-[11px] sm:text-xs font-semibold uppercase"
              style={{
                fontFamily: "'Cinzel', serif",
                color: '#d4af37',
              }}
            >
              EventSphere Official Credential
            </p>

            <h1
              className="mt-4 text-xl sm:text-3xl font-extrabold tracking-wider uppercase"
              style={{
                fontFamily: "'Cinzel', serif",
                background: 'linear-gradient(to right, #f7e690 0%, #d4af37 50%, #e6c86e 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {titleHeader}
            </h1>

            <p
              className="mt-6 text-xs sm:text-sm tracking-widest text-[#8b949e] uppercase"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              This is proudly presented to
            </p>

            {/* Recipient Name in Luxury Serif */}
            <div className="my-4 sm:my-6 relative inline-block">
              <h2
                className="font-extrabold text-3xl sm:text-5xl tracking-wide px-4"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  background: 'linear-gradient(135deg, #ffffff 0%, #f0f6fc 50%, #d4af37 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {cert.recipientName}
              </h2>
              {/* Elegant Underline */}
              <div
                className="mt-3 mx-auto h-[2px] w-48 sm:w-72"
                style={{
                  background: 'linear-gradient(90deg, transparent, #d4af37, transparent)',
                }}
              />
            </div>

            <p className="mx-auto max-w-xl text-xs sm:text-sm text-[#8b949e] leading-relaxed">
              for outstanding participation and successful completion of
            </p>

            {/* Event Title */}
            <h3
              className="mt-2 text-lg sm:text-2xl font-bold tracking-tight text-[#e6edf3]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {cert.eventTitle}
            </h3>

            <p className="mt-1 text-xs text-[#8b949e]">
              Conducted on{' '}
              <span className="text-[#f0f6fc] font-medium">{fmtDate(cert.eventDate || cert.issuedAt)}</span>{' '}
              · Authorized by{' '}
              <span className="text-[#d4af37] font-semibold">{cert.organizerName || 'EventSphere Organizer'}</span>
            </p>

            {/* ─── Footer: Signatures, Gold Seal & QR ─── */}
            <div className="mt-10 sm:mt-14 pt-6 border-t border-[rgba(212,175,55,0.2)] grid grid-cols-3 items-end text-center">
              {/* Left: Organizer Signature */}
              <div className="text-left">
                <div className="inline-block">
                  <p
                    className="italic text-base sm:text-lg text-[#d4af37]"
                    style={{ fontFamily: "'Playfair Display', cursive" }}
                  >
                    {cert.organizerName || 'Executive Committee'}
                  </p>
                  <div className="h-[1px] w-28 sm:w-40 bg-[#d4af37]/60 mt-1" />
                  <p
                    className="mt-1 text-[9px] sm:text-[10px] uppercase tracking-widest text-[#8b949e]"
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    Authorized Signatory
                  </p>
                </div>
              </div>

              {/* Center: Metallic Gold Embossed Seal */}
              <div className="flex flex-col items-center justify-center">
                <div
                  className="relative size-16 sm:size-20 rounded-full flex items-center justify-center shadow-2xl ring-2 ring-[#d4af37]/50"
                  style={{
                    background: 'radial-gradient(circle at 30% 30%, #fff2a3, #d4af37 45%, #8c6714 85%)',
                    boxShadow: '0 0 25px rgba(212, 175, 55, 0.45)',
                  }}
                >
                  <div className="size-12 sm:size-16 rounded-full border border-dashed border-[#573f05] flex flex-col items-center justify-center text-center text-[#382701] font-bold">
                    <ShieldCheck className="size-4 sm:size-5 text-[#382701]" />
                    <span className="text-[7px] sm:text-[8px] tracking-tighter uppercase font-extrabold leading-none mt-0.5">
                      Verified
                    </span>
                    <span className="text-[6px] tracking-widest uppercase text-[#573f05]">
                      Authentic
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-[8px] uppercase tracking-widest text-[#d4af37]/80">Secure Seal</p>
              </div>

              {/* Right: Live QR Code & Verification ID */}
              <div className="flex flex-col items-end">
                <div className="rounded-xl bg-white p-2 shadow-lg ring-1 ring-[#d4af37]/50">
                  <QRCodeSVG value={verifyUrl} size={68} level="M" />
                </div>
                <p className="mt-1.5 font-mono text-[9px] sm:text-[10px] text-[#8b949e] tracking-tight">
                  {cert.certificateId}
                </p>
                <span className="text-[8px] text-[#3fb950] font-semibold flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="size-2.5" /> Cryptographically Valid
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons (Print / Download & Direct Verify) */}
      <div className="no-print flex flex-wrap justify-center items-center gap-3 pt-2">
        <Button size="lg" onClick={print} className="gradient-brand text-white shadow-lift font-bold">
          <Download className="size-4" /> Download / Print Certificate
        </Button>
        <a href={verifyUrl} target="_blank" rel="noreferrer">
          <Button size="lg" variant="outline" className="font-semibold">
            <ExternalLink className="size-4" /> View Public Verification
          </Button>
        </a>
      </div>
    </div>
  );
}
