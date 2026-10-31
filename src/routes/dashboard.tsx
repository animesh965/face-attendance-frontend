import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/store/useAppStore";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    CalendarCheck,
    Cctv,
    Gauge,
    ScanFace,
    ShieldAlert,
    UserCheck,
    Users,
} from "lucide-react";
import { chartColors, chartGrid, chartAxis } from "@/lib/chart-colors";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { FaceScanScene } from "@/components/three/FaceScanScene";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { dashboardApi } from "@/api/dashboard";



export const Route = createFileRoute("/dashboard")({
    
beforeLoad: () => {
    const token = localStorage.getItem("access_token");
    const { authenticated, user } = useAppStore.getState();

    if (!token || !authenticated || !user) {
        throw redirect({ to: "/login" });
    }

    if (!user.permissions.includes("dashboard.read")) {
        throw redirect({ to: "/login" });
    }
},

    component: DashboardPage,
});

//     head: () => ({
//     meta: [
//         { title: "Dashboard — VertexFace AI" },
//         {
//         name: "description",
//         content:
//             "Real-time face recognition and attendance overview: live camera health, recognition accuracy and daily attendance analytics.",
//         },
//         { property: "og:title", content: "Dashboard — VertexFace AI" },
//         {
//         property: "og:description",
//         content: "Enterprise face recognition and attendance command center.",
//         },
//     ],
//     }),
//     component: DashboardPage,
// });


