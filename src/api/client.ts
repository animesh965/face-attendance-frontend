
import axios from "axios";
import { useAppStore } from "@/store/useAppStore";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle expired or invalid login sessions globally.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;

      // Avoid repeated redirects when already on the login page.
      if (currentPath !== "/login") {
        sessionStorage.setItem("session_expired", "true");

        // Clear the token and persisted login state.
        localStorage.removeItem("access_token");
        useAppStore.getState().logout();

        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Returns fallback data for ordinary API failures.
 * Authentication errors must not be hidden by fallback data.
 */
export async function withFallback<T>(
  request: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401
    ) {
      throw error;
    }

    console.error("API request failed:", error);
    return fallback;
  }
}



// import axios from "axios";

// export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// export const api = axios.create({
//   baseURL: API_BASE_URL,
//   timeout: 15000,
//   // headers: {
//   //   "Content-Type": "application/json",
//   // },
// });

// api.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem("access_token");

//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }

//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// /**
//  * Executes an API request and optionally returns fallback data
//  * when the backend is unavailable.
//  */
// export async function withFallback<T>(
//   request: () => Promise<T>,
//   fallback: T
// ): Promise<T> {
//   try {
//     return await request();
//   } catch (error) {
//     console.error("API request failed:", error);
//     return fallback;
//   }
// }