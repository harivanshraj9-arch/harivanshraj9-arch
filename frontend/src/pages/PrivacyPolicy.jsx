import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Zap, ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  const [md, setMd] = useState("");
  useEffect(() => {
    fetch("/privacy.md").then((r) => r.text()).then(setMd).catch(() => setMd("Privacy policy is temporarily unavailable."));
  }, []);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-foreground text-background flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div className="font-heading font-black">Prathvi Power Solutions</div>
          </Link>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Home
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <article className="prose prose-sm dark:prose-invert max-w-none">
          <pre className="whitespace-pre-wrap font-body text-sm leading-relaxed bg-transparent border-0 p-0">{md}</pre>
        </article>
      </main>
      <footer className="max-w-3xl mx-auto px-4 py-8 border-t border-border text-xs text-muted-foreground">
        © 2026 Prathvi Power Solutions · PPS Connect
      </footer>
    </div>
  );
}
