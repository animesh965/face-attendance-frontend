    import { api } from "./client";

    export interface DashboardSummary {
    total_users: number;
    present_today: number;
    absent_today: number;
    checked_in: number;
    checked_out: number;
    }

    export interface AttendanceTrend {
    day: string;
    present: number;
    late: number;
    absent: number;
    }

    export interface RecognitionHour {
    hour: string;
    recognized: number;
    unknown: number;
    }

    export interface RecentRecognition {
    id: string;
    trackId: number;
    name: string;
    camera: string;
    time: string;
    confidence: number;
    status: "recognized" | "unknown" | "unauthorized";
    }

    export interface DashboardResponse {
    success: boolean;
    date: string;
    summary: DashboardSummary;
    attendance_trend: AttendanceTrend[];
    recognitions_per_hour: RecognitionHour[];
    recent_activity: RecentRecognition[];
    recent_recognitions: RecentRecognition[];
    }

    export const dashboardApi = {
    get: async (): Promise<DashboardResponse> => {
        const response = await api.get("/api/v1/dashboard/");
        return response.data;
    },
    };
