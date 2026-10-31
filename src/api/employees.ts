import { api, withFallback } from "./client";
import { people } from "@/lib/mock-data";
import type { Person } from "@/types";

// export const employeesApi = {
//   list: () => withFallback(() => api.get<Person[]>("/employees").then((r) => r.data), people),
//   get: (id: string) =>
//     withFallback(
//       () => api.get<Person>(`/employees/${id}`).then((r) => r.data),
//       people.find((p) => p.id === id) ?? people[0]!,
//     ),
//   create: (payload: FormData) =>
//     api.post("/employees", payload, { headers: { "Content-Type": "multipart/form-data" } }),
//   register: (payload: FormData) =>
//     api.post("/register", payload, { headers: { "Content-Type": "multipart/form-data" } }),
//   remove: (id: string) => api.delete(`/employees/${id}`),
// };
export interface EmbeddingInfo {
  dimensions: number;
  model: string;
  quality: number;
  vectors: number;
}

export interface Employee {
  id: string;
  name: string;
  employeeId: string;
  email: string;
  phone?: string;
  department: string;
  designation: string;
  photo?: string;
  registeredAt: string;
  status: 'active' | 'inactive' | string;
  faceImages?: string[];
  embedding?: EmbeddingInfo;
}


export const employeesApi = {
  // GET /employees
  list: async (): Promise<Employee[]> => {
    const response = await api.get<Employee[]>('/employees');
    return response.data;
  },
  // GET /employees/{employee_id}
  get: async (id: string): Promise<Employee> => {
    const response = await api.get<Employee>(`/employees/${id}`);
    return response.data;
  },

  // Request an OTP to verify a replacement email address.
  requestEmailOtp: async (id: string, email: string) => {
    const response = await api.post(`/employees/${id}/request-email-otp`, { email });
    return response.data;
  },

  // Update all employee profile fields. email_otp is required only when email changes.
  update: async (id: string, payload: {
    name: string;
    email: string;
    phone: string;
    gender: string;
    department_id: string | null;
    designation_id: string | null;
    email_otp?: string;
  }) => {
    const response = await api.put(`/updateEmployee/${id}`, payload);
    return response.data;
  },

  // DELETE /employees/{id} (permanent deletion on backend)
  delete: async (id: string): Promise<void> => {
    await api.delete(`/employees/${id}`);
  },
};