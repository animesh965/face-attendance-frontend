import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
    MONTHS,
    YEARS,
    attendanceRatio,
    totalsFor,
    type RecordEmployee,
} from "@/lib/attendance-data";

type Props = {
    employees: RecordEmployee[];
    year: string;
    month: string;
    employeeId: string;
    onYearChange: (v: string) => void;
    onMonthChange: (v: string) => void;
    onEmployeeChange: (v: string) => void;
};

export function AttendanceEmployeePanel({
    employees,
    year,
    month,
    employeeId,
    onYearChange,
    onMonthChange,
    onEmployeeChange,
}: Props) {
    const [open, setOpen] = useState(false);
    const selected = employees.find((e) => e.id === employeeId);
    const totals = selected ? totalsFor(selected.days) : null;

    return (
    <Card className="rounded-2xl border-border/70 p-6 shadow-sm lg:sticky lg:top-6">
        <h2 className="text-base font-semibold tracking-tight">Filters</h2>

        <div className="mt-4 space-y-4">
        <div className="space-y-1.5">
            <Label>Statistical Year</Label>
            <Select value={year} onValueChange={onYearChange}>
            <SelectTrigger className="w-full rounded-xl">
                <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
                {YEARS.map((y) => (
                <SelectItem key={y} value={y}>
                    {y}
                </SelectItem>
                ))}
            </SelectContent>
            </Select>
        </div>

        <div className="space-y-1.5">
            <Label>Statistical Month</Label>
            <Select value={month} onValueChange={onMonthChange}>
            <SelectTrigger className="w-full rounded-xl">
                <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
                {MONTHS.map((m) => (
                    <SelectItem key={m} value={m}>
                    {m}
                </SelectItem>
                ))}
            </SelectContent>
            </Select>
        </div>

        <div className="space-y-1.5">
            <Label>Employee Query</Label>
            <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between rounded-xl font-normal"
                >
                    <span className="flex items-center gap-2 truncate">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    {selected ? selected.name : "Search employee"}
                </span>
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search by name or code..." />
                    <CommandList>
                    <CommandEmpty>No employee found.</CommandEmpty>
                    <CommandGroup>
                    {employees.map((e) => (
                        <CommandItem
                            key={e.id}
                            value={`${e.name} ${e.code}`}
                            onSelect={() => {
                            onEmployeeChange(e.id === employeeId ? "" : e.id);
                            setOpen(false);
                            }}
                        >
                            <Check
                            className={cn(
                                "mr-2 h-4 w-4",
                            e.id === employeeId ? "opacity-100" : "opacity-0",
                            )}
                            />
                            <span className="truncate">{e.name}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{e.code}</span>
                        </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
                </Command>
                </PopoverContent>
            </Popover>
            </div>
        </div>

        {selected && totals ? (
            <div className="mt-6 rounded-2xl border bg-muted/40 p-5">
            <p className="text-sm font-semibold">{selected.name}</p>
            <p className="text-xs text-muted-foreground">{selected.department}</p>

            <dl className="mt-4 space-y-2.5 text-sm">
            <Row label="Employee No" value={selected.code} />
            <Row label="Attendance Ratio" value={`${attendanceRatio(selected.days)}%`} />
            <Row label="Present" value={totals.P} />
            <Row label="Absent" value={totals.A} />
            <Row label="Holiday" value={totals.H} />
            <Row label="Sick Leave" value={totals.SL} />
            <Row label="Casual Leave" value={totals.CL} />
            </dl>
            </div>
        ) : (
            <p className="mt-6 rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
            Select an employee to see their attendance breakdown.
        </p>
        )}
        </Card>
    );
}

function Row({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex items-center justify-between gap-4">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="font-medium">{value}</dd>
        </div>
    );
}