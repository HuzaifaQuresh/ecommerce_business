import "./lib/error-capture";

import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import type { Register } from "@tanstack/react-router";
import type { RequestHandler } from "@tanstack/react-start/server";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { applyHttpCachePolicy } from "./lib/http-cache";
import { canonicalRedirect } from "./lib/canonical";
import { serveSitemap, tryServeSeoDocument } from "./lib/seo-documents";

type ServerEntry = { fetch: RequestHandler<Register> };

function createServerEntry(entry: ServerEntry): ServerEntry {
  return {
    async fetch(...args) {
      return await entry.fetch(...args);
    },
  };
}

const startFetch = createStartHandler(defaultStreamHandler);

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default createServerEntry({
  fetch: async (request, ...rest) => {
    try {
      const redirect = canonicalRedirect(request);
      if (redirect) return applyHttpCachePolicy(request, redirect);

      const seoSync = tryServeSeoDocument(request);
      if (seoSync) return applyHttpCachePolicy(request, seoSync);

      const pathname = new URL(request.url).pathname;
      if (pathname === "/sitemap.xml" || pathname === "/sitemap.xml/") {
        return applyHttpCachePolicy(request, await serveSitemap());
      }

      const response = await startFetch(request, ...rest);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return applyHttpCachePolicy(request, normalized);
    } catch (error) {
      console.error(error);
      return applyHttpCachePolicy(request, brandedErrorResponse());
    }
  },
});
