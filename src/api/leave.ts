import { api } from "./client";

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled" | "cancellation_pending";
export type HalfDaySession = "first_half" | "second_half";

export interface EmployeeBrief {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  role: string;
  photo: string;
  department_id: string | null;
  department: string;
  employee_type_id: string | null;
  employee_type: string;
  reporting_manager_id: string | null;
  date_of_joining: string | null;
  probation_end_date: string | null;
  location: string;
  gender: string;
  reporting_manager?: string | null | undefined;
  policy_id?: string | null | undefined;
}

export interface Shift {
  name: string;
  start_time: string;
  end_time: string;
}

export interface LeaveTypeBrief {
  leave_type_id: string;
  name: string;
  code: string;
  color: string;
  icon: string;
  is_paid: boolean;
  is_lwp: boolean;
  is_active: boolean;
}

export interface LeaveCard extends LeaveTypeBrief {
  eligible: boolean;
  eligibility_source: "employee" | "employee_type" | "none";
  allow_half_day: boolean;
  requires_document: boolean;
  document_required_after_days: number;
  min_days: number;
  max_days: number;
  accrual_frequency: "yearly" | "monthly";
  policy_source: string;
  entitlement: number;
  accrued: number;
  opening: number;
  carry_forward: number;
  adjusted: number;
  booked: number;
  pending: number;
  available: number | null;
  applicable: number | null;
  allocation_source: string | null;
}

export interface HistoryEntry {
  action: string;
  by: string;
  by_name?: string | undefined;
  role?: string | undefined;
  from_status: string | null;
  to_status: string;
  comment?: string | null | undefined;
  at: string;
}

export interface LeaveComment {
  id: string;
  by: string;
  by_name?: string | undefined;
  role?: string | undefined;
  comment: string;
  at: string;
}

