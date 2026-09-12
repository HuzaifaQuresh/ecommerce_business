import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { applyHttpCachePolicy } from "./lib/http-cache";
import { canonicalRedirect } from "./lib/canonical";
import { legacySeoRedirect } from "./lib/legacy-seo";
import { serveSitemap, tryServeSeoDocument } from "./lib/seo-documents";

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  try {
    const legacy = legacySeoRedirect(request);
    if (legacy) return applyHttpCachePolicy(request, legacy);

    const redirect = canonicalRedirect(request);
    if (redirect) return applyHttpCachePolicy(request, redirect);

    const seoSync = tryServeSeoDocument(request);
    if (seoSync) return applyHttpCachePolicy(request, seoSync);

    const pathname = new URL(request.url).pathname;
    if (pathname === "/sitemap.xml" || pathname === "/sitemap.xml/") {
      return applyHttpCachePolicy(request, await serveSitemap());
    }

    const result = await next();
    if (result instanceof Response) {
      return applyHttpCachePolicy(request, result);
    }
    if (!result || !("response" in result) || !result.response) {
      return result;
    }
    return {
      ...result,
      response: applyHttpCachePolicy(request, result.response),
    };
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return applyHttpCachePolicy(
      request,
      new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
}));
