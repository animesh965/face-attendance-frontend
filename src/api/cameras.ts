import { api, withFallback } from "./client";
import { cameras } from "@/lib/mock-data";
import type { Camera } from "@/types";

export const camerasApi = {
  list: () => withFallback(() => api.get<Camera[]>("/cameras").then((r) => r.data), cameras),
  create: (payload: Omit<Camera, "id">) => api.post<Camera>("/cameras", payload),
  update: (id: string, payload: Partial<Camera>) => api.put<Camera>(`/cameras/${id}`, payload),
  remove: (id: string) => api.delete(`/cameras/${id}`),
};