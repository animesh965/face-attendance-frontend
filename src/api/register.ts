        import { api } from "./client";

    export interface RegisterUser {
    id: string;
    name: string;
    email: string;
    face_registered: boolean;
    }

    // export const registerApi = {
    // registerEmployee: async (form: FormData) => {
    //     const response = await api.post(
    //     "/register/register-employee",
    //     form
    //     );

    //     return response.data;
    // },
    export const registerApi = {
    getUsers: async (): Promise<RegisterUser[]> => {
        const response = await api.get("/register/users");

        return response.data;
    },
registerEmployee: async (form: FormData) => {
        const response = await api.post(
        "/register/register-employee",
        form
        );

        return response.data;
    },
    // getUsers: async (): Promise<RegisterUser[]> => {
    //     const response = await api.get<RegisterUser[]>("/users");
    //     return response.data;
    // },
    };
    
    // import { api } from "./client";

    // export interface RegisterUser {
    // id: string;
    // name: string;
    // email: string;
    // face_registered: boolean;
    // }

   

    
    //};
