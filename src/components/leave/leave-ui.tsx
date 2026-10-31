import type { ReactNode } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { format, parseISO } from "date-fns";
import {
  Award, Baby, BookOpen, Briefcase, CalendarDays, Check, ChevronLeft, ChevronRight, CircleHelp, Coffee,
  HeartPulse, Home, Minus, Plane, SearchX, Stethoscope, Sun, Umbrella, Clock, Ban,
} from "lucide-react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { LeaveStatus, ReportResult } from "@/api/leave";

export const LEAVE_ICONS = {
  calendar: CalendarDays, sun: Sun, heart: HeartPulse, stethoscope: Stethoscope, book: BookOpen, plane: Plane,
  baby: Baby, briefcase: Briefcase, coffee: Coffee, home: Home, clock: Clock, award: Award, umbrella: Umbrella, ban: Ban,
} as const;

export type LeaveIconName = keyof typeof LEAVE_ICONS;

export function LeaveTypeIcon({ icon, color, className }: { icon: string; color: string; className?: string }) {
  const Icon = LEAVE_ICONS[icon as LeaveIconName] ?? CalendarDays;
  return (
    <span
      className={cn("inline-flex size-11 items-center justify-center rounded-lg", className)}
      style={{ backgroundColor: `${color}22`, color }}
    >
      <Icon className="size-5" />
    </span>
  );
}

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Parse an API date/datetime. Server timestamps are UTC but may arrive without an offset. */
export function parseServerDate(value: string) {
  const naive = /T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value);
  return parseISO(naive ? `${value}Z` : value);
}

export function fmtDate(value?: string | null, pattern = "dd-MMM-yyyy") {
  if (!value) return "-";
  try {
    return format(parseServerDate(value), pattern);
  } catch {
    return value;
  }
}

export function fmtDateTime(value?: string | null) {
  return fmtDate(value, "dd-MMM-yyyy hh:mm a");
}

export function fmtDays(value?: number | null) {
  if (value === null || value === undefined) return "-";
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function isoDay(d: Date) {
  return format(d, "yyyy-MM-dd");
}

/** Pull the FastAPI `detail` message (string or validation list) out of an axios error. */
export function errorText(error: unknown, fallback = "Something went wrong") {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((d: { msg?: string }) => (d.msg ?? "").replace(/^Value error, /, "")).join("; ");
    }
    if (error.response?.status === 403) return "You do not have permission to do this";
  }
  return error instanceof Error ? error.message : fallback;
}

const STATUS_STYLE: Record<LeaveStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  rejected: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
  cancelled: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30",
  cancellation_pending: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30",
};

export const STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  cancellation_pending: "Cancellation Pending",
};

export function StatusBadge({ status }: { status: LeaveStatus }) {
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap font-medium", STATUS_STYLE[status])}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

export function EmptyState({ title = "No Data Found", description, action }: { title?: string | undefined; description?: string | undefined; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
      <div className="relative">
        <div className="flex size-24 items-center justify-center rounded-full bg-navy/10">
          <SearchX className="size-10 text-navy/70" />
        </div>
        <span className="absolute -top-1 right-1 size-2 rounded-full bg-navy/30" />
        <span className="absolute bottom-2 -left-2 size-1.5 rounded-full bg-navy/30" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function HelpButton({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="gap-2 bg-navy text-navy-foreground hover:bg-navy/90">
          <CircleHelp className="size-4" /> Help
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 text-sm">
        <p className="mb-2 font-semibold">{title}</p>
        <div className="space-y-2 text-muted-foreground">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

export function PageTitle({ icon, title, subtitle, actions }: { icon?: ReactNode; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon && <span className="text-navy">{icon}</span>}
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Checkbox that can show a third "mixed" state (used by Check All and multi-selection mapping). */
export function TriCheckbox({
  checked, onCheckedChange, disabled, className, id, ...rest
}: {
  checked: boolean | "indeterminate";
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}) {
  return (
    <CheckboxPrimitive.Root
      id={id}
      checked={checked}
      disabled={disabled}
      onCheckedChange={(v) => onCheckedChange(v === true)}
      aria-label={rest["aria-label"]}
      className={cn(
        "peer grid size-[18px] shrink-0 cursor-pointer place-content-center rounded-[4px] border border-slate-400 bg-background shadow-sm",
        "focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-navy data-[state=checked]:bg-navy data-[state=checked]:text-navy-foreground",
        "data-[state=indeterminate]:border-navy data-[state=indeterminate]:bg-navy data-[state=indeterminate]:text-navy-foreground",
        className,
      )}
    >
      <CheckboxPrimitive.Indicator className="grid place-content-center">
        {checked === "indeterminate" ? <Minus className="size-3.5" /> : <Check className="size-3.5" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between gap-2 border-t px-4 py-3 text-sm text-muted-foreground">
      <span>
        {from}-{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="px-2">
          Page {page} of {pages}
        </span>
        <Button variant="outline" size="icon" className="size-8" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function MiniStat({ label, value, tone = "default", onClick, active }: {
  label: string; value: number | string; tone?: "default" | "pending" | "approved" | "rejected" | "info"; onClick?: () => void; active?: boolean;
}) {
  const tones = {
    default: "text-navy",
    pending: "text-amber-600",
    approved: "text-emerald-600",
    rejected: "text-rose-600",
    info: "text-sky-600",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "rounded-xl border bg-card p-4 text-left shadow-sm transition-colors enabled:hover:border-navy/50",
        active && "border-navy ring-1 ring-navy/30",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold", tones[tone])}>{value}</p>
    </button>
  );
}

// ---- export helpers -------------------------------------------------------------

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function saveBlob(blob: Blob, filename: string) {
  download(blob, filename);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Excel-compatible export (CSV with a UTF-8 BOM so Excel detects the encoding). */
export function exportExcel(report: ReportResult) {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Neutralise spreadsheet formula injection from user-entered text.
    const safe = /^[=+\-@]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const lines = [report.columns.map((c) => esc(c.label)).join(",")];
  for (const row of report.rows) lines.push(report.columns.map((c) => esc(row[c.key])).join(","));
  download(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), `${slug(report.title)}.csv`);
}

export function exportPdf(report: ReportResult) {
  const doc = new jsPDF({ orientation: report.columns.length > 6 ? "landscape" : "portrait" });
  doc.setFontSize(14);
  doc.text(report.title, 14, 16);
  doc.setFontSize(9);
  doc.text(`Generated ${format(new Date(), "dd-MMM-yyyy hh:mm a")}`, 14, 22);
  autoTable(doc, {
    startY: 27,
    head: [report.columns.map((c) => c.label)],
    body: report.rows.map((r) => report.columns.map((c) => String(r[c.key] ?? ""))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [52, 72, 154] },
  });
  doc.save(`${slug(report.title)}.pdf`);
}
