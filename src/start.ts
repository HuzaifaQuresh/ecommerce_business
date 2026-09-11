import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { applyHttpCachePolicy } from "./lib/http-cache";

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  try {
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
