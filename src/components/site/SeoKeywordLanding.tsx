import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/site/PageLayout";
import type { SeoKeywordLanding } from "@/lib/seo-keyword-landings";
import {
  absoluteUrl,
  canonicalLink,
  collectionPageJsonLd,
  ldJsonScript,
} from "@/lib/seo";

export function seoKeywordHead(page: SeoKeywordLanding) {
  return {
    meta: [
      { title: page.title },
      { name: "description", content: page.description },
      { name: "keywords", content: page.keywords },
      { property: "og:title", content: page.title },
      { property: "og:description", content: page.description },
      { property: "og:url", content: absoluteUrl(page.path) },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: page.title },
      { name: "twitter:description", content: page.description },
    ],
    links: [canonicalLink(page.path)],
    scripts: [
      ldJsonScript(
        collectionPageJsonLd({
          name: page.title,
          description: page.description,
          urlPath: page.path,
        }),
      ),
      ldJsonScript({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: page.faq.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      }),
    ],
  };
}

export function SeoKeywordLandingPage({ page }: { page: SeoKeywordLanding }) {
  return (
    <PageContainer>
      <p className="text-xs font-bold uppercase tracking-widest text-[#FF7A00]">
        SmartZone · smartzone.pk
      </p>
      <h1 className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight text-[#0B192C] sm:text-4xl">
        {page.h1}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">{page.intro}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        {page.productSearch ? (
          <Button className="bg-[#FF7A00] text-white hover:bg-[#E56E00]" asChild>
            <Link to="/products" search={page.productSearch}>
              {page.productCta} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : null}
        {page.secondaryTo ? (
          <Button variant="outline" asChild>
            <Link to={page.secondaryTo}>{page.secondaryLabel ?? "Learn more"}</Link>
          </Button>
        ) : null}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {page.sections.map((section) => (
          <article
            key={section.id}
            id={section.id}
            className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
          >
            <h2 className="text-lg font-bold text-[#0B192C]">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{section.body}</p>
          </article>
        ))}
      </div>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-bold text-[#0B192C]">FAQ</h2>
        {page.faq.map((item) => (
          <div key={item.q} className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-[#0B192C]">{item.q}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.a}</p>
          </div>
        ))}
      </section>

      <p className="mt-8 text-sm text-slate-500">
        Related:{" "}
        {page.related.map((link, i) => (
          <span key={link.to}>
            {i > 0 ? " · " : null}
            <Link to={link.to} className="font-semibold text-[#0052B4] hover:underline">
              {link.label}
            </Link>
          </span>
        ))}
      </p>
    </PageContainer>
  );
}
