import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";

export function AttendanceStatisticsChart({ data }: { data: { day: string; present: number }[] }) {
    return (
        <Card className="h-full rounded-2xl border-border/70 p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">Daily Attendance Statistics</h2>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            Present
            </span>
        </div>
        <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                interval={0}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            />
            <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                cursor={{ fill: "var(--muted)" }}
                contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                }}
                labelFormatter={(l) => `Day ${l}`}
                />
                <Bar dataKey="present" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={18} />
            </BarChart>
            </ResponsiveContainer>
        </div>
        </Card>
    );
    }

export function AttendanceRatioRing({ value }: { value: number }) {
    const r = 54;
    const c = 2 * Math.PI * r;
    return (
        <Card className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border-border/70 p-6 shadow-sm">
        <div className="relative h-36 w-36">
            <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
            <circle cx="70" cy="70" r={r} fill="none" stroke="var(--muted)" strokeWidth="12" />
            <circle
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke="var(--chart-4)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - value / 100)}
            />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-semibold tracking-tight">{value}%</span>
            </div>
        </div>
        <p className="text-sm text-muted-foreground">Attendance Ratio</p>
        </Card>
    );
    }
