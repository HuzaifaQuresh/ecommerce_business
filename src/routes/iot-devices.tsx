import { createFileRoute } from "@tanstack/react-router";
import { SeoKeywordLandingPage, seoKeywordHead } from "@/components/site/SeoKeywordLanding";
import { seoLandingByPath } from "@/lib/seo-keyword-landings";

const page = seoLandingByPath("/iot-devices")!;

export const Route = createFileRoute("/iot-devices")({
  head: () => seoKeywordHead(page),
  component: () => <SeoKeywordLandingPage page={page} />,
});
