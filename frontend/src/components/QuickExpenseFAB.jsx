import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Plus, X, Wallet, Loader2, Camera, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { API } from "@/lib/api";

const CATEGORIES = ["Food", "Fuel", "Travel", "Office", "Electricity", "Salary", "Shopping", "Medical", "Miscellaneous"];
const MODES = ["Cash", "UPI", "Bank", "Card"];
const LAST_KEY = "pps_quick_expense_last";
const MAX_EDGE = 1600;   // px — max dimension of compressed photo
const MAX_BYTES = 2 * 1024 * 1024;  // 2MB backend cap

/**
 * Global floating "+" button available on every public page.
 * Tapping opens a compact 3-field form (Amount, Category, Payment mode).
 * Remembers last used category + mode for one-tap repeat entry.
 * Hidden on /admin and /expenses (already has its own form).
 */
export default function QuickExpenseFAB() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState(null); // { dataUrl, name, size }
  const [photoBusy, setPhotoBusy] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [f, setF] = useState(() => {
    try {
      const last = JSON.parse(localStorage.getItem(LAST_KEY) || "null");
      return {
        amount: "",
        category: last?.category || "Fuel",
        payment_mode: last?.payment_mode || "UPI",
        description: "",
      };
    } catch {
      return { amount: "", category: "Fuel", payment_mode: "UPI", description: "" };
    }
  });

  // Hidden on admin routes and (redundant on) /expenses
  if (location.pathname.startsWith("/admin") || location.pathname === "/expenses") return null;

  // Compress selected image to JPEG (max edge 1600px, target < 2MB)
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please pick an image"); return; }
    setPhotoBusy(true);
    try {
      const compressed = await compressImage(file);
      setPhoto(compressed);
    } catch {
      toast.error("Could not process image");
    } finally {
      setPhotoBusy(false);
      e.target.value = "";
    }
  };

  const clearPhoto = () => setPhoto(null);

  const submit = async (e) => {
    e?.preventDefault();
    const amt = parseFloat(f.amount);
    if (!amt || amt <= 0) return toast.error("Enter amount");
    setBusy(true);
    try {
      const body = {
        date: new Date().toISOString().slice(0, 10),
        amount: amt,
        category: f.category,
        payment_mode: f.payment_mode,
        description: f.description.trim(),
      };
      if (photo) {
        body.attachment = photo.dataUrl;
        body.attachment_name = photo.name;
      }
      const res = await fetch(`${API}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("save failed");
      localStorage.setItem(LAST_KEY, JSON.stringify({ category: f.category, payment_mode: f.payment_mode }));
      toast.success(photo ? `₹${amt.toFixed(2)} + bill photo logged` : `₹${amt.toFixed(2)} logged`);
      setF((s) => ({ ...s, amount: "", description: "" }));
      setPhoto(null);
      setOpen(false);
    } catch {
      toast.error("Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Floating button - lg has small right-lower, mobile has above bottom nav */}
      <button
        data-testid="fab-quick-expense"
        onClick={() => setOpen(true)}
        aria-label="Log expense"
        className="lg:hidden fixed right-4 bottom-[calc(84px+env(safe-area-inset-bottom))] z-40 w-14 h-14 rounded-full bg-[hsl(var(--primary))] text-white shadow-2xl shadow-[hsl(var(--primary))]/40 flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </button>
      <button
        data-testid="fab-quick-expense-desktop"
        onClick={() => setOpen(true)}
        aria-label="Log expense"
        className="hidden lg:flex fixed right-6 bottom-6 z-40 h-12 pl-4 pr-5 rounded-full bg-[hsl(var(--primary))] text-white shadow-2xl shadow-[hsl(var(--primary))]/30 items-center gap-2 hover:brightness-110 active:scale-95 transition"
      >
        <Wallet className="w-4 h-4" />
        <span className="text-sm font-semibold">Quick Expense</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            onSubmit={submit}
            className="w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Quick Log</div>
                <h3 className="font-heading text-lg font-black">Add Expense</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-md hover:bg-muted flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Amount */}
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Amount (₹)</label>
                <input
                  data-testid="fab-amount"
                  autoFocus
                  inputMode="decimal"
                  type="number"
                  step="0.01"
                  value={f.amount}
                  onChange={(e) => setF((s) => ({ ...s, amount: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1 w-full h-14 px-4 rounded-xl bg-background border border-border text-2xl font-black tabular-nums focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                />
              </div>

              {/* Category chips */}
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Category</label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setF((s) => ({ ...s, category: c }))}
                      className={`px-3 h-9 rounded-full text-xs font-semibold ${
                        f.category === c
                          ? "bg-foreground text-background"
                          : "border border-border hover:bg-muted"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode */}
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Payment Mode</label>
                <div className="mt-1 grid grid-cols-4 gap-1.5">
                  {MODES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setF((s) => ({ ...s, payment_mode: m }))}
                      className={`h-10 rounded-lg text-xs font-semibold ${
                        f.payment_mode === m
                          ? "bg-foreground text-background"
                          : "border border-border hover:bg-muted"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional description */}
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Note (optional)</label>
                <input
                  value={f.description}
                  onChange={(e) => setF((s) => ({ ...s, description: e.target.value }))}
                  placeholder="Where / why"
                  className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                />
              </div>

              {/* Bill photo attachment */}
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Bill Photo (optional)</label>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFile}
                  className="hidden"
                  data-testid="fab-camera-input"
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFile}
                  className="hidden"
                  data-testid="fab-gallery-input"
                />

                {!photo && !photoBusy && (
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <button
                      data-testid="fab-photo-camera"
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="h-11 rounded-lg border border-border text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-muted"
                    >
                      <Camera className="w-4 h-4" />
                      Snap Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="h-11 rounded-lg border border-border text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-muted"
                    >
                      <Wallet className="w-4 h-4" />
                      Pick from Gallery
                    </button>
                  </div>
                )}

                {photoBusy && (
                  <div className="mt-1 h-20 rounded-lg border border-dashed border-border flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing photo…
                  </div>
                )}

                {photo && (
                  <div data-testid="fab-photo-preview" className="mt-1 relative rounded-lg overflow-hidden border border-border bg-muted">
                    <img src={photo.dataUrl} alt="Bill preview" className="w-full max-h-48 object-contain bg-black/5" />
                    <button
                      type="button"
                      onClick={clearPhoto}
                      aria-label="Remove photo"
                      className="absolute top-1 right-1 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center"
                    >
                      <ImageOff className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 flex items-center justify-between">
                      <span className="truncate">{photo.name}</span>
                      <span className="tabular-nums shrink-0 ml-2">{(photo.size / 1024).toFixed(0)} KB</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border">
              <button
                data-testid="fab-save"
                type="submit"
                disabled={busy || !f.amount}
                className="w-full h-12 rounded-xl bg-foreground text-background font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Log Expense
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

/**
 * Compress an image File → JPEG data URL (max 1600px edge, target < 2MB).
 * Uses canvas — no dependencies. Auto-lowers quality if too big.
 */
async function compressImage(file) {
  const originalUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = originalUrl;
    });

    let { width, height } = img;
    if (width > MAX_EDGE || height > MAX_EDGE) {
      const scale = Math.min(MAX_EDGE / width, MAX_EDGE / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; // paint background for transparent PNGs
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // Iteratively lower quality until size is under 2MB base64
    let quality = 0.85;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    while (dataUrl.length > MAX_BYTES && quality > 0.4) {
      quality -= 0.15;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }

    const base = (file.name || "bill").replace(/\.[^.]+$/, "");
    const name = `${base}.jpg`;
    // Approx binary size: base64 length * 0.75 minus data:image/jpeg;base64, prefix
    const size = Math.floor((dataUrl.length - 23) * 0.75);
    return { dataUrl, name, size };
  } finally {
    URL.revokeObjectURL(originalUrl);
  }
}
