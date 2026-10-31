export type AttendanceStatus =
    | "present"
    | "holiday"
    | "half-day"
    | "absent"
    | "week-off";

export interface Employee {
    id: string;
    name: string;
    designation: string;
    department?: string;
}

export interface Holiday {
    date: string;
    name: string;
}

export interface AttendanceRecord {
    employeeId: string;
    date: string;
    workingHours: number;
    status: AttendanceStatus;
    note?: string;
    shift?: string;
    clockIn?: string;
    clockOut?: string;
}

export const employees: Employee[] = [
    {
    id: "1",
    name: "Admin",
    designation: "Administrator",
    department: "Management",
    },
    {
    id: "2",
    name: "John Doe",
    designation: "Software Engineer",
    department: "Engineering",
    },
    {
    id: "3",
    name: "Jane Smith",
    designation: "HR Manager",
    department: "Human Resources",
    },
];

export const holidays: Holiday[] = [
    {
    date: "2026-01-26",
    name: "Republic Day",
    },
    {
    date: "2026-08-15",
    name: "Independence Day",
    },
    {
    date: "2026-10-02",
    name: "Gandhi Jayanti",
    },
];

export function toKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

export const statusMeta = {
    present: {
        label: "Full Day",
        dot: "bg-emerald-500",
        text: "text-emerald-600",
    },
    "half-day": {
        label: "Half Day",
        dot: "bg-amber-500",
        text: "text-amber-600",
    },
    absent: {
        label: "Absent",
        dot: "bg-rose-500",
        text: "text-rose-600",
    },
    holiday: {
        label: "Holiday",
        dot: "bg-sky-500",
        text: "text-sky-600",
    },
    "week-off": {
        label: "Week Off",
        dot: "bg-slate-400",
        text: "text-slate-500",
    },
} as const;

export function getAttendance(
    employeeId: string,
    date: Date,
): AttendanceRecord {
    const day = date.getDate();

    // Weekend
    if (date.getDay() === 0 || date.getDay() === 6) {
        return {
            employeeId,
            date: toKey(date),
            workingHours: 0,
            status: "week-off",
            note: "Weekly Off",
        };
    }

    // Demo Holiday
    if (day % 13 === 0) {
        return {
            employeeId,
            date: toKey(date),
            workingHours: 0,
            status: "holiday",
            note: "Holiday",
        };
    }

    // Half Day
    if (day % 7 === 0) {
        return {
            employeeId,
            date: toKey(date),
            workingHours: 4,
            status: "half-day",
            note: "Half day",
            shift: "09:00 - 18:00",
            clockIn: "09:12 AM",
            clockOut: "01:15 PM",
        };
    }

    // Demo Pending
    if (day % 9 === 0) {
        return {
            employeeId,
            date: toKey(date),
            workingHours: 0,
            status: "absent",
            note: "Pending REG (Full Day)",
        };
    }

    // Present
    return {
        employeeId,
        date: toKey(date),
        workingHours: 8,
        status: "present",
        shift: "09:00 - 18:00",
        clockIn: "09:05 AM",
        clockOut: "05:10 PM",
    };
}

// =====================aTTENDACE RECORD=============================

export type DayCode = "P" | "A" | "H" | "SL" | "CL";

export type RecordEmployee = {
    id: string;
    code: string;
    name: string;
    department: string;
    days: DayCode[]; // 31 entries
};


export const codeMeta: Record<
    DayCode,
    { label: string; cell: string; badge: string }
> = {
    P: {
        label: "Present",
        cell: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
        badge: "bg-emerald-500",
    },
    A: {
        label: "Absent",
        cell: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
        badge: "bg-red-500",
    },
    H: {
        label: "Holiday",
        cell: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        badge: "bg-slate-400",
    },
    SL: {
        label: "Sick Leave",
        cell: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
        badge: "bg-blue-500",
    },
    CL: {
        label: "Casual",
        cell: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
        badge: "bg-orange-500",
    },
};


export const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const FIRST = [
    "Akansha",
    "Rahul",
    "Priya",
    "Mohit",
    "Neha",
    "Arjun",
    "Sneha",
    "Vikram",
    "Ananya",
    "Karan",
    "Divya",
    "Rohit",
];
const LAST = ["Srivastava", "Verma", "Sharma", "Gupta", "Nair", "Iyer", "Kapoor", "Mehta"];
const DEPTS = ["Engineering", "Human Resources", "Quality", "Finance", "Operations"];

/** Deterministic pseudo random so SSR and client match. */
function rand(seed: number) {
  const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function pickCode(seed: number, day: number): DayCode {
    if (day % 7 === 0) return "H";
    const r = rand(seed * 31 + day);
    if (r < 0.8) return "P";
    if (r < 0.87) return "A";
    if (r < 0.92) return "SL";
    if (r < 0.97) return "CL";
    return "H";
}

export const recordEmployees: RecordEmployee[] = Array.from({ length: 150 }, (_, i) => {
    const first = FIRST[i % FIRST.length]!;
    const last = LAST[(i * 3) % LAST.length]!;
    return {
        id: `emp-${i + 1}`,
        code: `AV-${String(1001 + i)}`,
        name: `${first} ${last}`,
        department: DEPTS[i % DEPTS.length]!,
        days: DAYS.map((d) => pickCode(i + 1, d)),
    };
});

export function totalsFor(days: DayCode[]) {
    return days.reduce(
        (acc, c) => ({ ...acc, [c]: acc[c] + 1 }),
        { P: 0, A: 0, H: 0, SL: 0, CL: 0 } as Record<DayCode, number>,
    );
}

export function attendanceRatio(days: DayCode[]) {
    const t = totalsFor(days);
    const workable = days.length - t.H;
    if (workable <= 0) return 100;
  return Math.round((t.P / workable) * 100);
}

/** Daily present counts across all employees, for the bar chart. */
export const dailyStats = DAYS.map((day) => ({
    day: String(day),
    present: recordEmployees.filter((e) => e.days[day - 1] === "P").length,
}));

export const YEARS = ["2024", "2025", "2026"];
export const MONTHS = [
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