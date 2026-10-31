import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { authApi } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!token) { toast.error("Reset token is missing"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success("Password reset successfully. Please log in.");
      navigate({ to: "/login" });
    } catch (error: any) {
      toast.error("Password reset failed", { description: error?.response?.data?.detail || error.message });
    } finally { setLoading(false); }
  };

  return <div className="flex min-h-screen items-center justify-center bg-background p-4">
    <Card className="glass-panel w-full max-w-md">
      <CardHeader><CardTitle>Set a new password</CardTitle><CardDescription>Choose a new password for your attendance account.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2"><Label>New password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div className="space-y-2"><Label>Confirm password</Label><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
        <Button className="w-full" disabled={loading} onClick={submit}>{loading ? "Updating..." : "Reset password"}</Button>
      </CardContent>
    </Card>
  </div>;
}
