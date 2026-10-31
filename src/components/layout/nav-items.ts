
import {
  LayoutDashboard,
  ScanFace,
  UserPlus,
  Users,
  CalendarCheck,
  Cctv,
  BarChart3,
  Settings,
  CalendarRange,
} from "lucide-react";

export const navItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    permission: "dashboard.read",
  },
  {
    title: "Departments",
    url: "/departments",
    icon: Users,
    permission: "departments.read",
  },
  {
    title: "Designations",
    url: "/designations",
    icon: Users,
    permission: "designations.read",
  },
  {
  title: "User Creation",
  url: "/signup",
  icon: UserPlus,
  permission: "users.create",
},
  {
    title: "Live Recognition",
    url: "/live",
    icon: ScanFace,
    permission: "live.read",
  },
  {
    title: "Register Employee",
    url: "/register",
    icon: UserPlus,
    permission: "employees.create",
  },
  {
    title: "Employee List",
    url: "/people",
    icon: Users,
    permission: "employees.read",
  },
  {
    title: "Update Employee",
    url: "/updateEmployee",
    icon: Users,
    permission: "employees.update",
  },
  {
    title: "Attendance",
    url: "/attendance",
    icon: CalendarCheck,
    permission: "attendance.read",
  },
  {
    title: "Employee Work Calendar",
    url: "/employeeworkcalendar",
    icon: CalendarCheck,
    permission: "employeeworkcalendar.read",
  },
  {
    title: "Leave Tracker",
    url: "/leave",
    icon: CalendarRange,
    permission: "leave.self",
  },
  {
    title: "Cameras",
    url: "/cameras",
    icon: Cctv,
    permission: "cameras.read",
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
    permission: "analytics.read",
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    permission: "settings.read",
  },
  
] as const;










// import {
//   LayoutDashboard,
//   ScanFace,
//   UserPlus,
//   Users,
//   CalendarCheck,
//   Cctv,
//   BarChart3,
//   Settings,
// } from "lucide-react";

// export const navItems = [
//   { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
//   { title: "Departments", url: "/departments", icon: Users },
//   { title: "Designations", url: "/designations", icon: Users },
//   { title: "Live Recognition", url: "/live", icon: ScanFace },
//   { title: "Register Employee", url: "/register", icon: UserPlus },
//   { title: "Employee List", url: "/people", icon: Users },
//   { title: "Attendance", url: "/attendance", icon: CalendarCheck },
//   { title: "Employee Work Calendar", url: "/employeeworkcalendar", icon: CalendarCheck },
//   { title: "Cameras", url: "/cameras", icon: Cctv },
//   { title: "Analytics", url: "/analytics", icon: BarChart3 },
//   { title: "Settings", url: "/settings", icon: Settings },
//   // { title: "Dashboard", url: "/", icon: LayoutDashboard },
//   // { title: "Live Recognition", url: "/live", icon: ScanFace },
//   // { title: "Register Person", url: "/register", icon: UserPlus },
//   // { title: "People Database", url: "/people", icon: Users },
//   // { title: "Attendance", url: "/attendance", icon: CalendarCheck },
//   // { title: "Cameras", url: "/cameras", icon: Cctv },
//   // { title: "Analytics", url: "/analytics", icon: BarChart3 },
//   // { title: "Settings", url: "/settings", icon: Settings },
// ] as const;