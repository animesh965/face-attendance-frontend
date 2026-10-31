import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartColors, chartGrid, chartAxis } from "@/lib/chart-colors";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { attendanceApi } from "@/api/attendance";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — VertexFace AI" },
      {
        name: "description",
        content: "Recognition accuracy trends, department attendance comparison, peak-hour heatmap and identity distribution analytics.",
      },
      { property: "og:title", content: "Analytics — VertexFace AI" },
      { property: "og:description", content: "Recognition accuracy, peak hours and department analytics." },
    ],
  }),
  component: AnalyticsPage,
});

const CHART = [chartColors[0], chartColors[1], chartColors[2], chartColors[3], chartColors[4]];
const HOURS = ["07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Deterministic pseudo-random so SSR and client render identical values.
const seeded = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

function AnalyticsPage() {
  const { data } = useQuery({ queryKey: ["attendance"], queryFn: () => attendanceApi.list() });

  const departments = Object.entries(
    (data ?? []).reduce<Record<string, number>>((acc, r) => {
      acc[r.department] = (acc[r.department] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const accuracy = Array.from({ length: 14 }, (_, i) => ({
    day: `D${i + 1}`,
    accuracy: 94 + Math.round(Math.sin(i / 2) * 3 + seeded(i) * 2),
    falsePositives: Math.max(0, 6 - Math.round(seeded(i + 50) * 4)),
  }));

  const weekly = DAYS.map((d, i) => ({
    day: d,
    present: 120 + Math.round(Math.cos(i) * 18 + seeded(i + 7) * 12),
    late: 10 + Math.round(seeded(i + 21) * 12),
  }));

  const heat = DAYS.flatMap((d, di) =>
    HOURS.map((h, hi) => ({
      day: d,
      hour: h,
      value: Math.max(0, Math.round(60 * Math.exp(-((hi - 2) ** 2) / 6) + 30 * Math.exp(-((hi - 10) ** 2) / 5) - di * 3 + seeded(di * 13 + hi) * 10)),
    })),
  );
  const maxHeat = Math.max(...heat.map((h) => h.value));

  return (
    <DashboardLayout
      title="Analytics"
      description="Recognition performance, attendance behaviour and traffic distribution across the deployment."
      breadcrumbs={[{ label: "Analytics" }]}
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Recognition Accuracy</CardTitle>
            <CardDescription>Match confidence vs false positives over 14 days</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={accuracy}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="day" stroke={chartAxis} fontSize={12} />
                <YAxis stroke={chartAxis} fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Legend />
                <Line type="monotone" dataKey="accuracy" stroke={chartColors[0]} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="falsePositives" stroke={chartColors[4]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Department Comparison</CardTitle>
            <CardDescription>Attendance events recorded per department</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departments}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="name" stroke={chartAxis} fontSize={11} />
                <YAxis stroke={chartAxis} fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} fill={chartColors[0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Weekly Attendance Trend</CardTitle>
            <CardDescription>Present vs late arrivals</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekly}>
                <defs>
                  <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors[0]} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={chartColors[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="day" stroke={chartAxis} fontSize={12} />
                <YAxis stroke={chartAxis} fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="present" stroke={chartColors[0]} fill="url(#presentGrad)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="late" stroke={chartColors[3]} fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Identity Distribution</CardTitle>
            <CardDescription>Share of recognitions by department</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={departments} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>
                  {departments.map((_, i) => (
                    <Cell key={i} fill={CHART[i % CHART.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Peak Hours Heatmap</CardTitle>
          <CardDescription>Recognition volume by day and hour</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="mb-2 grid grid-cols-[52px_repeat(12,minmax(0,1fr))] gap-1 text-[11px] text-muted-foreground">
              <span />
              {HOURS.map((h) => (
                <span key={h} className="text-center">
                  {h}
                </span>
              ))}
            </div>
            {DAYS.map((d) => (
              <div key={d} className="mb-1 grid grid-cols-[52px_repeat(12,minmax(0,1fr))] items-center gap-1">
                <span className="text-xs text-muted-foreground">{d}</span>
                {HOURS.map((h) => {
                  const cell = heat.find((x) => x.day === d && x.hour === h)!;
                  return (
                    <div
                      key={h}
                      title={`${d} ${h}:00 — ${cell.value} events`}
                      className="h-8 rounded-md border border-border/40"
                      style={{ background: `color-mix(in oklab, var(--primary) ${(cell.value / maxHeat) * 100}%, transparent)` }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}