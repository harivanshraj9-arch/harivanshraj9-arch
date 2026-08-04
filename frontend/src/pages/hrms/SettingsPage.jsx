import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Building2 } from "lucide-react";
import HrmsLayout from "@/components/hrms/HrmsLayout";
import { hrmsApi } from "@/lib/hrmsApi";

export default function SettingsPage() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => setS(await hrmsApi.settings());
  useEffect(() => { load(); }, []);

  const set = (k, v) => setS(prev => ({ ...prev, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await hrmsApi.saveSettings(s);
      toast.success("Settings saved");
      load();
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  if (!s) return <HrmsLayout title="Settings"><div className="text-sm text-muted-foreground">Loading…</div></HrmsLayout>;

  return (
    <HrmsLayout title="Settings" subtitle="Company details, statutory percentages and office rules">
      <form onSubmit={save} className="space-y-4">
        <Card icon={Building2} title="Company">
          <Field label="Company Name">
            <Input value={s.company_name} onChange={v => set("company_name", v)} testid="settings-company" />
          </Field>
          <Field label="Company Address" full>
            <textarea rows={2} value={s.company_address || ""} onChange={e => set("company_address", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" />
          </Field>
          <Field label="Financial Year">
            <Input value={s.financial_year} onChange={v => set("financial_year", v)} />
          </Field>
        </Card>

        <Card icon={Building2} title="Office & Attendance">
          <Field label="Working Days / Month">
            <NumberInput value={s.working_days_per_month} onChange={v => set("working_days_per_month", v)} testid="settings-working-days" />
          </Field>
          <Field label="Shift Hours">
            <NumberInput value={s.shift_hours} onChange={v => set("shift_hours", v)} />
          </Field>
          <Field label="Office Start (HH:MM)">
            <Input value={s.office_start} onChange={v => set("office_start", v)} />
          </Field>
          <Field label="Office End (HH:MM)">
            <Input value={s.office_end} onChange={v => set("office_end", v)} />
          </Field>
          <Field label="Late Threshold (minutes)">
            <NumberInput value={s.late_threshold_minutes} onChange={v => set("late_threshold_minutes", v)} />
          </Field>
        </Card>

        <Card icon={Building2} title="Statutory Rates (India)">
          <Field label="PF Employee %">
            <NumberInput value={s.pf_employee_pct} onChange={v => set("pf_employee_pct", v)} testid="settings-pf-emp" />
          </Field>
          <Field label="PF Employer %">
            <NumberInput value={s.pf_employer_pct} onChange={v => set("pf_employer_pct", v)} />
          </Field>
          <Field label="PF Wage Cap (₹)">
            <NumberInput value={s.pf_wage_cap} onChange={v => set("pf_wage_cap", v)} />
          </Field>
          <Field label="ESIC Employee %">
            <NumberInput value={s.esic_employee_pct} onChange={v => set("esic_employee_pct", v)} />
          </Field>
          <Field label="ESIC Employer %">
            <NumberInput value={s.esic_employer_pct} onChange={v => set("esic_employer_pct", v)} />
          </Field>
          <Field label="ESIC Wage Ceiling (₹)">
            <NumberInput value={s.esic_wage_ceiling} onChange={v => set("esic_wage_ceiling", v)} />
          </Field>
          <Field label="Professional Tax (₹)">
            <NumberInput value={s.professional_tax} onChange={v => set("professional_tax", v)} />
          </Field>
        </Card>

        <div className="flex justify-end">
          <button data-testid="settings-save" type="submit" disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-50">
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </form>
    </HrmsLayout>
  );
}

const Card = ({ icon: Icon, title, children }) => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </div>
      <h3 className="font-heading text-lg font-bold">{title}</h3>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {children}
    </div>
  </div>
);

const Field = ({ label, children, full }) => (
  <label className={`block ${full ? "sm:col-span-2 lg:col-span-3" : ""}`}>
    <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</span>
    {children}
  </label>
);

const Input = ({ testid, value, onChange }) => (
  <input data-testid={testid} value={value || ""} onChange={e => onChange(e.target.value)}
    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
);

const NumberInput = ({ testid, value, onChange }) => (
  <input data-testid={testid} type="number" step="0.01" value={value ?? ""} onChange={e => onChange(parseFloat(e.target.value) || 0)}
    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
);
