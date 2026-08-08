import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Small banner that appears at the top when the device goes offline.
 * Uses the browser navigator.onLine + online/offline events. Works inside
 * the Capacitor Android wrap because WebView proxies these events.
 */
export default function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (online) return null;
  return (
    <div
      data-testid="offline-banner"
      role="alert"
      className="fixed top-[env(safe-area-inset-top)] left-0 right-0 z-[60] bg-[hsl(var(--destructive))] text-white text-xs font-semibold px-4 py-1.5 flex items-center justify-center gap-2 shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5" />
      You're offline — changes will not save until connection is back
    </div>
  );
}
