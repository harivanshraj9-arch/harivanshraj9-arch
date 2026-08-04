import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Search, Plus, Pencil, Trash2, Download, X, User, Paperclip, Save } from "lucide-react";
import HrmsLayout from "@/components/hrms/HrmsLayout";
import { hrmsApi } from "@/lib/hrmsApi";
import { inr } from "@/lib/format";

const emptyEmp = {
  name: "", father_name: "", mobile: "", email: "", aadhaar: "", pan: "",
  dob: "", gender: "", blood_group: "", address: "", emergency_contact: "",
  department: "", designation: "", branch: "", reporting_manager: "",
  joining_date: "", employment_type: "Full-Time",
  basic: 0, hra: 0, da: 0, conveyance: 0, special_allowance: 0,
  bank_name: "", account_number: "", ifsc: "",
  uan: "", esic_number: "", photo: null, status: "Active",
};

export default function EmployeesPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [lookups, setLookups] = useState(null);
  const [filters, setFilters] = useState({
    q: "", department: "All", designation: "All", branch: "All",
    status: "All", joined_from: "", joined_to: "",
  });
  const [detail, setDetail] = useState(null); // employee under view/edit (or 'new' string)
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [data, l] = await Promise.all([
        hrmsApi.listEmployees({ ...filters, limit: 1000 }),
        lookups ? Promise.resolve(lookups) : hrmsApi.lookups(),
      ]);
      setRows(data.items);
      setTotal(data.total);
      if (!lookups) setLookups(l);
    } catch (e) {
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filters.q, filters.department, filters.designation, filters.branch, filters.status, filters.joined_from, filters.joined_to]);

  const branches = useMemo(() => ["All", ...new Set(rows.map(r => r.branch).filter(Boolean))], [rows]);

  return (
    <HrmsLayout title="Employees" subtitle="Master data for every person on payroll">
      {/* Toolbar */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input data-testid="emp-search" value={filters.q}
              onChange={(e) => setFilters(f => ({ ...f, q: e.target.value }))}
              placeholder="Name, code, email, mobile, PAN, UAN…"
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
          </div>
          <select data-testid="emp-filter-dept" value={filters.department}
            onChange={(e) => setFilters(f => ({ ...f, department: e.target.value }))}
            className="h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none">
            <option value="All">All Departments</option>
            {(lookups?.departments || []).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select data-testid="emp-filter-desg" value={filters.designation}
            onChange={(e) => setFilters(f => ({ ...f, designation: e.target.value }))}
            className="h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none">
            <option value="All">All Designations</option>
            {(lookups?.designations || []).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select data-testid="emp-filter-status" value={filters.status}
            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
            className="h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none">
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {loading ? "Loading…" : `${total} employees`}
          </div>
          <div className="flex flex-wrap gap-2">
            <a data-testid="emp-export" href={hrmsApi.urlEmployees()} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border text-xs font-semibold hover:bg-muted">
              <Download className="w-3.5 h-3.5" /> Export
            </a>
            <button data-testid="emp-new" onClick={() => setDetail("new")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold">
              <Plus className="w-3.5 h-3.5" /> Add Employee
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <Th>Code</Th><Th>Name</Th><Th>Department</Th><Th>Designation</Th>
                <Th className="text-right">Salary</Th><Th>Joining</Th><Th>Status</Th><Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  {loading ? "Loading…" : "No employees. Click 'Add Employee' to start."}
                </td></tr>
              )}
              {rows.map((e) => {
                const salary = (e.basic || 0) + (e.hra || 0) + (e.da || 0) + (e.conveyance || 0) + (e.special_allowance || 0);
                return (
                  <tr key={e.id} data-testid={`emp-row-${e.emp_code}`} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-2 font-mono text-xs">{e.emp_code}</td>
                    <td className="px-3 py-2 font-semibold">
                      <div className="flex items-center gap-2">
                        <Avatar photo={e.photo} name={e.name} />
                        <div>
                          <div>{e.name}</div>
                          {e.email && <div className="text-[11px] text-muted-foreground">{e.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">{e.department || "—"}</td>
                    <td className="px-3 py-2">{e.designation || "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{inr(salary)}</td>
                    <td className="px-3 py-2 text-xs">{e.joining_date || "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold
                        ${e.status === "Active" ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button data-testid={`edit-${e.emp_code}`} onClick={() => setDetail(e)}
                        className="w-8 h-8 rounded-md hover:bg-muted inline-flex items-center justify-center" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button data-testid={`del-${e.emp_code}`} onClick={async () => {
                        if (!window.confirm(`Delete ${e.name}? This also removes their attendance, leaves and payroll.`)) return;
                        try { await hrmsApi.deleteEmployee(e.id); toast.success("Deleted"); load(); }
                        catch { toast.error("Delete failed"); }
                      }}
                        className="w-8 h-8 rounded-md hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))] inline-flex items-center justify-center" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <EmployeeDialog
          employee={detail === "new" ? null : detail}
          lookups={lookups}
          onClose={() => setDetail(null)}
          onSaved={() => { setDetail(null); load(); }}
        />
      )}
    </HrmsLayout>
  );
}

const Th = ({ children, className = "" }) => (
  <th className={`px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground ${className}`}>{children}</th>
);

const Avatar = ({ photo, name }) => (
  photo ? (
    <img src={photo} alt="" className="w-8 h-8 rounded-full object-cover" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
      {(name || "?").split(" ").map(s => s[0]).slice(0, 2).join("")}
    </div>
  )
);

function EmployeeDialog({ employee, lookups, onClose, onSaved }) {
  const [form, setForm] = useState(employee || emptyEmp);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("basic");
  const isEdit = !!employee?.id;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const photoFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 1 * 1024 * 1024) { toast.error("Photo max 1MB"); return; }
    const r = new FileReader();
    r.onload = () => set("photo", r.result);
    r.readAsDataURL(f);
  };

  const docFile = async (e, type) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast.error("File max 2MB"); return; }
    const r = new FileReader();
    r.onload = async () => {
      try {
        await hrmsApi.addDocument(employee.id, { type, name: f.name, data: r.result });
        toast.success("Document uploaded");
        const fresh = await hrmsApi.getEmployee(employee.id);
        setForm(fresh);
      } catch { toast.error("Upload failed"); }
    };
    r.readAsDataURL(f);
    e.target.value = "";
  };

  const removeDoc = async (docId) => {
    if (!window.confirm("Remove this document?")) return;
    try {
      await hrmsApi.deleteDocument(employee.id, docId);
      const fresh = await hrmsApi.getEmployee(employee.id);
      setForm(fresh);
      toast.success("Removed");
    } catch { toast.error("Remove failed"); }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name || form.name.trim().length < 2) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await hrmsApi.updateEmployee(employee.id, form);
        toast.success("Employee updated");
      } else {
        const created = await hrmsApi.createEmployee(form);
        toast.success(`Added — ${created.emp_code}`);
      }
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally { setSaving(false); }
  };

  return (
    <div data-testid="emp-dialog" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-2 sm:p-6 flex items-start sm:items-center justify-center overflow-y-auto">
      <form onSubmit={save} className="w-full max-w-4xl bg-card border border-border rounded-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar photo={form.photo} name={form.name} />
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
                {isEdit ? employee.emp_code : "New Employee"}
              </div>
              <h3 className="font-heading text-lg font-bold">{form.name || "Add employee"}</h3>
            </div>
          </div>
          <button type="button" data-testid="emp-dialog-close" onClick={onClose} className="w-9 h-9 rounded-md hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border px-4 flex gap-1 overflow-x-auto no-scrollbar">
          {["basic", "job", "salary", "bank", "documents"].map(t => (
            <button key={t} type="button" onClick={() => setTab(t)} data-testid={`emp-tab-${t}`}
              className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider whitespace-nowrap border-b-2
                ${tab === t ? "border-[hsl(var(--primary))] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === "basic" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Full Name*"><Input testid="emp-name" value={form.name} onChange={v => set("name", v)} /></Field>
              <Field label="Father's Name"><Input value={form.father_name} onChange={v => set("father_name", v)} /></Field>
              <Field label="Mobile"><Input value={form.mobile} onChange={v => set("mobile", v)} /></Field>
              <Field label="Email"><Input type="email" value={form.email} onChange={v => set("email", v)} /></Field>
              <Field label="Aadhaar"><Input value={form.aadhaar} onChange={v => set("aadhaar", v)} /></Field>
              <Field label="PAN"><Input value={form.pan} onChange={v => set("pan", v)} /></Field>
              <Field label="Date of Birth"><Input type="date" value={form.dob || ""} onChange={v => set("dob", v)} /></Field>
              <Field label="Gender">
                <Select value={form.gender} onChange={v => set("gender", v)} options={["", ...(lookups?.genders || [])]} />
              </Field>
              <Field label="Blood Group">
                <Select value={form.blood_group} onChange={v => set("blood_group", v)} options={["", ...(lookups?.blood_groups || [])]} />
              </Field>
              <Field label="Emergency Contact"><Input value={form.emergency_contact} onChange={v => set("emergency_contact", v)} /></Field>
              <Field label="Address" full><textarea rows={2} value={form.address} onChange={e => set("address", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" /></Field>
              <Field label="Photo (max 1MB)" full>
                <label className="cursor-pointer border border-dashed border-border rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {form.photo ? "Change photo" : "Upload photo"}
                  <input data-testid="emp-photo" type="file" accept="image/*" onChange={photoFile} className="hidden" />
                </label>
              </Field>
            </div>
          )}

          {tab === "job" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Department">
                <Select value={form.department} onChange={v => set("department", v)} options={["", ...(lookups?.departments || [])]} />
              </Field>
              <Field label="Designation">
                <Select value={form.designation} onChange={v => set("designation", v)} options={["", ...(lookups?.designations || [])]} />
              </Field>
              <Field label="Branch / Office"><Input value={form.branch} onChange={v => set("branch", v)} /></Field>
              <Field label="Reporting Manager"><Input value={form.reporting_manager} onChange={v => set("reporting_manager", v)} /></Field>
              <Field label="Joining Date"><Input type="date" value={form.joining_date || ""} onChange={v => set("joining_date", v)} /></Field>
              <Field label="Employment Type">
                <Select value={form.employment_type} onChange={v => set("employment_type", v)} options={lookups?.employment_types || []} />
              </Field>
              <Field label="Status">
                <Select value={form.status} onChange={v => set("status", v)} options={["Active", "Inactive"]} />
              </Field>
            </div>
          )}

          {tab === "salary" && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Basic (₹)"><NumberInput value={form.basic} onChange={v => set("basic", v)} /></Field>
                <Field label="HRA (₹)"><NumberInput value={form.hra} onChange={v => set("hra", v)} /></Field>
                <Field label="DA (₹)"><NumberInput value={form.da} onChange={v => set("da", v)} /></Field>
                <Field label="Conveyance (₹)"><NumberInput value={form.conveyance} onChange={v => set("conveyance", v)} /></Field>
                <Field label="Special Allowance (₹)"><NumberInput value={form.special_allowance} onChange={v => set("special_allowance", v)} /></Field>
                <Field label="UAN"><Input value={form.uan} onChange={v => set("uan", v)} /></Field>
                <Field label="ESIC No"><Input value={form.esic_number} onChange={v => set("esic_number", v)} /></Field>
              </div>
              <div className="mt-4 rounded-lg bg-muted p-3 flex justify-between text-sm">
                <span className="font-semibold">Gross monthly (structure)</span>
                <span className="font-bold tabular-nums">
                  {inr((form.basic || 0) + (form.hra || 0) + (form.da || 0) + (form.conveyance || 0) + (form.special_allowance || 0))}
                </span>
              </div>
            </div>
          )}

          {tab === "bank" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Bank Name"><Input value={form.bank_name} onChange={v => set("bank_name", v)} /></Field>
              <Field label="Account Number"><Input value={form.account_number} onChange={v => set("account_number", v)} /></Field>
              <Field label="IFSC"><Input value={form.ifsc} onChange={v => set("ifsc", v)} /></Field>
            </div>
          )}

          {tab === "documents" && (
            <div>
              {!isEdit ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  Save the employee first, then upload documents.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    {["Aadhaar", "PAN", "Resume", "Appointment Letter", "ID Card", "Increment Letter", "Experience Letter", "Warning Letter", "Relieving Letter", "Other"].map(t => (
                      <label key={t} className="cursor-pointer border border-dashed border-border rounded-lg px-3 py-2 text-xs text-center hover:bg-muted">
                        <Paperclip className="w-3.5 h-3.5 inline mr-1" /> {t}
                        <input data-testid={`doc-${t.replace(/\s/g, '-').toLowerCase()}`} type="file" accept="image/*,application/pdf" onChange={e => docFile(e, t)} className="hidden" />
                      </label>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {(form.documents || []).length === 0 && <div className="text-sm text-muted-foreground">No documents yet</div>}
                    {(form.documents || []).map(d => (
                      <div key={d.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                        <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-32 shrink-0 truncate">{d.type}</span>
                        <a href={d.data} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm truncate hover:text-[hsl(var(--primary))]">{d.name}</a>
                        <button type="button" onClick={() => removeDoc(d.id)} className="w-7 h-7 rounded-md hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))] flex items-center justify-center">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-muted/30">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-muted">Cancel</button>
          <button data-testid="emp-save" type="submit" disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-50">
            <Save className="w-4 h-4" /> {isEdit ? "Update" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

const Field = ({ label, children, full }) => (
  <label className={`block ${full ? "sm:col-span-2" : ""}`}>
    <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</span>
    {children}
  </label>
);

const Input = ({ testid, value, onChange, type = "text" }) => (
  <input data-testid={testid} type={type} value={value || ""} onChange={e => onChange(e.target.value)}
    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
);

const NumberInput = ({ value, onChange }) => (
  <input type="number" min="0" step="0.01" value={value || ""} onChange={e => onChange(parseFloat(e.target.value) || 0)}
    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
);

const Select = ({ value, onChange, options }) => (
  <select value={value || ""} onChange={e => onChange(e.target.value)}
    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">
    {options.map(o => <option key={o} value={o}>{o || "—"}</option>)}
  </select>
);
