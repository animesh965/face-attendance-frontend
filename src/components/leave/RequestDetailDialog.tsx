import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, Loader2, MessageSquare, Pencil, ShieldAlert, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { leaveAdminApi, leaveApi, type LeaveRequest } from "@/api/leave";
import { useAppStore } from "@/store/useAppStore";
import { ApplyLeaveDialog } from "./ApplyLeaveDialog";
import { StatusBadge, errorText, fmtDate, fmtDateTime, fmtDays, isoDay, saveBlob } from "./leave-ui";

export type DetailMode = "self" | "admin" | "team";

const ACTION_LABEL: Record<string, string> = {
  applied: "Applied", edited: "Edited", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled",
  cancellation_requested: "Cancellation requested", cancellation_approved: "Cancellation approved",
  cancellation_rejected: "Cancellation rejected", override_approved: "Overridden to approved",
  override_rejected: "Overridden to rejected", override_cancelled: "Overridden to cancelled",
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium break-words">{children}</div>
    </div>
  );
}

export function RequestDetailDialog({ requestId, mode, onClose }: { requestId: string | null; mode: DetailMode; onClose: () => void }) {
  const qc = useQueryClient();
  const user = useAppStore((s) => s.user);
  const isSuper = user?.role === "super_admin";
  const q = useQuery({ queryKey: ["leave", "request", requestId], queryFn: () => leaveApi.request(requestId as string), enabled: !!requestId });
  const [comment, setComment] = useState("");
  const [decisionComment, setDecisionComment] = useState("");
  const [overrideStatus, setOverrideStatus] = useState<"approved" | "rejected" | "cancelled" | "">("");
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState<LeaveRequest | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const r = q.data;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["leave"] });
    qc.invalidateQueries({ queryKey: ["leave-admin"] });
  };

  const run = async (key: string, fn: () => Promise<{ message?: string } | unknown>, success: string) => {
    setBusy(key);
    try {
      const res = (await fn()) as { message?: string } | undefined;
      toast.success(res?.message ?? success);
      setDecisionComment("");
      setOverrideStatus("");
      setConfirmCancel(false);
      refresh();
    } catch (e) {
      toast.error("Action failed", { description: errorText(e) });
      refresh();
    } finally {
      setBusy("");
    }
  };

  const today = isoDay(new Date());
  const own = r && user && r.employee.id === user.id;
  const canCancel = own && mode === "self" && (r.status === "pending" || (r.status === "approved" && r.from_date > today));
  const canDecide = mode === "admin" && r && (r.status === "pending" || r.status === "cancellation_pending");
  const canOverride = mode === "admin" && isSuper && r && ["approved", "rejected", "cancelled"].includes(r.status);
  const canComment = mode !== "team";

  const download = async () => {
    if (!r?.attachment) return;
    try {
      saveBlob(await leaveApi.attachment(r.id), r.attachment.name);
    } catch (e) {
      toast.error("Could not download document", { description: errorText(e) });
    }
  };

  const addComment = () =>
    run("comment", async () => {
      await leaveApi.comment(r!.id, comment.trim());
      setComment("");
      return { message: "Comment added" };
    }, "Comment added");

  return (
    <>
      <Dialog open={!!requestId} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              Leave request {r?.request_no} {r && <StatusBadge status={r.status} />}
            </DialogTitle>
          </DialogHeader>
          {q.isLoading || !r ? (
            q.isError ? <p className="text-sm text-rose-600">{errorText(q.error)}</p> : <Loader2 className="mx-auto my-8 size-6 animate-spin" />
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Employee">{r.employee.employee_id ? `${r.employee.employee_id} - ` : ""}{r.employee.name}</Field>
                <Field label="Employee type">{r.employee.employee_type || "-"}</Field>
                <Field label="Department">{r.employee.department || "-"}</Field>
                <Field label="Leave type">
                  <span className="inline-flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: r.leave_type.color }} />
                    {r.leave_type.name}
                  </span>
                </Field>
                <Field label="Dates">
                  {fmtDate(r.from_date)}{r.to_date !== r.from_date ? ` to ${fmtDate(r.to_date)}` : ""}
                  {r.half_day && ` (${r.half_day_session === "first_half" ? "First" : "Second"} half)`}
                </Field>
                <Field label="Duration">{fmtDays(r.days)} day(s)</Field>
                <Field label="Applied on">{fmtDateTime(r.applied_at)}</Field>
                <Field label="Team email">{r.team_email || "-"}</Field>
                <Field label="Document">
                  {r.attachment ? (
                    <button className="inline-flex items-center gap-1 text-navy hover:underline" onClick={download}>
                      <Download className="size-3.5" /> {r.attachment.name}
                    </button>
                  ) : "-"}
                </Field>
              </div>
              {r.reason && <Field label="Reason"><span className="font-normal whitespace-pre-wrap">{r.reason}</span></Field>}
              {r.excluded_dates.length > 0 && (
                <Field label="Not counted">
                  <span className="text-xs font-normal">{r.excluded_dates.map((d) => `${fmtDate(d.date, "dd-MMM")} (${d.reason})`).join(", ")}</span>
                </Field>
              )}
              {r.decided_by && (
                <div className="rounded-md bg-muted/50 p-3 text-sm">
                  Decided by <b>{r.decided_by}</b> ({r.decided_by_role?.replace("_", " ")}) on {fmtDateTime(r.decided_at)}
                  {r.decision_comment && <p className="mt-1 text-muted-foreground">"{r.decision_comment}"</p>}
                </div>
              )}

              {canDecide && (
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-sm font-semibold">{r.status === "cancellation_pending" ? "Employee requested cancellation" : "Decision"}</p>
                  <Textarea value={decisionComment} onChange={(e) => setDecisionComment(e.target.value)} rows={2} placeholder="Comment (required to reject)" maxLength={1000} />
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" className="border-rose-300 text-rose-700" disabled={!!busy}
                      onClick={() => decisionComment.trim().length < 3 ? toast.error("Enter a comment of at least 3 characters to reject") :
                        run("reject", () => leaveAdminApi.reject(r.id, decisionComment.trim()), "Rejected")}>
                      {busy === "reject" ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                      {r.status === "cancellation_pending" ? "Reject cancellation" : "Reject"}
                    </Button>
                    <Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={!!busy}
                      onClick={() => run("approve", () => leaveAdminApi.approve(r.id, decisionComment.trim()), "Approved")}>
                      {busy === "approve" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      {r.status === "cancellation_pending" ? "Approve cancellation" : "Approve"}
                    </Button>
                  </div>
                </div>
              )}

              {canOverride && (
                <div className="space-y-2 rounded-lg border border-amber-300 p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="size-4 text-amber-600" /> Super Admin override</p>
                  <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
                    <Select value={overrideStatus} onValueChange={(v) => setOverrideStatus(v as typeof overrideStatus)}>
                      <SelectTrigger><SelectValue placeholder="Change status to" /></SelectTrigger>
                      <SelectContent>
                        {(["approved", "rejected", "cancelled"] as const).filter((s) => s !== r.status).map((s) => (
                          <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea value={decisionComment} onChange={(e) => setDecisionComment(e.target.value)} rows={1} placeholder="Reason (required)" />
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" disabled={!overrideStatus || decisionComment.trim().length < 3 || !!busy}
                      onClick={() => run("override", () => leaveAdminApi.override(r.id, overrideStatus as "approved", decisionComment.trim()), "Overridden")}>
                      {busy === "override" && <Loader2 className="size-4 animate-spin" />} Apply override
                    </Button>
                  </div>
                </div>
              )}

              {(canCancel || (own && mode === "self" && r.status === "pending")) && (
                <div className="flex flex-wrap justify-end gap-2">
                  {r.status === "pending" && (
                    <Button variant="outline" onClick={() => setEditing(r)}><Pencil className="size-4" /> Edit</Button>
                  )}
                  {canCancel && !confirmCancel && (
                    <Button variant="outline" className="border-rose-300 text-rose-700" onClick={() => setConfirmCancel(true)}>
                      <X className="size-4" /> {r.status === "approved" ? "Request cancellation" : "Cancel request"}
                    </Button>
                  )}
                  {confirmCancel && (
                    <div className="w-full space-y-2 rounded-lg border border-rose-200 p-3">
                      <p className="text-sm">
                        {r.status === "approved"
                          ? "This leave is approved. An administrator must approve the cancellation before your balance is restored."
                          : "Cancel this pending request?"}
                      </p>
                      <Textarea value={decisionComment} onChange={(e) => setDecisionComment(e.target.value)} rows={2} placeholder="Reason (optional)" />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setConfirmCancel(false)}>Keep request</Button>
                        <Button className="bg-rose-600 text-white hover:bg-rose-700" disabled={!!busy}
                          onClick={() => run("cancel", () => leaveApi.cancel(r.id, decisionComment.trim()), "Cancelled")}>
                          {busy === "cancel" && <Loader2 className="size-4 animate-spin" />} Confirm
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Separator />
              <div>
                <p className="mb-2 text-sm font-semibold">Approval history</p>
                <ol className="space-y-2 border-l pl-4">
                  {r.history.map((h, i) => (
                    <li key={i} className="relative text-sm">
                      <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-navy" />
                      <span className="font-medium">{ACTION_LABEL[h.action] ?? h.action}</span> by {h.by_name ?? "-"}
                      {h.role && <span className="text-muted-foreground"> ({h.role.replace("_", " ")})</span>}
                      <span className="block text-xs text-muted-foreground">{fmtDateTime(h.at)}</span>
                      {h.comment && <span className="block text-xs">"{h.comment}"</span>}
                    </li>
                  ))}
                </ol>
              </div>

              {canComment && (
                <div>
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><MessageSquare className="size-4" /> Comments</p>
                  <div className="space-y-2">
                    {r.comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
                    {r.comments.map((c) => (
                      <div key={c.id} className="rounded-md bg-muted/50 p-2 text-sm">
                        <p className="text-xs text-muted-foreground">{c.by_name} ({c.role?.replace("_", " ")}) &middot; {fmtDateTime(c.at)}</p>
                        <p className="whitespace-pre-wrap">{c.comment}</p>
                      </div>
                    ))}
                    {(own || mode === "admin") && (
                      <div className="flex gap-2">
                        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={1} placeholder="Add a comment" maxLength={1000} />
                        <Button variant="outline" disabled={!comment.trim() || !!busy} onClick={addComment}>Post</Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ApplyLeaveDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} editing={editing} />
    </>
  );
}
