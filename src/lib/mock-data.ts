import type { AttendanceRecord, Camera, Person, RecognitionEvent } from "@/types";

const departments = ["Engineering", "Operations", "Security", "Finance", "HR", "Facilities"];
const designations = ["Analyst", "Engineer", "Manager", "Supervisor", "Lead", "Director"];
const firstNames = [
  "Aarav","Meera","Rohan","Sara","Kabir","Ishita","Vikram","Nina","Arjun","Priya",
  "Dev","Ananya","Karan","Riya","Yash","Tara","Nikhil","Zoya","Omar","Leah",
];
const lastNames = [
  "Sharma","Patel","Iyer","Khan","Verma","Nair","Rao","Singh","Bose","Mehta",
];

function avatar(seed: string) {
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=dbeafe,e0e7ff,f1f5f9`;
}

export const cameras: Camera[] = [
  { id: "CAM-01", name: "Main Entrance", rtspUrl: "rtsp://10.0.4.11:554/stream1", location: "Lobby", status: "online", resolution: "1920x1080", fps: 25 },
  { id: "CAM-02", name: "Reception Desk", rtspUrl: "rtsp://10.0.4.12:554/stream1", location: "Lobby", status: "online", resolution: "1280x720", fps: 30 },
  { id: "CAM-03", name: "Server Room", rtspUrl: "rtsp://10.0.4.13:554/stream1", location: "Floor 2", status: "online", resolution: "1920x1080", fps: 20 },
  { id: "CAM-04", name: "Parking Gate", rtspUrl: "rtsp://10.0.4.14:554/stream1", location: "Basement", status: "reconnecting", resolution: "2560x1440", fps: 15 },
  { id: "CAM-05", name: "Cafeteria", rtspUrl: "rtsp://10.0.4.15:554/stream1", location: "Floor 1", status: "online", resolution: "1280x720", fps: 25 },
  { id: "CAM-06", name: "Loading Bay", rtspUrl: "rtsp://10.0.4.16:554/stream1", location: "Exterior", status: "offline", resolution: "1920x1080", fps: 25 },
];

export const people: Person[] = Array.from({ length: 48 }).map((_, i) => {
  const name = `${firstNames[i % firstNames.length]!} ${lastNames[(i * 3) % lastNames.length]!}`;
  const dept = departments[i % departments.length]!;
  return {
    id: `p-${i + 1}`,
    name,
    employeeId: `EMP-${(1024 + i).toString()}`,
    email: `${name.toLowerCase().replace(/\s/g, ".")}@vertex.ai`,
    phone: `+91 98${(100000 + i * 137).toString().slice(0, 6)}`,
    department: dept,
    designation: designations[i % designations.length]!,
    photo: avatar(name),
    registeredAt: new Date(Date.now() - i * 86400000 * 3).toISOString(),
    status: i % 11 === 0 ? "inactive" : "active",
    faceImages: [avatar(name), avatar(name + "1"), avatar(name + "2"), avatar(name + "3")],
    embedding: {
      dimensions: 512,
      model: "ArcFace R100 / InsightFace",
      quality: 82 + ((i * 7) % 17),
      vectors: 3 + (i % 4),
    },
  };
});

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export const recognitions: RecognitionEvent[] = Array.from({ length: 40 }).map((_, i) => {
  const person = people[(i * 5) % people.length]!;
  const unknown = i % 9 === 0;
  const unauthorized = i % 17 === 0;
  return {
    id: `r-${i + 1}`,
    name: unknown ? "Unknown Face" : unauthorized ? "Unauthorized Entry" : person.name,
    camera: cameras[i % cameras.length]!.name,
    time: `${pad(9 + Math.floor(i / 6))}:${pad((i * 7) % 60)}:${pad((i * 13) % 60)}`,
    confidence: unknown ? 0.31 + (i % 10) / 100 : 0.87 + (i % 12) / 100,
    status: unauthorized ? "unauthorized" : unknown ? "unknown" : "recognized",
    trackId: 1000 + i,
  };
});

export const attendance: AttendanceRecord[] = people.slice(0, 36).map((p, i) => {
  const late = i % 7 === 0;
  const absent = i % 13 === 0;
  return {
    id: `a-${i + 1}`,
    employee: p.name,
    employeeId: p.employeeId,
    department: p.department,
    date: new Date(Date.now() - (i % 6) * 86400000).toISOString().slice(0, 10),
    checkIn: absent ? "—" : `${pad(late ? 10 : 8)}:${pad((i * 11) % 60)}`,
    checkOut: absent ? "—" : `${pad(17 + (i % 3))}:${pad((i * 5) % 60)}`,
    workingHours: absent ? "0h 00m" : `${8 + (i % 2)}h ${pad((i * 5) % 60)}m`,
    status: absent ? "absent" : late ? "late" : i % 19 === 0 ? "half-day" : "present",
  };
});

export const attendanceTrend = [
  { day: "Mon", present: 212, absent: 18, late: 14 },
  { day: "Tue", present: 226, absent: 12, late: 9 },
  { day: "Wed", present: 231, absent: 9, late: 11 },
  { day: "Thu", present: 219, absent: 15, late: 16 },
  { day: "Fri", present: 208, absent: 22, late: 18 },
  { day: "Sat", present: 121, absent: 8, late: 4 },
  { day: "Sun", present: 46, absent: 3, late: 1 },
];

export const recognitionsPerHour = Array.from({ length: 12 }).map((_, i) => ({
  hour: `${pad(8 + i)}:00`,
  recognized: Math.round(40 + Math.sin(i / 1.7) * 30 + i * 3),
  unknown: Math.round(6 + Math.abs(Math.cos(i / 2)) * 9),
}));

export const departmentAttendance = departments.map((d, i) => ({
  department: d,
  percentage: 78 + ((i * 13) % 20),
  employees: 24 + i * 7,
}));

export const accuracyTrend = Array.from({ length: 14 }).map((_, i) => ({
  day: `D-${14 - i}`,
  accuracy: 93 + Math.round(Math.sin(i / 2) * 3 + (i % 3)),
  falsePositives: 5 - (i % 4),
}));

export const heatmap = Array.from({ length: 7 }).map((_, r) => ({
  day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][r]!,
  cells: Array.from({ length: 12 }).map((_, c) => ({
    hour: 8 + c,
    value: Math.max(0, Math.round(Math.sin((c + r) / 2.2) * 45 + 50 - r * 5)),
  })),
}));