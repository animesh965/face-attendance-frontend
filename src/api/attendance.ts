import { api, withFallback } from "./client";
import { attendance, attendanceTrend, departmentAttendance } from "@/lib/mock-data";
import type { AttendanceRecord } from "@/types";

export const attendanceApi = {
  list: (params?: Record<string, string>) =>
    withFallback(
      () => api.get<AttendanceRecord[]>("/attendance", { params }).then((r) => r.data),
      attendance,
    ),
  trend: async () => attendanceTrend,
  byDepartment: async () => departmentAttendance,
};