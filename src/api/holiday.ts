import { api } from "./client";

export interface Holiday {
    id: string;
    name: string;
    from_date: string;
    to_date: string;
    description?: string | null;
    holiday_type: string;
    employee_type_ids?: string[];
    department_ids?: string[];
    locations?: string[];
    created_at: string;
    updated_at: string;
}

export interface HolidayPayload {
    name: string;
    from_date: string;
    to_date: string;
    description: string | null;
    holiday_type: string;
    // Empty lists = applies to everyone. Omit to leave an existing holiday's scope unchanged.
    employee_type_ids?: string[];
    department_ids?: string[];
    locations?: string[];
}

export const holidaysApi = {
    list: async (upcoming_only = true) =>
        (await api.get<Holiday[]>("/api/v1/holidays", {
        params: { upcoming_only },
        })).data,

    create: async (payload: HolidayPayload) =>
        (await api.post<Holiday>("/api/v1/holidays", payload)).data,

    update: async (id: string, payload: HolidayPayload) =>
        (await api.put<Holiday>(`/api/v1/holidays/${id}`, payload)).data,

    delete: async (id: string) =>
        (await api.delete(`/api/v1/holidays/${id}`)).data,
};






















// import { api } from "./client";

// export interface Holiday {
//   id: string;
//   name: string;
//   date: string;
//   description?: string | null;
//   holiday_type: string;
//   created_at: string;
//   updated_at: string;
// }

// export interface HolidayPayload {
//   name: string;
//   date: string;
//   description: string | null;
//   holiday_type: string;
// }

// export const holidaysApi = {
//   list: async (upcoming_only = true) =>
//     (await api.get<Holiday[]>("/api/v1/holidays", {
//       params: { upcoming_only },
//     })).data,

//   create: async (payload: HolidayPayload) =>
//     (await api.post<Holiday>("/api/v1/holidays", payload)).data,

//   update: async (id: string, payload: HolidayPayload) =>
//     (await api.put<Holiday>(`/api/v1/holidays/${id}`, payload)).data,

//   delete: async (id: string) =>
//     (await api.delete(`/api/v1/holidays/${id}`)).data,
// };


























// // import { api } from "./client";

// // export interface Holiday {
// //   id: string;
// //   name: string;
// //   date: string;
// //   description?: string | null;
// //   holiday_type: string;
// //   created_at: string;
// //   updated_at: string;
// // }

// // export const holidaysApi = {
// //   list: async (upcoming_only = true) =>
// //     (await api.get("/api/v1/holidays", {
// //       params: { upcoming_only },
// //     })).data,

// //   create: async (payload: {
// //     name: string;
// //     date: string;
// //     description: string | null;
// //     holiday_type: string;
// //   }) => (await api.post("/api/v1/holidays", payload)).data,

// //   update: async (id: string, payload: {
// //     name: string;
// //     date: string;
// //     description: string | null;
// //     holiday_type: string;
// //   }) => (await api.put(`/api/v1/holidays/${id}`, payload)).data,

// //   delete: async (id: string) =>
// //     (await api.delete(`/api/v1/holidays/${id}`)).data,
// // };

















// // import { api } from "./client";

// // export interface Holiday {
// //   id: string;
// //   name: string;
// //   date: string;
// //   description?: string | null;
// //   holiday_type: string;
// //   created_at: string;
// //   updated_at: string;
// // }

// // export interface HolidayPayload {
// //   name: string;
// //   date: string;
// //   description?: string | null;
// //   holiday_type: string;
// // }

// // export const holidaysApi = {
// //   // GET all holidays
// //   list: async (params?: {
// //     upcoming_only?: boolean;
// //     from_date?: string;
// //     to_date?: string;
// //   }): Promise<Holiday[]> => {
// //     const response = await api.get<Holiday[]>("/api/v1/holidays", {
// //       params,
// //     });
// //     return response.data;
// //   },

// //   // POST create holiday
// //   create: async (data: HolidayPayload): Promise<Holiday> => {
// //     const response = await api.post<Holiday>(
// //       "/api/v1/holidays",
// //       data
// //     );
// //     return response.data;
// //   },

// //   // PUT update holiday
// //   update: async (
// //     id: string,
// //     data: HolidayPayload
// //   ): Promise<Holiday> => {
// //     const response = await api.put<Holiday>(
// //       `/api/v1/holidays/${id}`,
// //       data
// //     );
// //     return response.data;
// //   },

// //   // DELETE holiday
// //   delete: async (id: string) => {
// //     const response = await api.delete(
// //       `/api/v1/holidays/${id}`
// //     );
// //     return response.data;
// //   },
// // };