function DashboardPage() {
    const navigate = useNavigate();
const hasPermission = useAppStore((s) => s.hasPermission);

    const handleModuleNavigation = (
    path: "/analytics" | "/live",
    permission: string,
    moduleName: string,
    ) => {
    if (!hasPermission(permission)) {
        toast.error("Permission Denied", {
        description: `You do not have permission to access ${moduleName}.`,
        });
        return;
    }

    navigate({ to: path });
    };
    const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.get,
    });

    const events = dashboard?.recent_recognitions ?? [];
    const trend = dashboard?.attendance_trend ?? [];
    const perHour = dashboard?.recognitions_per_hour ?? [];
    const activity = dashboard?.recent_activity ?? [];
    const isLoading = dashboardLoading;

    return (
    <DashboardLayout
        title="Dashboard"
        description="Unified view of recognition throughput, camera health and workforce attendance."
        breadcrumbs={[{ label: "Dashboard" }]}
        actions={
        <>
            <Button
                variant="outline"
                onClick={() =>
                    handleModuleNavigation(
                    "/analytics",
                    "analytics.read",
                    "Analytics",
                    )
                }
                >
                View analytics
                </Button>

                <Button
                onClick={() =>
                    handleModuleNavigation(
                    "/live",
                    "live.read",
                    "Live Feed",
                    )
                }
                >
                <ScanFace className="mr-2 size-4" />
                Open live feed
                </Button>
        </>
        }
    >
        
<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <StatCard
    index={0}
    label="Today's Attendance"
    value={
        dashboardLoading
        ? "..."
        : `${dashboard?.summary.present_today ?? 0} / ${dashboard?.summary.total_users ?? 0}`
    }
    hint={`${dashboard?.summary.present_today ?? 0} present today`}
    icon={CalendarCheck}
    tone="success"
    />

    <StatCard
    index={1}
    label="Registered People"
    value={
        dashboardLoading
        ? "..."
        : String(dashboard?.summary.total_users ?? 0)
    }
    hint="Total registered users"
    icon={Users}
    />

    <StatCard
    index={2}
    label="Absent Today"
    value={
        dashboardLoading
        ? "..."
        : String(dashboard?.summary.absent_today ?? 0)
    }
    hint="Users absent today"
    icon={ShieldAlert}
    tone="warning"
    />

    <StatCard
    index={3}
    label="Checked In"
    value={
        dashboardLoading
        ? "..."
        : String(dashboard?.summary.checked_in ?? 0)
    }
    hint="Today's check-ins"
    icon={UserCheck}
    tone="success"
    />

    <StatCard
    index={4}
    label="Checked Out"
    value={
        dashboardLoading
        ? "..."
        : String(dashboard?.summary.checked_out ?? 0)
    }
    hint="Today's check-outs"
    icon={Cctv}
    />

    <StatCard
    index={5}
    label="Attendance Date"
    value={
        dashboardLoading
        ? "..."
        : dashboard?.date ?? "—"
    }
    hint="Dashboard date"
    icon={Gauge}
    />
</div>

        <div className="grid gap-4 lg:grid-cols-3">
        <Card className="glass-panel lg:col-span-2">
            <CardHeader>
            <CardTitle>Attendance Trend</CardTitle>
            <CardDescription>Present, late and absent counts for the last 7 days</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                <defs>
                    <linearGradient id="present" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors[0]} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={chartColors[0]} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                <XAxis dataKey="day" stroke={chartAxis} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={chartAxis} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                    contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    color: "var(--color-popover-foreground)",
                    }}
                />
                <Legend />
                <Area type="monotone" dataKey="present" stroke={chartColors[0]} fill="url(#present)" strokeWidth={2} />
                <Area type="monotone" dataKey="late" stroke={chartColors[2]} fill="transparent" strokeWidth={2} />
                <Area type="monotone" dataKey="absent" stroke="#e2556d" fill="transparent" strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
            </CardContent>
        </Card>

        <Card className="glass-panel relative overflow-hidden">
            <FaceScanScene className="pointer-events-none absolute inset-x-0 top-8 h-64 opacity-80" />
            <CardHeader className="relative">
            <CardTitle>Live Embedding Engine</CardTitle>
            <CardDescription>ArcFace R100 · 512-D vectors</CardDescription>
            </CardHeader>
            <CardContent className="relative mt-auto space-y-2 pt-40 text-sm">
            <Row label="Inference latency" value="43 ms" />
            <Row label="Vectors indexed" value="4,318" />
            <Row label="GPU utilisation" value="61%" />
            <Row label="Queue depth" value="0" />
            </CardContent>
        </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
        <Card className="glass-panel lg:col-span-2">
            <CardHeader>
            <CardTitle>Recognitions per Hour</CardTitle>
            <CardDescription>Recognized vs unknown detections</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perHour}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                <XAxis dataKey="hour" stroke={chartAxis} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={chartAxis} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                    cursor={{ fill: "var(--color-accent)", opacity: 0.3 }}
                    contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    }}
                />
                <Bar dataKey="recognized" fill={chartColors[0]} radius={[6, 6, 0, 0]} />
                <Bar dataKey="unknown" fill={chartColors[2]} radius={[6, 6, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
            </CardContent>
        </Card>

        <Card className="glass-panel">
            <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
            {activity.slice(0, 6).map((e, i) => (
                <motion.div
                key={e.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-xl border bg-background/50 p-3"
                >
                <span className="gradient-primary flex size-8 items-center justify-center rounded-lg text-xs font-semibold text-primary-foreground">
    {String(e.trackId ?? e.id ?? i + 1).slice(-2)}
</span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.name}</p>
                    <p className="text-xs text-muted-foreground">
                    {e.camera} · {e.time}
                    </p>
                </div>
                <StatusBadge status={e.status} />
                </motion.div>
            ))}
            </CardContent>
        </Card>
        </div>

        <Card className="glass-panel">
        <CardHeader>
            <CardTitle>Recent Recognitions List</CardTitle>
            <CardDescription>Live event stream from all connected cameras</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? (
            <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
                ))}
            </div>
            ) : (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Camera</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    </TableRow>-
                </TableHeader>
                <TableBody>
                    {events.slice(0, 10).map((e) => (
                    <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.name}</TableCell>
                        <TableCell className="text-muted-foreground">{e.camera}</TableCell>
                        <TableCell className="tabular-nums">{e.time}</TableCell>
                      <TableCell className="tabular-nums">{(e.confidence * 100).toFixed(1)}%</TableCell>
                        <TableCell className="text-right">
                        <StatusBadge status={e.status} />
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
            )}
        </CardContent>
        </Card>
    </DashboardLayout>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
    <div className="flex items-center justify-between rounded-lg border bg-background/50 px-3 py-2">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
    </div>
    );
}
