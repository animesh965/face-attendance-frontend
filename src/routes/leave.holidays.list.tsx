import { createFileRoute } from "@tanstack/react-router";
import { HolidaysView } from "@/components/leave/HolidaysView";

export const Route = createFileRoute("/leave/holidays/list")({
  head: () => ({ meta: [{ title: "Holiday List" }] }),
  component: () => <HolidaysView mode="list" />,
});
