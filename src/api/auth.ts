    import { api } from "./client";

    export interface LoginRequest {
    email: string;
    password: string;
    }

    export interface SignupRequest {
    name: string;
    email: string;
    password: string;
    }

    export const authApi = {
    login: async (data: LoginRequest) => {
        const response = await api.post(
        "/api/v1/auth/login",
        data
        );

        return response.data;
    },

    signup: async (data: SignupRequest) => {
        const response = await api.post("/api/v1/auth/signup", data);
        return response.data;
    },

    forgotPassword: async (email: string) => {
        const response = await api.post("/api/v1/auth/forgot-password", { email });
        return response.data;
    },

    resetPassword: async (token: string, new_password: string) => {
        const response = await api.post("/api/v1/auth/reset-password", { token, new_password });
        return response.data;
    },
    };