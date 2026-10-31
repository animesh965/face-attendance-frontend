
import { redirect } from "@tanstack/react-router";
import { useAppStore } from "@/store/useAppStore";

export function requireAuth() {
    const token = localStorage.getItem("access_token");
    const { authenticated, user } = useAppStore.getState();

    if (!token || !authenticated || !user) {
        throw redirect({ to: "/login" });
    }
}
