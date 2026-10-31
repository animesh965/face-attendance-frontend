    import { api } from "./client";

    export interface Department {
    id: string;
    name: string;
    code: string;
    }

    export interface Designation {
    id: string;
    name: string;
    }

    export const organizationApi = {
    // Departments
    getDepartments: async (): Promise<Department[]> => {
        const response = await api.get(
        "/api/v1/organization/departments"
        );

        return response.data;
    },

    createDepartment: async (
        name: string,
        code: string
    ): Promise<Department> => {
        const response = await api.post(
        "/api/v1/organization/departments",
        null,
        {
            params: {
            name,
            code,
            },
        }
        );

        return response.data;
    },

    // Designations
    getDesignations: async (
        departmentId: string
    ): Promise<Designation[]> => {
        const response = await api.get(
        "/api/v1/organization/designations",
        {
            params: {
            department_id: departmentId,
            },
        }
        );

        return response.data;
    },

    createDesignation: async (
        name: string,
        departmentId: string
    ): Promise<Designation> => {
        const response = await api.post(
        "/api/v1/organization/designations",
        null,
        {
            params: {
            name,
            department_id: departmentId,
            },
        }
        );

        return response.data;
    },
    };
