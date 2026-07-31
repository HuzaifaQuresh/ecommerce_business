import { createFileRoute, Navigate } from "@tanstack/react-router";

/** Daraz-style short URL alias: /product/:slug → /products/:slug */
export const Route = createFileRoute("/product/$slug")({
  component: RedirectToProductsSlug,
});

function RedirectToProductsSlug() {
  const params = Route.useParams();
  const slug = params?.slug || "";
  return <Navigate to="/products/$slug" params={{ slug }} replace />;
}
