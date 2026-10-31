import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, FileDown, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { leaveAdminApi, leaveApi } from "@/api/leave";
import { FilterSelect } from "@/components/leave/FilterSelect";
import { useFilterOptions } from "@/components/leave/useFilterOptions";
import { EmptyState, PageTitle, errorText, exportExcel, exportPdf } from "@/components/leave/leave-ui";

export const Route = createFileRoute("/leave/admin/reports")({
  head: () => ({ meta: [{ title: "Leave Reports" }] }),
  component: ReportsPage,
});

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  .map((name, i) => ({ id: String(i + 1), name }));

function ReportsPage() {
  const settingsQ = useQuery({ queryKey: ["leave", "settings"], queryFn: leaveApi.settings });
  const catalogQ = useQuery({ queryKey: ["leave-admin", "report-catalog"], queryFn: leaveAdminApi.reportCatalog });
  const options = useFilterOptions();
  const [kind, setKind] = useState("employee-summary");
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<string | undefined>();
  const [employeeType, setEmployeeType] = useState<string | undefined>();
  const [department, setDepartment] = useState<string | undefined>();
  const [leaveType, setLeaveType] = useState<string | undefined>();
  const y = year ?? settingsQ.data?.current_year ?? new Date().getFullYear();
  const params = { year: y, month: month ? Number(month) : undefined, employee_type_id: employeeType, department_id: department, leave_type_id: leaveType };
  const q = useQuery({ queryKey: ["leave-admin", "report", kind, params], queryFn: () => leaveAdminApi.report(kind, params), enabled: !!settingsQ.data });

  return (
    <div className="space-y-4">
      <PageTitle icon={<BarChart3 className="size-6" />} title="Leave Reports" subtitle="Run a report, refine it with filters and export it to Excel or PDF."
        actions={q.data && (
          <div className="flex gap-2">
            <Button variant="outline" disabled={!q.data.rows.length} onClick={() => exportExcel(q.data)}><FileSpreadsheet className="size-4" /> Excel</Button>
            <Button variant="outline" disabled={!q.data.rows.length} onClick={() => exportPdf(q.data)}><FileDown className="size-4" /> PDF</Button>
          </div>
        )} />
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <nav className="h-fit rounded-xl border bg-card p-2 shadow-sm">
          {(catalogQ.data ?? []).map((r) => (
            <button key={r.kind} type="button" onClick={() => setKind(r.kind)}
              className={cn("block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted", kind === r.kind && "bg-navy text-navy-foreground hover:bg-navy/90")}>
              {r.title}
            </button>
          ))}
        </nav>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Leave year</Label>
              <Input type="number" min={2000} max={2100} value={y} onChange={(e) => setYear(Number(e.target.value) || y)} className="w-28" />
            </div>
            {kind === "monthly" && <FilterSelect label="Month" value={month} onChange={setMonth} options={MONTHS} allLabel="All months" className="w-36" />}
            <FilterSelect label="Employee type" value={employeeType} onChange={setEmployeeType} options={options.employeeTypes} allLabel="All types" />
            <FilterSelect label="Department" value={department} onChange={setDepartment} options={options.departments} allLabel="All departments" />
            <FilterSelect label="Leave type" value={leaveType} onChange={setLeaveType} options={options.leaveTypes} allLabel="All leave types" />
          </div>
          <div className="rounded-xl border bg-card shadow-sm">
            {q.isLoading || settingsQ.isLoading ? <Loader2 className="mx-auto my-10 size-5 animate-spin" />
              : q.isError ? <EmptyState title="Could not run report" description={errorText(q.error)} />
              : !q.data?.rows.length ? <EmptyState title="No data for these filters" />
              : (
                <>
                  <p className="border-b px-4 py-3 text-sm font-semibold">{q.data.title} <span className="font-normal text-muted-foreground">({q.data.rows.length} rows)</span></p>
                  <div className="max-h-[640px] overflow-auto">
                    <Table>
                      <TableHeader><TableRow>{q.data.columns.map((c) => <TableHead key={c.key} className="whitespace-nowrap">{c.label}</TableHead>)}</TableRow></TableHeader>
                      <TableBody>
                        {q.data.rows.map((row, i) => (
                          <TableRow key={i}>{q.data.columns.map((c) => <TableCell key={c.key} className="whitespace-nowrap">{row[c.key] ?? ""}</TableCell>)}</TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
