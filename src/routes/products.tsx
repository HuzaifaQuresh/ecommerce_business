import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout route — listing is /products/ (index), detail is /products/$slug */
export const Route = createFileRoute("/products")({
  component: () => <Outlet />,
});
