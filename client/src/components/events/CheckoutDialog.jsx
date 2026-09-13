import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Loader2, Lock, Ticket, Hourglass } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input, Textarea, Label, Select, FieldError } from '../ui/input';
import { endpoints } from '../../lib/api';
import { inr } from '../../lib/format';
import { toast } from 'sonner';

export default function CheckoutDialog({ event, open, onClose }) {
  const [step, setStep] = useState('form'); // form | paying | done | waitlist
  const [ticketType, setTicketType] = useState(event?.ticketTypes?.[0]?.name || 'General');
  const [responses, setResponses] = useState({});
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);

  const freeTickets = (event?.ticketTypes || []).filter((t) => t.price === 0);
  const paidTickets = (event?.ticketTypes || []).filter((t) => t.price > 0);
  const selected = event?.ticketTypes?.find((t) => t.name === ticketType);
  const price = selected ? selected.price : event?.price || 0;

  const registerMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ticketType,
        source: 'direct',
        responses: (event?.customRegistrationFields || []).map((f) => ({
          field: f.label,
          label: f.label,
          value: responses[f.label] ?? '',
        })),
      };
      return endpoints.register(event._id, payload);
    },
    onSuccess: async (data) => {
      if (data.waitlisted) {
        setResult(data);
        setStep('waitlist');
        toast.success(`You're #${data.position} on the waitlist`);
        return;
      }
      if (data.free) {
        setResult(data);
        setStep('done');
        toast.success('Registration confirmed!');
        return;
      }
      // DEMO PAYMENT: simulate the Razorpay redirect/verify round-trip.
      setStep('paying');
      try {
        await new Promise((r) => setTimeout(r, 1600));
        const verified = await endpoints.verifyPayment({
          orderId: data.order.orderId,
          paymentId: `pay_demo_${Date.now()}`,
          signature: 'demo',
          registrationId: data.registration?._id,
        });
        setResult({ ...data, ...verified });
        setStep('done');
        toast.success('Payment successful — ticket issued!');
      } catch (e) {
        toast.error(e.message);
        setStep('form');
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const validate = () => {
    const errs = {};
    (event?.customRegistrationFields || []).forEach((f) => {
      if (f.required && !String(responses[f.label] ?? '').trim()) errs[f.label] = 'This field is required';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = () => {
    if (validate()) registerMutation.mutate();
  };

  const reset = () => {
    setStep('form');
    setResult(null);
    setResponses({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={reset} title={step === 'done' ? 'You’re in!' : 'Complete registration'} size="lg">
      {step === 'form' && (
        <div className="space-y-5">
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="font-bold">{event?.title}</p>
            <p className="text-sm text-muted-foreground">{event?.venue?.name}, {event?.venue?.city}</p>
          </div>

          {event?.ticketTypes?.length > 0 ? (
            <div className="space-y-2">
              <Label>Choose ticket</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {event.ticketTypes.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => setTicketType(t.name)}
                    className={`rounded-xl border-2 p-3 text-left transition ${
                      ticketType === t.name ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{t.name}</span>
                      <span className="font-extrabold">{inr(t.price)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
              <span className="font-semibold text-sm">General Admission</span>
              <span className="font-extrabold">{inr(event?.price)}</span>
            </div>
          )}

          <div className="space-y-3">
            {event?.customRegistrationFields?.map((f) => (
              <div key={f.label}>
                <Label required={f.required}>{f.label}</Label>
                <div className="mt-1">
                  {['text', 'email', 'phone'].map(String).includes(f.type) && (
                    <Input
                      type={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'}
                      placeholder={f.placeholder}
                      value={responses[f.label] || ''}
                      error={errors[f.label]}
                      onChange={(e) => setResponses({ ...responses, [f.label]: e.target.value })}
                    />
                  )}
                  {f.type === 'textarea' && (
                    <Textarea
                      placeholder={f.placeholder}
                      value={responses[f.label] || ''}
                      error={errors[f.label]}
                      onChange={(e) => setResponses({ ...responses, [f.label]: e.target.value })}
                    />
                  )}
                  {f.type === 'select' && (
                    <Select
                      value={responses[f.label] || ''}
                      error={errors[f.label]}
                      onChange={(e) => setResponses({ ...responses, [f.label]: e.target.value })}
                    >
                      <option value="">Select…</option>
                      {f.options?.map((o) => <option key={o}>{o}</option>)}
                    </Select>
                  )}
                  {f.type === 'radio' && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {f.options?.map((o) => (
                        <button
                          type="button"
                          key={o}
                          onClick={() => setResponses({ ...responses, [f.label]: o })}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                            responses[f.label] === o ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/50'
                          }`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  )}
                  {f.type === 'checkbox' && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {f.options?.map((o) => {
                        const arr = responses[f.label] || [];
                        const active = arr.includes(o);
                        return (
                          <button
                            type="button"
                            key={o}
                            onClick={() =>
                              setResponses({
                                ...responses,
                                [f.label]: active ? arr.filter((x) => x !== o) : [...arr, o],
                              })
                            }
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/50'}`}
                          >
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <FieldError message={errors[f.label]} />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-xl border p-4">
            <div>
              <p className="text-xs text-muted-foreground">Total payable</p>
              <p className="text-xl font-extrabold">{inr(price)}</p>
            </div>
            <Button size="lg" loading={registerMutation.isPending} onClick={submit}>
              {price > 0 ? <><Lock /> Pay & Register</> : <><Ticket /> Confirm registration</>}
            </Button>
          </div>
          {price > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              Demo mode — no real payment is processed. Razorpay is wired behind a service abstraction.
            </p>
          )}
        </div>
      )}

      {step === 'paying' && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="font-semibold">Processing secure payment…</p>
          <p className="text-sm text-muted-foreground">{inr(price)} · Demo gateway</p>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircle2 className="size-14 text-success" />
          <div>
            <p className="font-bold text-lg">Registration confirmed</p>
            <p className="text-sm text-muted-foreground">Your digital QR pass has been generated.</p>
          </div>
          {result?.ticket && (
            <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-5">
              <QRCodeSVG value={result.ticket.code} size={148} level="M" />
              <p className="mt-2 font-mono text-sm font-bold tracking-widest">{result.ticket.code}</p>
            </div>
          )}
          <div className="flex gap-3">
            {result?.ticket && (
              <Link to={`/my-tickets/${result.ticket._id}`}>
                <Button>View my ticket</Button>
              </Link>
            )}
            <Button variant="outline" onClick={reset}>Close</Button>
          </div>
        </div>
      )}

      {step === 'waitlist' && (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="grid size-14 place-items-center rounded-xl bg-warning/15"><Hourglass className="size-7 text-warning" aria-hidden="true" /></div>
          <p className="font-bold text-lg">You’re #{result?.position} on the waitlist</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            If a seat opens up, the next eligible attendee is promoted automatically — you’ll get an instant notification and email.
          </p>
          <Button variant="outline" onClick={reset}>Got it</Button>
        </div>
      )}
    </Dialog>
  );
}
