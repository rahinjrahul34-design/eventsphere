import { Settings2, Save, X } from 'lucide-react';
import { Button } from '../ui/button';

export default function SafetyConfigModal({ form, setForm, onClose, onSave, saving }) {
  const set = (path, value) => {
    if (path.includes('.')) {
      const [a, b] = path.split('.');
      setForm({ ...form, [a]: { ...form[a], [b]: value } });
    } else {
      setForm({ ...form, [path]: value });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="safety-config-title">
      <div className="relative max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto card-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="size-5 text-primary" />
            <h3 id="safety-config-title" className="font-display text-lg font-black">Safety & operations settings</h3>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-primary">Emergency lead contact</h4>
            <div className="grid gap-2 sm:grid-cols-3">
              <Field label="Contact name" value={form.emergencyContact.name} onChange={(v) => set('emergencyContact.name', v)} placeholder="Officer name" />
              <Field label="Phone number *" value={form.emergencyContact.phone} onChange={(v) => set('emergencyContact.phone', v)} placeholder="+91…" />
              <Field label="Role / title" value={form.emergencyContact.role} onChange={(v) => set('emergencyContact.role', v)} placeholder="Safety coordinator" />
            </div>
          </div>

          <div className="space-y-2 border-t pt-3">
            <h4 className="font-bold uppercase tracking-wider text-primary">Medical & first-aid</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Station location" value={form.firstAidStation.location} onChange={(v) => set('firstAidStation.location', v)} placeholder="Lobby north" />
              <Field label="Details" value={form.firstAidStation.details} onChange={(v) => set('firstAidStation.details', v)} placeholder="AED, 2 first-aiders" />
            </div>
          </div>

          <div className="space-y-2 border-t pt-3">
            <h4 className="font-bold uppercase tracking-wider text-primary">Gates, desks & staffing</h4>
            <div className="grid gap-2 sm:grid-cols-3">
              <NumField label="Entry gates" value={form.entryGates} min={1} onChange={(v) => set('entryGates', v)} />
              <NumField label="Check-in desks" value={form.checkInDesks} min={1} onChange={(v) => set('checkInDesks', v)} />
              <NumField label="Staff / volunteers" value={form.staffCount} min={0} onChange={(v) => set('staffCount', v)} />
            </div>
          </div>

          <div className="space-y-2 border-t pt-3">
            <h4 className="font-bold uppercase tracking-wider text-primary">Parking & transit</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              <NumField label="Parking bays" value={form.parkingCapacity} min={0} onChange={(v) => set('parkingCapacity', v)} />
              <Field label="Transit instructions" value={form.parkingInfo} onChange={(v) => set('parkingInfo', v)} placeholder="Metro stop, overflow lots" />
            </div>
          </div>

          <div className="space-y-2 border-t pt-3">
            <h4 className="font-bold uppercase tracking-wider text-primary">Accessibility</h4>
            <div className="flex flex-wrap gap-4 pt-1">
              <Check label="Wheelchair ramp access" checked={form.accessibilityInfo.hasRampAccess} onChange={(v) => set('accessibilityInfo.hasRampAccess', v)} />
              <Check label="Reserved accessible seating" checked={form.accessibilityInfo.hasWheelchairSeating} onChange={(v) => set('accessibilityInfo.hasWheelchairSeating', v)} />
            </div>
            <Field label="Accessibility contact" value={form.accessibilityInfo.accessibilityContact} onChange={(v) => set('accessibilityInfo.accessibilityContact', v)} placeholder="Name / phone" />
          </div>

          <div className="space-y-2 border-t pt-3">
            <h4 className="font-bold uppercase tracking-wider text-primary">Evacuation & environment</h4>
            <label className="block">
              <span className="font-semibold text-muted-foreground">Evacuation instructions</span>
              <textarea
                rows={2}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-foreground"
                placeholder="Egress routes and assembly point."
                value={form.evacuationInstructions}
                onChange={(e) => set('evacuationInstructions', e.target.value)}
              />
            </label>
            <Check
              label="Outdoor or open-air event (weather contingency recommended)"
              checked={form.isOutdoor}
              onChange={(v) => set('isOutdoor', v)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="gradient-brand font-bold text-white" onClick={onSave} disabled={saving}>
            <Save className="size-4" /> Save & re-analyze
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="font-semibold text-muted-foreground">{label}</span>
      <input
        type="text"
        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-foreground"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function NumField({ label, value, onChange, min }) {
  return (
    <label className="block">
      <span className="font-semibold text-muted-foreground">{label}</span>
      <input
        type="number"
        min={min}
        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-foreground"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Check({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 font-semibold">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded text-primary" />
      <span>{label}</span>
    </label>
  );
}
