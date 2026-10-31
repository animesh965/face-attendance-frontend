import { createFileRoute } from "@tanstack/react-router";
import { HolidaysView } from "@/components/leave/HolidaysView";

export const Route = createFileRoute("/leave/holidays/")({
  head: () => ({ meta: [{ title: "Holiday Calendar" }] }),
  component: () => <HolidaysView mode="calendar" />,
});
