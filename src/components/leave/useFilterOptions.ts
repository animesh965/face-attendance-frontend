import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { leaveAdminApi, leaveApi } from "@/api/leave";
import { useAppStore } from "@/store/useAppStore";

export interface Option {
  id: string;
  name: string;
}

/** Filter choices for leave screens. Admins get organisation-wide lists; managers get their own team. */
export function useFilterOptions() {
  const role = useAppStore((s) => s.user?.role);
  const isAdmin = role === "admin" || role === "super_admin";
  const leaveTypesQ = useQuery({ queryKey: ["leave", "all-types"], queryFn: () => leaveAdminApi.leaveTypes(true) });
  const employeeTypesQ = useQuery({ queryKey: ["leave", "employee-types"], queryFn: () => leaveAdminApi.employeeTypes(true) });
  const departmentsQ = useQuery({ queryKey: ["leave-admin", "departments"], queryFn: leaveAdminApi.departments, enabled: isAdmin });
  const adminEmployeesQ = useQuery({ queryKey: ["leave-admin", "employees", "all"], queryFn: () => leaveAdminApi.employees({ page_size: 2000 }), enabled: isAdmin });
  const teamQ = useQuery({ queryKey: ["leave", "reportees", "all", ""], queryFn: () => leaveApi.reportees("all"), enabled: !isAdmin });

  return useMemo(() => {
    const people = isAdmin ? adminEmployeesQ.data?.items ?? [] : teamQ.data?.members ?? [];
    const departments: Option[] = isAdmin
      ? (departmentsQ.data ?? []).map((d) => ({ id: d.id, name: d.name }))
      : [...new Map(people.filter((p) => p.department_id).map((p) => [p.department_id as string, { id: p.department_id as string, name: p.department }])).values()];
    return {
      isAdmin,
      leaveTypes: (leaveTypesQ.data ?? []).map((t) => ({ id: t.id, name: t.name })),
      employeeTypes: (employeeTypesQ.data ?? []).map((t) => ({ id: t.id, name: t.name })),
      departments,
      employees: people.map((p) => ({ id: p.id, name: `${p.employee_id ? p.employee_id + " - " : ""}${p.name}` })),
    };
  }, [isAdmin, leaveTypesQ.data, employeeTypesQ.data, departmentsQ.data, adminEmployeesQ.data, teamQ.data]);
}
