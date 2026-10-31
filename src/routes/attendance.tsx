import { useMemo, useRef, useState } from "react";
import { createFileRoute , redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, FileText, RefreshCw, Search, Sheet as SheetIcon } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { attendanceApi } from "@/api/attendance";
import AttendanceRecord, { type AttendanceRecordRef, } from "./AttendanceRecord";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/attendance")({
  
beforeLoad: () => {
  const token = localStorage.getItem("access_token");
  const { authenticated, user } = useAppStore.getState();

  if (!token || !authenticated || !user) {
    throw redirect({ to: "/login" });
  }

  if (!user.permissions.includes("attendance.read")) {
    throw redirect({ to: "/dashboard" });
  }
},


  head: () => ({
    meta: [
      { title: "Attendance Records — VertexFace AI" },
      {
        name: "description",
        content:
          "Audit-ready attendance records with check-in, check-out, working hours, filters and CSV, Excel and PDF export.",
      },
      {
        property: "og:title",
        content: "Attendance Records — VertexFace AI",
      },
      {
        property: "og:description",
        content: "Audit-ready attendance logs with export options.",
      },
    ],
  }),

  component: AttendancePage,
});


function AttendancePage() {
  const [activeTab, setActiveTab] = useState<"ledger" | "record">(() => {
  const tab = new URLSearchParams(window.location.search).get("tab");

  return tab === "record" ? "record" : "ledger";
});
 const recordPdfRef = useRef<AttendanceRecordRef>(null);
  const { data, isLoading } = useQuery({ queryKey: ["attendance"], queryFn: () => attendanceApi.list() });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const [dateFrom, setDateFrom] = useState(getTodayDate);
const [dateTo, setDateTo] = useState(getTodayDate);
  const [page, setPage] = useState(1);
  const PAGE = 10;
const formatTime = (dateTime: string | null | undefined) => {
  if (!dateTime) return "-";

  const date = new Date(dateTime);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

  
const attendanceData = Array.isArray(data) ? data : [];

const filtered = useMemo(
  () =>
    attendanceData.filter((r) => {
    const recordDate = String(r.date ?? "").slice(0, 10);

      const employeeName = (r.employee ?? "").toLowerCase();

      const matchesDate =
        recordDate !== "" &&
        recordDate >= dateFrom &&
        recordDate <= dateTo;

      const matchesStatus =
        status === "all" ||
        (r.status ?? "").toLowerCase() === status;

      const matchesEmployee =
        employeeName.includes(query.toLowerCase());

      return matchesDate && matchesStatus && matchesEmployee;
    }),
  [attendanceData, query, status, dateFrom, dateTo],
);


  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const rows = filtered.slice((page - 1) * PAGE, page * PAGE);

  const exportAs = (kind: string) => {
  if (kind === "PDF") {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Attendance Records", 14, 20);

    doc.setFontSize(10);
    doc.text(
      `Total Records: ${filtered.length}`,
      14,
      28,
    );

    autoTable(doc, {
      startY: 35,

      head: [[
        "Employee",
        "Employee ID",
        "Department",
        "Date",
        "Check In",
        "Check Out",
        "Working Hours",
        "Status",
      ]],

      body: filtered.map((r) => [
        r.employee,
        r.employeeId,
        r.department,
        r.date,

        // Only HH:MM in PDF
        formatTime(r.checkIn),
        formatTime(r.checkOut),

        r.workingHours,
        r.status,
      ]),

      styles: {
        fontSize: 8,
      },

      headStyles: {
        fillColor: [37, 99, 235],
      },
    });

    doc.save("attendance-records.pdf");

    toast.success(
      "PDF downloaded successfully",
    );

    return;
  }

  toast.success(
    `Exporting ${filtered.length} records`,
    {
      description: `${kind} generation started.`,
    },
  );
};



  return (
    <DashboardLayout
      title="Attendance"
      description="Consolidated check-in and check-out ledger generated from recognition events."
      breadcrumbs={[{ label: "Attendance" }]}
      actions={
  <>
    {/* Attendance Tabs */}
    <div className="ml-2 flex items-center rounded-lg border bg-muted p-1">
      <button
        onClick={() => {
          setActiveTab("ledger");
          window.history.replaceState(
            null,
            "",
            "/attendance?tab=ledger",
          );
        }}
        className={`rounded-md px-4 py-2 text-sm font-medium transition ${
          activeTab === "ledger"
            ? "bg-background text-primary shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Ledger
      </button>

      <button
        onClick={() => {
          setActiveTab("record");
          window.history.replaceState(
            null,
            "",
            "/attendance?tab=record",
          );
        }}
        className={`rounded-md px-4 py-2 text-sm font-medium transition ${
          activeTab === "record"
            ? "bg-background text-primary shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Record
      </button>
    </div>

    {/* Action Buttons */}
    <div className="flex items-center gap-2">
      {/* Refresh */}
      <Button
        variant="outline"
        onClick={() => window.location.reload()}
      >
        <RefreshCw className="mr-2 size-4" />
        Refresh
      </Button>

      {/* Excel */}
      {/* <Button
        variant="outline"
        onClick={() => exportAs("Excel")}
      >
        <SheetIcon className="mr-2 size-4" />
        Excel
      </Button> */}

      {/* PDF */}
      {activeTab === "ledger" ? (
        <Button onClick={() => exportAs("PDF")}>
          <FileSpreadsheet className="mr-2 size-4" />
          PDF
        </Button>
      ) : (
        <Button
          onClick={() => {
            recordPdfRef.current?.exportPDF();
          }}
        >
          <FileSpreadsheet className="mr-2 size-4" />
          PDF
        </Button>
      )}
    </div>
  </>
}

    >
      {/* <div className="mb-4 flex rounded-lg border bg-muted p-1 w-fit">
  <button
    onClick={() => setActiveTab("ledger")}
    className={`px-4 py-2 rounded-md text-sm font-medium transition ${
      activeTab === "ledger"
        ? "bg-white shadow text-primary"
        : "text-muted-foreground"
    }`}
  >
    Ledger
  </button>

  <button
    onClick={() => setActiveTab("record")}
    className={`px-4 py-2 rounded-md text-sm font-medium transition ${
      activeTab === "record"
        ? "bg-white shadow text-primary"
        : "text-muted-foreground"
    }`}
  >
    Record
  </button>
</div> */}
{activeTab === "ledger" ? (
  <Card className="glass-panel">
    <CardContent className="space-y-4 pt-6">
      <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search employee"
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["all", "present", "late", "absent", "half-day"].map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s === "all" ? "All statuses" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          <Input
  type="date"
  value={dateFrom}
  max={dateTo}
  onChange={(e) => {
    setDateFrom(e.target.value);
    setPage(1);
  }}
  className="w-full sm:w-[170px]"
  aria-label="Date From"
/>

<Input
  type="date"
  value={dateTo}
  min={dateFrom}
  onChange={(e) => {
    setDateTo(e.target.value);
    setPage(1);
  }}
  className="w-full sm:w-[170px]"
  aria-label="Date To"
/>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="hidden md:table-cell">Department</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Working Hours</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <p className="font-medium">{r.employee}</p>
                        <p className="font-mono text-xs text-muted-foreground">{r.employeeId}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{r.department}</TableCell>
                      <TableCell className="tabular-nums">{r.date}</TableCell>
                      <TableCell className="tabular-nums">{formatTime(r.checkIn)}</TableCell>
                      <TableCell className="tabular-nums">{formatTime(r.checkOut)}</TableCell>
                      <TableCell className="tabular-nums">{r.workingHours}</TableCell>
                      <TableCell className="text-right">
                        <StatusBadge status={r.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">{filtered.length} records</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="tabular-nums">
                {page} / {pages}
              </span>
              <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
    </CardContent>
  </Card>
) : (
  <AttendanceRecord ref={recordPdfRef} />
)}
      
    </DashboardLayout>
  );
}