import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/leave/")({
  beforeLoad: () => {
    throw redirect({ to: "/leave/summary" });
  },
});
