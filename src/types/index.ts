export type PersonStatus = "active" | "inactive";

export interface Person {
  id: string;
  name: string;
  employeeId: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  photo: string;
  registeredAt: string;
  status: PersonStatus;
  faceImages: string[];
  embedding: { dimensions: number; model: string; quality: number; vectors: number };
}

export type RecognitionStatus = "recognized" | "unknown" | "unauthorized";

export interface RecognitionEvent {
  id: string;
  name: string;
  camera: string;
  time: string;
  confidence: number;
  status: RecognitionStatus;
  trackId: number;
}

export interface AttendanceRecord {
  id: string;
  employee: string;
  employeeId: string;
  department: string;
  date: string;
  checkIn: string;
  checkOut: string;
  workingHours: string;
  status: "present" | "late" | "absent" | "half-day";
}

export interface Camera {
  id: string;
  name: string;
  rtspUrl: string;
  location: string;
  status: "online" | "offline" | "reconnecting";
  resolution: string;
  fps: number;
}