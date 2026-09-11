import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/vendor/apply")({
  beforeLoad: () => {
    throw redirect({ to: "/vendor/auth", search: { tab: "register" } });
  },
  component: () => null,
});
