import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { motion } from "motion/react";
import { Eye, EyeOff, Loader2, Lock, Mail, ScanFace } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FaceScanScene } from "@/components/three/FaceScanScene";
import { useAppStore } from "@/store/useAppStore";
import { authApi } from "@/api/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — VertexFace AI Console" },
      {
        name: "description",
        content: "Secure operator sign-in for the VertexFace AI face recognition and attendance console.",
      },
      { property: "og:title", content: "Sign in — VertexFace AI Console" },
      { property: "og:description", content: "Secure operator access to the VertexFace AI console." },
    ],
  }),
  component: LoginPage,
});

interface FormValues {
  email: string;
  password: string;
}

function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const login = useAppStore((s) => s.login);
    useEffect(() => {
    if (sessionStorage.getItem("session_expired") === "true") {
      sessionStorage.removeItem("session_expired");

      toast.error("Session Expired", {
        description: "Your session has expired. Please log in again.",
        duration: 6000,
      });
    }
  }, []);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState } = useForm<FormValues>({
    defaultValues: { email: "", password: "" },
  });
const onSubmit = handleSubmit(async (values) => {
  setLoading(true);

  try {
    const res = await authApi.login({
      email: values.email,
      password: values.password,
    });

    // JWT Token Save
    localStorage.setItem("access_token", res.access_token);
    sessionStorage.removeItem("session_expired");

    // User Save
    localStorage.setItem("user", JSON.stringify(res.user));

    // Zustand Store Update
      login(res.user);

    toast.success("Login Successful", {
      description: `Welcome ${res.user.name}`,
    });

    navigate({ to: "/dashboard" });
  } catch (err: any) {
  console.error("Login error:", err);

  const detail = err?.response?.data?.detail;

  let message = "Invalid email or password";

  if (Array.isArray(detail)) {
    message = detail
      .map((item: any) => item?.msg)
      .filter(Boolean)
      .join(", ");
  } else if (typeof detail === "string") {
    message = detail;
  } else if (err?.response?.data?.message) {
    message = err.response.data.message;
  } else if (err?.response?.data?.error) {
    message = err.response.data.error;
  }

  toast.error("Login failed", {
    description: message,
  });
}
  finally {
    setLoading(false);
  }
});
  // const onSubmit = handleSubmit(async (values) => {
  //   setLoading(true);
  //   await new Promise((r) => setTimeout(r, 900));
  //   login(values.email);
  //   toast.success("Authenticated", { description: "Welcome back to VertexFace AI." });
  //   setLoading(false);
  //   navigate({ to: "/" });
  // });

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-sidebar lg:block">
        <FaceScanScene className="absolute inset-0" />
        <div className="relative flex h-full flex-col justify-between p-12 text-sidebar-foreground">
          <div className="flex items-center gap-3">
            <div className="gradient-primary flex size-10 items-center justify-center rounded-xl">
              <ScanFace className="size-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold">Face Recognition</p>
              <p className="text-xs text-sidebar-foreground/60">AI Attendance Suite</p>
            </div>
          </div>
          <div className="max-w-md">
            <h2 className="text-3xl font-semibold tracking-tight">
              Recognition-grade attendance at enterprise scale
            </h2>
            <p className="mt-3 text-sm text-sidebar-foreground/70">
              512-dimensional face embeddings, sub-50ms edge inference, and audit-ready attendance
              records across every camera in your estate.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-4 text-sm">
              {[
                ["97.4%", "Accuracy"],
                ["43 ms", "Latency"],
                ["1,482", "Enrolled"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3">
                  <p className="text-lg font-semibold">{v}</p>
                  <p className="text-xs text-sidebar-foreground/60">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-panel w-full max-w-sm rounded-2xl p-8"
        >
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="gradient-primary flex size-9 items-center justify-center rounded-xl">
              <ScanFace className="size-5 text-primary-foreground" />
            </div>
            <span className="font-semibold">Face Recognition</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your operator credentials to access the console.
          </p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" className="pl-9" placeholder="you@company.com" {...register("email", {
  required: "Email is required",
})} />
              </div>
            </div>
           
<div className="space-y-2">
  <Label htmlFor="password">Password</Label>

  <div className="relative">
    <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />

    <Input
      id="password"
      type={showPassword ? "text" : "password"}
      className="pl-9 pr-10"
      placeholder="••••••••"
      {...register("password", {
        required: "Password is required",
        minLength: {
          value: 8,
          message: "Password must be at least 8 characters",
        },
      })}
    />

    <button
      type="button"
      onClick={() => setShowPassword((prev) => !prev)}
      className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      aria-label={showPassword ? "Hide password" : "Show password"}
      aria-pressed={showPassword}
    >
      {showPassword ? (
        <EyeOff className="size-4" />
      ) : (
        <Eye className="size-4" />
      )}
    </button>
  </div>

  {formState.errors.password && (
    <p className="text-sm text-destructive">
      {formState.errors.password.message}
    </p>
  )}
</div>

          
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <Checkbox defaultChecked /> Remember me
              </label>
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => setForgotOpen(true)}
              >
                Forgot password?
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={loading || formState.isSubmitting}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Sign In
            </Button>
            {/* <div className="pt-2 text-center text-sm text-muted-foreground">
  Don't have an account?{" "}
  <button
    type="button"
    className="font-medium text-primary hover:underline"
    onClick={() => navigate({ to: "/signup" })}
  >
    Create account
  </button>
</div> */}
            {/* <Button
  type="button"
  variant="outline"
  className="w-full"
  onClick={() => navigate({ to: "/signup" })}
>
  Create an account
</Button> */}

          </form>
          <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Forgot password?</DialogTitle>
                <DialogDescription>Enter your registered email address. We will send you a secure password reset link.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Label htmlFor="forgot-email">Email address</Label>
                <Input id="forgot-email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@example.com" />
                <Button className="w-full" disabled={forgotLoading || !forgotEmail.includes("@")} onClick={async () => {
                  setForgotLoading(true);
                  try {
                    await authApi.forgotPassword(forgotEmail);
                    toast.success("If this account exists, a reset link has been sent.");
                    setForgotOpen(false);
                  } catch (error: any) {
                    toast.error("Unable to send reset link", { description: error?.response?.data?.detail || error.message });
                  } finally { setForgotLoading(false); }
                }}>{forgotLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Send reset link</Button>
              </div>
            </DialogContent>
          </Dialog>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            {/* Protected by SSO · SOC 2 Type II · ISO 27001 */}
            Powered by MSSPL VertexFace AI 2026 
          </p>
        </motion.div>
      </div>
    </div>
  );
}