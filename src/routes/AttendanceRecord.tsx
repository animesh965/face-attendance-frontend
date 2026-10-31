import { forwardRef, useImperativeHandle, useMemo, useState, } from "react";
    import { useQuery } from "@tanstack/react-query";

    import { attendanceApi } from "@/api/attendance";

    import { AttendanceSummary } from "@/routes/attsummary";
    import {
    AttendanceRatioRing,
    AttendanceStatisticsChart,
    } from "@/routes/Attcharts";
    import { AttendanceEmployeePanel } from "@/routes/AttendanceEmployeePanel";
    import { AttendanceRecordTable } from "@/routes/attrecordtable";
import { toast } from "sonner";

    import type {
    DayCode,
    RecordEmployee,
    } from "@/lib/attendance-data";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";

export type AttendanceRecordRef = {
    exportPDF: () => void;
};
    // ============================================================
    // API RESPONSE TYPE
    // ============================================================

    type ApiAttendanceRecord = {
    id: string;
    employee: string;
    employeeId: string;
    department?: string;
    date: string;

    checkIn?: string | null;
    checkOut?: string | null;

    workingHours?: string;

    status?: string | null;

    currentState?: string;
    lastAction?: string;
    };


    // ============================================================
    // MONTHS
    // ============================================================

    const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
    ];


    // ============================================================
    // API STATUS -> P/A/SL/CL/H
    // ============================================================

    function getStatusCode(
    status?: string | null,
    ): DayCode {
    switch (
        status?.trim().toLowerCase()
    ) {
        case "present":
        case "p":
        return "P";

        case "absent":
        case "a":
        return "A";

        case "holiday":
        case "h":
        return "H";

        case "sick leave":
        case "sick-leave":
        case "sick_leave":
        case "sickleave":
        case "sl":
        return "SL";

        case "casual leave":
        case "casual-leave":
        case "casual_leave":
        case "casualleave":
        case "cl":
        return "CL";

        case "half-day":
        // Tumhare current Record table mein
        // half-day ka separate code nahi hai.
        // Isliye half-day ko present treat kar rahe hain.
        return "P";

        case "week-off":
        return "H";

        default:
        return "A";
    }
    }


    // ============================================================
    // ATTENDANCE RECORD COMPONENT
    // ============================================================

    const AttendanceRecord = forwardRef<AttendanceRecordRef>(
  function AttendanceRecord(_, ref) {
    const [year, setYear] = useState("2026");

    const [month, setMonth] =
        useState("September");

    const [employeeId, setEmployeeId] =
        useState("");


    // ==========================================================
    // API
    // ==========================================================

    const {
        data: apiData,
        isLoading,
        isError,
        refetch,
    } = useQuery<ApiAttendanceRecord[]>({
        queryKey: ["attendance"],

        queryFn: async () => {
        const response =
            await attendanceApi.list();

        return Array.isArray(response)
            ? response
            : [];
        },
    });


    const attendanceData =
        apiData ?? [];


    // ==========================================================
    // SELECTED MONTH
    // ==========================================================

    const monthNumber =
        MONTHS.indexOf(month) + 1;


    const monthRecords =
        useMemo(() => {
        return attendanceData.filter(
            (record) => {
            if (!record.date) {
                return false;
            }

            const dateOnly =
                record.date.split("T")[0] ?? "";

            const parts =
                dateOnly.split("-");

            const recordYear =
                Number(parts[0] ?? 0);

            const recordMonth =
                Number(parts[1] ?? 0);

            return (
                recordYear === Number(year) &&
                recordMonth === monthNumber
            );
            },
        );
        }, [
        attendanceData,
        year,
        monthNumber,
        ]);

const daysInSelectedMonth = useMemo(() => {
    return new Date(
        Number(year),
        monthNumber,
        0,
    ).getDate();
}, [year, monthNumber]);
    // ==========================================================
    // API -> RecordEmployee[]
    // ==========================================================

    const recordEmployees =
        useMemo<RecordEmployee[]>(() => {
        const employeeMap =
            new Map<string, RecordEmployee>();


        for (
            const record of monthRecords
        ) {
            if (!record.employeeId) {
            continue;
            }


            // ----------------------------------------------------
            // Create employee
            // ----------------------------------------------------

            if (
            !employeeMap.has(
                record.employeeId,
            )
            ) {
            employeeMap.set(
                record.employeeId,
                {
                id: record.employeeId,

                code: record.employeeId,

                name:
                    record.employee ||
                    record.employeeId,

                department:
                    record.department ||
                    "-",

                // EXACTLY 31 DAYS
                days:
        Array(daysInSelectedMonth).fill("A") as DayCode[],
                },
);
            }


            const employee =
            employeeMap.get(
                record.employeeId,
            );


            if (!employee) {
            continue;
            }


            // ----------------------------------------------------
            // Date
            // ----------------------------------------------------

            const dateOnly =
            record.date.split("T")[0] ?? "";

            const parts =
            dateOnly.split("-");

            const day =
            Number(parts[2] ?? 0);


            // ----------------------------------------------------
            // Put P/A/SL/CL/H
            // ----------------------------------------------------

        if (day >= 1 && day <= daysInSelectedMonth) {
    employee.days[day - 1] = getStatusCode(record.status);
}
        }


        return Array.from(
            employeeMap.values(),
        );
        }, [monthRecords, daysInSelectedMonth]);


    // ==========================================================
    // FILTER EMPLOYEE
    // ==========================================================

    const rows =
        useMemo(() => {
        if (!employeeId) {
            return recordEmployees;
        }

        return recordEmployees.filter(
            (employee) =>
            employee.id === employeeId,
        );
        }, [
        recordEmployees,
        employeeId,
        ]);
    const exportRecordPDF = () => {
    if (rows.length === 0) {
    toast.error("No attendance records available");
    return;
    }

    // Record page par 31 days hain
    const totalDays = 31;

    const doc = new jsPDF(
        "landscape",
        "mm",
        "a3",
    );

  // =====================================================
  // TITLE
  // =====================================================

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");

  doc.text(
    "Attendance Record",
    14,
    18,
  );

  // =====================================================
  // MONTH / YEAR
  // =====================================================

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  doc.text(
    `Month: ${month} ${year}`,
    14,
    26,
  );

  doc.text(
    `Employees: ${rows.length}`,
    14,
    32,
  );

  // =====================================================
  // DAY HEADERS
  // =====================================================

  const dayHeaders = Array.from(
    { length: totalDays },
    (_, index) => String(index + 1),
  );

  // =====================================================
  // HEADER
  // =====================================================

  const head = [
    [
      "Employee ID",
      "Employee Name",
      "Department",
      ...dayHeaders,
      "P",
      "A",
      "H",
      "SL",
      "CL",
    ],
  ];

  // =====================================================
  // BODY
  // =====================================================

  const body = rows.map((employee) => {
    const days = [
      ...employee.days.slice(0, totalDays),
    ];

    // Agar kisi reason se 31 entries nahi hain
    while (days.length < totalDays) {
      days.push("A");
    }

    // =================================================
    // STATUS COUNTS
    // =================================================

    const presentCount = days.filter(
      (day) => day === "P",
    ).length;

    const absentCount = days.filter(
      (day) => day === "A",
    ).length;

    const holidayCount = days.filter(
      (day) => day === "H",
    ).length;

    const sickLeaveCount = days.filter(
      (day) => day === "SL",
    ).length;

    const casualLeaveCount = days.filter(
      (day) => day === "CL",
    ).length;

    return [
      // Employee information
      employee.code,
      employee.name,
      employee.department,

      // 1 - 31
      ...days,

      // Counts
      presentCount,
      absentCount,
      holidayCount,
      sickLeaveCount,
      casualLeaveCount,
    ];
  });

  // =====================================================
  // TABLE
  // =====================================================

  autoTable(doc, {
    startY: 40,

    head,

    body,

    theme: "grid",

    styles: {
      fontSize: 7,
      cellPadding: 2,
      halign: "center",
      valign: "middle",

      lineColor: [
        210,
        210,
        210,
      ],

      lineWidth: 0.2,
    },

    headStyles: {
      fillColor: [
        37,
        99,
        235,
      ],

      textColor: [
        255,
        255,
        255,
      ],

      fontStyle: "bold",

      halign: "center",

      fontSize: 7,
    },

    bodyStyles: {
      fontSize: 7,
    },

    // ===================================================
    // EMPLOYEE COLUMNS
    // ===================================================

    columnStyles: {
      0: {
        cellWidth: 30,
        halign: "left",
      },

      1: {
        cellWidth: 35,
        halign: "left",
      },

      2: {
        cellWidth: 40,
        halign: "left",
      },
    },

    // ===================================================
    // STATUS COLORS
    // ===================================================

    didParseCell: (data) => {
      /*
       * Employee information
       */

      if (
        data.section === "body" &&
        data.column.index <= 2
      ) {
        data.cell.styles.halign =
          "left";
      }

      /*
       * Attendance day columns
       *
       * 0 = Employee ID
       * 1 = Employee Name
       * 2 = Department
       *
       * Days start from column 3
       */

      if (
        data.section === "body" &&
        data.column.index >= 3 &&
        data.column.index <
          3 + totalDays
      ) {
        const value = String(
          data.cell.raw ?? "",
        );

        // Present
        if (value === "P") {
          data.cell.styles.textColor = [
            22,
            163,
            74,
          ];

          data.cell.styles.fontStyle =
            "bold";
        }

        // Absent
        if (value === "A") {
          data.cell.styles.textColor = [
            220,
            38,
            38,
          ];

          data.cell.styles.fontStyle =
            "bold";
        }

        // Holiday
        if (value === "H") {
          data.cell.styles.textColor = [
            100,
            116,
            139,
          ];

          data.cell.styles.fontStyle =
            "bold";
        }

        // Sick Leave
        if (value === "SL") {
          data.cell.styles.textColor = [
            37,
            99,
            235,
          ];

          data.cell.styles.fontStyle =
            "bold";
        }

        // Casual Leave
        if (value === "CL") {
          data.cell.styles.textColor = [
            234,
            88,
            12,
          ];

          data.cell.styles.fontStyle =
            "bold";
        }
      }

      /*
       * Count columns
       *
       * P A H SL CL
       */

      if (
        data.section === "body" &&
        data.column.index >=
          3 + totalDays
      ) {
        data.cell.styles.fontStyle =
          "bold";
      }
    },
  });

  // =====================================================
  // LEGEND
  // =====================================================

  const finalY =
    (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  doc.text(
    "P = Present   A = Absent   H = Holiday   SL = Sick Leave   CL = Casual Leave",
    14,
    finalY,
  );

  // =====================================================
  // DOWNLOAD
  // =====================================================

  doc.save(
    `attendance-record-${month}-${year}.pdf`,
  );

  toast.success(
    "Record PDF downloaded successfully",
  );
};

    useImperativeHandle(
    ref,
    () => ({
        exportPDF: exportRecordPDF,
    }),
    [rows, month, year, monthNumber],
    );



    // ==========================================================
    // DAILY PRESENT DATA FOR CHART
    // ==========================================================

    const dailyStats =
        useMemo(() => {
        const daysInMonth =
            new Date(
            Number(year),
            monthNumber,
            0,
            ).getDate();


        return Array.from(
            {
            length: daysInMonth,
            },
            (_, index) => {
            const day =
                index + 1;


            const present =
                recordEmployees.filter(
                (employee) =>
                    employee.days[day - 1] ===
                    "P",
                ).length;


            return {
                day: String(day),
                present,
            };
            },
        );
        }, [
        recordEmployees,
        year,
        monthNumber,
        ]);


    // ==========================================================
    // ATTENDANCE RATIO
    // ==========================================================

    const overallRatio =
        useMemo(() => {
        let present = 0;
        let absent = 0;
        let sickLeave = 0;
        let casualLeave = 0;


        for (
            const record of monthRecords
        ) {
            const status =
            getStatusCode(
                record.status,
            );


            if (status === "P") {
            present++;
            }

            if (status === "A") {
            absent++;
            }

            if (status === "SL") {
            sickLeave++;
            }

            if (status === "CL") {
            casualLeave++;
            }
        }


        const workable =
            present +
            absent +
            sickLeave +
            casualLeave;


        if (workable === 0) {
            return 0;
        }


        return Math.round(
            (present / workable) * 100,
        );
        }, [monthRecords]);


    // ==========================================================
    // FULL ATTENDANCE TODAY
    // ==========================================================

    const fullAttendanceToday =
        useMemo(() => {
        const today =
            new Date();


        const todayDate =
            today.toISOString()
            .split("T")[0] ?? "";


        return monthRecords.filter(
            (record) =>
            record.date.startsWith(
                todayDate,
            ) &&
            getStatusCode(
                record.status,
            ) === "P",
        ).length;
        }, [monthRecords]);


    // ==========================================================
    // LOADING
    // ==========================================================

    if (isLoading) {
        return (
        <main className="mx-auto w-full max-w-[1500px] px-4 pb-8 sm:px-6">

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">

            <div className="h-[500px] animate-pulse rounded-2xl bg-muted" />

            <div className="h-[500px] animate-pulse rounded-2xl bg-muted" />

            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">

            <div className="h-[250px] animate-pulse rounded-2xl bg-muted" />

            <div className="h-[250px] animate-pulse rounded-2xl bg-muted" />

            <div className="h-[250px] animate-pulse rounded-2xl bg-muted" />

            </div>

        </main>
        );
    }


    // ==========================================================
    // ERROR
    // ==========================================================

    if (isError) {
        return (
        <main className="mx-auto w-full max-w-[1500px] px-4 pb-8 sm:px-6">

            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">

            <h2 className="font-semibold text-red-700">
                Attendance data load nahi ho saka
            </h2>

            <p className="mt-1 text-sm text-red-600">
                Attendance API se data fetch karte waqt error aaya.
            </p>

            <button
                type="button"
                onClick={() => refetch()}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
            >
                Retry
            </button>

            </div>

        </main>
        );
    }


    // ==========================================================
    // PAGE
    // ==========================================================
return (
    <main className="mx-auto w-full max-w-[1500px] px-4 pt-0 pb-8 sm:px-6">

        <section className="mt-0 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">

        <AttendanceRecordTable
    employees={rows}
    daysInMonth={daysInSelectedMonth}
/>

        <AttendanceEmployeePanel
            employees={recordEmployees}
            year={year}
            month={month}
            employeeId={employeeId}
            onYearChange={setYear}
            onMonthChange={setMonth}
            onEmployeeChange={setEmployeeId}
        />

        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">

        <AttendanceSummary
            totalEmployees={
            recordEmployees.length
            }
            fullAttendanceToday={
            fullAttendanceToday
            }
        />

        <AttendanceStatisticsChart
            data={dailyStats}
        />

        <AttendanceRatioRing
            value={overallRatio}
        />

        </section>

    </main>
    );
    },
);

export default AttendanceRecord;

    // return (
    //     <main className="mx-auto w-full max-w-[1500px] px-4 pt-0 pb-8 sm:px-6">
        
    //     {/* ====================================================
    //         TABLE + FILTER
    //     ===================================================== */}

    //     <section className="mt-0 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">

    //         <AttendanceRecordTable
    //         employees={rows}
    //         />

    //         <AttendanceEmployeePanel
    //         employees={recordEmployees}
    //         year={year}
    //         month={month}
    //         employeeId={employeeId}
    //         onYearChange={setYear}
    //         onMonthChange={setMonth}
    //         onEmployeeChange={
    //             setEmployeeId
    //         }
    //         />

    //     </section>


    //     {/* ====================================================
    //         STATISTICS
    //     ===================================================== */}

    //     <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">

    //         <AttendanceSummary
    //         totalEmployees={
    //             recordEmployees.length
    //         }
    //         fullAttendanceToday={
    //             fullAttendanceToday
    //         }
    //         />

    //         <AttendanceStatisticsChart
    //         data={dailyStats}
    //         />

    //         <AttendanceRatioRing
    //         value={overallRatio}
    //         />

    //     </section>

    //     </main>
    // );
    





// import { createFileRoute } from '@tanstack/react-router'
// import { useMemo, useState } from "react";

// import { Download, FileSpreadsheet, FileText } from "lucide-react";
// import { toast } from "sonner";

// import { Button } from "@/components/ui/button";
// import { AttendanceSummary } from "@/routes/attsummary";
// import {
//     AttendanceRatioRing,
//     AttendanceStatisticsChart,
// } from "@/routes/Attcharts";
// import { AttendanceEmployeePanel } from "@/routes/AttendanceEmployeePanel";
// import { AttendanceRecordTable } from "@/routes/attrecordtable";
// import {
//     DAYS,
//     dailyStats,
//     recordEmployees,
//     totalsFor,
// } from "@/lib/attendance-data";
// import { cn } from "@/lib/utils";


// export default function AttendanceRecord() {
//     const [year, setYear] = useState("2026");
//     const [month, setMonth] = useState("September");
//     const [employeeId, setEmployeeId] = useState("");

//     const rows = useMemo(
//     () => (employeeId ? recordEmployees.filter((e) => e.id === employeeId) : recordEmployees.slice(0, 40)),
//     [employeeId],
//     );

//     const overallRatio = useMemo(() => {
//         const totals = recordEmployees.reduce(
//         (acc: { p: any; w: number; }, e: { days: any; }) => {
//         const t = totalsFor(e.days);
//         acc.p += t.P;
//         acc.w += DAYS.length - t.H;
//         return acc;
//         },
//         { p: 0, w: 0 },
//         );
//     return Math.round((totals.p / totals.w) * 100);
//     }, []);

//     const exportAs = (kind: string) => toast.success(`${kind} export started`);

//     return (
//     <main className="mx-auto w-full max-w-[1500px] px-4 pt-0 pb-8 sm:px-6">

//         {/* Attendance Record Table + Filters */}
//         <section className="mt-0 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
//         <AttendanceRecordTable employees={rows} />

//         <AttendanceEmployeePanel
//             employees={recordEmployees}
//             year={year}
//             month={month}
//             employeeId={employeeId}
//             onYearChange={setYear}
//             onMonthChange={setMonth}
//             onEmployeeChange={setEmployeeId}
//         />
//         </section>

//         {/* Attendance Statistics */}
//         <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
//         <AttendanceSummary
//             totalEmployees={recordEmployees.length}
//             fullAttendanceToday={142}
//         />

//         <AttendanceStatisticsChart data={dailyStats} />

//         <AttendanceRatioRing value={overallRatio} />
//         </section>

//     </main>
// );
// }