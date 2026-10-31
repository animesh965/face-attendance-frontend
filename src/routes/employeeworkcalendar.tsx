import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Plus, Pencil, Trash2, X } from "lucide-react";
import {
    ChevronLeft,
    ChevronRight,
    CalendarDays,
    PartyPopper,
    Clock,
    LogIn,
    LogOut,
    } from "lucide-react";
    import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

    import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
    import { Label } from "@/components/ui/label";
    import { Input } from "@/components/ui/input";
    import { Button } from "@/components/ui/button";
    import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    } from "@/components/ui/select";

    import { DashboardLayout } from "@/components/layout/DashboardLayout";
    import { cn } from "@/lib/utils";
    import { attendanceApi } from "@/api/attendance";
    import { holidaysApi, type Holiday, type HolidayPayload } from "@/api/holiday";
    import { useAppStore } from "@/store/useAppStore";
    
    export const Route = createFileRoute("/employeeworkcalendar")({
    head: () => ({
        meta: [
        { title: "Employee Work Calendar — HR Settings" },
        {
            name: "description",
            content:
            "Search an employee and view attendance, working hours and leaves on a calendar.",
        },
        ],
    }),
    component: EmployeeWorkCalendarPage,
    });

    const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    type ApiAttendanceRecord = {
    id: string;
    employee: string;
    employeeId: string;
    department: string;
    date: string;

    checkIn: string | null;
    checkOut: string | null;

    workingHours: string;
    totalWorkMinutes: number;

    completedWorkMinutes: number;
    completedWorkingHours: string;

    totalBreakMinutes: number;
    liveBreakMinutes: number;

    freeBreakMinutes: number;
    excessBreakMinutes: number;

    effectiveWorkMinutes: number;
    effectiveWorkingHours: string;

    requiredWorkMinutes: number;
    requiredWorkingHours: string;

    remainingWorkMinutes: number;
    remainingWorkingHours: string;

    isWorkingTimeComplete: boolean;

    liveCurrentSessionMinutes: number;
    liveWorkMinutes: number;
    liveWorkingHours: string;

    liveEffectiveWorkMinutes: number;
    liveEffectiveWorkingHours: string;

    liveRemainingWorkMinutes: number;
    liveRemainingWorkingHours: string;

    liveWorkingTimeComplete: boolean;

    status: string;
    currentState: string;

    sessions: {
        in: string;
        out: string | null;
        source: string;
        camera_id: string | null;
        similarity: number;
    }[];

    lastAction: string;
    lastActionAt: string;

    lastSimilarity: number;

    createdAt: string;
    updatedAt: string;
    };

    function toKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
    }

    function monthLabel(date: Date) {
    return date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });
    }

    function formatTime(dateTime: string | null | undefined) {
    if (!dateTime) return "--";

    const date = new Date(dateTime);

    if (Number.isNaN(date.getTime())) return "--";

    return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
    }

    function formatHours(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") {
        return "00:00 hours";
    }

    const text = String(value).trim();

    return `${text} hours`;
}


    function getStatus(record: ApiAttendanceRecord | undefined) {
    if (!record) return null;

    const status = record.status?.toLowerCase();

    if (status === "present") return "present";
    if (status === "absent") return "absent";
    if (status === "holiday") return "holiday";
    if (status === "half-day") return "half-day";
    if (status === "half_day") return "half-day";
    if (status === "week-off") return "week-off";
    if (status === "week_off") return "week-off";

    return status;
    }

    function statusText(record: ApiAttendanceRecord | undefined) {
    const status = getStatus(record);

    switch (status) {
        case "present":
        return "Full Day";

        case "half-day":
        return "Half Day";

        case "absent":
        return "Absent";

        case "holiday":
        return "Holiday";

        case "week-off":
        return "Week Off";

        default:
        return "";
    }
    }

    function statusClasses(record: ApiAttendanceRecord | undefined) {
    const status = getStatus(record);

    switch (status) {
        case "present":
        return {
            bg: "bg-emerald-50",
            text: "text-emerald-600",
        };

        case "half-day":
        return {
            bg: "bg-amber-50",
            text: "text-amber-600",
        };

        case "absent":
        return {
            bg: "bg-rose-50",
            text: "text-rose-600",
        };

        case "holiday":
        return {
            bg: "bg-sky-50",
            text: "text-sky-600",
        };

        case "week-off":
        return {
            bg: "bg-slate-50",
            text: "text-slate-500",
        };

        default:
        return {
            bg: "bg-white",
            text: "text-slate-500",
        };
    }
    }

    function EmployeeWorkCalendarPage() {
    const today = useMemo(() => new Date(), []);
    const todayKey = toKey(today);
    const handleRefresh = async () => {
        if (!isEmployee) setEmployeeId("");
        setMonthValue(
            `${today.getFullYear()}-${String(
                today.getMonth() + 1
            ).padStart(2, "0")}`
        );
        setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
        setSelectedKey(null);

        await refetch();
    };
    const currentUser = useAppStore((state) => state.user);
    const isEmployee = currentUser?.role === "user";
    const canManageHolidays = ["admin", "super_admin"].includes(String(currentUser?.role || "").toLowerCase());
    const queryClient = useQueryClient();
    const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
    const [holidayName, setHolidayName] = useState("");
    const [holidayFromDate, setHolidayFromDate] = useState("");
    const [holidayToDate, setHolidayToDate] = useState("");
    const [holidayDescription, setHolidayDescription] = useState("");
    const [holidayType, setHolidayType] = useState("public");

    const { data: holidayRecords = [], isLoading: holidaysLoading } = useQuery<Holiday[]>({
        queryKey: ["holidays", "upcoming"],
        queryFn: () => holidaysApi.list(false),
    });
    const refreshHolidays = () => queryClient.invalidateQueries({ queryKey: ["holidays"] });

    function resetHolidayForm() {
        setEditingHoliday(null);
        setHolidayName("");
        setHolidayFromDate("");
        setHolidayToDate("");
        setHolidayDescription("");
        setHolidayType("public");
    }
    function openAddHolidayDialog() {
        resetHolidayForm();
        setHolidayDialogOpen(true);
    }
    function openEditHolidayDialog(holiday: Holiday) {
        setEditingHoliday(holiday);
        setHolidayName(holiday.name);
        setHolidayFromDate(holiday.from_date.slice(0, 10));
        setHolidayToDate(holiday.to_date.slice(0, 10));
        setHolidayDescription(holiday.description || "");
        setHolidayType(holiday.holiday_type || "public");
        setHolidayDialogOpen(true);
    }
    const saveHolidayMutation = useMutation({
        mutationFn: (payload: HolidayPayload) => editingHoliday
            ? holidaysApi.update(editingHoliday.id, payload)
            : holidaysApi.create(payload),
        onSuccess: async () => {
            await refreshHolidays();
            setHolidayDialogOpen(false);
            resetHolidayForm();
        },
    });
    const deleteHolidayMutation = useMutation({
        mutationFn: (id: string) => holidaysApi.delete(id),
        onSuccess: refreshHolidays,
    });
    function submitHoliday(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (holidayToDate < holidayFromDate) return;
        saveHolidayMutation.mutate({
            name: holidayName.trim(),
            from_date: holidayFromDate,
            to_date: holidayToDate,
            description: holidayDescription.trim() || null,
            holiday_type: holidayType,
        });
    }
    const [employeeId, setEmployeeId] = useState(() =>
        currentUser?.employee_id || currentUser?.id || ""
    );

    // Selected month: YYYY-MM
    const [monthValue, setMonthValue] = useState(() => {
        return `${today.getFullYear()}-${String(
            today.getMonth() + 1
        ).padStart(2, "0")}`;
    });

    // Calendar ka current month
    const [cursor, setCursor] = useState(
        () => new Date(today.getFullYear(), today.getMonth(), 1)
    );

    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    // Month dropdown change hone par calendar update hoga
    useEffect(() => {
        const [year, month] = monthValue.split("-").map(Number);

        if (!year || !month || month < 1 || month > 12) return;

        setCursor(new Date(year, month - 1, 1));
        setSelectedKey(null);
    }, [monthValue]);

    /*
     * SAME API
     */
    const {
        data = [],
        isLoading,
        isError,
        refetch,
    } = useQuery<ApiAttendanceRecord[]>({
        queryKey: ["attendance"],
        queryFn: () => attendanceApi.list() as Promise<ApiAttendanceRecord[]>,
    });

    /*
     * Employee dropdown API se banega.
     */
    /*
    * Employee dropdown API se banega.
    */
    const employeeOptions = useMemo(() => {
        const map = new Map<
        string,
        {
            employeeId: string;
            employee: string;
            department: string;
        }
        >();

        data.forEach((record) => {
        if (!map.has(record.employeeId)) {
            map.set(record.employeeId, {
            employeeId: record.employeeId,
            employee: record.employee,
            department: record.department,
            });
        }
        });

        return Array.from(map.values());
    }, [data]);

    /*
    * Selected employee ke records
    */
    const employeeRecords = useMemo(() => {
        if (!employeeId) return [];

        return data.filter((record) => record.employeeId === employeeId);
    }, [data, employeeId]);
    const monthOptions = useMemo(() => {
    const years = new Set<number>([today.getFullYear()]);

    data.forEach((record) => {
        const recordDate = new Date(`${record.date}T00:00:00`);

        if (!Number.isNaN(recordDate.getTime())) {
            years.add(recordDate.getFullYear());
        }
    });

    return Array.from(years)
        .sort((a, b) => b - a)
        .flatMap((year) =>
            Array.from({ length: 12 }, (_, index) => {
                const month = index + 1;

                return {
                    value: `${year}-${String(month).padStart(2, "0")}`,
                    label: new Date(year, index, 1).toLocaleDateString(
                        "en-US",
                        { month: "long", year: "numeric" }
                    ),
                };
            })
        );
}, [data, today]);

    /*
    * date => API record
    */
    const recordMap = useMemo(() => {
        const map = new Map<string, ApiAttendanceRecord>();

        employeeRecords.forEach((record) => {
        map.set(record.date, record);
        });

        return map;
    }, [employeeRecords]);

    /*
    * Calendar 42 days
    */
    const days = useMemo(() => {
        const first = new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        1,
        );

        const start = new Date(first);

        start.setDate(first.getDate() - first.getDay());

        return Array.from({ length: 42 }, (_, i) => {
        const d = new Date(start);

        d.setDate(start.getDate() + i);

        return d;
        });
    }, [cursor]);

    // const inRange = (key: string) => {
    //     if (dateFrom && key < dateFrom) return false;
    //     if (dateTo && key > dateTo) return false;

    //     return true;
    // };

    /*
    * Calendar date ka API record
    */
    const recordFor = (date: Date) => {
        if (!employeeId) return undefined;

        const key = toKey(date);

        // if (!inRange(key)) return undefined;

        return recordMap.get(key);
    };

    /*
    * Current month ke records
    */
    const monthRecords = useMemo(() => {
    if (!employeeId) return [];

    const year = cursor.getFullYear();
    const month = cursor.getMonth();

    return employeeRecords.filter((record) => {
        const recordDate = new Date(`${record.date}T00:00:00`);

        return (
            !Number.isNaN(recordDate.getTime()) &&
            recordDate.getFullYear() === year &&
            recordDate.getMonth() === month
        );
    });
}, [employeeId, employeeRecords, cursor]);

    /*
    * Statistics
    */
    const totals = useMemo(() => {
        const present = monthRecords.filter(
        (record) => getStatus(record) === "present",
        ).length;

        const leaves = monthRecords.filter(
        (record) => getStatus(record) === "absent",
        ).length;

        const halfDays = monthRecords.filter(
        (record) => getStatus(record) === "half-day",
        ).length;

        const holidays = monthRecords.filter(
        (record) => getStatus(record) === "holiday",
        ).length;

        const weekOffs = monthRecords.filter(
        (record) => getStatus(record) === "week-off",
        ).length;

        const totalMinutes = monthRecords.reduce(
        (sum, record) => sum + (record.totalWorkMinutes || 0),
        0,
        );

        return {
        present,
        leaves,
        halfDays,
        holidays,
        weekOffs,
        totalMinutes,
        };
    }, [monthRecords]);

    const totalHours = useMemo(() => {
        const hours = Math.floor(totals.totalMinutes / 60);
        const minutes = totals.totalMinutes % 60;

        return `${hours}h ${String(minutes).padStart(2, "0")}m`;
    }, [totals.totalMinutes]);

    /*
    * Selected record
    */
    const selectedRecord = useMemo(() => {
    if (!selectedKey || !employeeId) return undefined;

    return recordMap.get(selectedKey);
}, [selectedKey, employeeId, recordMap]);

    const selectedEmployee = useMemo(() => {
        return employeeOptions.find(
        (employee) => employee.employeeId === employeeId,
        );
    }, [employeeOptions, employeeId]);

    /*
    * No hard-coded holidays.
    * API me holiday records honge to calendar me wahi Holiday dikhega.
    */
    const upcomingHolidays = useMemo(() => {
        return [...holidayRecords]
            .filter((holiday) => holiday.to_date.slice(0, 10) >= todayKey)
            .sort((a, b) => a.from_date.localeCompare(b.from_date))
            .slice(0, 8);
    }, [holidayRecords, todayKey]);

    const holidayForDate = (dateKey: string) =>
        holidayRecords.find((holiday) =>
            holiday.from_date.slice(0, 10) <= dateKey &&
            holiday.to_date.slice(0, 10) >= dateKey
        );

    const selectedHoliday = selectedKey ? holidayForDate(selectedKey) : undefined;

    return (
        <DashboardLayout
        title="Employee Work Calendar"
        description="Track employee working hours, leaves and attendance with a monthly calendar."
        breadcrumbs={[
            {
            label: "Employee Work Calendar",
            },
        ]}
        >
        <div className="space-y-6">
            {/* Filters */}
            <Card className="mb-6">
            <CardContent className="grid grid-cols-1 items-end gap-4 pt-6 md:grid-cols-[1fr_1fr_auto]">
                {/* Employee selector is only available to administrators. */}
                {!isEmployee && <div className="space-y-2">
                <Label htmlFor="employee">
                    Employee
                </Label>

                <Select
                    value={employeeId}
                    onValueChange={(value) => {
                    setEmployeeId(value);
                    setSelectedKey(null);
                    }}
                >
                    <SelectTrigger id="employee">
                    <SelectValue placeholder="Search employee" />
                    </SelectTrigger>

                    <SelectContent>
                    {employeeOptions.map((employee) => (
                        <SelectItem
                        key={employee.employeeId}
                        value={employee.employeeId}
                        >
                        {employee.employee} —{" "}
                        {employee.employeeId}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                </div>}
{/* Month Dropdown */}
<div className="space-y-2">
    <Label htmlFor="month">Select Month</Label>

    <Select
        value={monthValue}
        onValueChange={setMonthValue}
    >
        <SelectTrigger id="month">
            <SelectValue placeholder="Select month" />
        </SelectTrigger>

        <SelectContent>
            {monthOptions.map((month) => (
                <SelectItem
                    key={month.value}
                    value={month.value}
                >
                    {month.label}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
</div>
                {/* From */}
                {/* <div className="space-y-2">
                <Label htmlFor="from">
                    Date from
                </Label>

                <Input
                    id="from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) =>
                    setDateFrom(e.target.value)
                    }
                />
                </div> */}

                {/* To */}
                {/* <div className="space-y-2">
                <Label htmlFor="to">
                    Date to
                </Label>

                <Input
                    id="to"
                    type="date"
                    value={dateTo}
                    onChange={(e) =>
                    setDateTo(e.target.value)
                    }
                />
                </div> */}
                <div>
    <Button
        onClick={handleRefresh}
        variant="outline"
        className="w-full md:w-auto"
    >
        <RotateCcw className="mr-2 h-4 w-4" />
        Refresh
    </Button>
</div>
            </CardContent>
            </Card>

            {isLoading && (
            <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Loading attendance...
                </CardContent>
            </Card>
            )}

            {isError && (
            <Card>
                <CardContent className="flex flex-col items-center gap-3 py-10">
                <p className="text-sm text-destructive">
                    Attendance data load nahi ho saka.
                </p>

                <Button
                    variant="outline"
                    onClick={() => refetch()}
                >
                    Try Again
                </Button>
                </CardContent>
            </Card>
            )}

            {!isLoading && !isError && (
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Calendar */}
                <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarDays className="h-4 w-4" />

                    {monthLabel(cursor)}
                    </CardTitle>

                    <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label="Previous month"
                        onClick={() =>
                        setCursor(
                            new Date(
                            cursor.getFullYear(),
                            cursor.getMonth() - 1,
                            1,
                            ),
                        )
                        }
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                        setCursor(
                            new Date(
                            today.getFullYear(),
                            today.getMonth(),
                            1,
                            ),
                        )
                        }
                    >
                        Today
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        aria-label="Next month"
                        onClick={() =>
                        setCursor(
                            new Date(
                            cursor.getFullYear(),
                            cursor.getMonth() + 1,
                            1,
                            ),
                        )
                        }
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="relative mt-3 overflow-visible rounded-xl border bg-white">
                    {/* Week Header */}
                    <div className="grid grid-cols-7 overflow-hidden rounded-t-xl bg-[#2563eb] text-xs font-semibold text-white">
                        {WEEK_DAYS.map((day) => (
                        <div
                            key={day}
                            className="border-r border-blue-400/40 py-2.5 text-center last:border-r-0"
                        >
                            {day}
                        </div>
                        ))}
                    </div>

                    {/* Calendar */}
                    <div className="grid grid-cols-7">
                        {days.map((d) => {
                        const key = toKey(d);

                        const record = recordFor(d);
                        const holiday = holidayForDate(key);

                        const isCurrentMonth =
                            d.getMonth() ===
                            cursor.getMonth();

                        const isToday =
                            key === todayKey;

                        const status = getStatus(record);

                        const classes =
                            statusClasses(record);

                        return (
                            <button
                            key={key}
                            type="button"
                            onClick={() => {
                                if (record || holiday) {
                                    setSelectedKey(key);
                                }
                            }}
                            className={cn(
                                "relative h-24 border-r border-b p-2 text-left transition-all",
                                "hover:z-20 hover:bg-blue-50",
                                (record || holiday) ? "cursor-pointer" : "cursor-default",
                                holiday && !record ? "bg-sky-50" : classes.bg,
                                !isCurrentMonth &&
                                "opacity-40",
                                isToday &&
                                "ring-2 ring-inset ring-blue-500",
                                selectedKey === key &&
                                "z-20 ring-2 ring-inset ring-blue-500",
                            )}
                            >
                            {/* Date */}
                            <span
                                className={cn(
                                "absolute right-2 top-2 text-sm font-semibold",
                                isToday
                                    ? "text-blue-600"
                                    : "text-slate-700",
                                )}
                            >
                                {String(
                                d.getDate(),
                                ).padStart(2, "0")}
                            </span>

                            {/* Today dot */}
                            {isToday && (
                                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
                            )}

                            {/* Status */}
                            <div className="absolute left-3 right-2 top-10">
                                {!employeeId ? (
                                <p className="text-[10px] text-slate-400">
                                
                                </p>
                                ) : (
                                <>
                                    {holiday && (
                                        <p className="text-[10px] font-semibold leading-4 text-sky-700">
                                            {holiday.name}
                                        </p>
                                    )}
                                    {record ? (
                                        <>
                                            <p className={cn(
                                                "text-[11px] font-medium leading-4",
                                                classes.text,
                                            )}>
                                                {statusText(record)}
                                            </p>
                                            {status === "present" && (
                                                <p className="mt-1 text-[10px] text-slate-500">
                                                    {formatHours(record.liveWorkingHours || record.workingHours)}
                                                </p>
                                            )}
                                            {status === "half-day" && (
                                                <p className="mt-1 text-[10px] text-slate-500">
                                                    {formatHours(record.workingHours)}
                                                </p>
                                            )}
                                        </>
                                    ) : holiday ? (
                                        <p className="text-[10px] text-sky-600">Holiday</p>
                                    ) : (
                                        <p className="text-[10px] text-slate-400">No record</p>
                                    )}
                                </>
                                )}
                            </div>
                            </button>
                        );
                        })}
                    </div>
                    </div>

                    {/* Legend */}
                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <Legend
                        color="bg-emerald-500"
                        text="Present"
                    />

                    <Legend
                        color="bg-amber-500"
                        text="Half Day"
                    />

                    <Legend
                        color="bg-rose-500"
                        text="Absent"
                    />

                    <Legend
                        color="bg-sky-500"
                        text="Holiday"
                    />

                    <Legend
                        color="bg-slate-400"
                        text="Week Off"
                    />

                    <Legend
                        color="bg-primary"
                        text="Today"
                    />
                    </div>

                    {/* Stats */}
                    {employeeId && (
                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
                        <Stat
                        label="Working hours"
                        value={totalHours}
                        />

                        <Stat
                        label="Present days"
                        value={totals.present}
                        />

                        <Stat
                        label="Half days"
                        value={totals.halfDays}
                        />

                        <Stat
                        label="Leaves"
                        value={totals.leaves}
                        />

                        <Stat
                        label="Holidays"
                        value={totals.holidays}
                        />
                    </div>
                    )}

                    {!employeeId && (
                    <p className="mt-6 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                        Select an employee above to load
                        attendance details.
                    </p>
                    )}
                </CardContent>
                </Card>

                {/* Right Column */}
                <div className="space-y-6">
                {/* Selected Day */}
                {selectedRecord && selectedEmployee && (
                    <Card className="overflow-hidden">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-slate-500" />

                        {new Date(
                            `${selectedRecord.date}T00:00:00`,
                        ).toLocaleDateString(
                            "en-US",
                            {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            },
                        )}
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {/* Employee */}
                        <div>
                        <p className="text-sm font-semibold text-slate-800">
                            {selectedEmployee.employee}
                        </p>

                        <p className="text-xs text-slate-500">
                            {selectedEmployee.employeeId}
                        </p>

                        <p
                            className={cn(
                            "mt-1 text-xs font-medium",
                            statusClasses(
                                selectedRecord,
                            ).text,
                            )}
                        >
                            {statusText(
                            selectedRecord,
                            )}
                        </p>
                        </div>

                        {/* Check In */}
                        <div className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                            <LogIn className="h-5 w-5 text-emerald-500" />
                        </div>

                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-emerald-600">
                            Check In
                            </p>

                            <p className="mt-1 text-sm font-medium text-slate-700">
                            {formatTime(
                                selectedRecord.checkIn,
                            )}
                            </p>
                        </div>
                        </div>

                        {/* Check Out */}
                        <div className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50">
                            <LogOut className="h-5 w-5 text-orange-500" />
                        </div>

                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-orange-500">
                            Check Out
                            </p>

                            <p className="mt-1 text-sm font-medium text-slate-700">
                            {formatTime(
                                selectedRecord.checkOut,
                            )}
                            </p>
                        </div>
                        </div>

                        {/* Total Hours */}
                        <div className="flex items-center justify-between border-t pt-3">
                        <span className="text-sm font-semibold text-slate-700">
                            Total hours
                        </span>

                        <span className="rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                            {formatHours(
                            selectedRecord.workingHours,
                            )}
                        </span>
                        </div>

                        {/* Current State */}
                        <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                            Current state
                        </span>

                        <span className="rounded-md bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                            {selectedRecord.currentState ||
                            "--"}
                        </span>
                        </div>

                        {/* Remaining */}
                        <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                            Remaining
                        </span>

                        <span className="text-sm font-semibold">
                            {selectedRecord.liveRemainingWorkingHours ||
                            selectedRecord.remainingWorkingHours ||
                            "--"}
                        </span>
                        </div>
                    </CardContent>
                    </Card>
                )}

                {selectedHoliday && (
                    <Card className="border-sky-200 bg-sky-50/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm text-sky-700">
                                <PartyPopper className="h-4 w-4" />
                                Holiday Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p className="font-semibold text-slate-800">{selectedHoliday.name}</p>
                            <p className="text-sm text-muted-foreground">
                                {new Date(`${selectedHoliday.from_date.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                                {" - "}
                                {new Date(`${selectedHoliday.to_date.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                            {selectedHoliday.description && (
                                <p className="text-sm text-muted-foreground">{selectedHoliday.description}</p>
                            )}
                            <p className="text-xs font-medium capitalize text-sky-700">
                                {selectedHoliday.holiday_type} holiday
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Upcoming Holidays */}
                <Card>
                    <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <PartyPopper className="h-4 w-4" />
                            Upcoming Holidays
                        </CardTitle>
                        {canManageHolidays && (
                            <Button type="button" size="sm" onClick={openAddHolidayDialog}>
                                <Plus className="mr-1 h-4 w-4" /> Add
                            </Button>
                        )}
                    </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                    {holidaysLoading && <p className="text-sm text-muted-foreground">Loading holidays...</p>}
                    {!holidaysLoading && upcomingHolidays.length === 0 && (
                        <p className="text-sm text-muted-foreground">No upcoming holidays.</p>
                    )}
                    {upcomingHolidays.map((holiday) => {
                        const d = new Date(`${holiday.from_date.slice(0, 10)}T00:00:00`);
                        const endDate = new Date(`${holiday.to_date.slice(0, 10)}T00:00:00`);
                        const dateLabel = holiday.from_date === holiday.to_date
                            ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
                        return (
                            <div key={holiday.id} className="flex items-center gap-3 rounded-md border p-2">
                                <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-muted text-xs">
                                    <span className="font-semibold leading-none">{d.getDate()}</span>
                                    <span className="text-[10px] text-muted-foreground">{d.toLocaleDateString("en-US", { month: "short" })}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">{holiday.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {dateLabel}
                                        {holiday.description ? ` · ${holiday.description}` : ""}
                                    </p>
                                </div>
                                {canManageHolidays && (
                                    <div className="flex shrink-0 items-center gap-1">
                                        <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${holiday.name}`}
                                            onClick={() => openEditHolidayDialog(holiday)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${holiday.name}`}
                                            disabled={deleteHolidayMutation.isPending}
                                            onClick={() => {
                                                if (window.confirm(`Delete "${holiday.name}"?`)) deleteHolidayMutation.mutate(holiday.id);
                                            }}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    </CardContent>
                </Card>

                {canManageHolidays && holidayDialogOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                        role="presentation"
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) {
                                setHolidayDialogOpen(false);
                                resetHolidayForm();
                            }
                        }}>
                        <div role="dialog" aria-modal="true" aria-labelledby="holiday-dialog-title"
                            className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
                            <div className="mb-5 flex items-center justify-between">
                                <h2 id="holiday-dialog-title" className="text-lg font-semibold">
                                    {editingHoliday ? "Edit Holiday" : "Add Holiday"}
                                </h2>
                                <Button type="button" variant="ghost" size="icon" aria-label="Close"
                                    onClick={() => { setHolidayDialogOpen(false); resetHolidayForm(); }}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <form onSubmit={submitHoliday} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="holiday-name">Holiday Name</Label>
                                    <Input id="holiday-name" value={holidayName}
                                        onChange={(event) => setHolidayName(event.target.value)}
                                        placeholder="e.g. Independence Day" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="holiday-from-date">From Date</Label>
                                    <Input id="holiday-from-date" type="date" value={holidayFromDate}
                                        onChange={(event) => setHolidayFromDate(event.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="holiday-to-date">To Date</Label>
                                    <Input id="holiday-to-date" type="date" min={holidayFromDate || undefined}
                                        value={holidayToDate}
                                        onChange={(event) => setHolidayToDate(event.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="holiday-type">Holiday Type</Label>
                                    <Select value={holidayType} onValueChange={setHolidayType}>
                                        <SelectTrigger id="holiday-type"><SelectValue placeholder="Select holiday type" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="public">Public</SelectItem>
                                            <SelectItem value="company">Company</SelectItem>
                                            <SelectItem value="optional">Optional</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="holiday-description">Description</Label>
                                    <Input id="holiday-description" value={holidayDescription}
                                        onChange={(event) => setHolidayDescription(event.target.value)}
                                        placeholder="Optional description" />
                                </div>
                                {saveHolidayMutation.isError && (
                                    <p className="text-sm text-destructive">Unable to save holiday. Please check the details and try again.</p>
                                )}
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button type="button" variant="outline"
                                        onClick={() => { setHolidayDialogOpen(false); resetHolidayForm(); }}>Cancel</Button>
                                    <Button type="submit" disabled={saveHolidayMutation.isPending}>
                                        {saveHolidayMutation.isPending ? "Saving..." : editingHoliday ? "Update Holiday" : "Save Holiday"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                </div>
            </div>
            )}
        </div>
        </DashboardLayout>
    );
    }

    function Stat({
    label,
    value,
    }: {
    label: string;
    value: string | number;
    }) {
    return (
        <div className="rounded-md border p-3">
        <p className="text-xs text-muted-foreground">
            {label}
        </p>

        <p className="mt-1 text-lg font-semibold">
            {value}
        </p>
        </div>
    );
    }

    function Legend({
    color,
    text,
    }: {
    color: string;
    text: string;
    }) {
    return (
        <span className="flex items-center gap-1.5">
        <span
            className={cn(
            "h-2 w-2 rounded-full",
            color,
            )}
        />
        {text}
        </span>
    );
}





















//============= dummy

// import { createFileRoute } from "@tanstack/react-router";
// import { useMemo, useState } from "react";
// import { ChevronLeft, ChevronRight, CalendarDays, PartyPopper, Clock ,LogIn,
//     LogOut, } from "lucide-react";

// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Label } from "@/components/ui/label";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import {
//     Select,
//     SelectContent,
//     SelectItem,
//     SelectTrigger,
//     SelectValue,
// } from "@/components/ui/select";
// import { cn } from "@/lib/utils";
// import {
//     employees,
//     holidays,
//     getAttendance,
//     statusMeta,
//     toKey,
//     type AttendanceRecord,
// } from "@/lib/attendance-data";
// import { DashboardLayout } from "@/components/layout/DashboardLayout";

// export const Route = createFileRoute("/employeeworkcalendar")({
//     head: () => ({
//     meta: [
//         { title: "Employee Work Calendar — HR Settings" },
//         {
//         name: "description",
//         content:
//             "Search an employee, filter by date range and view working hours, leaves and half days on a calendar with upcoming holidays.",
//         },
//         { property: "og:title", content: "Employee Work Calendar — HR Settings" },
//         {
//         property: "og:description",
//         content: "Track working hours, leaves and half days per employee on a monthly calendar.",
//         },
//     ],
//     }),
//     component: EmployeeWorkCalendarPage,
// });

// const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// function monthLabel(date: Date) {
//     return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
// }

// function EmployeeWorkCalendarPage() {
//     const today = useMemo(() => new Date(), []);
//     const todayKey = toKey(today);

//     const [employeeId, setEmployeeId] = useState<string>("");
//     const [dateFrom, setDateFrom] = useState("");
//     const [dateTo, setDateTo] = useState("");
//     const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
//     const [selectedKey, setSelectedKey] = useState<string | null>(null);

//     const days = useMemo(() => {
//     const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
//     const start = new Date(first);
//     start.setDate(first.getDate() - first.getDay());
//     return Array.from({ length: 42 }, (_, i) => {
//         const d = new Date(start);
//         d.setDate(start.getDate() + i);
//         return d;
//     });
//     }, [cursor]);

//     const inRange = (key: string) => {
//     if (dateFrom && key < dateFrom) return false;
//     if (dateTo && key > dateTo) return false;
//     return true;
//     };

//     const recordFor = (date: Date): AttendanceRecord | null => {
//     if (!employeeId) return null;
//     const key = toKey(date);
//     if (!inRange(key)) return null;
//     return getAttendance(employeeId, date);
//     };

//     const monthRecords = useMemo(() => {
//     if (!employeeId) return [];
//     const out: AttendanceRecord[] = [];
//     const total = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
//     for (let i = 1; i <= total; i++) {
//         const d = new Date(cursor.getFullYear(), cursor.getMonth(), i);
//         if (!inRange(toKey(d))) continue;
//         out.push(getAttendance(employeeId, d));
//     }
//     return out;
//     }, [employeeId, cursor, dateFrom, dateTo]);

//     const totals = useMemo(
//         () => ({
//         hours: monthRecords.reduce((s, r) => s + r.workingHours, 0),
//         leaves: monthRecords.filter((r) => r.status === "absent").length,
//         halfDays: monthRecords.filter((r) => r.status === "half-day").length,
//         present: monthRecords.filter((r) => r.status === "present").length,
//     }),
//     [monthRecords],
//     );

//     const upcomingHolidays = useMemo(
//     () => holidays.filter((h: any) => h.date >= todayKey).slice(0, 8),
//     [todayKey],
//     );

//     const selectedRecord =
//     selectedKey && employeeId ? getAttendance(employeeId, new Date(`${selectedKey}T00:00:00`)) : null;

//     const selectedEmployee = employees.find((e: any) => e.id === employeeId);


//     return (
//     <DashboardLayout
//         title="Employee Work Calendar"
//         description="Track employee working hours, leaves and attendance with a monthly calendar."
//         breadcrumbs={[
//             { label: "Employee Work Calendar" },
//         ]}
//     >
//         <div className="space-y-6">
    

//       {/* Filters */}
//         <Card className="mb-6">
//         <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
//             <div className="space-y-2">
//             <Label htmlFor="employee">Employee</Label>
//             <Select value={employeeId} onValueChange={setEmployeeId}>
//                 <SelectTrigger id="employee">
//                 <SelectValue placeholder="Search employee" />
//                 </SelectTrigger>
//                 <SelectContent>
//                 {employees.map((e: any) => (
//                     <SelectItem key={e.id} value={e.id}>
//                     {e.name} — {e.designation}
//                     </SelectItem>
//                 ))}
//                 </SelectContent>
//             </Select>
//             </div>
//             <div className="space-y-2">
//             <Label htmlFor="from">Date from</Label>
//             <Input
//                 id="from"
//                 type="date"
//                 value={dateFrom}
//                 onChange={(e) => setDateFrom(e.target.value)}
//             />
//             </div>
//             <div className="space-y-2">
//             <Label htmlFor="to">Date to</Label>
//             <Input id="to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
//             </div>
//         </CardContent>
//         </Card>

//         <div className="grid gap-6 lg:grid-cols-3">
//         {/* Calendar */}
//         <Card className="lg:col-span-2">
//             <CardHeader className="flex flex-row items-center justify-between space-y-0">
//             <CardTitle className="flex items-center gap-2 text-base">
//                 <CalendarDays className="h-4 w-4" />
//                 {monthLabel(cursor)}
//             </CardTitle>
//             <div className="flex items-center gap-1">
//                 <Button
//                 variant="outline"
//                 size="icon"
//                 aria-label="Previous month"
//                 onClick={() =>
//                     setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
//                 }
//                 >
//                 <ChevronLeft className="h-4 w-4" />
//                 </Button>
//                 <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
//                 >
//                 Today
//                 </Button>
//                 <Button
//                 variant="outline"
//                 size="icon"
//                 aria-label="Next month"
//                 onClick={() =>
//                     setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
//                 }
//                 >
//                 <ChevronRight className="h-4 w-4" />
//                 </Button>
//             </div>
//             </CardHeader>
//             <CardContent>
//                 <div className="relative mt-3 overflow-visible rounded-xl border bg-white">

//     {/* Week Header */}
//     <div className="grid grid-cols-7 overflow-hidden rounded-t-xl bg-[#2563eb] text-white text-xs font-semibold">
//         {WEEK_DAYS.map((day) => (
//             <div
//                 key={day}
//                 className="py-2.5 text-center border-r border-blue-400/40 last:border-r-0"
//             >
//                 {day}
//             </div>
//         ))}
//     </div>

//     {/* Calendar */}
//     <div className="grid grid-cols-7">
//         {days.map((d) => {
//             const key = toKey(d);
//             const record = recordFor(d);

//             const isCurrentMonth =
//                 d.getMonth() === cursor.getMonth();

//             const isToday = key === todayKey;

//             const status = record?.status;

//             const bg =
//                 status === "present"
//                     ? "bg-emerald-50"
//                     : status === "half-day"
//                     ? "bg-amber-50"
//                     : status === "absent"
//                     ? "bg-rose-50"
//                     : status === "holiday"
//                     ? "bg-sky-50"
//                     : status === "week-off"
//                     ? "bg-slate-50"
//                     : "bg-white";

//             const statusText =
//                 status === "present"
//                     ? "Full Day"
//                     : status === "half-day"
//                     ? "Half Day"
//                     : status === "absent"
//                     ? record?.note || "Absent"
//                     : status === "holiday"
//                     ? "Holiday"
//                     : status === "week-off"
//                     ? "Week Off"
//                     : "";

//             return (
//                 <button
//                     key={key}
//                     type="button"
//                     onClick={() => setSelectedKey(key)}
//                     className={cn(
//                         "relative h-24 border-r border-b p-2 text-left transition-all",
//                         "hover:z-20 hover:bg-blue-50",
//                         bg,
//                         !isCurrentMonth && "opacity-40",
//                         isToday && "ring-2 ring-inset ring-blue-500",
//                         selectedKey === key &&
//                             "z-20 ring-2 ring-inset ring-blue-500"
//                     )}
//                 >
//                     {/* DATE - TOP RIGHT */}
//                     <span
//                         className={cn(
//                             "absolute right-2 top-2 text-sm font-semibold",
//                             isToday
//                                 ? "text-blue-600"
//                                 : "text-slate-700"
//                         )}
//                     >
//                         {String(d.getDate()).padStart(2, "0")}
//                     </span>

//                     {/* Today Dot */}
//                     {isToday && (
//                         <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
//                     )}

//                     {/* STATUS */}
//                     <div className="absolute left-3 top-10 right-2">
//                         <p
//                             className={cn(
//                                 "text-[11px] leading-4 font-medium",
//                                 status === "present" &&
//                                     "text-emerald-600",
//                                 status === "half-day" &&
//                                     "text-amber-600",
//                                 status === "absent" &&
//                                     "text-rose-600",
//                                 status === "holiday" &&
//                                     "text-sky-600",
//                                 status === "week-off" &&
//                                     "text-slate-500"
//                             )}
//                         >
//                             {statusText}
//                         </p>

//                         {/* Hours */}
//                         {record &&
//                             record.workingHours > 0 && (
//                                 <p className="mt-1 text-[10px] text-slate-500">
//                                     {record.workingHours} Hours
//                                 </p>
//                             )}
//                     </div>

                    
//                 </button>
//             );
//         })}
//     </div>
// </div>
//             {/* <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
//                 {WEEK_DAYS.map((d) => (
//                 <div key={d} className="py-1">
//                     {d}
//                 </div>
//                 ))}
//             </div> */}
        

//             {/* Legend */}
//             <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
//                 {Object.entries(statusMeta).map(([k, m]) => (
//                 <span key={k} className="flex items-center gap-1.5">
//                     {/* <span className={cn("h-2 w-2 rounded-full", m.dot)} />
//                     {m:any.label} */}
//                 </span>
//                 ))}
//                 <span className="flex items-center gap-1.5">
//                 <span className="h-2 w-2 rounded-full bg-primary" />
//                 Today
//                 </span>
//             </div>

//             {employeeId && (
//                 <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
//                 <Stat label="Working hours" value={`${totals.hours}h`} />
//                 <Stat label="Present days" value={totals.present} />
//                 <Stat label="Half days" value={totals.halfDays} />
//                 <Stat label="Leaves" value={totals.leaves} />
//                 </div>
//             )}

//             {!employeeId && (
//                 <p className="mt-6 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
//                 Select an employee above to load attendance details.
//                 </p>
//             )}
//             </CardContent>
//         </Card>

//         {/* Right column */}
//         <div className="space-y-6">
//             {selectedRecord && selectedEmployee && (
//     <Card className="overflow-hidden">
//         <CardHeader className="pb-3">
//             <CardTitle className="flex items-center gap-2 text-sm">
//                 <Clock className="h-4 w-4 text-slate-500" />

//                 {new Date(`${selectedKey}T00:00:00`).toLocaleDateString(
//                     "en-US",
//                     {
//                         weekday: "short",
//                         day: "numeric",
//                         month: "short",
//                         year: "numeric",
//                     }
//                 )}
//             </CardTitle>
//         </CardHeader>

//         <CardContent className="space-y-4">

//             {/* Employee */}
//             <div>
//                 <p className="text-sm font-semibold text-slate-800">
//                     {selectedEmployee.name}
//                 </p>

//                 <p
//                     className={cn(
//                         "mt-1 text-xs font-medium",
//                         statusMeta[selectedRecord.status].text
//                     )}
//                 >
//                     {statusMeta[selectedRecord.status].label}
//                 </p>
//             </div>

//             {/* Check In / Check Out */}
//             <div className="space-y-3">

//                 {/* Check In */}
//                 <div className="flex items-center gap-3 rounded-lg border p-3">
//                     <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
//                         <LogIn className="h-5 w-5 text-emerald-500" />
//                     </div>

//                     <div className="min-w-0">
//                         <p className="text-xs font-semibold text-emerald-600">
//                             Check In
//                         </p>

//                         <p className="mt-1 text-sm font-medium text-slate-700">
//                             {selectedRecord.clockIn || "--"}
//                         </p>
//                     </div>
//                 </div>

//                 {/* Check Out */}
//                 <div className="flex items-center gap-3 rounded-lg border p-3">
//                     <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50">
//                         <LogOut className="h-5 w-5 text-orange-500" />
//                     </div>

//                     <div className="min-w-0">
//                         <p className="text-xs font-semibold text-orange-500">
//                             Check Out
//                         </p>

//                         <p className="mt-1 text-sm font-medium text-slate-700">
//                             {selectedRecord.clockOut || "--"}
//                         </p>
//                     </div>
//                 </div>

//             </div>

//             {/* Total Hours */}
//             <div className="flex items-center justify-between border-t pt-3">
//                 <span className="text-sm font-semibold text-slate-700">
//                     Total hours
//                 </span>

//                 <span className="rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
//                     {selectedRecord.workingHours}h
//                 </span>
//             </div>

//         </CardContent>
//     </Card>
// )}

//             <Card>
//             <CardHeader>
//                 <CardTitle className="flex items-center gap-2 text-base">
//                 <PartyPopper className="h-4 w-4" />
//                 Upcoming Holidays
//                 </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-3">
//                 {upcomingHolidays.length === 0 && (
//                 <p className="text-sm text-muted-foreground">No upcoming holidays.</p>
//                 )}
//                 {upcomingHolidays.map((h:any) => {
//                 const d = new Date(`${h.date}T00:00:00`);
//                 return (
//                     <div key={h.date} className="flex items-center gap-3 rounded-md border p-2">
//                     <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-muted text-xs">
//                         <span className="font-semibold leading-none">{d.getDate()}</span>
//                         <span className="text-[10px] text-muted-foreground">
//                         {d.toLocaleDateString("en-US", { month: "short" })}
//                         </span>
//                         </div>
//                         <div>
//                         <p className="text-sm font-medium">{h.name}</p>
//                         <p className="text-xs text-muted-foreground">
//                         {d.toLocaleDateString("en-US", { weekday: "long" })}
//                         </p>
//                     </div>
//                     </div>
//                 );
//                 })}
//             </CardContent>
//             </Card>
//         </div>
//         </div>
//     </div>
//     </DashboardLayout>
// );
// }

// function Stat({ label, value }: { label: string; value: string | number }) {
//     return (
//     <div className="rounded-md border p-3">
//         <p className="text-xs text-muted-foreground">{label}</p>
//         <p className="mt-1 text-lg font-semibold">{value}</p>
//     </div>
//     );
// }






// import { createFileRoute } from "@tanstack/react-router";
// import { useEffect, useMemo, useState } from "react";
// import { RotateCcw, Plus, Pencil, Trash2, X } from "lucide-react";
// import {
//     ChevronLeft,
//     ChevronRight,
//     CalendarDays,
//     PartyPopper,
//     Clock,
//     LogIn,
//     LogOut,
//     } from "lucide-react";
//     import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

//     import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
//     import { Label } from "@/components/ui/label";
//     import { Input } from "@/components/ui/input";
//     import { Button } from "@/components/ui/button";
//     import {
//     Select,
//     SelectContent,
//     SelectItem,
//     SelectTrigger,
//     SelectValue,
//     } from "@/components/ui/select";

//     import { DashboardLayout } from "@/components/layout/DashboardLayout";
//     import { cn } from "@/lib/utils";
//     import { attendanceApi } from "@/api/attendance";
//     import { holidaysApi, type Holiday, type HolidayPayload } from "@/api/holiday";
//     import { useAppStore } from "@/store/useAppStore";
    
//     export const Route = createFileRoute("/employeeworkcalendar")({
//     head: () => ({
//         meta: [
//         { title: "Employee Work Calendar — HR Settings" },
//         {
//             name: "description",
//             content:
//             "Search an employee and view attendance, working hours and leaves on a calendar.",
//         },
//         ],
//     }),
//     component: EmployeeWorkCalendarPage,
//     });

//     const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

//     type ApiAttendanceRecord = {
//     id: string;
//     employee: string;
//     employeeId: string;
//     department: string;
//     date: string;

//     checkIn: string | null;
//     checkOut: string | null;

//     workingHours: string;
//     totalWorkMinutes: number;

//     completedWorkMinutes: number;
//     completedWorkingHours: string;

//     totalBreakMinutes: number;
//     liveBreakMinutes: number;

//     freeBreakMinutes: number;
//     excessBreakMinutes: number;

//     effectiveWorkMinutes: number;
//     effectiveWorkingHours: string;

//     requiredWorkMinutes: number;
//     requiredWorkingHours: string;

//     remainingWorkMinutes: number;
//     remainingWorkingHours: string;

//     isWorkingTimeComplete: boolean;

//     liveCurrentSessionMinutes: number;
//     liveWorkMinutes: number;
//     liveWorkingHours: string;

//     liveEffectiveWorkMinutes: number;
//     liveEffectiveWorkingHours: string;

//     liveRemainingWorkMinutes: number;
//     liveRemainingWorkingHours: string;

//     liveWorkingTimeComplete: boolean;

//     status: string;
//     currentState: string;

//     sessions: {
//         in: string;
//         out: string | null;
//         source: string;
//         camera_id: string | null;
//         similarity: number;
//     }[];

//     lastAction: string;
//     lastActionAt: string;

//     lastSimilarity: number;

//     createdAt: string;
//     updatedAt: string;
//     };

//     function toKey(date: Date) {
//     const year = date.getFullYear();
//     const month = String(date.getMonth() + 1).padStart(2, "0");
//     const day = String(date.getDate()).padStart(2, "0");

//     return `${year}-${month}-${day}`;
//     }

//     function monthLabel(date: Date) {
//     return date.toLocaleDateString("en-US", {
//         month: "long",
//         year: "numeric",
//     });
//     }

//     function formatTime(dateTime: string | null | undefined) {
//     if (!dateTime) return "--";

//     const date = new Date(dateTime);

//     if (Number.isNaN(date.getTime())) return "--";

//     return date.toLocaleTimeString("en-GB", {
//         hour: "2-digit",
//         minute: "2-digit",
//         hour12: false,
//     });
//     }

//     function formatHours(value: string | number | null | undefined) {
//     if (value === null || value === undefined || value === "") {
//         return "00:00 hours";
//     }

//     const text = String(value).trim();

//     return `${text} hours`;
// }


//     function getStatus(record: ApiAttendanceRecord | undefined) {
//     if (!record) return null;

//     const status = record.status?.toLowerCase();

//     if (status === "present") return "present";
//     if (status === "absent") return "absent";
//     if (status === "holiday") return "holiday";
//     if (status === "half-day") return "half-day";
//     if (status === "half_day") return "half-day";
//     if (status === "week-off") return "week-off";
//     if (status === "week_off") return "week-off";

//     return status;
//     }

//     function statusText(record: ApiAttendanceRecord | undefined) {
//     const status = getStatus(record);

//     switch (status) {
//         case "present":
//         return "Full Day";

//         case "half-day":
//         return "Half Day";

//         case "absent":
//         return "Absent";

//         case "holiday":
//         return "Holiday";

//         case "week-off":
//         return "Week Off";

//         default:
//         return "";
//     }
//     }

//     function statusClasses(record: ApiAttendanceRecord | undefined) {
//     const status = getStatus(record);

//     switch (status) {
//         case "present":
//         return {
//             bg: "bg-emerald-50",
//             text: "text-emerald-600",
//         };

//         case "half-day":
//         return {
//             bg: "bg-amber-50",
//             text: "text-amber-600",
//         };

//         case "absent":
//         return {
//             bg: "bg-rose-50",
//             text: "text-rose-600",
//         };

//         case "holiday":
//         return {
//             bg: "bg-sky-50",
//             text: "text-sky-600",
//         };

//         case "week-off":
//         return {
//             bg: "bg-slate-50",
//             text: "text-slate-500",
//         };

//         default:
//         return {
//             bg: "bg-white",
//             text: "text-slate-500",
//         };
//     }
//     }

//     function EmployeeWorkCalendarPage() {
//     const today = useMemo(() => new Date(), []);
//     const todayKey = toKey(today);
//     const handleRefresh = async () => {
//         if (!isEmployee) setEmployeeId("");
//         setMonthValue(
//             `${today.getFullYear()}-${String(
//                 today.getMonth() + 1
//             ).padStart(2, "0")}`
//         );
//         setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
//         setSelectedKey(null);

//         await refetch();
//     };
//     const currentUser = useAppStore((state) => state.user);
//     const isEmployee = currentUser?.role === "user";
//     const canManageHolidays = ["admin", "super_admin"].includes(String(currentUser?.role || "").toLowerCase());
//     const queryClient = useQueryClient();
//     const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
//     const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
//     const [holidayName, setHolidayName] = useState("");
//     const [holidayFromDate, setHolidayFromDate] = useState("");
//     const [holidayToDate, setHolidayToDate] = useState("");
//     const [holidayDescription, setHolidayDescription] = useState("");
//     const [holidayType, setHolidayType] = useState("public");

//     const { data: holidayRecords = [], isLoading: holidaysLoading } = useQuery<Holiday[]>({
//         queryKey: ["holidays", "upcoming"],
//         queryFn: () => holidaysApi.list(true),
//     });
//     const refreshHolidays = () => queryClient.invalidateQueries({ queryKey: ["holidays"] });

//     function resetHolidayForm() {
//         setEditingHoliday(null);
//         setHolidayName("");
//         setHolidayFromDate("");
//         setHolidayToDate("");
//         setHolidayDescription("");
//         setHolidayType("public");
//     }
//     function openAddHolidayDialog() {
//         resetHolidayForm();
//         setHolidayDialogOpen(true);
//     }
//     function openEditHolidayDialog(holiday: Holiday) {
//         setEditingHoliday(holiday);
//         setHolidayName(holiday.name);
//         setHolidayFromDate(holiday.from_date.slice(0, 10));
//         setHolidayToDate(holiday.to_date.slice(0, 10));
//         setHolidayDescription(holiday.description || "");
//         setHolidayType(holiday.holiday_type || "public");
//         setHolidayDialogOpen(true);
//     }
//     const saveHolidayMutation = useMutation({
//         mutationFn: (payload: HolidayPayload) => editingHoliday
//             ? holidaysApi.update(editingHoliday.id, payload)
//             : holidaysApi.create(payload),
//         onSuccess: async () => {
//             await refreshHolidays();
//             setHolidayDialogOpen(false);
//             resetHolidayForm();
//         },
//     });
//     const deleteHolidayMutation = useMutation({
//         mutationFn: (id: string) => holidaysApi.delete(id),
//         onSuccess: refreshHolidays,
//     });
//     function submitHoliday(event: React.FormEvent<HTMLFormElement>) {
//         event.preventDefault();
//         if (holidayToDate < holidayFromDate) return;
//         saveHolidayMutation.mutate({
//             name: holidayName.trim(),
//             from_date: holidayFromDate,
//             to_date: holidayToDate,
//             description: holidayDescription.trim() || null,
//             holiday_type: holidayType,
//         });
//     }
//     const [employeeId, setEmployeeId] = useState(() =>
//         currentUser?.employee_id || currentUser?.id || ""
//     );

//     // Selected month: YYYY-MM
//     const [monthValue, setMonthValue] = useState(() => {
//         return `${today.getFullYear()}-${String(
//             today.getMonth() + 1
//         ).padStart(2, "0")}`;
//     });

//     // Calendar ka current month
//     const [cursor, setCursor] = useState(
//         () => new Date(today.getFullYear(), today.getMonth(), 1)
//     );

//     const [selectedKey, setSelectedKey] = useState<string | null>(null);

//     // Month dropdown change hone par calendar update hoga
//     useEffect(() => {
//         const [year, month] = monthValue.split("-").map(Number);

//         if (!year || !month || month < 1 || month > 12) return;

//         setCursor(new Date(year, month - 1, 1));
//         setSelectedKey(null);
//     }, [monthValue]);

//     /*
//      * SAME API
//      */
//     const {
//         data = [],
//         isLoading,
//         isError,
//         refetch,
//     } = useQuery<ApiAttendanceRecord[]>({
//         queryKey: ["attendance"],
//         queryFn: () => attendanceApi.list() as Promise<ApiAttendanceRecord[]>,
//     });

//     /*
//      * Employee dropdown API se banega.
//      */
//     /*
//     * Employee dropdown API se banega.
//     */
//     const employeeOptions = useMemo(() => {
//         const map = new Map<
//         string,
//         {
//             employeeId: string;
//             employee: string;
//             department: string;
//         }
//         >();

//         data.forEach((record) => {
//         if (!map.has(record.employeeId)) {
//             map.set(record.employeeId, {
//             employeeId: record.employeeId,
//             employee: record.employee,
//             department: record.department,
//             });
//         }
//         });

//         return Array.from(map.values());
//     }, [data]);

//     /*
//     * Selected employee ke records
//     */
//     const employeeRecords = useMemo(() => {
//         if (!employeeId) return [];

//         return data.filter((record) => record.employeeId === employeeId);
//     }, [data, employeeId]);
//     const monthOptions = useMemo(() => {
//     const years = new Set<number>([today.getFullYear()]);

//     data.forEach((record) => {
//         const recordDate = new Date(`${record.date}T00:00:00`);

//         if (!Number.isNaN(recordDate.getTime())) {
//             years.add(recordDate.getFullYear());
//         }
//     });

//     return Array.from(years)
//         .sort((a, b) => b - a)
//         .flatMap((year) =>
//             Array.from({ length: 12 }, (_, index) => {
//                 const month = index + 1;

//                 return {
//                     value: `${year}-${String(month).padStart(2, "0")}`,
//                     label: new Date(year, index, 1).toLocaleDateString(
//                         "en-US",
//                         { month: "long", year: "numeric" }
//                     ),
//                 };
//             })
//         );
// }, [data, today]);

//     /*
//     * date => API record
//     */
//     const recordMap = useMemo(() => {
//         const map = new Map<string, ApiAttendanceRecord>();

//         employeeRecords.forEach((record) => {
//         map.set(record.date, record);
//         });

//         return map;
//     }, [employeeRecords]);

//     /*
//     * Calendar 42 days
//     */
//     const days = useMemo(() => {
//         const first = new Date(
//         cursor.getFullYear(),
//         cursor.getMonth(),
//         1,
//         );

//         const start = new Date(first);

//         start.setDate(first.getDate() - first.getDay());

//         return Array.from({ length: 42 }, (_, i) => {
//         const d = new Date(start);

//         d.setDate(start.getDate() + i);

//         return d;
//         });
//     }, [cursor]);

//     // const inRange = (key: string) => {
//     //     if (dateFrom && key < dateFrom) return false;
//     //     if (dateTo && key > dateTo) return false;

//     //     return true;
//     // };

//     /*
//     * Calendar date ka API record
//     */
//     const recordFor = (date: Date) => {
//         if (!employeeId) return undefined;

//         const key = toKey(date);

//         // if (!inRange(key)) return undefined;

//         return recordMap.get(key);
//     };

//     /*
//     * Current month ke records
//     */
//     const monthRecords = useMemo(() => {
//     if (!employeeId) return [];

//     const year = cursor.getFullYear();
//     const month = cursor.getMonth();

//     return employeeRecords.filter((record) => {
//         const recordDate = new Date(`${record.date}T00:00:00`);

//         return (
//             !Number.isNaN(recordDate.getTime()) &&
//             recordDate.getFullYear() === year &&
//             recordDate.getMonth() === month
//         );
//     });
// }, [employeeId, employeeRecords, cursor]);

//     /*
//     * Statistics
//     */
//     const totals = useMemo(() => {
//         const present = monthRecords.filter(
//         (record) => getStatus(record) === "present",
//         ).length;

//         const leaves = monthRecords.filter(
//         (record) => getStatus(record) === "absent",
//         ).length;

//         const halfDays = monthRecords.filter(
//         (record) => getStatus(record) === "half-day",
//         ).length;

//         const holidays = monthRecords.filter(
//         (record) => getStatus(record) === "holiday",
//         ).length;

//         const weekOffs = monthRecords.filter(
//         (record) => getStatus(record) === "week-off",
//         ).length;

//         const totalMinutes = monthRecords.reduce(
//         (sum, record) => sum + (record.totalWorkMinutes || 0),
//         0,
//         );

//         return {
//         present,
//         leaves,
//         halfDays,
//         holidays,
//         weekOffs,
//         totalMinutes,
//         };
//     }, [monthRecords]);

//     const totalHours = useMemo(() => {
//         const hours = Math.floor(totals.totalMinutes / 60);
//         const minutes = totals.totalMinutes % 60;

//         return `${hours}h ${String(minutes).padStart(2, "0")}m`;
//     }, [totals.totalMinutes]);

//     /*
//     * Selected record
//     */
//     const selectedRecord = useMemo(() => {
//     if (!selectedKey || !employeeId) return undefined;

//     return recordMap.get(selectedKey);
// }, [selectedKey, employeeId, recordMap]);

//     const selectedEmployee = useMemo(() => {
//         return employeeOptions.find(
//         (employee) => employee.employeeId === employeeId,
//         );
//     }, [employeeOptions, employeeId]);

//     /*
//     * No hard-coded holidays.
//     * API me holiday records honge to calendar me wahi Holiday dikhega.
//     */
//     const upcomingHolidays = useMemo(() => {
//         return [...holidayRecords]
//             .filter((holiday) => holiday.to_date.slice(0, 10) >= todayKey)
//             .sort((a, b) => a.from_date.localeCompare(b.from_date))
//             .slice(0, 8);
//     }, [holidayRecords, todayKey]);

//     return (
//         <DashboardLayout
//         title="Employee Work Calendar"
//         description="Track employee working hours, leaves and attendance with a monthly calendar."
//         breadcrumbs={[
//             {
//             label: "Employee Work Calendar",
//             },
//         ]}
//         >
//         <div className="space-y-6">
//             {/* Filters */}
//             <Card className="mb-6">
//             <CardContent className="grid grid-cols-1 items-end gap-4 pt-6 md:grid-cols-[1fr_1fr_auto]">
//                 {/* Employee selector is only available to administrators. */}
//                 {!isEmployee && <div className="space-y-2">
//                 <Label htmlFor="employee">
//                     Employee
//                 </Label>

//                 <Select
//                     value={employeeId}
//                     onValueChange={(value) => {
//                     setEmployeeId(value);
//                     setSelectedKey(null);
//                     }}
//                 >
//                     <SelectTrigger id="employee">
//                     <SelectValue placeholder="Search employee" />
//                     </SelectTrigger>

//                     <SelectContent>
//                     {employeeOptions.map((employee) => (
//                         <SelectItem
//                         key={employee.employeeId}
//                         value={employee.employeeId}
//                         >
//                         {employee.employee} —{" "}
//                         {employee.employeeId}
//                         </SelectItem>
//                     ))}
//                     </SelectContent>
//                 </Select>
//                 </div>}
// {/* Month Dropdown */}
// <div className="space-y-2">
//     <Label htmlFor="month">Select Month</Label>

//     <Select
//         value={monthValue}
//         onValueChange={setMonthValue}
//     >
//         <SelectTrigger id="month">
//             <SelectValue placeholder="Select month" />
//         </SelectTrigger>

//         <SelectContent>
//             {monthOptions.map((month) => (
//                 <SelectItem
//                     key={month.value}
//                     value={month.value}
//                 >
//                     {month.label}
//                 </SelectItem>
//             ))}
//         </SelectContent>
//     </Select>
// </div>
//                 {/* From */}
//                 {/* <div className="space-y-2">
//                 <Label htmlFor="from">
//                     Date from
//                 </Label>

//                 <Input
//                     id="from"
//                     type="date"
//                     value={dateFrom}
//                     onChange={(e) =>
//                     setDateFrom(e.target.value)
//                     }
//                 />
//                 </div> */}

//                 {/* To */}
//                 {/* <div className="space-y-2">
//                 <Label htmlFor="to">
//                     Date to
//                 </Label>

//                 <Input
//                     id="to"
//                     type="date"
//                     value={dateTo}
//                     onChange={(e) =>
//                     setDateTo(e.target.value)
//                     }
//                 />
//                 </div> */}
//                 <div>
//     <Button
//         onClick={handleRefresh}
//         variant="outline"
//         className="w-full md:w-auto"
//     >
//         <RotateCcw className="mr-2 h-4 w-4" />
//         Refresh
//     </Button>
// </div>
//             </CardContent>
//             </Card>

//             {isLoading && (
//             <Card>
//                 <CardContent className="py-10 text-center text-sm text-muted-foreground">
//                 Loading attendance...
//                 </CardContent>
//             </Card>
//             )}

//             {isError && (
//             <Card>
//                 <CardContent className="flex flex-col items-center gap-3 py-10">
//                 <p className="text-sm text-destructive">
//                     Attendance data load nahi ho saka.
//                 </p>

//                 <Button
//                     variant="outline"
//                     onClick={() => refetch()}
//                 >
//                     Try Again
//                 </Button>
//                 </CardContent>
//             </Card>
//             )}

//             {!isLoading && !isError && (
//             <div className="grid gap-6 lg:grid-cols-3">
//                 {/* Calendar */}
//                 <Card className="lg:col-span-2">
//                 <CardHeader className="flex flex-row items-center justify-between space-y-0">
//                     <CardTitle className="flex items-center gap-2 text-base">
//                     <CalendarDays className="h-4 w-4" />

//                     {monthLabel(cursor)}
//                     </CardTitle>

//                     <div className="flex items-center gap-1">
//                     <Button
//                         variant="outline"
//                         size="icon"
//                         aria-label="Previous month"
//                         onClick={() =>
//                         setCursor(
//                             new Date(
//                             cursor.getFullYear(),
//                             cursor.getMonth() - 1,
//                             1,
//                             ),
//                         )
//                         }
//                     >
//                         <ChevronLeft className="h-4 w-4" />
//                     </Button>

//                     <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() =>
//                         setCursor(
//                             new Date(
//                             today.getFullYear(),
//                             today.getMonth(),
//                             1,
//                             ),
//                         )
//                         }
//                     >
//                         Today
//                     </Button>

//                     <Button
//                         variant="outline"
//                         size="icon"
//                         aria-label="Next month"
//                         onClick={() =>
//                         setCursor(
//                             new Date(
//                             cursor.getFullYear(),
//                             cursor.getMonth() + 1,
//                             1,
//                             ),
//                         )
//                         }
//                     >
//                         <ChevronRight className="h-4 w-4" />
//                     </Button>
//                     </div>
//                 </CardHeader>

//                 <CardContent>
//                     <div className="relative mt-3 overflow-visible rounded-xl border bg-white">
//                     {/* Week Header */}
//                     <div className="grid grid-cols-7 overflow-hidden rounded-t-xl bg-[#2563eb] text-xs font-semibold text-white">
//                         {WEEK_DAYS.map((day) => (
//                         <div
//                             key={day}
//                             className="border-r border-blue-400/40 py-2.5 text-center last:border-r-0"
//                         >
//                             {day}
//                         </div>
//                         ))}
//                     </div>

//                     {/* Calendar */}
//                     <div className="grid grid-cols-7">
//                         {days.map((d) => {
//                         const key = toKey(d);

//                         const record = recordFor(d);

//                         const isCurrentMonth =
//                             d.getMonth() ===
//                             cursor.getMonth();

//                         const isToday =
//                             key === todayKey;

//                         const status = getStatus(record);

//                         const classes =
//                             statusClasses(record);

//                         return (
//                             <button
//                             key={key}
//                             type="button"
//                             onClick={() => {
//                                 if (record) {
//                                 setSelectedKey(key);
//                                 }
//                             }}
//                             className={cn(
//                                 "relative h-24 border-r border-b p-2 text-left transition-all",
//                                 "hover:z-20 hover:bg-blue-50",
//                                 classes.bg,
//                                 !isCurrentMonth &&
//                                 "opacity-40",
//                                 isToday &&
//                                 "ring-2 ring-inset ring-blue-500",
//                                 selectedKey === key &&
//                                 "z-20 ring-2 ring-inset ring-blue-500",
//                             )}
//                             >
//                             {/* Date */}
//                             <span
//                                 className={cn(
//                                 "absolute right-2 top-2 text-sm font-semibold",
//                                 isToday
//                                     ? "text-blue-600"
//                                     : "text-slate-700",
//                                 )}
//                             >
//                                 {String(
//                                 d.getDate(),
//                                 ).padStart(2, "0")}
//                             </span>

//                             {/* Today dot */}
//                             {isToday && (
//                                 <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
//                             )}

//                             {/* Status */}
//                             <div className="absolute left-3 right-2 top-10">
//                                 {!employeeId ? (
//                                 <p className="text-[10px] text-slate-400">
                                
//                                 </p>
//                                 ) : record ? (
//                                 <>
//                                     <p
//                                     className={cn(
//                                         "text-[11px] font-medium leading-4",
//                                         classes.text,
//                                     )}
//                                     >
//                                     {statusText(record)}
//                                     </p>

//                                     {status === "present" && (
//     <p className="mt-1 text-[10px] text-slate-500">
//         {formatHours(
//             record.liveWorkingHours ||
//             record.workingHours
//         )}
//     </p>
// )}

//                                     {status === "half-day" && (
//     <p className="mt-1 text-[10px] text-slate-500">
//         {formatHours(record.workingHours)}
//     </p>
// )}
//                                 </>
//                                 ) : (
//                                 <p className="text-[10px] text-slate-400">
//                                     No record
//                                 </p>
//                                 )}
//                             </div>
//                             </button>
//                         );
//                         })}
//                     </div>
//                     </div>

//                     {/* Legend */}
//                     <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
//                     <Legend
//                         color="bg-emerald-500"
//                         text="Present"
//                     />

//                     <Legend
//                         color="bg-amber-500"
//                         text="Half Day"
//                     />

//                     <Legend
//                         color="bg-rose-500"
//                         text="Absent"
//                     />

//                     <Legend
//                         color="bg-sky-500"
//                         text="Holiday"
//                     />

//                     <Legend
//                         color="bg-slate-400"
//                         text="Week Off"
//                     />

//                     <Legend
//                         color="bg-primary"
//                         text="Today"
//                     />
//                     </div>

//                     {/* Stats */}
//                     {employeeId && (
//                     <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
//                         <Stat
//                         label="Working hours"
//                         value={totalHours}
//                         />

//                         <Stat
//                         label="Present days"
//                         value={totals.present}
//                         />

//                         <Stat
//                         label="Half days"
//                         value={totals.halfDays}
//                         />

//                         <Stat
//                         label="Leaves"
//                         value={totals.leaves}
//                         />

//                         <Stat
//                         label="Holidays"
//                         value={totals.holidays}
//                         />
//                     </div>
//                     )}

//                     {!employeeId && (
//                     <p className="mt-6 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
//                         Select an employee above to load
//                         attendance details.
//                     </p>
//                     )}
//                 </CardContent>
//                 </Card>

//                 {/* Right Column */}
//                 <div className="space-y-6">
//                 {/* Selected Day */}
//                 {selectedRecord && selectedEmployee && (
//                     <Card className="overflow-hidden">
//                     <CardHeader className="pb-3">
//                         <CardTitle className="flex items-center gap-2 text-sm">
//                         <Clock className="h-4 w-4 text-slate-500" />

//                         {new Date(
//                             `${selectedRecord.date}T00:00:00`,
//                         ).toLocaleDateString(
//                             "en-US",
//                             {
//                             weekday: "short",
//                             day: "numeric",
//                             month: "short",
//                             year: "numeric",
//                             },
//                         )}
//                         </CardTitle>
//                     </CardHeader>

//                     <CardContent className="space-y-4">
//                         {/* Employee */}
//                         <div>
//                         <p className="text-sm font-semibold text-slate-800">
//                             {selectedEmployee.employee}
//                         </p>

//                         <p className="text-xs text-slate-500">
//                             {selectedEmployee.employeeId}
//                         </p>

//                         <p
//                             className={cn(
//                             "mt-1 text-xs font-medium",
//                             statusClasses(
//                                 selectedRecord,
//                             ).text,
//                             )}
//                         >
//                             {statusText(
//                             selectedRecord,
//                             )}
//                         </p>
//                         </div>

//                         {/* Check In */}
//                         <div className="flex items-center gap-3 rounded-lg border p-3">
//                         <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
//                             <LogIn className="h-5 w-5 text-emerald-500" />
//                         </div>

//                         <div className="min-w-0">
//                             <p className="text-xs font-semibold text-emerald-600">
//                             Check In
//                             </p>

//                             <p className="mt-1 text-sm font-medium text-slate-700">
//                             {formatTime(
//                                 selectedRecord.checkIn,
//                             )}
//                             </p>
//                         </div>
//                         </div>

//                         {/* Check Out */}
//                         <div className="flex items-center gap-3 rounded-lg border p-3">
//                         <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50">
//                             <LogOut className="h-5 w-5 text-orange-500" />
//                         </div>

//                         <div className="min-w-0">
//                             <p className="text-xs font-semibold text-orange-500">
//                             Check Out
//                             </p>

//                             <p className="mt-1 text-sm font-medium text-slate-700">
//                             {formatTime(
//                                 selectedRecord.checkOut,
//                             )}
//                             </p>
//                         </div>
//                         </div>

//                         {/* Total Hours */}
//                         <div className="flex items-center justify-between border-t pt-3">
//                         <span className="text-sm font-semibold text-slate-700">
//                             Total hours
//                         </span>

//                         <span className="rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
//                             {formatHours(
//                             selectedRecord.workingHours,
//                             )}
//                         </span>
//                         </div>

//                         {/* Current State */}
//                         <div className="flex items-center justify-between">
//                         <span className="text-sm text-muted-foreground">
//                             Current state
//                         </span>

//                         <span className="rounded-md bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
//                             {selectedRecord.currentState ||
//                             "--"}
//                         </span>
//                         </div>

//                         {/* Remaining */}
//                         <div className="flex items-center justify-between">
//                         <span className="text-sm text-muted-foreground">
//                             Remaining
//                         </span>

//                         <span className="text-sm font-semibold">
//                             {selectedRecord.liveRemainingWorkingHours ||
//                             selectedRecord.remainingWorkingHours ||
//                             "--"}
//                         </span>
//                         </div>
//                     </CardContent>
//                     </Card>
//                 )}

//                 {/* Upcoming Holidays */}
//                 <Card>
//                     <CardHeader>
//                     <div className="flex items-center justify-between gap-3">
//                         <CardTitle className="flex items-center gap-2 text-base">
//                             <PartyPopper className="h-4 w-4" />
//                             Upcoming Holidays
//                         </CardTitle>
//                         {canManageHolidays && (
//                             <Button type="button" size="sm" onClick={openAddHolidayDialog}>
//                                 <Plus className="mr-1 h-4 w-4" /> Add
//                             </Button>
//                         )}
//                     </div>
//                     </CardHeader>
//                     <CardContent className="space-y-3">
//                     {holidaysLoading && <p className="text-sm text-muted-foreground">Loading holidays...</p>}
//                     {!holidaysLoading && upcomingHolidays.length === 0 && (
//                         <p className="text-sm text-muted-foreground">No upcoming holidays.</p>
//                     )}
//                     {upcomingHolidays.map((holiday) => {
//                         const d = new Date(`${holiday.from_date.slice(0, 10)}T00:00:00`);
//                         const endDate = new Date(`${holiday.to_date.slice(0, 10)}T00:00:00`);
//                         const dateLabel = holiday.from_date === holiday.to_date
//                             ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
//                             : `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
//                         return (
//                             <div key={holiday.id} className="flex items-center gap-3 rounded-md border p-2">
//                                 <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-muted text-xs">
//                                     <span className="font-semibold leading-none">{d.getDate()}</span>
//                                     <span className="text-[10px] text-muted-foreground">{d.toLocaleDateString("en-US", { month: "short" })}</span>
//                                 </div>
//                                 <div className="min-w-0 flex-1">
//                                     <p className="text-sm font-medium">{holiday.name}</p>
//                                     <p className="text-xs text-muted-foreground">
//                                         {dateLabel}
//                                         {holiday.description ? ` · ${holiday.description}` : ""}
//                                     </p>
//                                 </div>
//                                 {canManageHolidays && (
//                                     <div className="flex shrink-0 items-center gap-1">
//                                         <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${holiday.name}`}
//                                             onClick={() => openEditHolidayDialog(holiday)}>
//                                             <Pencil className="h-4 w-4" />
//                                         </Button>
//                                         <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${holiday.name}`}
//                                             disabled={deleteHolidayMutation.isPending}
//                                             onClick={() => {
//                                                 if (window.confirm(`Delete "${holiday.name}"?`)) deleteHolidayMutation.mutate(holiday.id);
//                                             }}>
//                                             <Trash2 className="h-4 w-4 text-destructive" />
//                                         </Button>
//                                     </div>
//                                 )}
//                             </div>
//                         );
//                     })}
//                     </CardContent>
//                 </Card>

//                 {canManageHolidays && holidayDialogOpen && (
//                     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
//                         role="presentation"
//                         onMouseDown={(event) => {
//                             if (event.target === event.currentTarget) {
//                                 setHolidayDialogOpen(false);
//                                 resetHolidayForm();
//                             }
//                         }}>
//                         <div role="dialog" aria-modal="true" aria-labelledby="holiday-dialog-title"
//                             className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
//                             <div className="mb-5 flex items-center justify-between">
//                                 <h2 id="holiday-dialog-title" className="text-lg font-semibold">
//                                     {editingHoliday ? "Edit Holiday" : "Add Holiday"}
//                                 </h2>
//                                 <Button type="button" variant="ghost" size="icon" aria-label="Close"
//                                     onClick={() => { setHolidayDialogOpen(false); resetHolidayForm(); }}>
//                                     <X className="h-4 w-4" />
//                                 </Button>
//                             </div>
//                             <form onSubmit={submitHoliday} className="space-y-4">
//                                 <div className="space-y-2">
//                                     <Label htmlFor="holiday-name">Holiday Name</Label>
//                                     <Input id="holiday-name" value={holidayName}
//                                         onChange={(event) => setHolidayName(event.target.value)}
//                                         placeholder="e.g. Independence Day" required />
//                                 </div>
//                                 <div className="space-y-2">
//                                     <Label htmlFor="holiday-from-date">From Date</Label>
//                                     <Input id="holiday-from-date" type="date" value={holidayFromDate}
//                                         onChange={(event) => setHolidayFromDate(event.target.value)} required />
//                                 </div>
//                                 <div className="space-y-2">
//                                     <Label htmlFor="holiday-to-date">To Date</Label>
//                                     <Input id="holiday-to-date" type="date" min={holidayFromDate || undefined}
//                                         value={holidayToDate}
//                                         onChange={(event) => setHolidayToDate(event.target.value)} required />
//                                 </div>
//                                 <div className="space-y-2">
//                                     <Label htmlFor="holiday-type">Holiday Type</Label>
//                                     <Select value={holidayType} onValueChange={setHolidayType}>
//                                         <SelectTrigger id="holiday-type"><SelectValue placeholder="Select holiday type" /></SelectTrigger>
//                                         <SelectContent>
//                                             <SelectItem value="public">Public</SelectItem>
//                                             <SelectItem value="company">Company</SelectItem>
//                                             <SelectItem value="optional">Optional</SelectItem>
//                                         </SelectContent>
//                                     </Select>
//                                 </div>
//                                 <div className="space-y-2">
//                                     <Label htmlFor="holiday-description">Description</Label>
//                                     <Input id="holiday-description" value={holidayDescription}
//                                         onChange={(event) => setHolidayDescription(event.target.value)}
//                                         placeholder="Optional description" />
//                                 </div>
//                                 {saveHolidayMutation.isError && (
//                                     <p className="text-sm text-destructive">Unable to save holiday. Please check the details and try again.</p>
//                                 )}
//                                 <div className="flex justify-end gap-2 pt-2">
//                                     <Button type="button" variant="outline"
//                                         onClick={() => { setHolidayDialogOpen(false); resetHolidayForm(); }}>Cancel</Button>
//                                     <Button type="submit" disabled={saveHolidayMutation.isPending}>
//                                         {saveHolidayMutation.isPending ? "Saving..." : editingHoliday ? "Update Holiday" : "Save Holiday"}
//                                     </Button>
//                                 </div>
//                             </form>
//                         </div>
//                     </div>
//                 )}
//                 </div>
//             </div>
//             )}
//         </div>
//         </DashboardLayout>
//     );
//     }

//     function Stat({
//     label,
//     value,
//     }: {
//     label: string;
//     value: string | number;
//     }) {
//     return (
//         <div className="rounded-md border p-3">
//         <p className="text-xs text-muted-foreground">
//             {label}
//         </p>

//         <p className="mt-1 text-lg font-semibold">
//             {value}
//         </p>
//         </div>
//     );
//     }

//     function Legend({
//     color,
//     text,
//     }: {
//     color: string;
//     text: string;
//     }) {
//     return (
//         <span className="flex items-center gap-1.5">
//         <span
//             className={cn(
//             "h-2 w-2 rounded-full",
//             color,
//             )}
//         />
//         {text}
//         </span>
//     );
// }





















//============= dummy

// import { createFileRoute } from "@tanstack/react-router";
// import { useMemo, useState } from "react";
// import { ChevronLeft, ChevronRight, CalendarDays, PartyPopper, Clock ,LogIn,
//     LogOut, } from "lucide-react";

// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Label } from "@/components/ui/label";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import {
//     Select,
//     SelectContent,
//     SelectItem,
//     SelectTrigger,
//     SelectValue,
// } from "@/components/ui/select";
// import { cn } from "@/lib/utils";
// import {
//     employees,
//     holidays,
//     getAttendance,
//     statusMeta,
//     toKey,
//     type AttendanceRecord,
// } from "@/lib/attendance-data";
// import { DashboardLayout } from "@/components/layout/DashboardLayout";

// export const Route = createFileRoute("/employeeworkcalendar")({
//     head: () => ({
//     meta: [
//         { title: "Employee Work Calendar — HR Settings" },
//         {
//         name: "description",
//         content:
//             "Search an employee, filter by date range and view working hours, leaves and half days on a calendar with upcoming holidays.",
//         },
//         { property: "og:title", content: "Employee Work Calendar — HR Settings" },
//         {
//         property: "og:description",
//         content: "Track working hours, leaves and half days per employee on a monthly calendar.",
//         },
//     ],
//     }),
//     component: EmployeeWorkCalendarPage,
// });

// const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// function monthLabel(date: Date) {
//     return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
// }

// function EmployeeWorkCalendarPage() {
//     const today = useMemo(() => new Date(), []);
//     const todayKey = toKey(today);

//     const [employeeId, setEmployeeId] = useState<string>("");
//     const [dateFrom, setDateFrom] = useState("");
//     const [dateTo, setDateTo] = useState("");
//     const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
//     const [selectedKey, setSelectedKey] = useState<string | null>(null);

//     const days = useMemo(() => {
//     const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
//     const start = new Date(first);
//     start.setDate(first.getDate() - first.getDay());
//     return Array.from({ length: 42 }, (_, i) => {
//         const d = new Date(start);
//         d.setDate(start.getDate() + i);
//         return d;
//     });
//     }, [cursor]);

//     const inRange = (key: string) => {
//     if (dateFrom && key < dateFrom) return false;
//     if (dateTo && key > dateTo) return false;
//     return true;
//     };

//     const recordFor = (date: Date): AttendanceRecord | null => {
//     if (!employeeId) return null;
//     const key = toKey(date);
//     if (!inRange(key)) return null;
//     return getAttendance(employeeId, date);
//     };

//     const monthRecords = useMemo(() => {
//     if (!employeeId) return [];
//     const out: AttendanceRecord[] = [];
//     const total = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
//     for (let i = 1; i <= total; i++) {
//         const d = new Date(cursor.getFullYear(), cursor.getMonth(), i);
//         if (!inRange(toKey(d))) continue;
//         out.push(getAttendance(employeeId, d));
//     }
//     return out;
//     }, [employeeId, cursor, dateFrom, dateTo]);

//     const totals = useMemo(
//         () => ({
//         hours: monthRecords.reduce((s, r) => s + r.workingHours, 0),
//         leaves: monthRecords.filter((r) => r.status === "absent").length,
//         halfDays: monthRecords.filter((r) => r.status === "half-day").length,
//         present: monthRecords.filter((r) => r.status === "present").length,
//     }),
//     [monthRecords],
//     );

//     const upcomingHolidays = useMemo(
//     () => holidays.filter((h: any) => h.date >= todayKey).slice(0, 8),
//     [todayKey],
//     );

//     const selectedRecord =
//     selectedKey && employeeId ? getAttendance(employeeId, new Date(`${selectedKey}T00:00:00`)) : null;

//     const selectedEmployee = employees.find((e: any) => e.id === employeeId);


//     return (
//     <DashboardLayout
//         title="Employee Work Calendar"
//         description="Track employee working hours, leaves and attendance with a monthly calendar."
//         breadcrumbs={[
//             { label: "Employee Work Calendar" },
//         ]}
//     >
//         <div className="space-y-6">
    

//       {/* Filters */}
//         <Card className="mb-6">
//         <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
//             <div className="space-y-2">
//             <Label htmlFor="employee">Employee</Label>
//             <Select value={employeeId} onValueChange={setEmployeeId}>
//                 <SelectTrigger id="employee">
//                 <SelectValue placeholder="Search employee" />
//                 </SelectTrigger>
//                 <SelectContent>
//                 {employees.map((e: any) => (
//                     <SelectItem key={e.id} value={e.id}>
//                     {e.name} — {e.designation}
//                     </SelectItem>
//                 ))}
//                 </SelectContent>
//             </Select>
//             </div>
//             <div className="space-y-2">
//             <Label htmlFor="from">Date from</Label>
//             <Input
//                 id="from"
//                 type="date"
//                 value={dateFrom}
//                 onChange={(e) => setDateFrom(e.target.value)}
//             />
//             </div>
//             <div className="space-y-2">
//             <Label htmlFor="to">Date to</Label>
//             <Input id="to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
//             </div>
//         </CardContent>
//         </Card>

//         <div className="grid gap-6 lg:grid-cols-3">
//         {/* Calendar */}
//         <Card className="lg:col-span-2">
//             <CardHeader className="flex flex-row items-center justify-between space-y-0">
//             <CardTitle className="flex items-center gap-2 text-base">
//                 <CalendarDays className="h-4 w-4" />
//                 {monthLabel(cursor)}
//             </CardTitle>
//             <div className="flex items-center gap-1">
//                 <Button
//                 variant="outline"
//                 size="icon"
//                 aria-label="Previous month"
//                 onClick={() =>
//                     setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
//                 }
//                 >
//                 <ChevronLeft className="h-4 w-4" />
//                 </Button>
//                 <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
//                 >
//                 Today
//                 </Button>
//                 <Button
//                 variant="outline"
//                 size="icon"
//                 aria-label="Next month"
//                 onClick={() =>
//                     setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
//                 }
//                 >
//                 <ChevronRight className="h-4 w-4" />
//                 </Button>
//             </div>
//             </CardHeader>
//             <CardContent>
//                 <div className="relative mt-3 overflow-visible rounded-xl border bg-white">

//     {/* Week Header */}
//     <div className="grid grid-cols-7 overflow-hidden rounded-t-xl bg-[#2563eb] text-white text-xs font-semibold">
//         {WEEK_DAYS.map((day) => (
//             <div
//                 key={day}
//                 className="py-2.5 text-center border-r border-blue-400/40 last:border-r-0"
//             >
//                 {day}
//             </div>
//         ))}
//     </div>

//     {/* Calendar */}
//     <div className="grid grid-cols-7">
//         {days.map((d) => {
//             const key = toKey(d);
//             const record = recordFor(d);

//             const isCurrentMonth =
//                 d.getMonth() === cursor.getMonth();

//             const isToday = key === todayKey;

//             const status = record?.status;

//             const bg =
//                 status === "present"
//                     ? "bg-emerald-50"
//                     : status === "half-day"
//                     ? "bg-amber-50"
//                     : status === "absent"
//                     ? "bg-rose-50"
//                     : status === "holiday"
//                     ? "bg-sky-50"
//                     : status === "week-off"
//                     ? "bg-slate-50"
//                     : "bg-white";

//             const statusText =
//                 status === "present"
//                     ? "Full Day"
//                     : status === "half-day"
//                     ? "Half Day"
//                     : status === "absent"
//                     ? record?.note || "Absent"
//                     : status === "holiday"
//                     ? "Holiday"
//                     : status === "week-off"
//                     ? "Week Off"
//                     : "";

//             return (
//                 <button
//                     key={key}
//                     type="button"
//                     onClick={() => setSelectedKey(key)}
//                     className={cn(
//                         "relative h-24 border-r border-b p-2 text-left transition-all",
//                         "hover:z-20 hover:bg-blue-50",
//                         bg,
//                         !isCurrentMonth && "opacity-40",
//                         isToday && "ring-2 ring-inset ring-blue-500",
//                         selectedKey === key &&
//                             "z-20 ring-2 ring-inset ring-blue-500"
//                     )}
//                 >
//                     {/* DATE - TOP RIGHT */}
//                     <span
//                         className={cn(
//                             "absolute right-2 top-2 text-sm font-semibold",
//                             isToday
//                                 ? "text-blue-600"
//                                 : "text-slate-700"
//                         )}
//                     >
//                         {String(d.getDate()).padStart(2, "0")}
//                     </span>

//                     {/* Today Dot */}
//                     {isToday && (
//                         <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
//                     )}

//                     {/* STATUS */}
//                     <div className="absolute left-3 top-10 right-2">
//                         <p
//                             className={cn(
//                                 "text-[11px] leading-4 font-medium",
//                                 status === "present" &&
//                                     "text-emerald-600",
//                                 status === "half-day" &&
//                                     "text-amber-600",
//                                 status === "absent" &&
//                                     "text-rose-600",
//                                 status === "holiday" &&
//                                     "text-sky-600",
//                                 status === "week-off" &&
//                                     "text-slate-500"
//                             )}
//                         >
//                             {statusText}
//                         </p>

//                         {/* Hours */}
//                         {record &&
//                             record.workingHours > 0 && (
//                                 <p className="mt-1 text-[10px] text-slate-500">
//                                     {record.workingHours} Hours
//                                 </p>
//                             )}
//                     </div>

                    
//                 </button>
//             );
//         })}
//     </div>
// </div>
//             {/* <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
//                 {WEEK_DAYS.map((d) => (
//                 <div key={d} className="py-1">
//                     {d}
//                 </div>
//                 ))}
//             </div> */}
        

//             {/* Legend */}
//             <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
//                 {Object.entries(statusMeta).map(([k, m]) => (
//                 <span key={k} className="flex items-center gap-1.5">
//                     {/* <span className={cn("h-2 w-2 rounded-full", m.dot)} />
//                     {m:any.label} */}
//                 </span>
//                 ))}
//                 <span className="flex items-center gap-1.5">
//                 <span className="h-2 w-2 rounded-full bg-primary" />
//                 Today
//                 </span>
//             </div>

//             {employeeId && (
//                 <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
//                 <Stat label="Working hours" value={`${totals.hours}h`} />
//                 <Stat label="Present days" value={totals.present} />
//                 <Stat label="Half days" value={totals.halfDays} />
//                 <Stat label="Leaves" value={totals.leaves} />
//                 </div>
//             )}

//             {!employeeId && (
//                 <p className="mt-6 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
//                 Select an employee above to load attendance details.
//                 </p>
//             )}
//             </CardContent>
//         </Card>

//         {/* Right column */}
//         <div className="space-y-6">
//             {selectedRecord && selectedEmployee && (
//     <Card className="overflow-hidden">
//         <CardHeader className="pb-3">
//             <CardTitle className="flex items-center gap-2 text-sm">
//                 <Clock className="h-4 w-4 text-slate-500" />

//                 {new Date(`${selectedKey}T00:00:00`).toLocaleDateString(
//                     "en-US",
//                     {
//                         weekday: "short",
//                         day: "numeric",
//                         month: "short",
//                         year: "numeric",
//                     }
//                 )}
//             </CardTitle>
//         </CardHeader>

//         <CardContent className="space-y-4">

//             {/* Employee */}
//             <div>
//                 <p className="text-sm font-semibold text-slate-800">
//                     {selectedEmployee.name}
//                 </p>

//                 <p
//                     className={cn(
//                         "mt-1 text-xs font-medium",
//                         statusMeta[selectedRecord.status].text
//                     )}
//                 >
//                     {statusMeta[selectedRecord.status].label}
//                 </p>
//             </div>

//             {/* Check In / Check Out */}
//             <div className="space-y-3">

//                 {/* Check In */}
//                 <div className="flex items-center gap-3 rounded-lg border p-3">
//                     <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
//                         <LogIn className="h-5 w-5 text-emerald-500" />
//                     </div>

//                     <div className="min-w-0">
//                         <p className="text-xs font-semibold text-emerald-600">
//                             Check In
//                         </p>

//                         <p className="mt-1 text-sm font-medium text-slate-700">
//                             {selectedRecord.clockIn || "--"}
//                         </p>
//                     </div>
//                 </div>

//                 {/* Check Out */}
//                 <div className="flex items-center gap-3 rounded-lg border p-3">
//                     <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50">
//                         <LogOut className="h-5 w-5 text-orange-500" />
//                     </div>

//                     <div className="min-w-0">
//                         <p className="text-xs font-semibold text-orange-500">
//                             Check Out
//                         </p>

//                         <p className="mt-1 text-sm font-medium text-slate-700">
//                             {selectedRecord.clockOut || "--"}
//                         </p>
//                     </div>
//                 </div>

//             </div>

//             {/* Total Hours */}
//             <div className="flex items-center justify-between border-t pt-3">
//                 <span className="text-sm font-semibold text-slate-700">
//                     Total hours
//                 </span>

//                 <span className="rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
//                     {selectedRecord.workingHours}h
//                 </span>
//             </div>

//         </CardContent>
//     </Card>
// )}

//             <Card>
//             <CardHeader>
//                 <CardTitle className="flex items-center gap-2 text-base">
//                 <PartyPopper className="h-4 w-4" />
//                 Upcoming Holidays
//                 </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-3">
//                 {upcomingHolidays.length === 0 && (
//                 <p className="text-sm text-muted-foreground">No upcoming holidays.</p>
//                 )}
//                 {upcomingHolidays.map((h:any) => {
//                 const d = new Date(`${h.date}T00:00:00`);
//                 return (
//                     <div key={h.date} className="flex items-center gap-3 rounded-md border p-2">
//                     <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-muted text-xs">
//                         <span className="font-semibold leading-none">{d.getDate()}</span>
//                         <span className="text-[10px] text-muted-foreground">
//                         {d.toLocaleDateString("en-US", { month: "short" })}
//                         </span>
//                         </div>
//                         <div>
//                         <p className="text-sm font-medium">{h.name}</p>
//                         <p className="text-xs text-muted-foreground">
//                         {d.toLocaleDateString("en-US", { weekday: "long" })}
//                         </p>
//                     </div>
//                     </div>
//                 );
//                 })}
//             </CardContent>
//             </Card>
//         </div>
//         </div>
//     </div>
//     </DashboardLayout>
// );
// }

// function Stat({ label, value }: { label: string; value: string | number }) {
//     return (
//     <div className="rounded-md border p-3">
//         <p className="text-xs text-muted-foreground">{label}</p>
//         <p className="mt-1 text-lg font-semibold">{value}</p>
//     </div>
//     );
// }



































// import { createFileRoute } from "@tanstack/react-router";
// import { useEffect, useMemo, useState } from "react";
// import { RotateCcw, Plus, Pencil, Trash2, X } from "lucide-react";
// import {
//     ChevronLeft,
//     ChevronRight,
//     CalendarDays,
//     PartyPopper,
//     Clock,
//     LogIn,
//     LogOut,
//     } from "lucide-react";
//     import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

//     import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
//     import { Label } from "@/components/ui/label";
//     import { Input } from "@/components/ui/input";
//     import { Button } from "@/components/ui/button";
//     import {
//     Select,
//     SelectContent,
//     SelectItem,
//     SelectTrigger,
//     SelectValue,
//     } from "@/components/ui/select";

//     import { DashboardLayout } from "@/components/layout/DashboardLayout";
//     import { cn } from "@/lib/utils";
//     import { attendanceApi } from "@/api/attendance";
//     import { holidaysApi, type Holiday, type HolidayPayload } from "@/api/holiday";
//     import { useAppStore } from "@/store/useAppStore";
    
//     export const Route = createFileRoute("/employeeworkcalendar")({
//     head: () => ({
//         meta: [
//         { title: "Employee Work Calendar — HR Settings" },
//         {
//             name: "description",
//             content:
//             "Search an employee and view attendance, working hours and leaves on a calendar.",
//         },
//         ],
//     }),
//     component: EmployeeWorkCalendarPage,
//     });

//     const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

//     type ApiAttendanceRecord = {
//     id: string;
//     employee: string;
//     employeeId: string;
//     department: string;
//     date: string;

//     checkIn: string | null;
//     checkOut: string | null;

//     workingHours: string;
//     totalWorkMinutes: number;

//     completedWorkMinutes: number;
//     completedWorkingHours: string;

//     totalBreakMinutes: number;
//     liveBreakMinutes: number;

//     freeBreakMinutes: number;
//     excessBreakMinutes: number;

//     effectiveWorkMinutes: number;
//     effectiveWorkingHours: string;

//     requiredWorkMinutes: number;
//     requiredWorkingHours: string;

//     remainingWorkMinutes: number;
//     remainingWorkingHours: string;

//     isWorkingTimeComplete: boolean;

//     liveCurrentSessionMinutes: number;
//     liveWorkMinutes: number;
//     liveWorkingHours: string;

//     liveEffectiveWorkMinutes: number;
//     liveEffectiveWorkingHours: string;

//     liveRemainingWorkMinutes: number;
//     liveRemainingWorkingHours: string;

//     liveWorkingTimeComplete: boolean;

//     status: string;
//     currentState: string;

//     sessions: {
//         in: string;
//         out: string | null;
//         source: string;
//         camera_id: string | null;
//         similarity: number;
//     }[];

//     lastAction: string;
//     lastActionAt: string;

//     lastSimilarity: number;

//     createdAt: string;
//     updatedAt: string;
//     };

//     function toKey(date: Date) {
//     const year = date.getFullYear();
//     const month = String(date.getMonth() + 1).padStart(2, "0");
//     const day = String(date.getDate()).padStart(2, "0");

//     return `${year}-${month}-${day}`;
//     }

//     function monthLabel(date: Date) {
//     return date.toLocaleDateString("en-US", {
//         month: "long",
//         year: "numeric",
//     });
//     }

//     function formatTime(dateTime: string | null | undefined) {
//     if (!dateTime) return "--";

//     const date = new Date(dateTime);

//     if (Number.isNaN(date.getTime())) return "--";

//     return date.toLocaleTimeString("en-GB", {
//         hour: "2-digit",
//         minute: "2-digit",
//         hour12: false,
//     });
//     }

//     function formatHours(value: string | number | null | undefined) {
//     if (value === null || value === undefined || value === "") {
//         return "00:00 hours";
//     }

//     const text = String(value).trim();

//     return `${text} hours`;
// }


//     function getStatus(record: ApiAttendanceRecord | undefined) {
//     if (!record) return null;

//     const status = record.status?.toLowerCase();

//     if (status === "present") return "present";
//     if (status === "absent") return "absent";
//     if (status === "holiday") return "holiday";
//     if (status === "half-day") return "half-day";
//     if (status === "half_day") return "half-day";
//     if (status === "week-off") return "week-off";
//     if (status === "week_off") return "week-off";

//     return status;
//     }

//     function statusText(record: ApiAttendanceRecord | undefined) {
//     const status = getStatus(record);

//     switch (status) {
//         case "present":
//         return "Full Day";

//         case "half-day":
//         return "Half Day";

//         case "absent":
//         return "Absent";

//         case "holiday":
//         return "Holiday";

//         case "week-off":
//         return "Week Off";

//         default:
//         return "";
//     }
//     }

//     function statusClasses(record: ApiAttendanceRecord | undefined) {
//     const status = getStatus(record);

//     switch (status) {
//         case "present":
//         return {
//             bg: "bg-emerald-50",
//             text: "text-emerald-600",
//         };

//         case "half-day":
//         return {
//             bg: "bg-amber-50",
//             text: "text-amber-600",
//         };

//         case "absent":
//         return {
//             bg: "bg-rose-50",
//             text: "text-rose-600",
//         };

//         case "holiday":
//         return {
//             bg: "bg-sky-50",
//             text: "text-sky-600",
//         };

//         case "week-off":
//         return {
//             bg: "bg-slate-50",
//             text: "text-slate-500",
//         };

//         default:
//         return {
//             bg: "bg-white",
//             text: "text-slate-500",
//         };
//     }
//     }

//     function EmployeeWorkCalendarPage() {
//     const today = useMemo(() => new Date(), []);
//     const todayKey = toKey(today);
//     const handleRefresh = async () => {
//         if (!isEmployee) setEmployeeId("");
//         setMonthValue(
//             `${today.getFullYear()}-${String(
//                 today.getMonth() + 1
//             ).padStart(2, "0")}`
//         );
//         setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
//         setSelectedKey(null);

//         await refetch();
//     };
//     const currentUser = useAppStore((state) => state.user);
//     const isEmployee = currentUser?.role === "user";
//     const canManageHolidays = ["admin", "super_admin"].includes(String(currentUser?.role || "").toLowerCase());
//     const queryClient = useQueryClient();
//     const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
//     const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
//     const [holidayName, setHolidayName] = useState("");
//     const [holidayDate, setHolidayDate] = useState("");
//     const [holidayDescription, setHolidayDescription] = useState("");
//     const [holidayType, setHolidayType] = useState("public");

//     const { data: holidayRecords = [], isLoading: holidaysLoading } = useQuery<Holiday[]>({
//         queryKey: ["holidays", "upcoming"],
//         queryFn: () => holidaysApi.list(true),
//     });
//     const refreshHolidays = () => queryClient.invalidateQueries({ queryKey: ["holidays"] });

//     function resetHolidayForm() {
//         setEditingHoliday(null);
//         setHolidayName("");
//         setHolidayDate("");
//         setHolidayDescription("");
//         setHolidayType("public");
//     }
//     function openAddHolidayDialog() {
//         resetHolidayForm();
//         setHolidayDialogOpen(true);
//     }
//     function openEditHolidayDialog(holiday: Holiday) {
//         setEditingHoliday(holiday);
//         setHolidayName(holiday.name);
//         setHolidayDate(holiday.date.slice(0, 10));
//         setHolidayDescription(holiday.description || "");
//         setHolidayType(holiday.holiday_type || "public");
//         setHolidayDialogOpen(true);
//     }
//     const saveHolidayMutation = useMutation({
//         mutationFn: (payload: HolidayPayload) => editingHoliday
//             ? holidaysApi.update(editingHoliday.id, payload)
//             : holidaysApi.create(payload),
//         onSuccess: async () => {
//             await refreshHolidays();
//             setHolidayDialogOpen(false);
//             resetHolidayForm();
//         },
//     });
//     const deleteHolidayMutation = useMutation({
//         mutationFn: (id: string) => holidaysApi.delete(id),
//         onSuccess: refreshHolidays,
//     });
//     function submitHoliday(event: React.FormEvent<HTMLFormElement>) {
//         event.preventDefault();
//         saveHolidayMutation.mutate({
//             name: holidayName.trim(),
//             date: holidayDate,
//             description: holidayDescription.trim() || null,
//             holiday_type: holidayType,
//         });
//     }
//     const [employeeId, setEmployeeId] = useState(() =>
//         currentUser?.employee_id || currentUser?.id || ""
//     );

//     // Selected month: YYYY-MM
//     const [monthValue, setMonthValue] = useState(() => {
//         return `${today.getFullYear()}-${String(
//             today.getMonth() + 1
//         ).padStart(2, "0")}`;
//     });

//     // Calendar ka current month
//     const [cursor, setCursor] = useState(
//         () => new Date(today.getFullYear(), today.getMonth(), 1)
//     );

//     const [selectedKey, setSelectedKey] = useState<string | null>(null);

//     // Month dropdown change hone par calendar update hoga
//     useEffect(() => {
//         const [year, month] = monthValue.split("-").map(Number);

//         if (!year || !month || month < 1 || month > 12) return;

//         setCursor(new Date(year, month - 1, 1));
//         setSelectedKey(null);
//     }, [monthValue]);

//     /*
//      * SAME API
//      */
//     const {
//         data = [],
//         isLoading,
//         isError,
//         refetch,
//     } = useQuery<ApiAttendanceRecord[]>({
//         queryKey: ["attendance"],
//         queryFn: () => attendanceApi.list() as Promise<ApiAttendanceRecord[]>,
//     });

//     /*
//      * Employee dropdown API se banega.
//      */
//     /*
//     * Employee dropdown API se banega.
//     */
//     const employeeOptions = useMemo(() => {
//         const map = new Map<
//         string,
//         {
//             employeeId: string;
//             employee: string;
//             department: string;
//         }
//         >();

//         data.forEach((record) => {
//         if (!map.has(record.employeeId)) {
//             map.set(record.employeeId, {
//             employeeId: record.employeeId,
//             employee: record.employee,
//             department: record.department,
//             });
//         }
//         });

//         return Array.from(map.values());
//     }, [data]);

//     /*
//     * Selected employee ke records
//     */
//     const employeeRecords = useMemo(() => {
//         if (!employeeId) return [];

//         return data.filter((record) => record.employeeId === employeeId);
//     }, [data, employeeId]);
//     const monthOptions = useMemo(() => {
//     const years = new Set<number>([today.getFullYear()]);

//     data.forEach((record) => {
//         const recordDate = new Date(`${record.date}T00:00:00`);

//         if (!Number.isNaN(recordDate.getTime())) {
//             years.add(recordDate.getFullYear());
//         }
//     });

//     return Array.from(years)
//         .sort((a, b) => b - a)
//         .flatMap((year) =>
//             Array.from({ length: 12 }, (_, index) => {
//                 const month = index + 1;

//                 return {
//                     value: `${year}-${String(month).padStart(2, "0")}`,
//                     label: new Date(year, index, 1).toLocaleDateString(
//                         "en-US",
//                         { month: "long", year: "numeric" }
//                     ),
//                 };
//             })
//         );
// }, [data, today]);

//     /*
//     * date => API record
//     */
//     const recordMap = useMemo(() => {
//         const map = new Map<string, ApiAttendanceRecord>();

//         employeeRecords.forEach((record) => {
//         map.set(record.date, record);
//         });

//         return map;
//     }, [employeeRecords]);

//     /*
//     * Calendar 42 days
//     */
//     const days = useMemo(() => {
//         const first = new Date(
//         cursor.getFullYear(),
//         cursor.getMonth(),
//         1,
//         );

//         const start = new Date(first);

//         start.setDate(first.getDate() - first.getDay());

//         return Array.from({ length: 42 }, (_, i) => {
//         const d = new Date(start);

//         d.setDate(start.getDate() + i);

//         return d;
//         });
//     }, [cursor]);

//     // const inRange = (key: string) => {
//     //     if (dateFrom && key < dateFrom) return false;
//     //     if (dateTo && key > dateTo) return false;

//     //     return true;
//     // };

//     /*
//     * Calendar date ka API record
//     */
//     const recordFor = (date: Date) => {
//         if (!employeeId) return undefined;

//         const key = toKey(date);

//         // if (!inRange(key)) return undefined;

//         return recordMap.get(key);
//     };

//     /*
//     * Current month ke records
//     */
//     const monthRecords = useMemo(() => {
//     if (!employeeId) return [];

//     const year = cursor.getFullYear();
//     const month = cursor.getMonth();

//     return employeeRecords.filter((record) => {
//         const recordDate = new Date(`${record.date}T00:00:00`);

//         return (
//             !Number.isNaN(recordDate.getTime()) &&
//             recordDate.getFullYear() === year &&
//             recordDate.getMonth() === month
//         );
//     });
// }, [employeeId, employeeRecords, cursor]);

//     /*
//     * Statistics
//     */
//     const totals = useMemo(() => {
//         const present = monthRecords.filter(
//         (record) => getStatus(record) === "present",
//         ).length;

//         const leaves = monthRecords.filter(
//         (record) => getStatus(record) === "absent",
//         ).length;

//         const halfDays = monthRecords.filter(
//         (record) => getStatus(record) === "half-day",
//         ).length;

//         const holidays = monthRecords.filter(
//         (record) => getStatus(record) === "holiday",
//         ).length;

//         const weekOffs = monthRecords.filter(
//         (record) => getStatus(record) === "week-off",
//         ).length;

//         const totalMinutes = monthRecords.reduce(
//         (sum, record) => sum + (record.totalWorkMinutes || 0),
//         0,
//         );

//         return {
//         present,
//         leaves,
//         halfDays,
//         holidays,
//         weekOffs,
//         totalMinutes,
//         };
//     }, [monthRecords]);

//     const totalHours = useMemo(() => {
//         const hours = Math.floor(totals.totalMinutes / 60);
//         const minutes = totals.totalMinutes % 60;

//         return `${hours}h ${String(minutes).padStart(2, "0")}m`;
//     }, [totals.totalMinutes]);

//     /*
//     * Selected record
//     */
//     const selectedRecord = useMemo(() => {
//     if (!selectedKey || !employeeId) return undefined;

//     return recordMap.get(selectedKey);
// }, [selectedKey, employeeId, recordMap]);

//     const selectedEmployee = useMemo(() => {
//         return employeeOptions.find(
//         (employee) => employee.employeeId === employeeId,
//         );
//     }, [employeeOptions, employeeId]);

//     /*
//     * No hard-coded holidays.
//     * API me holiday records honge to calendar me wahi Holiday dikhega.
//     */
//     const upcomingHolidays = useMemo(() => {
//         return [...holidayRecords]
//             .filter((holiday) => holiday.date.slice(0, 10) >= todayKey)
//             .sort((a, b) => a.date.localeCompare(b.date))
//             .slice(0, 8);
//     }, [holidayRecords, todayKey]);

//     return (
//         <DashboardLayout
//         title="Employee Work Calendar"
//         description="Track employee working hours, leaves and attendance with a monthly calendar."
//         breadcrumbs={[
//             {
//             label: "Employee Work Calendar",
//             },
//         ]}
//         >
//         <div className="space-y-6">
//             {/* Filters */}
//             <Card className="mb-6">
//             <CardContent className="grid grid-cols-1 items-end gap-4 pt-6 md:grid-cols-[1fr_1fr_auto]">
//                 {/* Employee selector is only available to administrators. */}
//                 {!isEmployee && <div className="space-y-2">
//                 <Label htmlFor="employee">
//                     Employee
//                 </Label>

//                 <Select
//                     value={employeeId}
//                     onValueChange={(value) => {
//                     setEmployeeId(value);
//                     setSelectedKey(null);
//                     }}
//                 >
//                     <SelectTrigger id="employee">
//                     <SelectValue placeholder="Search employee" />
//                     </SelectTrigger>

//                     <SelectContent>
//                     {employeeOptions.map((employee) => (
//                         <SelectItem
//                         key={employee.employeeId}
//                         value={employee.employeeId}
//                         >
//                         {employee.employee} —{" "}
//                         {employee.employeeId}
//                         </SelectItem>
//                     ))}
//                     </SelectContent>
//                 </Select>
//                 </div>}
// {/* Month Dropdown */}
// <div className="space-y-2">
//     <Label htmlFor="month">Select Month</Label>

//     <Select
//         value={monthValue}
//         onValueChange={setMonthValue}
//     >
//         <SelectTrigger id="month">
//             <SelectValue placeholder="Select month" />
//         </SelectTrigger>

//         <SelectContent>
//             {monthOptions.map((month) => (
//                 <SelectItem
//                     key={month.value}
//                     value={month.value}
//                 >
//                     {month.label}
//                 </SelectItem>
//             ))}
//         </SelectContent>
//     </Select>
// </div>
//                 {/* From */}
//                 {/* <div className="space-y-2">
//                 <Label htmlFor="from">
//                     Date from
//                 </Label>

//                 <Input
//                     id="from"
//                     type="date"
//                     value={dateFrom}
//                     onChange={(e) =>
//                     setDateFrom(e.target.value)
//                     }
//                 />
//                 </div> */}

//                 {/* To */}
//                 {/* <div className="space-y-2">
//                 <Label htmlFor="to">
//                     Date to
//                 </Label>

//                 <Input
//                     id="to"
//                     type="date"
//                     value={dateTo}
//                     onChange={(e) =>
//                     setDateTo(e.target.value)
//                     }
//                 />
//                 </div> */}
//                 <div>
//     <Button
//         onClick={handleRefresh}
//         variant="outline"
//         className="w-full md:w-auto"
//     >
//         <RotateCcw className="mr-2 h-4 w-4" />
//         Refresh
//     </Button>
// </div>
//             </CardContent>
//             </Card>

//             {isLoading && (
//             <Card>
//                 <CardContent className="py-10 text-center text-sm text-muted-foreground">
//                 Loading attendance...
//                 </CardContent>
//             </Card>
//             )}

//             {isError && (
//             <Card>
//                 <CardContent className="flex flex-col items-center gap-3 py-10">
//                 <p className="text-sm text-destructive">
//                     Attendance data load nahi ho saka.
//                 </p>

//                 <Button
//                     variant="outline"
//                     onClick={() => refetch()}
//                 >
//                     Try Again
//                 </Button>
//                 </CardContent>
//             </Card>
//             )}

//             {!isLoading && !isError && (
//             <div className="grid gap-6 lg:grid-cols-3">
//                 {/* Calendar */}
//                 <Card className="lg:col-span-2">
//                 <CardHeader className="flex flex-row items-center justify-between space-y-0">
//                     <CardTitle className="flex items-center gap-2 text-base">
//                     <CalendarDays className="h-4 w-4" />

//                     {monthLabel(cursor)}
//                     </CardTitle>

//                     <div className="flex items-center gap-1">
//                     <Button
//                         variant="outline"
//                         size="icon"
//                         aria-label="Previous month"
//                         onClick={() =>
//                         setCursor(
//                             new Date(
//                             cursor.getFullYear(),
//                             cursor.getMonth() - 1,
//                             1,
//                             ),
//                         )
//                         }
//                     >
//                         <ChevronLeft className="h-4 w-4" />
//                     </Button>

//                     <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() =>
//                         setCursor(
//                             new Date(
//                             today.getFullYear(),
//                             today.getMonth(),
//                             1,
//                             ),
//                         )
//                         }
//                     >
//                         Today
//                     </Button>

//                     <Button
//                         variant="outline"
//                         size="icon"
//                         aria-label="Next month"
//                         onClick={() =>
//                         setCursor(
//                             new Date(
//                             cursor.getFullYear(),
//                             cursor.getMonth() + 1,
//                             1,
//                             ),
//                         )
//                         }
//                     >
//                         <ChevronRight className="h-4 w-4" />
//                     </Button>
//                     </div>
//                 </CardHeader>

//                 <CardContent>
//                     <div className="relative mt-3 overflow-visible rounded-xl border bg-white">
//                     {/* Week Header */}
//                     <div className="grid grid-cols-7 overflow-hidden rounded-t-xl bg-[#2563eb] text-xs font-semibold text-white">
//                         {WEEK_DAYS.map((day) => (
//                         <div
//                             key={day}
//                             className="border-r border-blue-400/40 py-2.5 text-center last:border-r-0"
//                         >
//                             {day}
//                         </div>
//                         ))}
//                     </div>

//                     {/* Calendar */}
//                     <div className="grid grid-cols-7">
//                         {days.map((d) => {
//                         const key = toKey(d);

//                         const record = recordFor(d);

//                         const isCurrentMonth =
//                             d.getMonth() ===
//                             cursor.getMonth();

//                         const isToday =
//                             key === todayKey;

//                         const status = getStatus(record);

//                         const classes =
//                             statusClasses(record);

//                         return (
//                             <button
//                             key={key}
//                             type="button"
//                             onClick={() => {
//                                 if (record) {
//                                 setSelectedKey(key);
//                                 }
//                             }}
//                             className={cn(
//                                 "relative h-24 border-r border-b p-2 text-left transition-all",
//                                 "hover:z-20 hover:bg-blue-50",
//                                 classes.bg,
//                                 !isCurrentMonth &&
//                                 "opacity-40",
//                                 isToday &&
//                                 "ring-2 ring-inset ring-blue-500",
//                                 selectedKey === key &&
//                                 "z-20 ring-2 ring-inset ring-blue-500",
//                             )}
//                             >
//                             {/* Date */}
//                             <span
//                                 className={cn(
//                                 "absolute right-2 top-2 text-sm font-semibold",
//                                 isToday
//                                     ? "text-blue-600"
//                                     : "text-slate-700",
//                                 )}
//                             >
//                                 {String(
//                                 d.getDate(),
//                                 ).padStart(2, "0")}
//                             </span>

//                             {/* Today dot */}
//                             {isToday && (
//                                 <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
//                             )}

//                             {/* Status */}
//                             <div className="absolute left-3 right-2 top-10">
//                                 {!employeeId ? (
//                                 <p className="text-[10px] text-slate-400">
                                
//                                 </p>
//                                 ) : record ? (
//                                 <>
//                                     <p
//                                     className={cn(
//                                         "text-[11px] font-medium leading-4",
//                                         classes.text,
//                                     )}
//                                     >
//                                     {statusText(record)}
//                                     </p>

//                                     {status === "present" && (
//     <p className="mt-1 text-[10px] text-slate-500">
//         {formatHours(
//             record.liveWorkingHours ||
//             record.workingHours
//         )}
//     </p>
// )}

//                                     {status === "half-day" && (
//     <p className="mt-1 text-[10px] text-slate-500">
//         {formatHours(record.workingHours)}
//     </p>
// )}
//                                 </>
//                                 ) : (
//                                 <p className="text-[10px] text-slate-400">
//                                     No record
//                                 </p>
//                                 )}
//                             </div>
//                             </button>
//                         );
//                         })}
//                     </div>
//                     </div>

//                     {/* Legend */}
//                     <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
//                     <Legend
//                         color="bg-emerald-500"
//                         text="Present"
//                     />

//                     <Legend
//                         color="bg-amber-500"
//                         text="Half Day"
//                     />

//                     <Legend
//                         color="bg-rose-500"
//                         text="Absent"
//                     />

//                     <Legend
//                         color="bg-sky-500"
//                         text="Holiday"
//                     />

//                     <Legend
//                         color="bg-slate-400"
//                         text="Week Off"
//                     />

//                     <Legend
//                         color="bg-primary"
//                         text="Today"
//                     />
//                     </div>

//                     {/* Stats */}
//                     {employeeId && (
//                     <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
//                         <Stat
//                         label="Working hours"
//                         value={totalHours}
//                         />

//                         <Stat
//                         label="Present days"
//                         value={totals.present}
//                         />

//                         <Stat
//                         label="Half days"
//                         value={totals.halfDays}
//                         />

//                         <Stat
//                         label="Leaves"
//                         value={totals.leaves}
//                         />

//                         <Stat
//                         label="Holidays"
//                         value={totals.holidays}
//                         />
//                     </div>
//                     )}

//                     {!employeeId && (
//                     <p className="mt-6 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
//                         Select an employee above to load
//                         attendance details.
//                     </p>
//                     )}
//                 </CardContent>
//                 </Card>

//                 {/* Right Column */}
//                 <div className="space-y-6">
//                 {/* Selected Day */}
//                 {selectedRecord && selectedEmployee && (
//                     <Card className="overflow-hidden">
//                     <CardHeader className="pb-3">
//                         <CardTitle className="flex items-center gap-2 text-sm">
//                         <Clock className="h-4 w-4 text-slate-500" />

//                         {new Date(
//                             `${selectedRecord.date}T00:00:00`,
//                         ).toLocaleDateString(
//                             "en-US",
//                             {
//                             weekday: "short",
//                             day: "numeric",
//                             month: "short",
//                             year: "numeric",
//                             },
//                         )}
//                         </CardTitle>
//                     </CardHeader>

//                     <CardContent className="space-y-4">
//                         {/* Employee */}
//                         <div>
//                         <p className="text-sm font-semibold text-slate-800">
//                             {selectedEmployee.employee}
//                         </p>

//                         <p className="text-xs text-slate-500">
//                             {selectedEmployee.employeeId}
//                         </p>

//                         <p
//                             className={cn(
//                             "mt-1 text-xs font-medium",
//                             statusClasses(
//                                 selectedRecord,
//                             ).text,
//                             )}
//                         >
//                             {statusText(
//                             selectedRecord,
//                             )}
//                         </p>
//                         </div>

//                         {/* Check In */}
//                         <div className="flex items-center gap-3 rounded-lg border p-3">
//                         <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
//                             <LogIn className="h-5 w-5 text-emerald-500" />
//                         </div>

//                         <div className="min-w-0">
//                             <p className="text-xs font-semibold text-emerald-600">
//                             Check In
//                             </p>

//                             <p className="mt-1 text-sm font-medium text-slate-700">
//                             {formatTime(
//                                 selectedRecord.checkIn,
//                             )}
//                             </p>
//                         </div>
//                         </div>

//                         {/* Check Out */}
//                         <div className="flex items-center gap-3 rounded-lg border p-3">
//                         <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50">
//                             <LogOut className="h-5 w-5 text-orange-500" />
//                         </div>

//                         <div className="min-w-0">
//                             <p className="text-xs font-semibold text-orange-500">
//                             Check Out
//                             </p>

//                             <p className="mt-1 text-sm font-medium text-slate-700">
//                             {formatTime(
//                                 selectedRecord.checkOut,
//                             )}
//                             </p>
//                         </div>
//                         </div>

//                         {/* Total Hours */}
//                         <div className="flex items-center justify-between border-t pt-3">
//                         <span className="text-sm font-semibold text-slate-700">
//                             Total hours
//                         </span>

//                         <span className="rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
//                             {formatHours(
//                             selectedRecord.workingHours,
//                             )}
//                         </span>
//                         </div>

//                         {/* Current State */}
//                         <div className="flex items-center justify-between">
//                         <span className="text-sm text-muted-foreground">
//                             Current state
//                         </span>

//                         <span className="rounded-md bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
//                             {selectedRecord.currentState ||
//                             "--"}
//                         </span>
//                         </div>

//                         {/* Remaining */}
//                         <div className="flex items-center justify-between">
//                         <span className="text-sm text-muted-foreground">
//                             Remaining
//                         </span>

//                         <span className="text-sm font-semibold">
//                             {selectedRecord.liveRemainingWorkingHours ||
//                             selectedRecord.remainingWorkingHours ||
//                             "--"}
//                         </span>
//                         </div>
//                     </CardContent>
//                     </Card>
//                 )}

//                 {/* Upcoming Holidays */}
//                 <Card>
//                     <CardHeader>
//                     <div className="flex items-center justify-between gap-3">
//                         <CardTitle className="flex items-center gap-2 text-base">
//                             <PartyPopper className="h-4 w-4" />
//                             Upcoming Holidays
//                         </CardTitle>
//                         {canManageHolidays && (
//                             <Button type="button" size="sm" onClick={openAddHolidayDialog}>
//                                 <Plus className="mr-1 h-4 w-4" /> Add
//                             </Button>
//                         )}
//                     </div>
//                     </CardHeader>
//                     <CardContent className="space-y-3">
//                     {holidaysLoading && <p className="text-sm text-muted-foreground">Loading holidays...</p>}
//                     {!holidaysLoading && upcomingHolidays.length === 0 && (
//                         <p className="text-sm text-muted-foreground">No upcoming holidays.</p>
//                     )}
//                     {upcomingHolidays.map((holiday) => {
//                         const d = new Date(`${holiday.date.slice(0, 10)}T00:00:00`);
//                         return (
//                             <div key={holiday.id} className="flex items-center gap-3 rounded-md border p-2">
//                                 <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-muted text-xs">
//                                     <span className="font-semibold leading-none">{d.getDate()}</span>
//                                     <span className="text-[10px] text-muted-foreground">{d.toLocaleDateString("en-US", { month: "short" })}</span>
//                                 </div>
//                                 <div className="min-w-0 flex-1">
//                                     <p className="text-sm font-medium">{holiday.name}</p>
//                                     <p className="text-xs text-muted-foreground">
//                                         {d.toLocaleDateString("en-US", { weekday: "long" })}
//                                         {holiday.description ? ` · ${holiday.description}` : ""}
//                                     </p>
//                                 </div>
//                                 {canManageHolidays && (
//                                     <div className="flex shrink-0 items-center gap-1">
//                                         <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${holiday.name}`}
//                                             onClick={() => openEditHolidayDialog(holiday)}>
//                                             <Pencil className="h-4 w-4" />
//                                         </Button>
//                                         <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${holiday.name}`}
//                                             disabled={deleteHolidayMutation.isPending}
//                                             onClick={() => {
//                                                 if (window.confirm(`Delete "${holiday.name}"?`)) deleteHolidayMutation.mutate(holiday.id);
//                                             }}>
//                                             <Trash2 className="h-4 w-4 text-destructive" />
//                                         </Button>
//                                     </div>
//                                 )}
//                             </div>
//                         );
//                     })}
//                     </CardContent>
//                 </Card>

//                 {canManageHolidays && holidayDialogOpen && (
//                     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
//                         role="presentation"
//                         onMouseDown={(event) => {
//                             if (event.target === event.currentTarget) {
//                                 setHolidayDialogOpen(false);
//                                 resetHolidayForm();
//                             }
//                         }}>
//                         <div role="dialog" aria-modal="true" aria-labelledby="holiday-dialog-title"
//                             className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
//                             <div className="mb-5 flex items-center justify-between">
//                                 <h2 id="holiday-dialog-title" className="text-lg font-semibold">
//                                     {editingHoliday ? "Edit Holiday" : "Add Holiday"}
//                                 </h2>
//                                 <Button type="button" variant="ghost" size="icon" aria-label="Close"
//                                     onClick={() => { setHolidayDialogOpen(false); resetHolidayForm(); }}>
//                                     <X className="h-4 w-4" />
//                                 </Button>
//                             </div>
//                             <form onSubmit={submitHoliday} className="space-y-4">
//                                 <div className="space-y-2">
//                                     <Label htmlFor="holiday-name">Holiday Name</Label>
//                                     <Input id="holiday-name" value={holidayName}
//                                         onChange={(event) => setHolidayName(event.target.value)}
//                                         placeholder="e.g. Independence Day" required />
//                                 </div>
//                                 <div className="space-y-2">
//                                     <Label htmlFor="holiday-date">Date</Label>
//                                     <Input id="holiday-date" type="date" value={holidayDate}
//                                         onChange={(event) => setHolidayDate(event.target.value)} required />
//                                 </div>
//                                 <div className="space-y-2">
//                                     <Label htmlFor="holiday-type">Holiday Type</Label>
//                                     <Select value={holidayType} onValueChange={setHolidayType}>
//                                         <SelectTrigger id="holiday-type"><SelectValue placeholder="Select holiday type" /></SelectTrigger>
//                                         <SelectContent>
//                                             <SelectItem value="public">Public</SelectItem>
//                                             <SelectItem value="company">Company</SelectItem>
//                                             <SelectItem value="optional">Optional</SelectItem>
//                                         </SelectContent>
//                                     </Select>
//                                 </div>
//                                 <div className="space-y-2">
//                                     <Label htmlFor="holiday-description">Description</Label>
//                                     <Input id="holiday-description" value={holidayDescription}
//                                         onChange={(event) => setHolidayDescription(event.target.value)}
//                                         placeholder="Optional description" />
//                                 </div>
//                                 {saveHolidayMutation.isError && (
//                                     <p className="text-sm text-destructive">Unable to save holiday. Please check the details and try again.</p>
//                                 )}
//                                 <div className="flex justify-end gap-2 pt-2">
//                                     <Button type="button" variant="outline"
//                                         onClick={() => { setHolidayDialogOpen(false); resetHolidayForm(); }}>Cancel</Button>
//                                     <Button type="submit" disabled={saveHolidayMutation.isPending}>
//                                         {saveHolidayMutation.isPending ? "Saving..." : editingHoliday ? "Update Holiday" : "Save Holiday"}
//                                     </Button>
//                                 </div>
//                             </form>
//                         </div>
//                     </div>
//                 )}
//                 </div>
//             </div>
//             )}
//         </div>
//         </DashboardLayout>
//     );
//     }

//     function Stat({
//     label,
//     value,
//     }: {
//     label: string;
//     value: string | number;
//     }) {
//     return (
//         <div className="rounded-md border p-3">
//         <p className="text-xs text-muted-foreground">
//             {label}
//         </p>

//         <p className="mt-1 text-lg font-semibold">
//             {value}
//         </p>
//         </div>
//     );
//     }

//     function Legend({
//     color,
//     text,
//     }: {
//     color: string;
//     text: string;
//     }) {
//     return (
//         <span className="flex items-center gap-1.5">
//         <span
//             className={cn(
//             "h-2 w-2 rounded-full",
//             color,
//             )}
//         />
//         {text}
//         </span>
//     );
// }





















// //============= dummy

// // import { createFileRoute } from "@tanstack/react-router";
// // import { useMemo, useState } from "react";
// // import { ChevronLeft, ChevronRight, CalendarDays, PartyPopper, Clock ,LogIn,
// //     LogOut, } from "lucide-react";

// // import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// // import { Label } from "@/components/ui/label";
// // import { Input } from "@/components/ui/input";
// // import { Button } from "@/components/ui/button";
// // import {
// //     Select,
// //     SelectContent,
// //     SelectItem,
// //     SelectTrigger,
// //     SelectValue,
// // } from "@/components/ui/select";
// // import { cn } from "@/lib/utils";
// // import {
// //     employees,
// //     holidays,
// //     getAttendance,
// //     statusMeta,
// //     toKey,
// //     type AttendanceRecord,
// // } from "@/lib/attendance-data";
// // import { DashboardLayout } from "@/components/layout/DashboardLayout";

// // export const Route = createFileRoute("/employeeworkcalendar")({
// //     head: () => ({
// //     meta: [
// //         { title: "Employee Work Calendar — HR Settings" },
// //         {
// //         name: "description",
// //         content:
// //             "Search an employee, filter by date range and view working hours, leaves and half days on a calendar with upcoming holidays.",
// //         },
// //         { property: "og:title", content: "Employee Work Calendar — HR Settings" },
// //         {
// //         property: "og:description",
// //         content: "Track working hours, leaves and half days per employee on a monthly calendar.",
// //         },
// //     ],
// //     }),
// //     component: EmployeeWorkCalendarPage,
// // });

// // const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// // function monthLabel(date: Date) {
// //     return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
// // }

// // function EmployeeWorkCalendarPage() {
// //     const today = useMemo(() => new Date(), []);
// //     const todayKey = toKey(today);

// //     const [employeeId, setEmployeeId] = useState<string>("");
// //     const [dateFrom, setDateFrom] = useState("");
// //     const [dateTo, setDateTo] = useState("");
// //     const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
// //     const [selectedKey, setSelectedKey] = useState<string | null>(null);

// //     const days = useMemo(() => {
// //     const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
// //     const start = new Date(first);
// //     start.setDate(first.getDate() - first.getDay());
// //     return Array.from({ length: 42 }, (_, i) => {
// //         const d = new Date(start);
// //         d.setDate(start.getDate() + i);
// //         return d;
// //     });
// //     }, [cursor]);

// //     const inRange = (key: string) => {
// //     if (dateFrom && key < dateFrom) return false;
// //     if (dateTo && key > dateTo) return false;
// //     return true;
// //     };

// //     const recordFor = (date: Date): AttendanceRecord | null => {
// //     if (!employeeId) return null;
// //     const key = toKey(date);
// //     if (!inRange(key)) return null;
// //     return getAttendance(employeeId, date);
// //     };

// //     const monthRecords = useMemo(() => {
// //     if (!employeeId) return [];
// //     const out: AttendanceRecord[] = [];
// //     const total = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
// //     for (let i = 1; i <= total; i++) {
// //         const d = new Date(cursor.getFullYear(), cursor.getMonth(), i);
// //         if (!inRange(toKey(d))) continue;
// //         out.push(getAttendance(employeeId, d));
// //     }
// //     return out;
// //     }, [employeeId, cursor, dateFrom, dateTo]);

// //     const totals = useMemo(
// //         () => ({
// //         hours: monthRecords.reduce((s, r) => s + r.workingHours, 0),
// //         leaves: monthRecords.filter((r) => r.status === "absent").length,
// //         halfDays: monthRecords.filter((r) => r.status === "half-day").length,
// //         present: monthRecords.filter((r) => r.status === "present").length,
// //     }),
// //     [monthRecords],
// //     );

// //     const upcomingHolidays = useMemo(
// //     () => holidays.filter((h: any) => h.date >= todayKey).slice(0, 8),
// //     [todayKey],
// //     );

// //     const selectedRecord =
// //     selectedKey && employeeId ? getAttendance(employeeId, new Date(`${selectedKey}T00:00:00`)) : null;

// //     const selectedEmployee = employees.find((e: any) => e.id === employeeId);


// //     return (
// //     <DashboardLayout
// //         title="Employee Work Calendar"
// //         description="Track employee working hours, leaves and attendance with a monthly calendar."
// //         breadcrumbs={[
// //             { label: "Employee Work Calendar" },
// //         ]}
// //     >
// //         <div className="space-y-6">
    

// //       {/* Filters */}
// //         <Card className="mb-6">
// //         <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
// //             <div className="space-y-2">
// //             <Label htmlFor="employee">Employee</Label>
// //             <Select value={employeeId} onValueChange={setEmployeeId}>
// //                 <SelectTrigger id="employee">
// //                 <SelectValue placeholder="Search employee" />
// //                 </SelectTrigger>
// //                 <SelectContent>
// //                 {employees.map((e: any) => (
// //                     <SelectItem key={e.id} value={e.id}>
// //                     {e.name} — {e.designation}
// //                     </SelectItem>
// //                 ))}
// //                 </SelectContent>
// //             </Select>
// //             </div>
// //             <div className="space-y-2">
// //             <Label htmlFor="from">Date from</Label>
// //             <Input
// //                 id="from"
// //                 type="date"
// //                 value={dateFrom}
// //                 onChange={(e) => setDateFrom(e.target.value)}
// //             />
// //             </div>
// //             <div className="space-y-2">
// //             <Label htmlFor="to">Date to</Label>
// //             <Input id="to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
// //             </div>
// //         </CardContent>
// //         </Card>

// //         <div className="grid gap-6 lg:grid-cols-3">
// //         {/* Calendar */}
// //         <Card className="lg:col-span-2">
// //             <CardHeader className="flex flex-row items-center justify-between space-y-0">
// //             <CardTitle className="flex items-center gap-2 text-base">
// //                 <CalendarDays className="h-4 w-4" />
// //                 {monthLabel(cursor)}
// //             </CardTitle>
// //             <div className="flex items-center gap-1">
// //                 <Button
// //                 variant="outline"
// //                 size="icon"
// //                 aria-label="Previous month"
// //                 onClick={() =>
// //                     setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
// //                 }
// //                 >
// //                 <ChevronLeft className="h-4 w-4" />
// //                 </Button>
// //                 <Button
// //                 variant="outline"
// //                 size="sm"
// //                 onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
// //                 >
// //                 Today
// //                 </Button>
// //                 <Button
// //                 variant="outline"
// //                 size="icon"
// //                 aria-label="Next month"
// //                 onClick={() =>
// //                     setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
// //                 }
// //                 >
// //                 <ChevronRight className="h-4 w-4" />
// //                 </Button>
// //             </div>
// //             </CardHeader>
// //             <CardContent>
// //                 <div className="relative mt-3 overflow-visible rounded-xl border bg-white">

// //     {/* Week Header */}
// //     <div className="grid grid-cols-7 overflow-hidden rounded-t-xl bg-[#2563eb] text-white text-xs font-semibold">
// //         {WEEK_DAYS.map((day) => (
// //             <div
// //                 key={day}
// //                 className="py-2.5 text-center border-r border-blue-400/40 last:border-r-0"
// //             >
// //                 {day}
// //             </div>
// //         ))}
// //     </div>

// //     {/* Calendar */}
// //     <div className="grid grid-cols-7">
// //         {days.map((d) => {
// //             const key = toKey(d);
// //             const record = recordFor(d);

// //             const isCurrentMonth =
// //                 d.getMonth() === cursor.getMonth();

// //             const isToday = key === todayKey;

// //             const status = record?.status;

// //             const bg =
// //                 status === "present"
// //                     ? "bg-emerald-50"
// //                     : status === "half-day"
// //                     ? "bg-amber-50"
// //                     : status === "absent"
// //                     ? "bg-rose-50"
// //                     : status === "holiday"
// //                     ? "bg-sky-50"
// //                     : status === "week-off"
// //                     ? "bg-slate-50"
// //                     : "bg-white";

// //             const statusText =
// //                 status === "present"
// //                     ? "Full Day"
// //                     : status === "half-day"
// //                     ? "Half Day"
// //                     : status === "absent"
// //                     ? record?.note || "Absent"
// //                     : status === "holiday"
// //                     ? "Holiday"
// //                     : status === "week-off"
// //                     ? "Week Off"
// //                     : "";

// //             return (
// //                 <button
// //                     key={key}
// //                     type="button"
// //                     onClick={() => setSelectedKey(key)}
// //                     className={cn(
// //                         "relative h-24 border-r border-b p-2 text-left transition-all",
// //                         "hover:z-20 hover:bg-blue-50",
// //                         bg,
// //                         !isCurrentMonth && "opacity-40",
// //                         isToday && "ring-2 ring-inset ring-blue-500",
// //                         selectedKey === key &&
// //                             "z-20 ring-2 ring-inset ring-blue-500"
// //                     )}
// //                 >
// //                     {/* DATE - TOP RIGHT */}
// //                     <span
// //                         className={cn(
// //                             "absolute right-2 top-2 text-sm font-semibold",
// //                             isToday
// //                                 ? "text-blue-600"
// //                                 : "text-slate-700"
// //                         )}
// //                     >
// //                         {String(d.getDate()).padStart(2, "0")}
// //                     </span>

// //                     {/* Today Dot */}
// //                     {isToday && (
// //                         <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
// //                     )}

// //                     {/* STATUS */}
// //                     <div className="absolute left-3 top-10 right-2">
// //                         <p
// //                             className={cn(
// //                                 "text-[11px] leading-4 font-medium",
// //                                 status === "present" &&
// //                                     "text-emerald-600",
// //                                 status === "half-day" &&
// //                                     "text-amber-600",
// //                                 status === "absent" &&
// //                                     "text-rose-600",
// //                                 status === "holiday" &&
// //                                     "text-sky-600",
// //                                 status === "week-off" &&
// //                                     "text-slate-500"
// //                             )}
// //                         >
// //                             {statusText}
// //                         </p>

// //                         {/* Hours */}
// //                         {record &&
// //                             record.workingHours > 0 && (
// //                                 <p className="mt-1 text-[10px] text-slate-500">
// //                                     {record.workingHours} Hours
// //                                 </p>
// //                             )}
// //                     </div>

                    
// //                 </button>
// //             );
// //         })}
// //     </div>
// // </div>
// //             {/* <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
// //                 {WEEK_DAYS.map((d) => (
// //                 <div key={d} className="py-1">
// //                     {d}
// //                 </div>
// //                 ))}
// //             </div> */}
        

// //             {/* Legend */}
// //             <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
// //                 {Object.entries(statusMeta).map(([k, m]) => (
// //                 <span key={k} className="flex items-center gap-1.5">
// //                     {/* <span className={cn("h-2 w-2 rounded-full", m.dot)} />
// //                     {m:any.label} */}
// //                 </span>
// //                 ))}
// //                 <span className="flex items-center gap-1.5">
// //                 <span className="h-2 w-2 rounded-full bg-primary" />
// //                 Today
// //                 </span>
// //             </div>

// //             {employeeId && (
// //                 <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
// //                 <Stat label="Working hours" value={`${totals.hours}h`} />
// //                 <Stat label="Present days" value={totals.present} />
// //                 <Stat label="Half days" value={totals.halfDays} />
// //                 <Stat label="Leaves" value={totals.leaves} />
// //                 </div>
// //             )}

// //             {!employeeId && (
// //                 <p className="mt-6 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
// //                 Select an employee above to load attendance details.
// //                 </p>
// //             )}
// //             </CardContent>
// //         </Card>

// //         {/* Right column */}
// //         <div className="space-y-6">
// //             {selectedRecord && selectedEmployee && (
// //     <Card className="overflow-hidden">
// //         <CardHeader className="pb-3">
// //             <CardTitle className="flex items-center gap-2 text-sm">
// //                 <Clock className="h-4 w-4 text-slate-500" />

// //                 {new Date(`${selectedKey}T00:00:00`).toLocaleDateString(
// //                     "en-US",
// //                     {
// //                         weekday: "short",
// //                         day: "numeric",
// //                         month: "short",
// //                         year: "numeric",
// //                     }
// //                 )}
// //             </CardTitle>
// //         </CardHeader>

// //         <CardContent className="space-y-4">

// //             {/* Employee */}
// //             <div>
// //                 <p className="text-sm font-semibold text-slate-800">
// //                     {selectedEmployee.name}
// //                 </p>

// //                 <p
// //                     className={cn(
// //                         "mt-1 text-xs font-medium",
// //                         statusMeta[selectedRecord.status].text
// //                     )}
// //                 >
// //                     {statusMeta[selectedRecord.status].label}
// //                 </p>
// //             </div>

// //             {/* Check In / Check Out */}
// //             <div className="space-y-3">

// //                 {/* Check In */}
// //                 <div className="flex items-center gap-3 rounded-lg border p-3">
// //                     <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
// //                         <LogIn className="h-5 w-5 text-emerald-500" />
// //                     </div>

// //                     <div className="min-w-0">
// //                         <p className="text-xs font-semibold text-emerald-600">
// //                             Check In
// //                         </p>

// //                         <p className="mt-1 text-sm font-medium text-slate-700">
// //                             {selectedRecord.clockIn || "--"}
// //                         </p>
// //                     </div>
// //                 </div>

// //                 {/* Check Out */}
// //                 <div className="flex items-center gap-3 rounded-lg border p-3">
// //                     <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50">
// //                         <LogOut className="h-5 w-5 text-orange-500" />
// //                     </div>

// //                     <div className="min-w-0">
// //                         <p className="text-xs font-semibold text-orange-500">
// //                             Check Out
// //                         </p>

// //                         <p className="mt-1 text-sm font-medium text-slate-700">
// //                             {selectedRecord.clockOut || "--"}
// //                         </p>
// //                     </div>
// //                 </div>

// //             </div>

// //             {/* Total Hours */}
// //             <div className="flex items-center justify-between border-t pt-3">
// //                 <span className="text-sm font-semibold text-slate-700">
// //                     Total hours
// //                 </span>

// //                 <span className="rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
// //                     {selectedRecord.workingHours}h
// //                 </span>
// //             </div>

// //         </CardContent>
// //     </Card>
// // )}

// //             <Card>
// //             <CardHeader>
// //                 <CardTitle className="flex items-center gap-2 text-base">
// //                 <PartyPopper className="h-4 w-4" />
// //                 Upcoming Holidays
// //                 </CardTitle>
// //             </CardHeader>
// //             <CardContent className="space-y-3">
// //                 {upcomingHolidays.length === 0 && (
// //                 <p className="text-sm text-muted-foreground">No upcoming holidays.</p>
// //                 )}
// //                 {upcomingHolidays.map((h:any) => {
// //                 const d = new Date(`${h.date}T00:00:00`);
// //                 return (
// //                     <div key={h.date} className="flex items-center gap-3 rounded-md border p-2">
// //                     <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-muted text-xs">
// //                         <span className="font-semibold leading-none">{d.getDate()}</span>
// //                         <span className="text-[10px] text-muted-foreground">
// //                         {d.toLocaleDateString("en-US", { month: "short" })}
// //                         </span>
// //                         </div>
// //                         <div>
// //                         <p className="text-sm font-medium">{h.name}</p>
// //                         <p className="text-xs text-muted-foreground">
// //                         {d.toLocaleDateString("en-US", { weekday: "long" })}
// //                         </p>
// //                     </div>
// //                     </div>
// //                 );
// //                 })}
// //             </CardContent>
// //             </Card>
// //         </div>
// //         </div>
// //     </div>
// //     </DashboardLayout>
// // );
// // }

// // function Stat({ label, value }: { label: string; value: string | number }) {
// //     return (
// //     <div className="rounded-md border p-3">
// //         <p className="text-xs text-muted-foreground">{label}</p>
// //         <p className="mt-1 text-lg font-semibold">{value}</p>
// //     </div>
// //     );
// // }


























// // import { createFileRoute } from "@tanstack/react-router";
// // import { useEffect, useMemo, useState } from "react";
// // import { RotateCcw } from "lucide-react";
// // import {
// //     ChevronLeft,
// //     ChevronRight,
// //     CalendarDays,
// //     PartyPopper,
// //     Clock,
// //     LogIn,
// //     LogOut,
// //     } from "lucide-react";
// //     import { useQuery } from "@tanstack/react-query";

// //     import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// //     import { Label } from "@/components/ui/label";
// //     import { Input } from "@/components/ui/input";
// //     import { Button } from "@/components/ui/button";
// //     import {
// //     Select,
// //     SelectContent,
// //     SelectItem,
// //     SelectTrigger,
// //     SelectValue,
// //     } from "@/components/ui/select";

// //     import { DashboardLayout } from "@/components/layout/DashboardLayout";
// //     import { cn } from "@/lib/utils";
// //     import { attendanceApi } from "@/api/attendance";
// //     import { useAppStore } from "@/store/useAppStore";
    
// //     export const Route = createFileRoute("/employeeworkcalendar")({
// //     head: () => ({
// //         meta: [
// //         { title: "Employee Work Calendar — HR Settings" },
// //         {
// //             name: "description",
// //             content:
// //             "Search an employee and view attendance, working hours and leaves on a calendar.",
// //         },
// //         ],
// //     }),
// //     component: EmployeeWorkCalendarPage,
// //     });

// //     const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// //     type ApiAttendanceRecord = {
// //     id: string;
// //     employee: string;
// //     employeeId: string;
// //     department: string;
// //     date: string;

// //     checkIn: string | null;
// //     checkOut: string | null;

// //     workingHours: string;
// //     totalWorkMinutes: number;

// //     completedWorkMinutes: number;
// //     completedWorkingHours: string;

// //     totalBreakMinutes: number;
// //     liveBreakMinutes: number;

// //     freeBreakMinutes: number;
// //     excessBreakMinutes: number;

// //     effectiveWorkMinutes: number;
// //     effectiveWorkingHours: string;

// //     requiredWorkMinutes: number;
// //     requiredWorkingHours: string;

// //     remainingWorkMinutes: number;
// //     remainingWorkingHours: string;

// //     isWorkingTimeComplete: boolean;

// //     liveCurrentSessionMinutes: number;
// //     liveWorkMinutes: number;
// //     liveWorkingHours: string;

// //     liveEffectiveWorkMinutes: number;
// //     liveEffectiveWorkingHours: string;

// //     liveRemainingWorkMinutes: number;
// //     liveRemainingWorkingHours: string;

// //     liveWorkingTimeComplete: boolean;

// //     status: string;
// //     currentState: string;

// //     sessions: {
// //         in: string;
// //         out: string | null;
// //         source: string;
// //         camera_id: string | null;
// //         similarity: number;
// //     }[];

// //     lastAction: string;
// //     lastActionAt: string;

// //     lastSimilarity: number;

// //     createdAt: string;
// //     updatedAt: string;
// //     };

// //     function toKey(date: Date) {
// //     const year = date.getFullYear();
// //     const month = String(date.getMonth() + 1).padStart(2, "0");
// //     const day = String(date.getDate()).padStart(2, "0");

// //     return `${year}-${month}-${day}`;
// //     }

// //     function monthLabel(date: Date) {
// //     return date.toLocaleDateString("en-US", {
// //         month: "long",
// //         year: "numeric",
// //     });
// //     }

// //     function formatTime(dateTime: string | null | undefined) {
// //     if (!dateTime) return "--";

// //     const date = new Date(dateTime);

// //     if (Number.isNaN(date.getTime())) return "--";

// //     return date.toLocaleTimeString("en-GB", {
// //         hour: "2-digit",
// //         minute: "2-digit",
// //         hour12: false,
// //     });
// //     }

// //     function formatHours(value: string | number | null | undefined) {
// //     if (value === null || value === undefined || value === "") {
// //         return "00:00 hours";
// //     }

// //     const text = String(value).trim();

// //     return `${text} hours`;
// // }


// //     function getStatus(record: ApiAttendanceRecord | undefined) {
// //     if (!record) return null;

// //     const status = record.status?.toLowerCase();

// //     if (status === "present") return "present";
// //     if (status === "absent") return "absent";
// //     if (status === "holiday") return "holiday";
// //     if (status === "half-day") return "half-day";
// //     if (status === "half_day") return "half-day";
// //     if (status === "week-off") return "week-off";
// //     if (status === "week_off") return "week-off";

// //     return status;
// //     }

// //     function statusText(record: ApiAttendanceRecord | undefined) {
// //     const status = getStatus(record);

// //     switch (status) {
// //         case "present":
// //         return "Full Day";

// //         case "half-day":
// //         return "Half Day";

// //         case "absent":
// //         return "Absent";

// //         case "holiday":
// //         return "Holiday";

// //         case "week-off":
// //         return "Week Off";

// //         default:
// //         return "";
// //     }
// //     }

// //     function statusClasses(record: ApiAttendanceRecord | undefined) {
// //     const status = getStatus(record);

// //     switch (status) {
// //         case "present":
// //         return {
// //             bg: "bg-emerald-50",
// //             text: "text-emerald-600",
// //         };

// //         case "half-day":
// //         return {
// //             bg: "bg-amber-50",
// //             text: "text-amber-600",
// //         };

// //         case "absent":
// //         return {
// //             bg: "bg-rose-50",
// //             text: "text-rose-600",
// //         };

// //         case "holiday":
// //         return {
// //             bg: "bg-sky-50",
// //             text: "text-sky-600",
// //         };

// //         case "week-off":
// //         return {
// //             bg: "bg-slate-50",
// //             text: "text-slate-500",
// //         };

// //         default:
// //         return {
// //             bg: "bg-white",
// //             text: "text-slate-500",
// //         };
// //     }
// //     }

// //     function EmployeeWorkCalendarPage() {
// //     const today = useMemo(() => new Date(), []);
// //     const todayKey = toKey(today);
// //     const handleRefresh = async () => {
// //         if (!isEmployee) setEmployeeId("");
// //         setMonthValue(
// //             `${today.getFullYear()}-${String(
// //                 today.getMonth() + 1
// //             ).padStart(2, "0")}`
// //         );
// //         setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
// //         setSelectedKey(null);

// //         await refetch();
// //     };
// //     const currentUser = useAppStore((state) => state.user);
// //     const isEmployee = currentUser?.role === "user";
// //     const [employeeId, setEmployeeId] = useState(() =>
// //         currentUser?.employee_id || currentUser?.id || ""
// //     );

// //     // Selected month: YYYY-MM
// //     const [monthValue, setMonthValue] = useState(() => {
// //         return `${today.getFullYear()}-${String(
// //             today.getMonth() + 1
// //         ).padStart(2, "0")}`;
// //     });

// //     // Calendar ka current month
// //     const [cursor, setCursor] = useState(
// //         () => new Date(today.getFullYear(), today.getMonth(), 1)
// //     );

// //     const [selectedKey, setSelectedKey] = useState<string | null>(null);

// //     // Month dropdown change hone par calendar update hoga
// //     useEffect(() => {
// //         const [year, month] = monthValue.split("-").map(Number);

// //         if (!year || !month || month < 1 || month > 12) return;

// //         setCursor(new Date(year, month - 1, 1));
// //         setSelectedKey(null);
// //     }, [monthValue]);

// //     /*
// //      * SAME API
// //      */
// //     const {
// //         data = [],
// //         isLoading,
// //         isError,
// //         refetch,
// //     } = useQuery<ApiAttendanceRecord[]>({
// //         queryKey: ["attendance"],
// //         queryFn: () => attendanceApi.list() as Promise<ApiAttendanceRecord[]>,
// //     });

// //     /*
// //      * Employee dropdown API se banega.
// //      */
// //     /*
// //     * Employee dropdown API se banega.
// //     */
// //     const employeeOptions = useMemo(() => {
// //         const map = new Map<
// //         string,
// //         {
// //             employeeId: string;
// //             employee: string;
// //             department: string;
// //         }
// //         >();

// //         data.forEach((record) => {
// //         if (!map.has(record.employeeId)) {
// //             map.set(record.employeeId, {
// //             employeeId: record.employeeId,
// //             employee: record.employee,
// //             department: record.department,
// //             });
// //         }
// //         });

// //         return Array.from(map.values());
// //     }, [data]);

// //     /*
// //     * Selected employee ke records
// //     */
// //     const employeeRecords = useMemo(() => {
// //         if (!employeeId) return [];

// //         return data.filter((record) => record.employeeId === employeeId);
// //     }, [data, employeeId]);
// //     const monthOptions = useMemo(() => {
// //     const years = new Set<number>([today.getFullYear()]);

// //     data.forEach((record) => {
// //         const recordDate = new Date(`${record.date}T00:00:00`);

// //         if (!Number.isNaN(recordDate.getTime())) {
// //             years.add(recordDate.getFullYear());
// //         }
// //     });

// //     return Array.from(years)
// //         .sort((a, b) => b - a)
// //         .flatMap((year) =>
// //             Array.from({ length: 12 }, (_, index) => {
// //                 const month = index + 1;

// //                 return {
// //                     value: `${year}-${String(month).padStart(2, "0")}`,
// //                     label: new Date(year, index, 1).toLocaleDateString(
// //                         "en-US",
// //                         { month: "long", year: "numeric" }
// //                     ),
// //                 };
// //             })
// //         );
// // }, [data, today]);

// //     /*
// //     * date => API record
// //     */
// //     const recordMap = useMemo(() => {
// //         const map = new Map<string, ApiAttendanceRecord>();

// //         employeeRecords.forEach((record) => {
// //         map.set(record.date, record);
// //         });

// //         return map;
// //     }, [employeeRecords]);

// //     /*
// //     * Calendar 42 days
// //     */
// //     const days = useMemo(() => {
// //         const first = new Date(
// //         cursor.getFullYear(),
// //         cursor.getMonth(),
// //         1,
// //         );

// //         const start = new Date(first);

// //         start.setDate(first.getDate() - first.getDay());

// //         return Array.from({ length: 42 }, (_, i) => {
// //         const d = new Date(start);

// //         d.setDate(start.getDate() + i);

// //         return d;
// //         });
// //     }, [cursor]);

// //     // const inRange = (key: string) => {
// //     //     if (dateFrom && key < dateFrom) return false;
// //     //     if (dateTo && key > dateTo) return false;

// //     //     return true;
// //     // };

// //     /*
// //     * Calendar date ka API record
// //     */
// //     const recordFor = (date: Date) => {
// //         if (!employeeId) return undefined;

// //         const key = toKey(date);

// //         // if (!inRange(key)) return undefined;

// //         return recordMap.get(key);
// //     };

// //     /*
// //     * Current month ke records
// //     */
// //     const monthRecords = useMemo(() => {
// //     if (!employeeId) return [];

// //     const year = cursor.getFullYear();
// //     const month = cursor.getMonth();

// //     return employeeRecords.filter((record) => {
// //         const recordDate = new Date(`${record.date}T00:00:00`);

// //         return (
// //             !Number.isNaN(recordDate.getTime()) &&
// //             recordDate.getFullYear() === year &&
// //             recordDate.getMonth() === month
// //         );
// //     });
// // }, [employeeId, employeeRecords, cursor]);

// //     /*
// //     * Statistics
// //     */
// //     const totals = useMemo(() => {
// //         const present = monthRecords.filter(
// //         (record) => getStatus(record) === "present",
// //         ).length;

// //         const leaves = monthRecords.filter(
// //         (record) => getStatus(record) === "absent",
// //         ).length;

// //         const halfDays = monthRecords.filter(
// //         (record) => getStatus(record) === "half-day",
// //         ).length;

// //         const holidays = monthRecords.filter(
// //         (record) => getStatus(record) === "holiday",
// //         ).length;

// //         const weekOffs = monthRecords.filter(
// //         (record) => getStatus(record) === "week-off",
// //         ).length;

// //         const totalMinutes = monthRecords.reduce(
// //         (sum, record) => sum + (record.totalWorkMinutes || 0),
// //         0,
// //         );

// //         return {
// //         present,
// //         leaves,
// //         halfDays,
// //         holidays,
// //         weekOffs,
// //         totalMinutes,
// //         };
// //     }, [monthRecords]);

// //     const totalHours = useMemo(() => {
// //         const hours = Math.floor(totals.totalMinutes / 60);
// //         const minutes = totals.totalMinutes % 60;

// //         return `${hours}h ${String(minutes).padStart(2, "0")}m`;
// //     }, [totals.totalMinutes]);

// //     /*
// //     * Selected record
// //     */
// //     const selectedRecord = useMemo(() => {
// //     if (!selectedKey || !employeeId) return undefined;

// //     return recordMap.get(selectedKey);
// // }, [selectedKey, employeeId, recordMap]);

// //     const selectedEmployee = useMemo(() => {
// //         return employeeOptions.find(
// //         (employee) => employee.employeeId === employeeId,
// //         );
// //     }, [employeeOptions, employeeId]);

// //     /*
// //     * No hard-coded holidays.
// //     * API me holiday records honge to calendar me wahi Holiday dikhega.
// //     */
// //     const upcomingHolidays = useMemo(() => {
// //         return data
// //         .filter((record) => {
// //             return (
// //             record.date >= todayKey &&
// //             getStatus(record) === "holiday"
// //             );
// //         })
// //         .sort((a, b) => a.date.localeCompare(b.date))
// //         .slice(0, 8);
// //     }, [data, todayKey]);

// //     return (
// //         <DashboardLayout
// //         title="Employee Work Calendar"
// //         description="Track employee working hours, leaves and attendance with a monthly calendar."
// //         breadcrumbs={[
// //             {
// //             label: "Employee Work Calendar",
// //             },
// //         ]}
// //         >
// //         <div className="space-y-6">
// //             {/* Filters */}
// //             <Card className="mb-6">
// //             <CardContent className="grid grid-cols-1 items-end gap-4 pt-6 md:grid-cols-[1fr_1fr_auto]">
// //                 {/* Employee selector is only available to administrators. */}
// //                 {!isEmployee && <div className="space-y-2">
// //                 <Label htmlFor="employee">
// //                     Employee
// //                 </Label>

// //                 <Select
// //                     value={employeeId}
// //                     onValueChange={(value) => {
// //                     setEmployeeId(value);
// //                     setSelectedKey(null);
// //                     }}
// //                 >
// //                     <SelectTrigger id="employee">
// //                     <SelectValue placeholder="Search employee" />
// //                     </SelectTrigger>

// //                     <SelectContent>
// //                     {employeeOptions.map((employee) => (
// //                         <SelectItem
// //                         key={employee.employeeId}
// //                         value={employee.employeeId}
// //                         >
// //                         {employee.employee} —{" "}
// //                         {employee.employeeId}
// //                         </SelectItem>
// //                     ))}
// //                     </SelectContent>
// //                 </Select>
// //                 </div>}
// // {/* Month Dropdown */}
// // <div className="space-y-2">
// //     <Label htmlFor="month">Select Month</Label>

// //     <Select
// //         value={monthValue}
// //         onValueChange={setMonthValue}
// //     >
// //         <SelectTrigger id="month">
// //             <SelectValue placeholder="Select month" />
// //         </SelectTrigger>

// //         <SelectContent>
// //             {monthOptions.map((month) => (
// //                 <SelectItem
// //                     key={month.value}
// //                     value={month.value}
// //                 >
// //                     {month.label}
// //                 </SelectItem>
// //             ))}
// //         </SelectContent>
// //     </Select>
// // </div>
// //                 {/* From */}
// //                 {/* <div className="space-y-2">
// //                 <Label htmlFor="from">
// //                     Date from
// //                 </Label>

// //                 <Input
// //                     id="from"
// //                     type="date"
// //                     value={dateFrom}
// //                     onChange={(e) =>
// //                     setDateFrom(e.target.value)
// //                     }
// //                 />
// //                 </div> */}

// //                 {/* To */}
// //                 {/* <div className="space-y-2">
// //                 <Label htmlFor="to">
// //                     Date to
// //                 </Label>

// //                 <Input
// //                     id="to"
// //                     type="date"
// //                     value={dateTo}
// //                     onChange={(e) =>
// //                     setDateTo(e.target.value)
// //                     }
// //                 />
// //                 </div> */}
// //                 <div>
// //     <Button
// //         onClick={handleRefresh}
// //         variant="outline"
// //         className="w-full md:w-auto"
// //     >
// //         <RotateCcw className="mr-2 h-4 w-4" />
// //         Refresh
// //     </Button>
// // </div>
// //             </CardContent>
// //             </Card>

// //             {isLoading && (
// //             <Card>
// //                 <CardContent className="py-10 text-center text-sm text-muted-foreground">
// //                 Loading attendance...
// //                 </CardContent>
// //             </Card>
// //             )}

// //             {isError && (
// //             <Card>
// //                 <CardContent className="flex flex-col items-center gap-3 py-10">
// //                 <p className="text-sm text-destructive">
// //                     Attendance data load nahi ho saka.
// //                 </p>

// //                 <Button
// //                     variant="outline"
// //                     onClick={() => refetch()}
// //                 >
// //                     Try Again
// //                 </Button>
// //                 </CardContent>
// //             </Card>
// //             )}

// //             {!isLoading && !isError && (
// //             <div className="grid gap-6 lg:grid-cols-3">
// //                 {/* Calendar */}
// //                 <Card className="lg:col-span-2">
// //                 <CardHeader className="flex flex-row items-center justify-between space-y-0">
// //                     <CardTitle className="flex items-center gap-2 text-base">
// //                     <CalendarDays className="h-4 w-4" />

// //                     {monthLabel(cursor)}
// //                     </CardTitle>

// //                     <div className="flex items-center gap-1">
// //                     <Button
// //                         variant="outline"
// //                         size="icon"
// //                         aria-label="Previous month"
// //                         onClick={() =>
// //                         setCursor(
// //                             new Date(
// //                             cursor.getFullYear(),
// //                             cursor.getMonth() - 1,
// //                             1,
// //                             ),
// //                         )
// //                         }
// //                     >
// //                         <ChevronLeft className="h-4 w-4" />
// //                     </Button>

// //                     <Button
// //                         variant="outline"
// //                         size="sm"
// //                         onClick={() =>
// //                         setCursor(
// //                             new Date(
// //                             today.getFullYear(),
// //                             today.getMonth(),
// //                             1,
// //                             ),
// //                         )
// //                         }
// //                     >
// //                         Today
// //                     </Button>

// //                     <Button
// //                         variant="outline"
// //                         size="icon"
// //                         aria-label="Next month"
// //                         onClick={() =>
// //                         setCursor(
// //                             new Date(
// //                             cursor.getFullYear(),
// //                             cursor.getMonth() + 1,
// //                             1,
// //                             ),
// //                         )
// //                         }
// //                     >
// //                         <ChevronRight className="h-4 w-4" />
// //                     </Button>
// //                     </div>
// //                 </CardHeader>

// //                 <CardContent>
// //                     <div className="relative mt-3 overflow-visible rounded-xl border bg-white">
// //                     {/* Week Header */}
// //                     <div className="grid grid-cols-7 overflow-hidden rounded-t-xl bg-[#2563eb] text-xs font-semibold text-white">
// //                         {WEEK_DAYS.map((day) => (
// //                         <div
// //                             key={day}
// //                             className="border-r border-blue-400/40 py-2.5 text-center last:border-r-0"
// //                         >
// //                             {day}
// //                         </div>
// //                         ))}
// //                     </div>

// //                     {/* Calendar */}
// //                     <div className="grid grid-cols-7">
// //                         {days.map((d) => {
// //                         const key = toKey(d);

// //                         const record = recordFor(d);

// //                         const isCurrentMonth =
// //                             d.getMonth() ===
// //                             cursor.getMonth();

// //                         const isToday =
// //                             key === todayKey;

// //                         const status = getStatus(record);

// //                         const classes =
// //                             statusClasses(record);

// //                         return (
// //                             <button
// //                             key={key}
// //                             type="button"
// //                             onClick={() => {
// //                                 if (record) {
// //                                 setSelectedKey(key);
// //                                 }
// //                             }}
// //                             className={cn(
// //                                 "relative h-24 border-r border-b p-2 text-left transition-all",
// //                                 "hover:z-20 hover:bg-blue-50",
// //                                 classes.bg,
// //                                 !isCurrentMonth &&
// //                                 "opacity-40",
// //                                 isToday &&
// //                                 "ring-2 ring-inset ring-blue-500",
// //                                 selectedKey === key &&
// //                                 "z-20 ring-2 ring-inset ring-blue-500",
// //                             )}
// //                             >
// //                             {/* Date */}
// //                             <span
// //                                 className={cn(
// //                                 "absolute right-2 top-2 text-sm font-semibold",
// //                                 isToday
// //                                     ? "text-blue-600"
// //                                     : "text-slate-700",
// //                                 )}
// //                             >
// //                                 {String(
// //                                 d.getDate(),
// //                                 ).padStart(2, "0")}
// //                             </span>

// //                             {/* Today dot */}
// //                             {isToday && (
// //                                 <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
// //                             )}

// //                             {/* Status */}
// //                             <div className="absolute left-3 right-2 top-10">
// //                                 {!employeeId ? (
// //                                 <p className="text-[10px] text-slate-400">
                                
// //                                 </p>
// //                                 ) : record ? (
// //                                 <>
// //                                     <p
// //                                     className={cn(
// //                                         "text-[11px] font-medium leading-4",
// //                                         classes.text,
// //                                     )}
// //                                     >
// //                                     {statusText(record)}
// //                                     </p>

// //                                     {status === "present" && (
// //     <p className="mt-1 text-[10px] text-slate-500">
// //         {formatHours(
// //             record.liveWorkingHours ||
// //             record.workingHours
// //         )}
// //     </p>
// // )}

// //                                     {status === "half-day" && (
// //     <p className="mt-1 text-[10px] text-slate-500">
// //         {formatHours(record.workingHours)}
// //     </p>
// // )}
// //                                 </>
// //                                 ) : (
// //                                 <p className="text-[10px] text-slate-400">
// //                                     No record
// //                                 </p>
// //                                 )}
// //                             </div>
// //                             </button>
// //                         );
// //                         })}
// //                     </div>
// //                     </div>

// //                     {/* Legend */}
// //                     <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
// //                     <Legend
// //                         color="bg-emerald-500"
// //                         text="Present"
// //                     />

// //                     <Legend
// //                         color="bg-amber-500"
// //                         text="Half Day"
// //                     />

// //                     <Legend
// //                         color="bg-rose-500"
// //                         text="Absent"
// //                     />

// //                     <Legend
// //                         color="bg-sky-500"
// //                         text="Holiday"
// //                     />

// //                     <Legend
// //                         color="bg-slate-400"
// //                         text="Week Off"
// //                     />

// //                     <Legend
// //                         color="bg-primary"
// //                         text="Today"
// //                     />
// //                     </div>

// //                     {/* Stats */}
// //                     {employeeId && (
// //                     <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
// //                         <Stat
// //                         label="Working hours"
// //                         value={totalHours}
// //                         />

// //                         <Stat
// //                         label="Present days"
// //                         value={totals.present}
// //                         />

// //                         <Stat
// //                         label="Half days"
// //                         value={totals.halfDays}
// //                         />

// //                         <Stat
// //                         label="Leaves"
// //                         value={totals.leaves}
// //                         />

// //                         <Stat
// //                         label="Holidays"
// //                         value={totals.holidays}
// //                         />
// //                     </div>
// //                     )}

// //                     {!employeeId && (
// //                     <p className="mt-6 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
// //                         Select an employee above to load
// //                         attendance details.
// //                     </p>
// //                     )}
// //                 </CardContent>
// //                 </Card>

// //                 {/* Right Column */}
// //                 <div className="space-y-6">
// //                 {/* Selected Day */}
// //                 {selectedRecord && selectedEmployee && (
// //                     <Card className="overflow-hidden">
// //                     <CardHeader className="pb-3">
// //                         <CardTitle className="flex items-center gap-2 text-sm">
// //                         <Clock className="h-4 w-4 text-slate-500" />

// //                         {new Date(
// //                             `${selectedRecord.date}T00:00:00`,
// //                         ).toLocaleDateString(
// //                             "en-US",
// //                             {
// //                             weekday: "short",
// //                             day: "numeric",
// //                             month: "short",
// //                             year: "numeric",
// //                             },
// //                         )}
// //                         </CardTitle>
// //                     </CardHeader>

// //                     <CardContent className="space-y-4">
// //                         {/* Employee */}
// //                         <div>
// //                         <p className="text-sm font-semibold text-slate-800">
// //                             {selectedEmployee.employee}
// //                         </p>

// //                         <p className="text-xs text-slate-500">
// //                             {selectedEmployee.employeeId}
// //                         </p>

// //                         <p
// //                             className={cn(
// //                             "mt-1 text-xs font-medium",
// //                             statusClasses(
// //                                 selectedRecord,
// //                             ).text,
// //                             )}
// //                         >
// //                             {statusText(
// //                             selectedRecord,
// //                             )}
// //                         </p>
// //                         </div>

// //                         {/* Check In */}
// //                         <div className="flex items-center gap-3 rounded-lg border p-3">
// //                         <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
// //                             <LogIn className="h-5 w-5 text-emerald-500" />
// //                         </div>

// //                         <div className="min-w-0">
// //                             <p className="text-xs font-semibold text-emerald-600">
// //                             Check In
// //                             </p>

// //                             <p className="mt-1 text-sm font-medium text-slate-700">
// //                             {formatTime(
// //                                 selectedRecord.checkIn,
// //                             )}
// //                             </p>
// //                         </div>
// //                         </div>

// //                         {/* Check Out */}
// //                         <div className="flex items-center gap-3 rounded-lg border p-3">
// //                         <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50">
// //                             <LogOut className="h-5 w-5 text-orange-500" />
// //                         </div>

// //                         <div className="min-w-0">
// //                             <p className="text-xs font-semibold text-orange-500">
// //                             Check Out
// //                             </p>

// //                             <p className="mt-1 text-sm font-medium text-slate-700">
// //                             {formatTime(
// //                                 selectedRecord.checkOut,
// //                             )}
// //                             </p>
// //                         </div>
// //                         </div>

// //                         {/* Total Hours */}
// //                         <div className="flex items-center justify-between border-t pt-3">
// //                         <span className="text-sm font-semibold text-slate-700">
// //                             Total hours
// //                         </span>

// //                         <span className="rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
// //                             {formatHours(
// //                             selectedRecord.workingHours,
// //                             )}
// //                         </span>
// //                         </div>

// //                         {/* Current State */}
// //                         <div className="flex items-center justify-between">
// //                         <span className="text-sm text-muted-foreground">
// //                             Current state
// //                         </span>

// //                         <span className="rounded-md bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
// //                             {selectedRecord.currentState ||
// //                             "--"}
// //                         </span>
// //                         </div>

// //                         {/* Remaining */}
// //                         <div className="flex items-center justify-between">
// //                         <span className="text-sm text-muted-foreground">
// //                             Remaining
// //                         </span>

// //                         <span className="text-sm font-semibold">
// //                             {selectedRecord.liveRemainingWorkingHours ||
// //                             selectedRecord.remainingWorkingHours ||
// //                             "--"}
// //                         </span>
// //                         </div>
// //                     </CardContent>
// //                     </Card>
// //                 )}

// //                 {/* Upcoming Holidays */}
// //                 <Card>
// //                     <CardHeader>
// //                     <CardTitle className="flex items-center gap-2 text-base">
// //                         <PartyPopper className="h-4 w-4" />
// //                         Upcoming Holidays
// //                     </CardTitle>
// //                     </CardHeader>

// //                     <CardContent className="space-y-3">
// //                     {upcomingHolidays.length === 0 && (
// //                         <p className="text-sm text-muted-foreground">
// //                         No upcoming holidays.
// //                         </p>
// //                     )}

// //                     {upcomingHolidays.map(
// //                         (record) => {
// //                         const d = new Date(
// //                             `${record.date}T00:00:00`,
// //                         );

// //                         return (
// //                             <div
// //                             key={record.id}
// //                             className="flex items-center gap-3 rounded-md border p-2"
// //                             >
// //                             <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-muted text-xs">
// //                                 <span className="font-semibold leading-none">
// //                                 {d.getDate()}
// //                                 </span>

// //                                 <span className="text-[10px] text-muted-foreground">
// //                                 {d.toLocaleDateString(
// //                                     "en-US",
// //                                     {
// //                                     month: "short",
// //                                     },
// //                                 )}
// //                                 </span>
// //                             </div>

// //                             <div>
// //                                 <p className="text-sm font-medium">
// //                                 Holiday
// //                                 </p>

// //                                 <p className="text-xs text-muted-foreground">
// //                                 {d.toLocaleDateString(
// //                                     "en-US",
// //                                     {
// //                                     weekday: "long",
// //                                     },
// //                                 )}
// //                                 </p>
// //                             </div>
// //                             </div>
// //                         );
// //                         },
// //                     )}
// //                     </CardContent>
// //                 </Card>
// //                 </div>
// //             </div>
// //             )}
// //         </div>
// //         </DashboardLayout>
// //     );
// //     }

// //     function Stat({
// //     label,
// //     value,
// //     }: {
// //     label: string;
// //     value: string | number;
// //     }) {
// //     return (
// //         <div className="rounded-md border p-3">
// //         <p className="text-xs text-muted-foreground">
// //             {label}
// //         </p>

// //         <p className="mt-1 text-lg font-semibold">
// //             {value}
// //         </p>
// //         </div>
// //     );
// //     }

// //     function Legend({
// //     color,
// //     text,
// //     }: {
// //     color: string;
// //     text: string;
// //     }) {
// //     return (
// //         <span className="flex items-center gap-1.5">
// //         <span
// //             className={cn(
// //             "h-2 w-2 rounded-full",
// //             color,
// //             )}
// //         />
// //         {text}
// //         </span>
// //     );
// // }





















// // //============= dummy

// // // import { createFileRoute } from "@tanstack/react-router";
// // // import { useMemo, useState } from "react";
// // // import { ChevronLeft, ChevronRight, CalendarDays, PartyPopper, Clock ,LogIn,
// // //     LogOut, } from "lucide-react";

// // // import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// // // import { Label } from "@/components/ui/label";
// // // import { Input } from "@/components/ui/input";
// // // import { Button } from "@/components/ui/button";
// // // import {
// // //     Select,
// // //     SelectContent,
// // //     SelectItem,
// // //     SelectTrigger,
// // //     SelectValue,
// // // } from "@/components/ui/select";
// // // import { cn } from "@/lib/utils";
// // // import {
// // //     employees,
// // //     holidays,
// // //     getAttendance,
// // //     statusMeta,
// // //     toKey,
// // //     type AttendanceRecord,
// // // } from "@/lib/attendance-data";
// // // import { DashboardLayout } from "@/components/layout/DashboardLayout";

// // // export const Route = createFileRoute("/employeeworkcalendar")({
// // //     head: () => ({
// // //     meta: [
// // //         { title: "Employee Work Calendar — HR Settings" },
// // //         {
// // //         name: "description",
// // //         content:
// // //             "Search an employee, filter by date range and view working hours, leaves and half days on a calendar with upcoming holidays.",
// // //         },
// // //         { property: "og:title", content: "Employee Work Calendar — HR Settings" },
// // //         {
// // //         property: "og:description",
// // //         content: "Track working hours, leaves and half days per employee on a monthly calendar.",
// // //         },
// // //     ],
// // //     }),
// // //     component: EmployeeWorkCalendarPage,
// // // });

// // // const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// // // function monthLabel(date: Date) {
// // //     return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
// // // }

// // // function EmployeeWorkCalendarPage() {
// // //     const today = useMemo(() => new Date(), []);
// // //     const todayKey = toKey(today);

// // //     const [employeeId, setEmployeeId] = useState<string>("");
// // //     const [dateFrom, setDateFrom] = useState("");
// // //     const [dateTo, setDateTo] = useState("");
// // //     const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
// // //     const [selectedKey, setSelectedKey] = useState<string | null>(null);

// // //     const days = useMemo(() => {
// // //     const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
// // //     const start = new Date(first);
// // //     start.setDate(first.getDate() - first.getDay());
// // //     return Array.from({ length: 42 }, (_, i) => {
// // //         const d = new Date(start);
// // //         d.setDate(start.getDate() + i);
// // //         return d;
// // //     });
// // //     }, [cursor]);

// // //     const inRange = (key: string) => {
// // //     if (dateFrom && key < dateFrom) return false;
// // //     if (dateTo && key > dateTo) return false;
// // //     return true;
// // //     };

// // //     const recordFor = (date: Date): AttendanceRecord | null => {
// // //     if (!employeeId) return null;
// // //     const key = toKey(date);
// // //     if (!inRange(key)) return null;
// // //     return getAttendance(employeeId, date);
// // //     };

// // //     const monthRecords = useMemo(() => {
// // //     if (!employeeId) return [];
// // //     const out: AttendanceRecord[] = [];
// // //     const total = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
// // //     for (let i = 1; i <= total; i++) {
// // //         const d = new Date(cursor.getFullYear(), cursor.getMonth(), i);
// // //         if (!inRange(toKey(d))) continue;
// // //         out.push(getAttendance(employeeId, d));
// // //     }
// // //     return out;
// // //     }, [employeeId, cursor, dateFrom, dateTo]);

// // //     const totals = useMemo(
// // //         () => ({
// // //         hours: monthRecords.reduce((s, r) => s + r.workingHours, 0),
// // //         leaves: monthRecords.filter((r) => r.status === "absent").length,
// // //         halfDays: monthRecords.filter((r) => r.status === "half-day").length,
// // //         present: monthRecords.filter((r) => r.status === "present").length,
// // //     }),
// // //     [monthRecords],
// // //     );

// // //     const upcomingHolidays = useMemo(
// // //     () => holidays.filter((h: any) => h.date >= todayKey).slice(0, 8),
// // //     [todayKey],
// // //     );

// // //     const selectedRecord =
// // //     selectedKey && employeeId ? getAttendance(employeeId, new Date(`${selectedKey}T00:00:00`)) : null;

// // //     const selectedEmployee = employees.find((e: any) => e.id === employeeId);


// // //     return (
// // //     <DashboardLayout
// // //         title="Employee Work Calendar"
// // //         description="Track employee working hours, leaves and attendance with a monthly calendar."
// // //         breadcrumbs={[
// // //             { label: "Employee Work Calendar" },
// // //         ]}
// // //     >
// // //         <div className="space-y-6">
    

// // //       {/* Filters */}
// // //         <Card className="mb-6">
// // //         <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
// // //             <div className="space-y-2">
// // //             <Label htmlFor="employee">Employee</Label>
// // //             <Select value={employeeId} onValueChange={setEmployeeId}>
// // //                 <SelectTrigger id="employee">
// // //                 <SelectValue placeholder="Search employee" />
// // //                 </SelectTrigger>
// // //                 <SelectContent>
// // //                 {employees.map((e: any) => (
// // //                     <SelectItem key={e.id} value={e.id}>
// // //                     {e.name} — {e.designation}
// // //                     </SelectItem>
// // //                 ))}
// // //                 </SelectContent>
// // //             </Select>
// // //             </div>
// // //             <div className="space-y-2">
// // //             <Label htmlFor="from">Date from</Label>
// // //             <Input
// // //                 id="from"
// // //                 type="date"
// // //                 value={dateFrom}
// // //                 onChange={(e) => setDateFrom(e.target.value)}
// // //             />
// // //             </div>
// // //             <div className="space-y-2">
// // //             <Label htmlFor="to">Date to</Label>
// // //             <Input id="to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
// // //             </div>
// // //         </CardContent>
// // //         </Card>

// // //         <div className="grid gap-6 lg:grid-cols-3">
// // //         {/* Calendar */}
// // //         <Card className="lg:col-span-2">
// // //             <CardHeader className="flex flex-row items-center justify-between space-y-0">
// // //             <CardTitle className="flex items-center gap-2 text-base">
// // //                 <CalendarDays className="h-4 w-4" />
// // //                 {monthLabel(cursor)}
// // //             </CardTitle>
// // //             <div className="flex items-center gap-1">
// // //                 <Button
// // //                 variant="outline"
// // //                 size="icon"
// // //                 aria-label="Previous month"
// // //                 onClick={() =>
// // //                     setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
// // //                 }
// // //                 >
// // //                 <ChevronLeft className="h-4 w-4" />
// // //                 </Button>
// // //                 <Button
// // //                 variant="outline"
// // //                 size="sm"
// // //                 onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
// // //                 >
// // //                 Today
// // //                 </Button>
// // //                 <Button
// // //                 variant="outline"
// // //                 size="icon"
// // //                 aria-label="Next month"
// // //                 onClick={() =>
// // //                     setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
// // //                 }
// // //                 >
// // //                 <ChevronRight className="h-4 w-4" />
// // //                 </Button>
// // //             </div>
// // //             </CardHeader>
// // //             <CardContent>
// // //                 <div className="relative mt-3 overflow-visible rounded-xl border bg-white">

// // //     {/* Week Header */}
// // //     <div className="grid grid-cols-7 overflow-hidden rounded-t-xl bg-[#2563eb] text-white text-xs font-semibold">
// // //         {WEEK_DAYS.map((day) => (
// // //             <div
// // //                 key={day}
// // //                 className="py-2.5 text-center border-r border-blue-400/40 last:border-r-0"
// // //             >
// // //                 {day}
// // //             </div>
// // //         ))}
// // //     </div>

// // //     {/* Calendar */}
// // //     <div className="grid grid-cols-7">
// // //         {days.map((d) => {
// // //             const key = toKey(d);
// // //             const record = recordFor(d);

// // //             const isCurrentMonth =
// // //                 d.getMonth() === cursor.getMonth();

// // //             const isToday = key === todayKey;

// // //             const status = record?.status;

// // //             const bg =
// // //                 status === "present"
// // //                     ? "bg-emerald-50"
// // //                     : status === "half-day"
// // //                     ? "bg-amber-50"
// // //                     : status === "absent"
// // //                     ? "bg-rose-50"
// // //                     : status === "holiday"
// // //                     ? "bg-sky-50"
// // //                     : status === "week-off"
// // //                     ? "bg-slate-50"
// // //                     : "bg-white";

// // //             const statusText =
// // //                 status === "present"
// // //                     ? "Full Day"
// // //                     : status === "half-day"
// // //                     ? "Half Day"
// // //                     : status === "absent"
// // //                     ? record?.note || "Absent"
// // //                     : status === "holiday"
// // //                     ? "Holiday"
// // //                     : status === "week-off"
// // //                     ? "Week Off"
// // //                     : "";

// // //             return (
// // //                 <button
// // //                     key={key}
// // //                     type="button"
// // //                     onClick={() => setSelectedKey(key)}
// // //                     className={cn(
// // //                         "relative h-24 border-r border-b p-2 text-left transition-all",
// // //                         "hover:z-20 hover:bg-blue-50",
// // //                         bg,
// // //                         !isCurrentMonth && "opacity-40",
// // //                         isToday && "ring-2 ring-inset ring-blue-500",
// // //                         selectedKey === key &&
// // //                             "z-20 ring-2 ring-inset ring-blue-500"
// // //                     )}
// // //                 >
// // //                     {/* DATE - TOP RIGHT */}
// // //                     <span
// // //                         className={cn(
// // //                             "absolute right-2 top-2 text-sm font-semibold",
// // //                             isToday
// // //                                 ? "text-blue-600"
// // //                                 : "text-slate-700"
// // //                         )}
// // //                     >
// // //                         {String(d.getDate()).padStart(2, "0")}
// // //                     </span>

// // //                     {/* Today Dot */}
// // //                     {isToday && (
// // //                         <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
// // //                     )}

// // //                     {/* STATUS */}
// // //                     <div className="absolute left-3 top-10 right-2">
// // //                         <p
// // //                             className={cn(
// // //                                 "text-[11px] leading-4 font-medium",
// // //                                 status === "present" &&
// // //                                     "text-emerald-600",
// // //                                 status === "half-day" &&
// // //                                     "text-amber-600",
// // //                                 status === "absent" &&
// // //                                     "text-rose-600",
// // //                                 status === "holiday" &&
// // //                                     "text-sky-600",
// // //                                 status === "week-off" &&
// // //                                     "text-slate-500"
// // //                             )}
// // //                         >
// // //                             {statusText}
// // //                         </p>

// // //                         {/* Hours */}
// // //                         {record &&
// // //                             record.workingHours > 0 && (
// // //                                 <p className="mt-1 text-[10px] text-slate-500">
// // //                                     {record.workingHours} Hours
// // //                                 </p>
// // //                             )}
// // //                     </div>

                    
// // //                 </button>
// // //             );
// // //         })}
// // //     </div>
// // // </div>
// // //             {/* <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
// // //                 {WEEK_DAYS.map((d) => (
// // //                 <div key={d} className="py-1">
// // //                     {d}
// // //                 </div>
// // //                 ))}
// // //             </div> */}
        

// // //             {/* Legend */}
// // //             <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
// // //                 {Object.entries(statusMeta).map(([k, m]) => (
// // //                 <span key={k} className="flex items-center gap-1.5">
// // //                     {/* <span className={cn("h-2 w-2 rounded-full", m.dot)} />
// // //                     {m:any.label} */}
// // //                 </span>
// // //                 ))}
// // //                 <span className="flex items-center gap-1.5">
// // //                 <span className="h-2 w-2 rounded-full bg-primary" />
// // //                 Today
// // //                 </span>
// // //             </div>

// // //             {employeeId && (
// // //                 <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
// // //                 <Stat label="Working hours" value={`${totals.hours}h`} />
// // //                 <Stat label="Present days" value={totals.present} />
// // //                 <Stat label="Half days" value={totals.halfDays} />
// // //                 <Stat label="Leaves" value={totals.leaves} />
// // //                 </div>
// // //             )}

// // //             {!employeeId && (
// // //                 <p className="mt-6 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
// // //                 Select an employee above to load attendance details.
// // //                 </p>
// // //             )}
// // //             </CardContent>
// // //         </Card>

// // //         {/* Right column */}
// // //         <div className="space-y-6">
// // //             {selectedRecord && selectedEmployee && (
// // //     <Card className="overflow-hidden">
// // //         <CardHeader className="pb-3">
// // //             <CardTitle className="flex items-center gap-2 text-sm">
// // //                 <Clock className="h-4 w-4 text-slate-500" />

// // //                 {new Date(`${selectedKey}T00:00:00`).toLocaleDateString(
// // //                     "en-US",
// // //                     {
// // //                         weekday: "short",
// // //                         day: "numeric",
// // //                         month: "short",
// // //                         year: "numeric",
// // //                     }
// // //                 )}
// // //             </CardTitle>
// // //         </CardHeader>

// // //         <CardContent className="space-y-4">

// // //             {/* Employee */}
// // //             <div>
// // //                 <p className="text-sm font-semibold text-slate-800">
// // //                     {selectedEmployee.name}
// // //                 </p>

// // //                 <p
// // //                     className={cn(
// // //                         "mt-1 text-xs font-medium",
// // //                         statusMeta[selectedRecord.status].text
// // //                     )}
// // //                 >
// // //                     {statusMeta[selectedRecord.status].label}
// // //                 </p>
// // //             </div>

// // //             {/* Check In / Check Out */}
// // //             <div className="space-y-3">

// // //                 {/* Check In */}
// // //                 <div className="flex items-center gap-3 rounded-lg border p-3">
// // //                     <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
// // //                         <LogIn className="h-5 w-5 text-emerald-500" />
// // //                     </div>

// // //                     <div className="min-w-0">
// // //                         <p className="text-xs font-semibold text-emerald-600">
// // //                             Check In
// // //                         </p>

// // //                         <p className="mt-1 text-sm font-medium text-slate-700">
// // //                             {selectedRecord.clockIn || "--"}
// // //                         </p>
// // //                     </div>
// // //                 </div>

// // //                 {/* Check Out */}
// // //                 <div className="flex items-center gap-3 rounded-lg border p-3">
// // //                     <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50">
// // //                         <LogOut className="h-5 w-5 text-orange-500" />
// // //                     </div>

// // //                     <div className="min-w-0">
// // //                         <p className="text-xs font-semibold text-orange-500">
// // //                             Check Out
// // //                         </p>

// // //                         <p className="mt-1 text-sm font-medium text-slate-700">
// // //                             {selectedRecord.clockOut || "--"}
// // //                         </p>
// // //                     </div>
// // //                 </div>

// // //             </div>

// // //             {/* Total Hours */}
// // //             <div className="flex items-center justify-between border-t pt-3">
// // //                 <span className="text-sm font-semibold text-slate-700">
// // //                     Total hours
// // //                 </span>

// // //                 <span className="rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
// // //                     {selectedRecord.workingHours}h
// // //                 </span>
// // //             </div>

// // //         </CardContent>
// // //     </Card>
// // // )}

// // //             <Card>
// // //             <CardHeader>
// // //                 <CardTitle className="flex items-center gap-2 text-base">
// // //                 <PartyPopper className="h-4 w-4" />
// // //                 Upcoming Holidays
// // //                 </CardTitle>
// // //             </CardHeader>
// // //             <CardContent className="space-y-3">
// // //                 {upcomingHolidays.length === 0 && (
// // //                 <p className="text-sm text-muted-foreground">No upcoming holidays.</p>
// // //                 )}
// // //                 {upcomingHolidays.map((h:any) => {
// // //                 const d = new Date(`${h.date}T00:00:00`);
// // //                 return (
// // //                     <div key={h.date} className="flex items-center gap-3 rounded-md border p-2">
// // //                     <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-muted text-xs">
// // //                         <span className="font-semibold leading-none">{d.getDate()}</span>
// // //                         <span className="text-[10px] text-muted-foreground">
// // //                         {d.toLocaleDateString("en-US", { month: "short" })}
// // //                         </span>
// // //                         </div>
// // //                         <div>
// // //                         <p className="text-sm font-medium">{h.name}</p>
// // //                         <p className="text-xs text-muted-foreground">
// // //                         {d.toLocaleDateString("en-US", { weekday: "long" })}
// // //                         </p>
// // //                     </div>
// // //                     </div>
// // //                 );
// // //                 })}
// // //             </CardContent>
// // //             </Card>
// // //         </div>
// // //         </div>
// // //     </div>
// // //     </DashboardLayout>
// // // );
// // // }

// // // function Stat({ label, value }: { label: string; value: string | number }) {
// // //     return (
// // //     <div className="rounded-md border p-3">
// // //         <p className="text-xs text-muted-foreground">{label}</p>
// // //         <p className="mt-1 text-lg font-semibold">{value}</p>
// // //     </div>
// // //     );
// // // }
