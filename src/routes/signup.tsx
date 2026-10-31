import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Eye, EyeOff, Loader2, UserPlus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/api/auth";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Apni API ka signup endpoint yahan daalo


const signupSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(100),
    email: z.string().trim().email("Invalid email address").max(255),
    password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

export const Route = createFileRoute("/signup")({
    head: () => ({
    meta: [
        { title: "User Creation - VertexFace AI" },
        // { title: "Sign Up - HR Settings" },
        { name: "description", content: "Create a new account" },
        { property: "og:title", content: "Sign Up - HR Settings" },
        { property: "og:description", content: "Create a new account" },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
    ],
    }),
    component: SignupPage,
});

function SignupPage() 
{
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [submitting, setSubmitting] = useState(false);
const handleReset = () => {
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setErrors({});
};
    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = signupSchema.safeParse({
    name,
    email,
    password,
    });

    if (!result.success) {
    const fieldErrors: FieldErrors = {};

    for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;

        if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
        }
    }

    setErrors(fieldErrors);
    return;
    }

    setSubmitting(true);

    try {
    const res = await authApi.signup({
        name: result.data.name,
        email: result.data.email,
        password: result.data.password,
    });

    console.log("Signup response:", res);

    toast.success("Account created successfully!", {
        description: "Your account has been created. Please sign in.",
    });

    // Clear form
    setName("");
    setEmail("");
    setPassword("");

    // Signup ke baad login page
    navigate({to: "/login",
    });
    } catch (err: any) {
    console.error("Signup error:", err);

    const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Unable to create account. Please try again.";

    toast.error("Signup failed", {
        description: message,
    });
    } finally {
    setSubmitting(false);
    }
};

        return (
    <DashboardLayout
        title="User Creation"
        description="Create and manage users"
        breadcrumbs={[{ label: "User Creation" }]}
    >
        <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            User Creation
            </CardTitle>

            <CardDescription>
            Enter the user details below to create an account.
            </CardDescription>
        </CardHeader>

        <CardContent>
            <form
            onSubmit={handleSubmit}
            className="grid gap-6 sm:grid-cols-2"
            noValidate
            >
            {/* Name */}
            <div className="grid gap-2">
                <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
                </Label>

                <Input
                id="name"
                placeholder="Enter full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!errors.name}
                />

                {errors.name && (
                <p className="text-xs text-destructive">
                    {errors.name}
                </p>
                )}
            </div>

            {/* Email */}
            <div className="grid gap-2">
                <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
                </Label>

                <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
                />

                {errors.email && (
                <p className="text-xs text-destructive">
                    {errors.email}
                </p>
                )}
            </div>

            {/* Password - Eye button unchanged */}
            <div className="grid gap-2">
                <Label htmlFor="password">
                Password <span className="text-destructive">*</span>
                </Label>

                <div className="relative">
                <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!errors.password}
                    className="pr-10"
                />
                

                <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                >
                    {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                    ) : (
                    <Eye className="h-5 w-5" />
                    )}
                </button>
                </div>

                {errors.password && (
                <p className="text-xs text-destructive">
                    {errors.password}
                </p>
                )}
            </div>

            {/* Save and Reset */}
            <div className="flex flex-wrap gap-3 sm:col-span-2">
                <Button type="submit" disabled={submitting}>
                {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {submitting ? "Saving..." : "Save"}
                </Button>

                <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => {
                    setName("");
                    setEmail("");
                    setPassword("");
                    setShowPassword(false);
                    setErrors({});
                }}
                >
                Reset
                </Button>
            </div>
            </form>
        </CardContent>
        </Card>
    </DashboardLayout>
    );
}