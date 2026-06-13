import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, MapPinned } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — CityNav" }, { name: "description", content: "Sign in to save routes, receive alerts, and access smart traffic analytics." }, { property: "og:title", content: "Sign in — CityNav" }, { property: "og:description", content: "Access smart traffic navigation and graph-powered routing." }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [show, setShow] = useState(false);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
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
  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/dashboard`, extraParams: { prompt: "select_account" } });
    if (result.error) setMessage(result.error.message); else if (!result.redirected) navigate({ to: "/dashboard" });
  };
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 city-grid">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,color-mix(in_oklab,var(--primary)_20%,transparent),transparent_35%)]" />
    <Link to="/" className="absolute left-5 top-5 z-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Home</Link>
    <section className="glass-panel relative z-10 grid w-full max-w-4xl overflow-hidden rounded-3xl lg:grid-cols-[1fr_1.1fr]">
      <div className="hidden bg-map p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><MapPinned /></span><span className="font-display text-xl font-semibold">CityNav</span></div>
        <div><p className="mb-3 text-xs font-bold uppercase tracking-[.2em] text-primary">Graph intelligence</p><h1 className="text-4xl font-semibold leading-tight">Every road is an edge. Every decision, optimized.</h1><p className="mt-4 text-sm leading-6 opacity-70">Compare Dijkstra, A*, BFS and DFS on a live weighted city graph.</p></div>
        <div className="grid grid-cols-3 gap-3 text-center"><div><b className="block text-xl">12</b><small className="opacity-60">Nodes</small></div><div><b className="block text-xl">19</b><small className="opacity-60">Edges</small></div><div><b className="block text-xl">4</b><small className="opacity-60">Algorithms</small></div></div>
      </div>
      <div className="p-6 sm:p-10">
        <div className="mb-8"><p className="text-sm font-semibold text-primary">{mode === "register" ? "Create account" : mode === "forgot" ? "Account recovery" : "Welcome back"}</p><h2 className="mt-1 text-3xl font-semibold">{mode === "register" ? "Join the network" : mode === "forgot" ? "Reset your password" : "Enter the control center"}</h2></div>
        {mode !== "forgot" && <Button type="button" variant="glass" className="mb-5 h-11 w-full" onClick={google}>Continue with Google</Button>}
        <form className="space-y-4" onSubmit={submit}>
          {mode === "register" && <Input aria-label="Display name" placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />}
          <Input aria-label="Email" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required />
          {mode !== "forgot" && <div className="relative"><Input aria-label="Password" type={show ? "text" : "password"} placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={128} required /><button type="button" aria-label="Toggle password visibility" onClick={() => setShow(!show)} className="absolute right-3 top-2.5 text-muted-foreground">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div>}
          {message && <p role="status" className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}
          <Button variant="hero" size="xl" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "register" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}</Button>
        </form>
        <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm"><button onClick={() => setMode(mode === "register" ? "login" : "register")} className="text-primary hover:underline">{mode === "register" ? "Already registered? Sign in" : "Create an account"}</button><button onClick={() => setMode(mode === "forgot" ? "login" : "forgot")} className="text-muted-foreground hover:text-foreground">{mode === "forgot" ? "Back to sign in" : "Forgot password?"}</button></div>
      </div>
    </section>
  </main>;
}