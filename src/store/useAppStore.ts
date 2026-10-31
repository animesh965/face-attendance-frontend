import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Settings {
  faceMatchThreshold: number;
  recognitionThreshold: number;
  detectionConfidence: number;
  attendanceCooldown: number;
  rtspTimeout: number;
  apiBaseUrl: string;
  autoAttendance: boolean;
  unknownAlerts: boolean;
  livenessCheck: boolean;
  autoCheckout: boolean;
  workStart: string;
  lateAfter: string;
}


interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  employee_id?: string;
  phone?: string;
  gender?: string;
  department_id?: string;
  designation_id?: string;
  permissions: string[];
}

interface AppState {
  user: AppUser | null;
  authenticated: boolean;
  darkMode: boolean;
  sidebarCollapsed: boolean;
  settings: Settings;
  login: (user: AppUser) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
}


export const useAppStore = create<AppState>()(
  persist<AppState>(
    (set, get) => ({
      user: null,
      authenticated: false,
      darkMode: false,
      sidebarCollapsed: false,

      settings: {
        faceMatchThreshold: 0.62,
        recognitionThreshold: 0.78,
        detectionConfidence: 0.85,
        attendanceCooldown: 300,
        rtspTimeout: 15,
        apiBaseUrl: "http://localhost:8000",
        autoAttendance: true,
        unknownAlerts: true,
        livenessCheck: true,
        autoCheckout: true,
        workStart: "09:00",
        lateAfter: "09:15",
      },

      login: (user: AppUser) =>
  set({
    authenticated: true,
    user,
  }),

logout: () =>
  set({
    authenticated: false,
    user: null,
  }),

hasPermission: (permission: string): boolean => {
  const user = get().user;
  if (!user) return false;
  // Overriding finalized leave decisions is reserved for super admins (enforced by the API too).
  if (permission === "leave.override") return user.role === "super_admin";
  if (user.role === "admin" || user.role === "super_admin") return true;
  const employeePermissions = new Set([
    "dashboard.read",
    "live.read",
    "recognition.read",
    "attendance.read",
    "employeeworkcalendar.read",
    "leave.self",
    "leave.team",
  ]);
  return employeePermissions.has(permission);
},

toggleDarkMode: () =>
  set((state) => ({
    darkMode: !state.darkMode,
  })),

toggleSidebar: () =>
  set((state) => ({
    sidebarCollapsed: !state.sidebarCollapsed,
  })),

updateSettings: (patch: Partial<Settings>) =>
  set((state) => ({
    settings: {
      ...state.settings,
      ...patch,
    },
  })),
    }),
    {
      name: "vertex-face-ai",
    },
  ),
);