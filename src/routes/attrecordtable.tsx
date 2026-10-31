import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DAYS, codeMeta, totalsFor, type DayCode, type RecordEmployee } from "@/lib/attendance-data";

const CODES: DayCode[] = ["P", "A", "H", "SL", "CL"];

export function AttendanceRecordTable({
    employees,
    daysInMonth,
}: {
    employees: RecordEmployee[];
    daysInMonth: number;
}) {
    return (
    <Card className="overflow-hidden rounded-2xl border-border/70 p-0 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 border-b px-6 py-4">
            {CODES.map((c) => (
            <span key={c} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={cn("h-2.5 w-2.5 rounded-full", codeMeta[c].badge)} />
                <span className="font-medium text-foreground">{c}</span> {codeMeta[c].label}
            </span>
            ))}
        </div>

        <div className="max-h-[560px] overflow-auto">
        <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
            <thead>
                <tr>
                <Th className="sticky left-0 z-30 min-w-32 bg-muted/60 text-left">Employee Code</Th>
                <Th className="sticky left-32 z-30 min-w-48 bg-muted/60 text-left">Employee Name</Th>
                {DAYS.slice(0, daysInMonth).map((d) => (
    <Th key={d} className="w-10 min-w-10 bg-muted/60">
        {d}
    </Th>
))}
                {CODES.map((c) => (
                    <Th key={c} className="min-w-16 bg-muted/60">
                    {c} Total
                    </Th>
                ))}
                </tr>
            </thead>
            <tbody>
                {employees.map((e) => {
                const t = totalsFor(e.days);
                return (
                    <tr key={e.id} className="group">
                    <Td className="sticky left-0 z-20 min-w-32 bg-card text-left font-medium group-hover:bg-muted/40">
                    {e.code}
                    </Td>
                    <Td className="sticky left-32 z-20 min-w-48 bg-card text-left group-hover:bg-muted/40">
                        {e.name}
                    </Td>
                    {e.days.map((c, i) => (
                        <Td key={i} className={cn("font-medium", codeMeta[c].cell)}>
                        {c}
                        </Td>
                    ))}
                    {CODES.map((c) => (
                        <Td key={c} className="font-semibold">
                        {t[c]}
                        </Td>
                    ))}
                    </tr>
                );
                })}
            </tbody>
            </table>
        </div>
        </Card>
    );
}

function Th({ className, children }: { className?: string; children: React.ReactNode }) {
    return (
        <th
        className={cn(
            "sticky top-0 z-10 whitespace-nowrap border-b px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground backdrop-blur",
            className,
        )}
        >
        {children}
        </th>
    );
}

function Td({ className, children }: { className?: string; children: React.ReactNode }) {
    return (
        <td className={cn("whitespace-nowrap border-b px-3 py-2 text-center", className)}>{children}</td>
    );
}
