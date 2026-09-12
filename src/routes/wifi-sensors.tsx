import { createFileRoute } from "@tanstack/react-router";
import { SeoKeywordLandingPage, seoKeywordHead } from "@/components/site/SeoKeywordLanding";
import { seoLandingByPath } from "@/lib/seo-keyword-landings";

const page = seoLandingByPath("/wifi-sensors")!;

export const Route = createFileRoute("/wifi-sensors")({
  head: () => seoKeywordHead(page),
  component: () => <SeoKeywordLandingPage page={page} />,
});
