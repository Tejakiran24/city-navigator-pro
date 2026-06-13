import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reset-password")({ component: ResetPassword });
function ResetPassword() {
  const navigate = useNavigate(); const [password, setPassword] = useState(""); const [message, setMessage] = useState("");
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!window.location.hash.includes("type=recovery")) { setMessage("This recovery link is invalid or expired."); return; } const { error } = await supabase.auth.updateUser({ password }); if (error) setMessage(error.message); else navigate({ to: "/dashboard" }); };
  return <main className="grid min-h-screen place-items-center bg-background p-4 city-grid"><form onSubmit={submit} className="glass-panel w-full max-w-md space-y-5 rounded-3xl p-8"><h1 className="text-3xl font-semibold">Set a new password</h1><p className="text-sm text-muted-foreground">Choose at least eight characters.</p><Input type="password" minLength={8} maxLength={128} required value={password} onChange={(e) => setPassword(e.target.value)} />{message && <p className="text-sm text-danger">{message}</p>}<Button variant="hero" size="xl" className="w-full">Update password</Button></form></main>;
}