export interface LeaveRequest {
  id: string;
  request_no: string;
  employee: EmployeeBrief;
  leave_type: LeaveTypeBrief;
  from_date: string;
  to_date: string;
  half_day: boolean;
  half_day_session: HalfDaySession | null;
  days: number;
  excluded_dates: { date: string; reason: string }[];
  team_email: string | null;
  reason: string | null;
  attachment: { name: string; size?: number | undefined } | null;
  status: LeaveStatus;
  applied_at: string;
  updated_at: string;
  decided_by: string | null;
  decided_by_role: string | null;
  decided_at: string | null;
  decision_comment: string | null;
  comments: LeaveComment[];
  history: HistoryEntry[];
  year: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface HolidayView {
  id: string;
  name: string;
  from_date: string;
  to_date: string;
  description: string | null;
  holiday_type: string;
  days: number;
}

export interface LeaveSummary {
  year: number;
  period: { start: string; end: string };
  weekly_offs: number[];
  booked_total: number;
  pending_total: number;
  absent_days: number;
  cards: LeaveCard[];
  upcoming: { leaves: LeaveRequest[]; holidays: HolidayView[] };
  past: { leaves: LeaveRequest[]; holidays: HolidayView[] };
}

export interface LeaveSettings {
  weekly_offs: number[];
  leave_year_start_month: number;
  count_pending_against_balance: boolean;
  current_year: number;
  current_year_start: string;
  current_year_end: string;
}

export interface MyProfile extends Omit<EmployeeBrief, "reporting_manager"> {
  shift: Shift;
  reporting_manager: { id: string; name: string; employee_id?: string | undefined } | null;
  is_manager: boolean;
}

export interface ApplyPayload {
  leave_type_id: string;
  from_date: string;
  to_date: string;
  half_day: boolean;
  half_day_session: HalfDaySession | null;
  team_email?: string | undefined;
  reason?: string | undefined;
}

export interface PreviewResult {
  days: number;
  counted_dates: string[];
  excluded_dates: { date: string; reason: string }[];
  balance: LeaveCard;
  requires_document: boolean;
}

export interface RequestFilters {
  status?: string | undefined;
  leave_type_id?: string | undefined;
  from_date?: string | undefined;
  to_date?: string | undefined;
  search?: string | undefined;
  sort_by?: string | undefined;
  sort_dir?: number | undefined;
  page?: number | undefined;
  page_size?: number | undefined;
  employee_type_id?: string | undefined;
  department_id?: string | undefined;
}

export interface SavedView {
  id: string;
  name: string;
  filters: RequestFilters;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link: string;
  read: boolean;
  created_at: string;
}

export interface TeamMember extends EmployeeBrief {
  shift: Shift;
  is_direct: boolean;
  status: string;
  tone: "leave" | "holiday" | "weekend" | "present" | "absent";
}

export interface TeamMemberDetail extends EmployeeBrief {
  shift: Shift;
  status: string;
  tone: TeamMember["tone"];
  eligibility: (LeaveTypeBrief & { eligible: boolean; source: string; type_enabled: boolean })[];
  balances: LeaveCard[];
  upcoming: LeaveRequest[];
  history: LeaveRequest[];
  attendance: { month: string; present_days: number; today: string };
}

// ---- admin ------------------------------------------------------------------

export interface EmployeeType {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
  employee_count: number;
}

export interface LeaveRules {
  annual_entitlement: number;
  accrual_frequency: "yearly" | "monthly";
  carry_forward: boolean;
  max_carry_forward: number;
  carry_forward_expiry_months: number;
  allow_half_day: boolean;
  min_days: number;
  max_days: number;
  allow_during_probation: boolean;
  min_service_days: number;
  allow_negative_balance: boolean;
  negative_balance_limit: number;
  exclude_weekly_offs: boolean;
  exclude_holidays: boolean;
  advance_notice_days: number;
  allow_past_dates: boolean;
  max_past_days: number;
}

export interface LeaveType extends LeaveRules {
  id: string;
  name: string;
  code: string;
  description: string | null;
  color: string;
  icon: string;
  is_paid: boolean;
  is_lwp: boolean;
  requires_document: boolean;
  document_required_after_days: number;
  encashable: boolean;
  max_encashable_days: number;
  is_active: boolean;
  sort_order: number;
}

export type LeaveTypePayload = Omit<LeaveType, "id">;

export interface LeavePolicy extends LeaveRules {
  id: string;
  name: string | null;
  leave_type_id: string;
  leave_type: string;
  employee_type_id: string | null;
  employee_type: string;
  is_active: boolean;
}

export type LeavePolicyPayload = LeaveRules & {
  leave_type_id: string;
  employee_type_id: string | null;
  name?: string | null | undefined;
  is_active?: boolean | undefined;
};

export interface Mapping {
  id: string;
  leave_type_id: string;
  employee_type_id: string | null;
  employee_id: string | null;
  enabled: boolean;
  effective_from: string | null;
  effective_to: string | null;
  is_current: boolean;
  note: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  employee?: EmployeeBrief | null | undefined;
}

export interface MappingChangeSummary {
  added: number;
  removed: number;
  employee_types_without_leave: string[];
  changes: { employee_type: string; leave_type: string; change: "added" | "removed" }[];
  saved: boolean;
}

export interface EligibilityInfo {
  eligible: boolean;
  source: "employee" | "employee_type" | "none";
  type_enabled: boolean;
  override: { id: string; enabled: boolean; effective_from: string | null; effective_to: string | null; in_effect: boolean } | null;
}

export interface Allocation {
  id: string;
  year: number;
  days: number;
  leave_type_id: string;
  leave_type: string;
  employee_type_id: string | null;
  employee_type: string | null;
  employee_id: string | null;
  employee: string | null;
  employee_code: string | null;
  scope: "employee" | "employee_type";
  note: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface Adjustment {
  id: string;
  employee: string;
  employee_code: string;
  leave_type: string;
  year: number;
  kind: string;
  days: number;
  reason: string;
  created_by: string;
  created_at: string;
}

export interface LeaveTransaction {
  id: string;
  leave_type: string | null;
  year: number;
  kind: string;
  days: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CarryForwardRow {
  employee_id: string;
  employee: string;
  employee_code?: string | undefined;
  leave_type_id: string;
  leave_type: string;
  available?: number | undefined;
  carry_forward?: number | undefined;
  lapse?: number | undefined;
  expired_on?: string | undefined;
}

export interface RequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  cancellation_pending: number;
}

export interface ApprovalRecord {
  id: string;
  request_id: string;
  request_no: string;
  employee: string;
  employee_code: string;
  leave_type: string;
  action: string;
  from_status: string | null;
  to_status: string;
  actor: string;
  actor_role: string;
  comment: string | null;
  created_at: string;
}

export interface AuditRecord {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  actor: string;
  actor_role: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface LeaveDashboard {
  year: number;
  stats: RequestStats & { on_leave_today: number; employees_without_type: number };
  by_leave_type: { leave_type: string; color: string; days: number; requests: number }[];
  by_month: { month: string; days: number }[];
  pending: LeaveRequest[];
}

export interface ReportResult {
  title: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string | number>[];
}

export interface ShiftPolicy extends Shift {
  id: string;
}

export interface Department {
  id: string;
  name: string;
  code?: string | undefined;
}

const clean = <T extends object>(params: T) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null));

function applyForm(payload: ApplyPayload, document?: File | null | undefined, removeDocument = false) {
  const form = new FormData();
  form.append("leave_type_id", payload.leave_type_id);
  form.append("from_date", payload.from_date);
  form.append("to_date", payload.to_date);
  form.append("half_day", String(payload.half_day));
  if (payload.half_day && payload.half_day_session) form.append("half_day_session", payload.half_day_session);
  if (payload.team_email) form.append("team_email", payload.team_email);
  if (payload.reason) form.append("reason", payload.reason);
  if (document) form.append("document", document);
  if (removeDocument) form.append("remove_document", "true");
  return form;
}

const L = "/api/v1/leave";
const A = "/api/v1/leave/admin";

export const leaveApi = {
  settings: async () => (await api.get<LeaveSettings>(`${L}/settings`)).data,
  profile: async () => (await api.get<MyProfile>(`${L}/me/profile`)).data,
  summary: async (year?: number) => (await api.get<LeaveSummary>(`${L}/me/summary`, { params: clean({ year }) })).data,
  eligibleTypes: async (on_date?: string) =>
    (await api.get<LeaveCard[]>(`${L}/me/eligible-types`, { params: clean({ on_date }) })).data,
  preview: async (payload: ApplyPayload, request_id?: string) =>
    (await api.post<PreviewResult>(`${L}/me/preview`, payload, { params: clean({ request_id }) })).data,
  apply: async (payload: ApplyPayload, document?: File | null) =>
    (await api.post<LeaveRequest>(`${L}/requests`, applyForm(payload, document))).data,
  edit: async (id: string, payload: ApplyPayload, document?: File | null | undefined, removeDocument = false) =>
    (await api.put<LeaveRequest>(`${L}/requests/${id}`, applyForm(payload, document, removeDocument))).data,
  myRequests: async (filters: RequestFilters) =>
    (await api.get<Paged<LeaveRequest>>(`${L}/me/requests`, { params: clean(filters) })).data,
  request: async (id: string) => (await api.get<LeaveRequest>(`${L}/requests/${id}`)).data,
  cancel: async (id: string, comment?: string) =>
    (await api.post<{ message: string; request: LeaveRequest }>(`${L}/requests/${id}/cancel`, { comment: comment || null })).data,
  comment: async (id: string, comment: string) =>
    (await api.post<LeaveComment>(`${L}/requests/${id}/comments`, { comment })).data,
  attachment: async (id: string) =>
    (await api.get<Blob>(`${L}/requests/${id}/attachment`, { responseType: "blob" })).data,
  views: async () => (await api.get<SavedView[]>(`${L}/me/views`)).data,
  saveView: async (name: string, filters: RequestFilters) =>
    (await api.post<SavedView>(`${L}/me/views`, { name, filters })).data,
  deleteView: async (id: string) => (await api.delete(`${L}/me/views/${id}`)).data,
  holidays: async (year?: number) =>
    (await api.get<{ year: number; start: string; end: string; weekly_offs: number[]; holidays: HolidayView[] }>(
      `${L}/holidays`, { params: clean({ year }) })).data,
  calendar: async (params: { from_date: string; to_date: string; employee_id?: string | undefined; department_id?: string | undefined; employee_type_id?: string | undefined; leave_type_id?: string | undefined }) =>
    (await api.get<{ weekly_offs: number[]; leaves: LeaveRequest[]; holidays: HolidayView[] }>(`${L}/calendar`, { params: clean(params) })).data,
  notifications: async () => (await api.get<{ unread: number; items: NotificationItem[] }>(`${L}/notifications`)).data,
  readNotification: async (id: string) => (await api.post(`${L}/notifications/${id}/read`)).data,
  readAllNotifications: async () => (await api.post(`${L}/notifications/read-all`)).data,
  // team (view only)
  reportees: async (scope: "direct" | "all", search?: string) =>
    (await api.get<{ manager: EmployeeBrief; direct_count: number; all_count: number; members: TeamMember[] }>(
      `${L}/team/reportees`, { params: clean({ scope, search }) })).data,
  teamMember: async (id: string) => (await api.get<TeamMemberDetail>(`${L}/team/members/${id}`)).data,
  onLeave: async (params: { from_date?: string | undefined; to_date?: string | undefined; employee_id?: string | undefined; department_id?: string | undefined; employee_type_id?: string | undefined; leave_type_id?: string | undefined }) =>
    (await api.get<{ from_date: string; to_date: string; items: LeaveRequest[] }>(`${L}/team/on-leave`, { params: clean(params) })).data,
  teamRequests: async (filters: RequestFilters) =>
    (await api.get<Paged<LeaveRequest>>(`${L}/team/requests`, { params: clean(filters) })).data,
};

export const leaveAdminApi = {
  employeeTypes: async (include_inactive = true) =>
    (await api.get<EmployeeType[]>(`${A}/employee-types`, { params: { include_inactive } })).data,
  createEmployeeType: async (payload: { name: string; code?: string | null | undefined; description?: string | null | undefined; is_active: boolean }) =>
    (await api.post<EmployeeType>(`${A}/employee-types`, payload)).data,
  updateEmployeeType: async (id: string, payload: { name: string; code?: string | null | undefined; description?: string | null | undefined; is_active: boolean }) =>
    (await api.put<EmployeeType>(`${A}/employee-types/${id}`, payload)).data,
  employees: async (params: { search?: string | undefined; employee_type_id?: string | undefined; department_id?: string | undefined; unassigned?: boolean | undefined; page?: number | undefined; page_size?: number | undefined } = {}) =>
    (await api.get<Paged<EmployeeBrief>>(`${A}/employees`, { params: clean(params) })).data,
  updateProfile: async (id: string, payload: { employee_type_id: string | null; reporting_manager_id: string | null; date_of_joining: string | null; probation_end_date: string | null; location: string | null; policy_id: string | null }) =>
    (await api.put<EmployeeBrief>(`${A}/employees/${id}/profile`, payload)).data,
  assignType: async (employee_ids: string[], employee_type_id: string) =>
    (await api.post<{ updated: number }>(`${A}/employees/assign-type`, { employee_ids, employee_type_id })).data,
  shiftPolicies: async () => (await api.get<ShiftPolicy[]>(`${A}/shift-policies`)).data,
  departments: async () => (await api.get<Department[]>("/api/v1/organization/departments")).data,
  leaveTypes: async (include_inactive = true) =>
    (await api.get<LeaveType[]>(`${A}/leave-types`, { params: { include_inactive } })).data,
  createLeaveType: async (payload: LeaveTypePayload) => (await api.post<LeaveType>(`${A}/leave-types`, payload)).data,
  updateLeaveType: async (id: string, payload: LeaveTypePayload) => (await api.put<LeaveType>(`${A}/leave-types/${id}`, payload)).data,
  setLeaveTypeStatus: async (id: string, is_active: boolean) =>
    (await api.patch(`${A}/leave-types/${id}/status`, { is_active })).data,
  policies: async () => (await api.get<LeavePolicy[]>(`${A}/policies`)).data,
  createPolicy: async (payload: LeavePolicyPayload) => (await api.post<LeavePolicy>(`${A}/policies`, payload)).data,
  updatePolicy: async (id: string, payload: LeavePolicyPayload) => (await api.put<LeavePolicy>(`${A}/policies/${id}`, payload)).data,
  deactivatePolicy: async (id: string) => (await api.delete(`${A}/policies/${id}`)).data,
  saveSettings: async (payload: { weekly_offs: number[]; leave_year_start_month: number; count_pending_against_balance: boolean }) =>
    (await api.put<LeaveSettings>(`${A}/settings`, payload)).data,
  typeMappings: async () => (await api.get<Mapping[]>(`${A}/mappings/employee-types`)).data,
  saveTypeMappings: async (payload: { employee_type_ids: string[]; leave_type_ids: string[]; unchanged_leave_type_ids: string[] }, dry_run: boolean) =>
    (await api.post<MappingChangeSummary>(`${A}/mappings/employee-types`, payload, { params: { dry_run } })).data,
  employeeMappings: async (employee_id?: string) =>
    (await api.get<Mapping[]>(`${A}/mappings/employees`, { params: clean({ employee_id }) })).data,
  saveEmployeeMappings: async (payload: { employee_ids: string[]; leave_type_ids: string[]; action: "enable" | "disable" | "inherit"; effective_from?: string | null | undefined; effective_to?: string | null | undefined; note?: string | null | undefined }) =>
    (await api.post<{ created: number; removed: number; unchanged: number }>(`${A}/mappings/employees`, payload)).data,
  eligibility: async (employee_ids: string[]) =>
    (await api.get<Record<string, Record<string, EligibilityInfo>>>(`${A}/eligibility`, { params: { employee_ids: employee_ids.join(",") } })).data,
  mappingHistory: async (params: { employee_type_id?: string | undefined; employee_id?: string | undefined }) =>
    (await api.get<Mapping[]>(`${A}/mappings/history`, { params: clean(params) })).data,
  allocations: async (year: number, leave_type_id?: string) =>
    (await api.get<Allocation[]>(`${A}/allocations`, { params: clean({ year, leave_type_id }) })).data,
  saveAllocation: async (payload: { leave_type_id: string; year: number; days: number; employee_type_id?: string | null | undefined; employee_ids?: string[] | undefined; note?: string | null | undefined }) =>
    (await api.post<{ saved: number }>(`${A}/allocations`, payload)).data,
  removeAllocation: async (id: string) => (await api.delete(`${A}/allocations/${id}`)).data,
  adjust: async (payload: { employee_ids: string[]; leave_type_id: string; year: number; kind: "adjustment" | "opening" | "carry_forward"; days: number; reason: string }) =>
    (await api.post<{ adjusted: number }>(`${A}/adjustments`, payload)).data,
  adjustments: async (year: number) => (await api.get<Adjustment[]>(`${A}/adjustments`, { params: { year } })).data,
  balances: async (params: { year?: number | undefined; employee_type_id?: string | undefined; department_id?: string | undefined; search?: string | undefined; employee_id?: string | undefined }) =>
    (await api.get<{ year: number; items: { employee: EmployeeBrief; balances: LeaveCard[] }[] }>(`${A}/balances`, { params: clean(params) })).data,
  transactions: async (employee_id: string, year?: number) =>
    (await api.get<LeaveTransaction[]>(`${A}/transactions`, { params: clean({ employee_id, year }) })).data,
  carryForward: async (from_year: number, dry_run: boolean) =>
    (await api.post<{ from_year: number; to_year: number; posted: number; rows: CarryForwardRow[] }>(`${A}/carry-forward`, { from_year }, { params: { dry_run } })).data,
  lapse: async (year: number, dry_run: boolean) =>
    (await api.post<{ year: number; posted: number; rows: CarryForwardRow[] }>(`${A}/carry-forward/lapse`, null, { params: { year, dry_run } })).data,
  requests: async (filters: RequestFilters) =>
    (await api.get<Paged<LeaveRequest> & { stats: RequestStats }>(`${A}/requests`, { params: clean(filters) })).data,
  approve: async (id: string, comment?: string) =>
    (await api.post<{ message: string; request: LeaveRequest }>(`${A}/requests/${id}/approve`, { comment: comment || null })).data,
  reject: async (id: string, comment: string) =>
    (await api.post<{ message: string; request: LeaveRequest }>(`${A}/requests/${id}/reject`, { comment })).data,
  override: async (id: string, status: "approved" | "rejected" | "cancelled", comment: string) =>
    (await api.post<{ message: string; request: LeaveRequest }>(`${A}/requests/${id}/override`, { status, comment })).data,
  approvals: async (params: { action?: string | undefined; search?: string | undefined; from_date?: string | undefined; to_date?: string | undefined; page?: number | undefined; page_size?: number | undefined }) =>
    (await api.get<Paged<ApprovalRecord>>(`${A}/approvals`, { params: clean(params) })).data,
  audit: async (page = 1, page_size = 25) => (await api.get<Paged<AuditRecord>>(`${A}/audit`, { params: { page, page_size } })).data,
  dashboard: async (year?: number) => (await api.get<LeaveDashboard>(`${A}/dashboard`, { params: clean({ year }) })).data,
  reportCatalog: async () => (await api.get<{ kind: string; title: string }[]>(`${A}/reports`)).data,
  report: async (kind: string, params: { year?: number | undefined; month?: number | undefined; employee_type_id?: string | undefined; department_id?: string | undefined; leave_type_id?: string | undefined }) =>
    (await api.get<ReportResult>(`${A}/reports/${kind}`, { params: clean(params) })).data,
};
