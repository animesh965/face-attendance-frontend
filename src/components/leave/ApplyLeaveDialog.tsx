import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CalendarDays, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { leaveApi, type ApplyPayload, type HalfDaySession, type LeaveRequest, type PreviewResult } from "@/api/leave";
import { errorText, fmtDate, fmtDays } from "./leave-ui";

const MAX_DOC_MB = 8;
const DOC_ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,.docx";

function Row({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 md:grid-cols-[170px_1fr] md:items-start md:gap-4">
      <Label className="pt-2 text-sm font-normal text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </Label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function ApplyLeaveDialog({
  open, onOpenChange, editing, defaultLeaveTypeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: LeaveRequest | null;
  defaultLeaveTypeId?: string | undefined;
}) {
  const qc = useQueryClient();
  const typesQ = useQuery({ queryKey: ["leave", "eligible-types"], queryFn: () => leaveApi.eligibleTypes(), enabled: open });
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [halfDay, setHalfDay] = useState(false);
  const [session, setSession] = useState<HalfDaySession>("first_half");
  const [teamEmail, setTeamEmail] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLeaveTypeId(editing?.leave_type.leave_type_id ?? defaultLeaveTypeId ?? "");
    setFromDate(editing?.from_date ?? "");
    setToDate(editing?.to_date ?? "");
    setHalfDay(editing?.half_day ?? false);
    setSession(editing?.half_day_session ?? "first_half");
    setTeamEmail(editing?.team_email ?? "");
    setReason(editing?.reason ?? "");
    setFile(null);
    setRemoveExisting(false);
    setPreview(null);
    setPreviewError("");
  }, [open, editing, defaultLeaveTypeId]);

  const types = typesQ.data ?? [];
  const selectedType = types.find((t) => t.leave_type_id === leaveTypeId);
  const sameDay = fromDate && fromDate === toDate;
  const halfAllowed = Boolean(selectedType?.allow_half_day && sameDay);

  useEffect(() => {
    if (!halfAllowed && halfDay) setHalfDay(false);
  }, [halfAllowed, halfDay]);

  const payload: ApplyPayload | null = useMemo(() => {
    if (!leaveTypeId || !fromDate || !toDate) return null;
    return {
      leave_type_id: leaveTypeId, from_date: fromDate, to_date: toDate, half_day: halfDay,
      half_day_session: halfDay ? session : null, team_email: teamEmail.trim() || undefined, reason: reason.trim() || undefined,
    };
  }, [leaveTypeId, fromDate, toDate, halfDay, session, teamEmail, reason]);

  // Live duration + balance check from the same backend rules used on submit.
  const previewKey = payload ? `${payload.leave_type_id}|${payload.from_date}|${payload.to_date}|${payload.half_day}|${payload.half_day_session}` : "";
  useEffect(() => {
    if (!open || !payload) {
      setPreview(null);
      setPreviewError("");
      return;
    }
    if (payload.to_date < payload.from_date) {
      setPreview(null);
      setPreviewError("To date must be on or after From date");
      return;
    }
    let live = true;
    setPreviewing(true);
    const t = setTimeout(() => {
      leaveApi.preview({ ...payload, team_email: undefined, reason: undefined }, editing?.id)
        .then((r) => { if (live) { setPreview(r); setPreviewError(""); } })
        .catch((e) => { if (live) { setPreview(null); setPreviewError(errorText(e)); } })
        .finally(() => live && setPreviewing(false));
    }, 300);
    return () => { live = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey, open]);

  const docRequired = Boolean(preview?.requires_document) && !(editing?.attachment && !removeExisting);

  const pickFile = (f: File | null) => {
    if (f && f.size > MAX_DOC_MB * 1024 * 1024) {
      toast.error(`Document must be under ${MAX_DOC_MB} MB`);
      return;
    }
    setFile(f);
  };

  const submit = async () => {
    if (!payload) { toast.error("Choose a leave type and dates"); return; }
    if (payload.to_date < payload.from_date) { toast.error("To date must be on or after From date"); return; }
    if (teamEmail.trim()) {
      const bad = teamEmail.split(/[,;]/).map((s) => s.trim()).filter(Boolean).find((s) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
      if (bad) { toast.error(`Invalid team email: ${bad}`); return; }
    }
    if (docRequired && !file) { toast.error("A supporting document is required for this leave"); return; }
    setSubmitting(true);
    try {
      if (editing) {
        await leaveApi.edit(editing.id, payload, file, removeExisting && !file);
        toast.success("Leave request updated");
      } else {
        const r = await leaveApi.apply(payload, file);
        toast.success("Leave applied", { description: `${r.request_no}: ${fmtDays(r.days)} day(s) sent to Admin for approval` });
      }
      qc.invalidateQueries({ queryKey: ["leave"] });
      onOpenChange(false);
    } catch (e) {
      toast.error(editing ? "Could not update leave" : "Could not apply leave", { description: errorText(e) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl gap-0 overflow-y-auto bg-muted/40 p-0 [&>button]:hidden">
        <div className="flex items-center justify-between border-b bg-card px-4 py-3">
          <DialogTitle className="text-base font-semibold">{editing ? `Edit Leave ${editing.request_no}` : "Apply Leave"}</DialogTitle>
          <Button variant="ghost" size="icon" className="size-7 bg-muted" onClick={() => onOpenChange(false)} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>
        <div className="p-3 md:p-4">
          <div className="rounded-lg border bg-card">
            <p className="border-b px-4 py-3 text-sm font-semibold">Leave</p>
            <div className="space-y-4 p-4">
              <Row label="Leave type" required>
                <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
                  <SelectTrigger><SelectValue placeholder={typesQ.isLoading ? "Loading..." : "Select"} /></SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t.leave_type_id} value={t.leave_type_id}>
                        {t.name} {t.is_lwp ? "(unpaid)" : `- ${fmtDays(t.applicable)} day(s) can be applied`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!typesQ.isLoading && types.length === 0 && (
                  <p className="mt-1 text-xs text-rose-600">No leave types are mapped to you yet. Please contact your administrator.</p>
                )}
              </Row>
              <Row label="Date" required>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input type="date" aria-label="From date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); if (!toDate || e.target.value > toDate) setToDate(e.target.value); }} />
                  <Input type="date" aria-label="To date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </Row>
              {selectedType?.allow_half_day && (
                <Row label="Half day">
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <label className={cn("flex items-center gap-2 text-sm", !halfAllowed && "opacity-50")}>
                      <Checkbox checked={halfDay} disabled={!halfAllowed} onCheckedChange={(v) => setHalfDay(v === true)} />
                      Apply as half day {!sameDay && <span className="text-xs text-muted-foreground">(single date only)</span>}
                    </label>
                    {halfDay && (
                      <RadioGroup value={session} onValueChange={(v) => setSession(v as HalfDaySession)} className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="first_half" /> First half</label>
                        <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="second_half" /> Second half</label>
                      </RadioGroup>
                    )}
                  </div>
                </Row>
              )}
              {payload && (
                <Row label="Duration">
                  <div className={cn("rounded-md border px-3 py-2 text-sm", previewError ? "border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" : "bg-muted/40")}>
                    {previewing ? (
                      <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Calculating...</span>
                    ) : previewError ? (
                      <span className="flex items-start gap-2"><AlertCircle className="mt-0.5 size-4 shrink-0" /> {previewError}</span>
                    ) : preview ? (
                      <div className="space-y-1">
                        <p className="flex items-center gap-2 font-medium"><CalendarDays className="size-4 text-navy" /> {fmtDays(preview.days)} day(s) of leave</p>
                        {preview.excluded_dates.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Not counted: {preview.excluded_dates.map((d) => `${fmtDate(d.date, "dd-MMM")} (${d.reason})`).join(", ")}
                          </p>
                        )}
                        {!preview.balance.is_lwp && (
                          <p className="text-xs text-muted-foreground">
                            Available {fmtDays(preview.balance.available)} &middot; pending {fmtDays(preview.balance.pending)} &middot; balance after approval {fmtDays((preview.balance.available ?? 0) - preview.days)}
                          </p>
                        )}
                        {preview.balance.is_lwp && <p className="text-xs text-muted-foreground">Unpaid leave - no balance is deducted.</p>}
                      </div>
                    ) : null}
                  </div>
                </Row>
              )}
              <Row label="Team Email ID">
                <Input value={teamEmail} onChange={(e) => setTeamEmail(e.target.value)} placeholder="Comma-separated addresses to keep informed" maxLength={500} />
              </Row>
              <Row label="Reason for leave">
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000} />
              </Row>
              <Row label="Supporting document" required={docRequired}>
                <div className="space-y-2">
                  {editing?.attachment && !removeExisting && !file && (
                    <div className="flex items-center gap-2 text-sm">
                      <Paperclip className="size-4" /> {editing.attachment.name}
                      <Button variant="ghost" size="sm" onClick={() => setRemoveExisting(true)}>Remove</Button>
                    </div>
                  )}
                  <Input type="file" accept={DOC_ACCEPT} onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
                  <p className="text-xs text-muted-foreground">PDF, JPG, PNG or Word, up to {MAX_DOC_MB} MB.{selectedType?.requires_document ? " Required for this leave type." : ""}</p>
                </div>
              </Row>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button className="bg-navy text-navy-foreground hover:bg-navy/90" onClick={submit} disabled={submitting || !payload}>
              {submitting && <Loader2 className="size-4 animate-spin" />} {editing ? "Update" : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
