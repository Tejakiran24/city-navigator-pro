import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in | UrbanFlow Navigation" }, { name: "description", content: "Sign in to plan routes, receive live alerts, and access your traffic insights." }, { property: "og:title", content: "Sign in | UrbanFlow Navigation" }, { property: "og:description", content: "Access smarter city navigation and real-time traffic intelligence." }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [show, setShow] = useState(false);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const [showGooglePopup, setShowGooglePopup] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    if (!email.trim() || (mode !== "forgot" && password.length < 8)) { setMessage("Enter a valid email and a password of at least 8 characters."); setBusy(false); return; }
    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
      setMessage(error ? error.message : "Password reset instructions sent.");
    } else if (mode === "register") {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim() || "City Navigator" } } });
      if (!error && data.user) await supabase.from("profiles").upsert({ id: data.user.id, display_name: name.trim() || "City Navigator" });
      setMessage(error ? error.message : "Check your inbox to verify your account.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setMessage(error.message); else navigate({ to: "/dashboard" });
    }
    setBusy(false);
  };

  const google = () => {
    setShowGooglePopup(true);
  };

  const handleMockGoogleLogin = async (displayName: string, mockEmail: string) => {
    setBusy(true);
    setMessage("");
    setShowGooglePopup(false);
    
    // Authenticate with Supabase Anonymous Sign-In under the hood
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      setMessage(error.message);
    } else {
      if (data.user) {
        // Upsert the profile table with the selected Google User name and a custom avatar
        await supabase.from("profiles").upsert({ 
          id: data.user.id, 
          display_name: displayName,
          avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`
        });
      }
      navigate({ to: "/dashboard" });
    }
    setBusy(false);
  };

  const guest = async () => {
    setBusy(true); setMessage("");
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      setMessage(error.message);
    } else {
      if (data.user) {
        await supabase.from("profiles").upsert({ id: data.user.id, display_name: "Guest User" });
      }
      navigate({ to: "/dashboard" });
    }
    setBusy(false);
  };

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 city-grid">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,color-mix(in_oklab,var(--primary)_20%,transparent),transparent_35%)]" />
    <Link to="/" className="absolute left-5 top-5 z-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Home</Link>
    <section className="glass-panel relative z-10 grid w-full max-w-4xl overflow-hidden rounded-3xl lg:grid-cols-[1fr_1.1fr]">
      <div className="hidden bg-map p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"><Navigation className="-rotate-12" /></span><span className="font-display text-xl font-semibold">UrbanFlow</span></div>
        <div><p className="mb-3 text-xs font-bold uppercase tracking-[.2em] text-primary">Smart city navigation</p><h1 className="text-4xl font-semibold leading-tight">A faster, calmer way through the city.</h1><p className="mt-4 text-sm leading-6 opacity-70">Plan journeys with live traffic conditions, reliable arrival times, and proactive road alerts.</p></div>
        <div className="grid grid-cols-3 gap-3 text-center"><div><b className="block text-xl">24/7</b><small className="opacity-60">Live traffic</small></div><div><b className="block text-xl">87%</b><small className="opacity-60">City flow</small></div><div><b className="block text-xl">12 min</b><small className="opacity-60">Avg. trip</small></div></div>
      </div>
      <div className="p-6 sm:p-10 flex flex-col justify-center">
        <div className="mb-6"><p className="text-sm font-semibold text-primary">{mode === "register" ? "Create account" : mode === "forgot" ? "Account recovery" : "Welcome back"}</p><h2 className="mt-1 text-2xl font-bold">{mode === "register" ? "Start navigating smarter" : mode === "forgot" ? "Reset your password" : "Continue your journey"}</h2></div>
        {mode !== "forgot" && (
          <div className="flex flex-col gap-2.5 mb-5">
            <Button type="button" variant="hero" size="xl" className="w-full font-semibold shadow-lg" onClick={guest} disabled={busy}>Continue as Guest (Instant Access)</Button>
            <Button type="button" variant="outline" className="h-10 w-full text-xs" onClick={google} disabled={busy}>Continue with Google</Button>
          </div>
        )}
        <form className="space-y-3.5" onSubmit={submit}>
          {mode === "register" && <Input aria-label="Display name" placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />}
          <Input aria-label="Email" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required />
          {mode !== "forgot" && <div className="relative"><Input aria-label="Password" type={show ? "text" : "password"} placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={128} required /><button type="button" aria-label="Toggle password visibility" onClick={() => setShow(!show)} className="absolute right-3 top-2.5 text-muted-foreground">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div>}
          {message && <p role="status" className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{message}</p>}
          <Button variant="secondary" size="lg" className="w-full font-medium" disabled={busy}>{busy ? "Please wait…" : mode === "register" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}</Button>
        </form>
        <div className="mt-4 flex flex-wrap justify-between gap-3 text-xs"><button onClick={() => setMode(mode === "register" ? "login" : "register")} className="text-primary hover:underline">{mode === "register" ? "Already registered? Sign in" : "Create an account"}</button><button onClick={() => setMode(mode === "forgot" ? "login" : "forgot")} className="text-muted-foreground hover:text-foreground">{mode === "forgot" ? "Back to sign in" : "Forgot password?"}</button></div>
      </div>
    </section>

    {/* Simulated Google Accounts Selector Modal */}
    {showGooglePopup && (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-fade-in">
        <div className="glass-panel w-full max-w-sm rounded-2xl p-6 border border-border shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center space-y-2">
            <svg className="mx-auto size-8" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.67 0 3.17.58 4.35 1.71l3.25-3.25C17.65 1.58 15.01 1 12 1 7.24 1 3.2 3.73 1.24 7.72l3.87 3a6.978 6.978 0 0 1 6.89-5.68z"/>
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.43h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.39-4.88 3.39-8.48z"/>
              <path fill="#FBBC05" d="M5.11 10.72A6.902 6.902 0 0 1 5 12c0 .44.04.87.11 1.28l-3.87 3A11.96 11.96 0 0 1 1 12c0-1.6.31-3.13.88-4.54l4.23 3.26z"/>
              <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.31 1.09-4.3 1.09-3.79 0-7-2.56-8.14-6.02l-3.87 3C1.93 19.88 6.55 23 12 23z"/>
            </svg>
            <h3 className="font-semibold text-lg text-foreground">Sign in with Google</h3>
            <p className="text-xs text-muted-foreground">Select an account to proceed to UrbanFlow</p>
          </div>

          <div className="space-y-2">
            {[
              { name: "Teja Kiran", email: "tejakiran24@gmail.com" },
              { name: "Demo Navigator", email: "demo.navigator@gmail.com" }
            ].map((acc) => (
              <button
                key={acc.email}
                onClick={() => handleMockGoogleLogin(acc.name, acc.email)}
                disabled={busy}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 text-left transition-all cursor-pointer"
              >
                <div className="grid size-8 place-items-center rounded-full bg-primary/10 font-bold text-primary text-sm shrink-0">
                  {acc.name.charAt(0)}
                </div>
                <div className="min-w-0 text-xs">
                  <p className="font-semibold text-foreground truncate">{acc.name}</p>
                  <p className="text-muted-foreground truncate">{acc.email}</p>
                </div>
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            className="w-full text-xs"
            onClick={() => setShowGooglePopup(false)}
            disabled={busy}
          >
            Cancel
          </Button>
        </div>
      </div>
    )}
  </main>;
}