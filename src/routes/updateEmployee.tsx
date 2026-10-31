import { useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, MailCheck, Pencil, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { employeesApi, type Employee } from "@/api/employees";
import { organizationApi } from "@/api/organization";
import { useAppStore } from "@/store/useAppStore";
import { onlyDigits, phoneError } from "@/lib/phone";

export const Route = createFileRoute("/updateEmployee")({
  beforeLoad: () => {
    const { authenticated, user } = useAppStore.getState();
    if (!authenticated || !user) throw redirect({ to: "/login" });
    if (user.role === "user") throw redirect({ to: "/dashboard" });
  },
  component: UpdateEmployeesPage,
});

const invalidPhone = (phone: string) => phoneError(phone) !== null;

function UpdateEmployeesPage() {
  const queryClient = useQueryClient();
  const { data: employees = [], isLoading, refetch } = useQuery<Employee[]>({
    queryKey: ["employees"], queryFn: employeesApi.list,
  });
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"], queryFn: organizationApi.getDepartments,
  });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Employee | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("male");
  const [departmentId, setDepartmentId] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const { data: designations = [] } = useQuery({
    queryKey: ["designations", departmentId],
    queryFn: () => organizationApi.getDesignations(departmentId),
    enabled: Boolean(departmentId),
  });

  const filtered = useMemo(() => employees.filter((e) =>
    [e.name, e.email, e.employeeId].some((v) => (v || "").toLowerCase().includes(search.toLowerCase()))
  ), [employees, search]);

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("Select an employee first");
      const phoneProblem = phoneError(phone);
      if (phoneProblem) throw new Error(phoneProblem);
      if (email.toLowerCase() !== selected.email.toLowerCase() && (!otpSent || !/^\d{6}$/.test(otp))) {
        throw new Error("Verify the new email using the 6-digit OTP before saving.");
      }
      return employeesApi.update(selected.id, {
        name, email, phone: onlyDigits(phone), gender,
        department_id: departmentId || null,
        designation_id: designationId || null,
        ...(email.toLowerCase() !== selected.email.toLowerCase() ? { email_otp: otp } : {}),
      });
    },
    onSuccess: async () => {
      toast.success("Employee updated successfully");
      setSelected(null);
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error: any) => toast.error("Unable to update employee", {
      description: error?.response?.data?.detail || error.message,
    }),
  });

  const startEdit = (employee: Employee) => {
    setSelected(employee);
    setName(employee.name || "");
    setEmail(employee.email || "");
    setPhone(employee.phone || "");
    setGender((employee as any).gender || "male");
    setDepartmentId((employee as any).departmentId || "");
    setDesignationId((employee as any).designationId || "");
    setOtp("");
    setOtpSent(false);
  };

  const sendOtp = async () => {
    if (!selected) return;
    if (!email.includes("@")) { toast.error("Enter a valid new email address"); return; }
    setSendingOtp(true);
    try {
      await employeesApi.requestEmailOtp(selected.id, email);
      setOtpSent(true);
      toast.success("Verification OTP sent to the new email address");
    } catch (error: any) {
      toast.error("Could not send OTP", { description: error?.response?.data?.detail || error.message });
    } finally { setSendingOtp(false); }
  };

  return (
    <DashboardLayout
      title="Update Employee"
      description="Edit employee profile details and verify a new email address before saving."
      breadcrumbs={[{ label: "Employee Records" }, { label: "Update Employee" }]}
      actions={<Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh"><RefreshCw className="size-4" /></Button>}
    >
      <Card className="glass-panel">
        <CardContent className="space-y-4 pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Search employee by name, email or ID" />
          </div>
          {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading employees...</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Employee ID</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.map((employee) => <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.employeeId}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{employee.phone || "—"}</TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => startEdit(employee)}><Pencil className="mr-2 size-4" />Edit</Button></TableCell>
                  </TableRow>)}
                  {!filtered.length && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No employees found.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selected && <Card className="glass-panel">
        <CardHeader><CardTitle className="text-base">Edit {selected.name}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Email / Gmail</Label><div className="flex gap-2"><Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setOtpSent(false); setOtp(""); }} /><Button type="button" variant="outline" disabled={sendingOtp || email.toLowerCase() === selected.email.toLowerCase()} onClick={sendOtp}>{sendingOtp ? <Loader2 className="size-4 animate-spin" /> : <MailCheck className="size-4" />}<span className="ml-2">Send OTP</span></Button></div>{email.toLowerCase() !== selected.email.toLowerCase() && <p className="text-xs text-muted-foreground">A 6-digit verification code will be sent to the new email.</p>}</div>
          {email.toLowerCase() !== selected.email.toLowerCase() && <div className="space-y-2"><Label>Email verification OTP</Label><Input inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(onlyDigits(e.target.value, 6))} placeholder="Enter 6-digit OTP" />{otpSent && <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="size-3" /> OTP sent</p>}</div>}
          <div className="space-y-2"><Label>Phone number</Label><Input inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(onlyDigits(e.target.value))} placeholder="10-digit Indian mobile number" />{phone && invalidPhone(phone) && <p className="text-xs text-destructive">{phoneError(phone)}</p>}</div>
          <div className="space-y-2"><Label>Gender</Label><Select value={gender} onValueChange={setGender}><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Department</Label><Select value={departmentId} onValueChange={(value) => { setDepartmentId(value); setDesignationId(""); }}><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger><SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Designation</Label><Select value={designationId} onValueChange={setDesignationId} disabled={!departmentId}><SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger><SelectContent>{designations.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="sm:col-span-2 flex justify-end gap-2"><Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button><Button disabled={updateMutation.isPending || invalidPhone(phone)} onClick={() => updateMutation.mutate()}>{updateMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Save changes</Button></div>
        </CardContent>
      </Card>}
    </DashboardLayout>
  );
}
