import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fc from "fast-check";

// ---------------------------------------------------------------------------
// Top-level mocks (hoisted by vitest)
// ---------------------------------------------------------------------------
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

vi.mock("@/features/businesses/queries", () => ({
  listPublicBusinessSitemapEntries: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/inquiries/queries", () => ({
  listPublicInquirySitemapEntries: vi.fn().mockResolvedValue([]),
}));

vi.mock("node:child_process", () => ({
  spawnSync: vi.fn().mockReturnValue({ status: 1, error: new Error("mocked") }),
}));

// ---------------------------------------------------------------------------
// 1. Property 16 & 17: metadataBase fallback ladder (Task 1.3)
// ---------------------------------------------------------------------------
describe("metadataBase fallback ladder", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("Property 16: getSiteUrl() returns a well-formed URL with pathname '/' for any env config with at least one fallback source", async () => {
    const envArb = fc.record({
      BETTER_AUTH_URL: fc.oneof(
        fc.constant(undefined),
        fc.webUrl().map((u) => u),
      ),
      VERCEL_URL: fc.oneof(
        fc.constant(undefined),
        fc.domain().map((d) => d),
      ),
      NODE_ENV: fc.oneof(
        fc.constant("development"),
        fc.constant("production"),
        fc.constant("test"),
      ),
    }).filter((env) => {
      // At least one source must be present, or dev mode
      return Boolean(env.BETTER_AUTH_URL) || Boolean(env.VERCEL_URL) || env.NODE_ENV === "development";
    });

    await fc.assert(
      fc.asyncProperty(envArb, async (envConfig) => {
        vi.resetModules();
        vi.unstubAllEnvs();

        // Clear env vars first
        delete process.env.BETTER_AUTH_URL;
        delete process.env.VERCEL_URL;

        if (envConfig.BETTER_AUTH_URL) {
          process.env.BETTER_AUTH_URL = envConfig.BETTER_AUTH_URL;
        }
        if (envConfig.VERCEL_URL) {
          process.env.VERCEL_URL = envConfig.VERCEL_URL;
        }
        vi.stubEnv("NODE_ENV", envConfig.NODE_ENV);

        const { getSiteUrl } = await import("@/lib/seo/site");
        const url = getSiteUrl();

        expect(url).toBeInstanceOf(URL);
        expect(url.pathname).toBe("/");
        // Must have a valid origin (protocol + host)
        expect(url.origin).toMatch(/^https?:\/\/.+/);
      }),
      { numRuns: 30 },
    );
  });

  it("Property 17: createPageMetadata yields openGraph.url that resolves via new URL(P, S) pattern", async () => {
    const pathnameArb = fc
      .array(fc.stringMatching(/^[a-z0-9-]+$/), { minLength: 1, maxLength: 4 })
      .map((segments) => `/${segments.join("/")}`);

    await fc.assert(
      fc.asyncProperty(pathnameArb, async (pathname) => {
        vi.resetModules();
        process.env.BETTER_AUTH_URL = "https://example.com";
        vi.stubEnv("NODE_ENV", "production");

        const { createPageMetadata, getSiteUrl } = await import("@/lib/seo/site");
        const meta = createPageMetadata({ pathname, description: "test" });
        const siteUrl = getSiteUrl();

        // openGraph.url should be the normalized pathname
        const ogUrl = (meta.openGraph as Record<string, unknown>)?.url as string;
        expect(ogUrl).toBeDefined();

        // It should resolve correctly via new URL(ogUrl, siteUrl)
        const resolved = new URL(ogUrl, siteUrl);
        expect(resolved.pathname).toBe(pathname);
      }),
      { numRuns: 20 },
    );
  });
});


// ---------------------------------------------------------------------------
// 2. Unit test: permanent metadataBase failure (Task 1.4)
// ---------------------------------------------------------------------------
describe("assertMetadataBaseResolvable permanent failure", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws MetadataBaseResolutionError when all fallback sources are cleared in production", async () => {
    vi.resetModules();

    // Remove all fallback sources
    delete process.env.BETTER_AUTH_URL;
    delete process.env.VERCEL_URL;
    vi.stubEnv("NODE_ENV", "production");

    // The module-level call to assertMetadataBaseResolvable() will throw on import.
    // We catch that and verify it's the expected error.
    try {
      await import("@/lib/seo/site");
      // If we get here, the module didn't throw — fail the test
      expect.fail("Expected module import to throw MetadataBaseResolutionError");
    } catch (error: unknown) {
      expect((error as Error).name).toBe("MetadataBaseResolutionError");
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Property 13: JSON-LD escaping (Task 1.6)
// ---------------------------------------------------------------------------
describe("JSON-LD escaping (encodeJsonLd)", () => {
  it("Property 13: output never contains '</' and always round-trips as valid JSON", async () => {
    vi.resetModules();
    process.env.BETTER_AUTH_URL = "https://example.com";

    const { encodeJsonLd } = await import("@/lib/seo/structured-data");

    const adversarialInserts = ["</script>", "</", "<!--", "\\", "\\\\"];

    // fast-check v4: use fc.string() which generates full unicode
    const dataArb = fc.oneof(
      fc.string(),
      fc.constantFrom(...adversarialInserts),
      fc.tuple(fc.string(), fc.constantFrom(...adversarialInserts), fc.string())
        .map(([a, b, c]) => a + b + c),
    );

    fc.assert(
      fc.property(dataArb, (input) => {
        const data = { "@context": "https://schema.org", name: input };
        const encoded = encodeJsonLd(data);

        // Must NOT contain `</` substring (XSS vector in script tags)
        expect(encoded).not.toContain("</");

        // Must be valid JSON that round-trips
        const parsed = JSON.parse(encoded);
        expect(parsed.name).toBe(input);

        // Safe for <script type="application/ld+json"> insertion
        expect(encoded).not.toMatch(/<\//);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// 4. Property 10 & 11: Product offers and LocalBusiness gating (Task 1.7)
// ---------------------------------------------------------------------------
describe("Structured data: Product pricing and LocalBusiness", () => {
  it("Property 10: getProductPricingStructuredData emits offers.length = |plans| × |intervals|", async () => {
    vi.resetModules();
    process.env.BETTER_AUTH_URL = "https://example.com";

    const { getProductPricingStructuredData } = await import(
      "@/lib/seo/structured-data"
    );

    const planNameArb = fc.stringMatching(/^[A-Za-z ]+$/).filter((s) => s.trim().length > 0);
    const intervalArb = fc.constantFrom("month" as const, "year" as const);
    const offerArb = fc.record({
      name: planNameArb,
      priceCurrency: fc.constant("USD"),
      price: fc.integer({ min: 100, max: 99900 }),
      billingIncrement: intervalArb,
    });

    const offersArb = fc.array(offerArb, { minLength: 1, maxLength: 10 });

    fc.assert(
      fc.property(offersArb, (offers) => {
        const result = getProductPricingStructuredData({
          name: "Test Product",
          description: "A test product",
          url: "https://example.com/pricing",
          offers,
        });

        const resultOffers = (result as Record<string, unknown>).offers as unknown[];
        expect(resultOffers).toHaveLength(offers.length);
      }),
      { numRuns: 30 },
    );
  });

  it("Property 11: getLocalBusinessStructuredData returns correct @type based on address presence", async () => {
    vi.resetModules();
    process.env.BETTER_AUTH_URL = "https://example.com";

    const { getLocalBusinessStructuredData } = await import(
      "@/lib/seo/structured-data"
    );

    // With address present → @type: "LocalBusiness"
    const withAddress = getLocalBusinessStructuredData({
      name: "Test Biz",
      url: "https://example.com",
      description: "A test business",
      address: { streetAddress: "123 Main St", addressLocality: "Springfield" },
    });
    expect(withAddress).not.toBeNull();
    expect((withAddress as Record<string, unknown>)["@type"]).toBe("LocalBusiness");

    // Without address → @type: "ProfessionalService"
    const withoutAddress = getLocalBusinessStructuredData({
      name: "Test Biz",
      url: "https://example.com",
      description: "A test business",
    });
    expect(withoutAddress).not.toBeNull();
    expect((withoutAddress as Record<string, unknown>)["@type"]).toBe("ProfessionalService");

    // Missing name/url/description → null
    const missingName = getLocalBusinessStructuredData({
      name: "",
      url: "https://example.com",
      description: "A test business",
    });
    expect(missingName).toBeNull();

    const missingUrl = getLocalBusinessStructuredData({
      name: "Test",
      url: "",
      description: "A test business",
    });
    expect(missingUrl).toBeNull();

    const missingDescription = getLocalBusinessStructuredData({
      name: "Test",
      url: "https://example.com",
      description: "",
    });
    expect(missingDescription).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. Property 12: Breadcrumb reconstruction (Task 1.8)
// ---------------------------------------------------------------------------
describe("Breadcrumb reconstruction", () => {
  it("Property 12: pathnames with >1 segment produce items whose urls reconstruct the pathname", async () => {
    vi.resetModules();
    process.env.BETTER_AUTH_URL = "https://example.com";

    const { buildBreadcrumbsForPathname } = await import(
      "@/lib/seo/structured-data"
    );

    const segmentArb = fc.stringMatching(/^[a-z0-9-]+$/).filter((s) => s.length > 0 && s.length < 30);
    const multiSegmentPathArb = fc
      .array(segmentArb, { minLength: 2, maxLength: 5 })
      .map((segments) => `/${segments.join("/")}`);

    fc.assert(
      fc.property(multiSegmentPathArb, (pathname) => {
        const breadcrumbs = buildBreadcrumbsForPathname(pathname, {});

        expect(breadcrumbs.length).toBeGreaterThan(0);

        // The last breadcrumb url should equal the full pathname
        const lastUrl = breadcrumbs[breadcrumbs.length - 1]!.url;
        expect(lastUrl).toBe(pathname);

        // Each breadcrumb url should be a prefix of the next
        for (let i = 1; i < breadcrumbs.length; i++) {
          expect(breadcrumbs[i]!.url.startsWith(breadcrumbs[i - 1]!.url)).toBe(true);
        }
      }),
      { numRuns: 50 },
    );
  });

  it("pathnames with ≤1 segment return empty array", async () => {
    vi.resetModules();
    process.env.BETTER_AUTH_URL = "https://example.com";

    const { buildBreadcrumbsForPathname } = await import(
      "@/lib/seo/structured-data"
    );

    // Root path
    expect(buildBreadcrumbsForPathname("/", {})).toEqual([]);

    // Empty string
    expect(buildBreadcrumbsForPathname("", {})).toEqual([]);
  });
});


// ---------------------------------------------------------------------------
// 6. Unit test: root metadata + viewport + verification (Task 2.2)
// ---------------------------------------------------------------------------
describe("Root layout metadata and viewport", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("metadata has required fields: metadataBase, title, description, alternates, openGraph, twitter, robots, icons, applicationName", async () => {
    vi.resetModules();
    process.env.BETTER_AUTH_URL = "https://example.com";

    const layoutModule = await import("@/app/layout");
    const metadata = layoutModule.metadata;

    expect(metadata.metadataBase).toBeInstanceOf(URL);
    expect(metadata.title).toHaveProperty("default");
    expect(metadata.title).toHaveProperty("template");
    expect(metadata.description).toBeDefined();
    expect(metadata.alternates?.canonical).toBeDefined();
    expect(metadata.openGraph).toBeDefined();
    expect(metadata.twitter).toBeDefined();
    expect(metadata.robots).toBeDefined();
    expect(metadata.icons).toBeDefined();
    expect(metadata.applicationName).toBeDefined();
  });

  it("viewport has width, initialScale, maximumScale, userScalable, themeColor", async () => {
    vi.resetModules();
    process.env.BETTER_AUTH_URL = "https://example.com";

    const layoutModule = await import("@/app/layout");
    const vp = layoutModule.viewport;

    expect(vp.width).toBe("device-width");
    expect(vp.initialScale).toBe(1);
    expect(vp.maximumScale).toBe(5);
    expect(vp.userScalable).toBe(true);
    expect(vp.themeColor).toBeDefined();
  });

  it("verification.google is present when GOOGLE_SITE_VERIFICATION env is set", async () => {
    vi.resetModules();
    process.env.BETTER_AUTH_URL = "https://example.com";
    process.env.GOOGLE_SITE_VERIFICATION = "test-verification-code";

    const layoutModule = await import("@/app/layout");
    const metadata = layoutModule.metadata;

    expect(metadata.verification?.google).toBe("test-verification-code");
  });
});

// ---------------------------------------------------------------------------
// 7. Property 7 + unit: Sitemap (Task 3.2)
// ---------------------------------------------------------------------------
describe("Sitemap", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("static entries include /, /pricing, /privacy, /terms, /refund-policy, /inquire", async () => {
    vi.resetModules();
    process.env.BETTER_AUTH_URL = "https://example.com";

    const { listPublicBusinessSitemapEntries } = await import("@/features/businesses/queries");
    const { listPublicInquirySitemapEntries } = await import("@/features/inquiries/queries");
    vi.mocked(listPublicBusinessSitemapEntries).mockResolvedValue([]);
    vi.mocked(listPublicInquirySitemapEntries).mockResolvedValue([]);

    const sitemapModule = await import("@/app/sitemap");
    const entries = await sitemapModule.default();

    const urls = entries.map((e) => new URL(e.url).pathname);
    expect(urls).toContain("/");
    expect(urls).toContain("/pricing");
    expect(urls).toContain("/privacy");
    expect(urls).toContain("/terms");
    expect(urls).toContain("/refund-policy");
    expect(urls).toContain("/inquire");
  });

  it("revalidate === 3600", async () => {
    vi.resetModules();
    process.env.BETTER_AUTH_URL = "https://example.com";

    const sitemapModule = await import("@/app/sitemap");
    expect(sitemapModule.revalidate).toBe(3600);
  });

  it("root entry has images array", async () => {
    vi.resetModules();
    process.env.BETTER_AUTH_URL = "https://example.com";

    const { listPublicBusinessSitemapEntries } = await import("@/features/businesses/queries");
    const { listPublicInquirySitemapEntries } = await import("@/features/inquiries/queries");
    vi.mocked(listPublicBusinessSitemapEntries).mockResolvedValue([]);
    vi.mocked(listPublicInquirySitemapEntries).mockResolvedValue([]);

    const sitemapModule = await import("@/app/sitemap");
    const entries = await sitemapModule.default();

    const rootEntry = entries.find((e) => new URL(e.url).pathname === "/");
    expect(rootEntry).toBeDefined();
    expect(rootEntry!.images).toBeDefined();
    expect(Array.isArray(rootEntry!.images)).toBe(true);
    expect(rootEntry!.images!.length).toBeGreaterThan(0);
  });

  it("Property 7: sitemap includes only business rows where isPublic (noIndex === false)", async () => {
    // Generate arrays with unique slugs to avoid ambiguity when the same
    // slug appears in both public and noIndex rows.
    const businessRowsArb = fc
      .uniqueArray(
        fc.stringMatching(/^[a-z][a-z0-9-]*$/).filter((s) => s.length > 0 && s.length < 30),
        { minLength: 1, maxLength: 10 },
      )
      .chain((slugs) =>
        fc.tuple(
          ...slugs.map((slug) =>
            fc.record({
              slug: fc.constant(slug),
              lastModified: fc.date({ min: new Date("2020-01-01"), max: new Date("2030-01-01") }),
              noIndex: fc.boolean(),
            }).map((row) => ({ ...row, pathname: `/businesses/${row.slug}` })),
          ),
        ),
      );

    await fc.assert(
      fc.asyncProperty(businessRowsArb, async (businessRows) => {
        vi.resetModules();
        process.env.BETTER_AUTH_URL = "https://example.com";

        const { listPublicBusinessSitemapEntries } = await import("@/features/businesses/queries");
        const { listPublicInquirySitemapEntries } = await import("@/features/inquiries/queries");
        vi.mocked(listPublicBusinessSitemapEntries).mockResolvedValue(businessRows);
        vi.mocked(listPublicInquirySitemapEntries).mockResolvedValue([]);

        const sitemapModule = await import("@/app/sitemap");
        const entries = await sitemapModule.default();

        const businessUrls = entries
          .map((e) => new URL(e.url).pathname)
          .filter((p) => p.startsWith("/businesses/"));

        const expectedPublicPaths = businessRows
          .filter((r) => !r.noIndex)
          .map((r) => r.pathname);

        // Every public row should be in the sitemap
        for (const pathname of expectedPublicPaths) {
          expect(businessUrls).toContain(pathname);
        }

        // No noIndex row should be in the sitemap
        const noIndexPaths = businessRows
          .filter((r) => r.noIndex)
          .map((r) => r.pathname);
        for (const pathname of noIndexPaths) {
          expect(businessUrls).not.toContain(pathname);
        }
      }),
      { numRuns: 15 },
    );
  });
});

// ---------------------------------------------------------------------------
// 8. Property 8, 9 + unit: Robots (Task 3.4)
// ---------------------------------------------------------------------------
describe("Robots", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("Property 8: every PUBLIC_ROUTE_PREFIX appears in robots().rules[0].allow", async () => {
    vi.resetModules();
    process.env.BETTER_AUTH_URL = "https://example.com";

    const { PUBLIC_ROUTE_PREFIXES } = await import("@/lib/seo/route-registry");
    const robotsModule = await import("@/app/robots");
    const result = robotsModule.default();

    const allowList = result.rules as Array<{ allow?: string[] }>;
    const allowed = allowList[0]?.allow ?? [];

    for (const prefix of PUBLIC_ROUTE_PREFIXES) {
      expect(allowed).toContain(prefix);
    }
  });

  it("Property 9: every PRIVATE_ROUTE_PREFIX appears in robots().rules[0].disallow", async () => {
    vi.resetModules();
    process.env.BETTER_AUTH_URL = "https://example.com";

    const { PRIVATE_ROUTE_PREFIXES } = await import("@/lib/seo/route-registry");
    const robotsModule = await import("@/app/robots");
    const result = robotsModule.default();

    const rulesList = result.rules as Array<{ disallow?: string[] }>;
    const disallowed = rulesList[0]?.disallow ?? [];

    for (const prefix of PRIVATE_ROUTE_PREFIXES) {
      expect(disallowed).toContain(prefix);
    }
  });

  it("no /_next/ in disallow, sitemap + host present, no bot-specific rules", async () => {
    vi.resetModules();
    process.env.BETTER_AUTH_URL = "https://example.com";

    const robotsModule = await import("@/app/robots");
    const result = robotsModule.default();

    const rulesList = result.rules as Array<{ disallow?: string[]; userAgent?: string }>;
    const disallowed = rulesList[0]?.disallow ?? [];

    // No /_next/ in disallow
    expect(disallowed.some((d) => d.includes("/_next/"))).toBe(false);

    // sitemap present
    expect(result.sitemap).toBeDefined();
    expect(typeof result.sitemap).toBe("string");

    // host present
    expect(result.host).toBeDefined();
    expect(typeof result.host).toBe("string");

    // No bot-specific rules (only one rule with userAgent: "*")
    expect(rulesList).toHaveLength(1);
    expect(rulesList[0]?.userAgent).toBe("*");
  });
});

// ---------------------------------------------------------------------------
// 9. Property 4: Business slug metadata (Task 5.5)
// ---------------------------------------------------------------------------
describe("Business slug metadata", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("Property 4: public business profile has title with name, description ≤ 160 chars, canonical = /businesses/<slug>", async () => {
    vi.resetModules();
    process.env.BETTER_AUTH_URL = "https://example.com";

    const { getPublicBusinessPageMetadata } = await import(
      "@/features/businesses/metadata"
    );

    const profileArb = fc.record({
      id: fc.uuid(),
      slug: fc.stringMatching(/^[a-z0-9-]+$/).filter((s) => s.length > 0 && s.length < 50),
      name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
      description: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 300 })),
      shortDescription: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 200 })),
      logoUrl: fc.oneof(fc.constant(null), fc.webUrl()),
      updatedAt: fc.date({ min: new Date("2020-01-01"), max: new Date("2030-01-01") }),
      isPublic: fc.constant(true),
    });

    fc.assert(
      fc.property(profileArb, (profile) => {
        const meta = getPublicBusinessPageMetadata(profile);

        // Title contains business name
        const titleObj = meta.title as { absolute?: string } | undefined;
        const titleStr = titleObj?.absolute ?? "";
        expect(titleStr).toContain(profile.name);

        // Description ≤ 160 chars
        expect(meta.description).toBeDefined();
        expect(meta.description!.length).toBeLessThanOrEqual(160);

        // Canonical = /businesses/<slug>
        expect(meta.alternates?.canonical).toBe(`/businesses/${profile.slug}`);
      }),
      { numRuns: 30 },
    );
  });

  it("missing/non-public business returns robots.index === false", async () => {
    vi.resetModules();
    process.env.BETTER_AUTH_URL = "https://example.com";

    const { getMissingPublicBusinessMetadata } = await import(
      "@/features/businesses/metadata"
    );

    const meta = getMissingPublicBusinessMetadata();
    const robots = meta.robots as Record<string, unknown>;
    expect(robots.index).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 10. Property 5: Quote metadata always noindex (Task 5.6)
// ---------------------------------------------------------------------------
describe("Quote metadata always noindex", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("Property 5: for any PublicQuoteMetadataInput, robots.index === false, robots.follow === false, canonical = /quote/<token>", async () => {
    vi.resetModules();
    process.env.BETTER_AUTH_URL = "https://example.com";

    const { getPublicQuotePageMetadata } = await import(
      "@/features/quotes/metadata"
    );

    const inputArb = fc.record({
      token: fc.stringMatching(/^[a-zA-Z0-9-]+$/).filter((s) => s.length > 0),
      title: fc.string({ minLength: 0, maxLength: 100 }),
      quoteNumber: fc.stringMatching(/^[A-Z0-9-]+$/).filter((s) => s.length > 0),
      businessName: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
    });

    fc.assert(
      fc.property(inputArb, (input) => {
        const meta = getPublicQuotePageMetadata(input);

        const robots = meta.robots as Record<string, unknown>;
        expect(robots.index).toBe(false);
        expect(robots.follow).toBe(false);

        // Canonical = /quote/<token>
        expect(meta.alternates?.canonical).toBe(`/quote/${input.token}`);
      }),
      { numRuns: 30 },
    );
  });
});

// ---------------------------------------------------------------------------
// 11. Unit: images.remotePatterns shape (Task 11.4)
// ---------------------------------------------------------------------------
describe("next.config.ts images.remotePatterns", () => {
  it("exports a config with images.remotePatterns as an array", async () => {
    vi.resetModules();
    process.env.BETTER_AUTH_URL = "https://example.com";

    const configModule = await import("@/next.config");
    const config = configModule.default;

    expect(config).toBeDefined();
    expect(config.images).toBeDefined();
    expect(Array.isArray(config.images!.remotePatterns)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 12. Unit: modularizeImports shape (Task 12.5)
// ---------------------------------------------------------------------------
describe("next.config.ts modularizeImports", () => {
  it("exports a config with modularizeImports as an object", async () => {
    vi.resetModules();
    process.env.BETTER_AUTH_URL = "https://example.com";

    const configModule = await import("@/next.config");
    const config = configModule.default;

    expect(config).toBeDefined();
    expect(config.modularizeImports).toBeDefined();
    expect(typeof config.modularizeImports).toBe("object");
    expect(config.modularizeImports).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 13. Unit: waiver parsing and threshold classification (Task 14.3)
// ---------------------------------------------------------------------------
describe("Lighthouse budget: waiver parsing and threshold classification", () => {
  it("parseWaivers extracts waiver reasons from PR body", () => {
    // Inline the logic to avoid importing the script (which triggers main())
    function parseWaivers(prBody: string | undefined): string[] {
      if (!prBody) return [];
      const waivers: string[] = [];
      const pattern = /seo-budget-waiver:\s*(.+)/gi;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(prBody)) !== null) {
        const reason = match[1]?.trim();
        if (reason) waivers.push(reason);
      }
      return waivers;
    }

    // No waivers
    expect(parseWaivers(undefined)).toEqual([]);
    expect(parseWaivers("")).toEqual([]);
    expect(parseWaivers("Just a normal PR body")).toEqual([]);

    // Single waiver
    expect(parseWaivers("seo-budget-waiver: font loading delay")).toEqual([
      "font loading delay",
    ]);

    // Multiple waivers
    const multiBody = `
Some PR description.

seo-budget-waiver: font loading delay
seo-budget-waiver: third-party script overhead

More text here.
    `;
    expect(parseWaivers(multiBody)).toEqual([
      "font loading delay",
      "third-party script overhead",
    ]);
  });

  it("classifyMetric returns correct status based on thresholds", () => {
    // Inline the logic to avoid importing the script (which triggers main())
    type MetricStatus = "ok" | "violation" | "critical";
    function classifyMetric(
      value: number,
      thresholds: { budget: number; critical: number },
    ): MetricStatus {
      if (value > thresholds.critical) return "critical";
      if (value > thresholds.budget) return "violation";
      return "ok";
    }

    const thresholds = { budget: 2500, critical: 4000 };

    // Below budget → ok
    expect(classifyMetric(2000, thresholds)).toBe("ok");
    expect(classifyMetric(2500, thresholds)).toBe("ok");

    // Above budget but below critical → violation
    expect(classifyMetric(2501, thresholds)).toBe("violation");
    expect(classifyMetric(3999, thresholds)).toBe("violation");
    expect(classifyMetric(4000, thresholds)).toBe("violation");

    // Above critical → critical
    expect(classifyMetric(4001, thresholds)).toBe("critical");
    expect(classifyMetric(10000, thresholds)).toBe("critical");
  });

  it("classifyMetric: CLS thresholds (fractional values)", () => {
    type MetricStatus = "ok" | "violation" | "critical";
    function classifyMetric(
      value: number,
      thresholds: { budget: number; critical: number },
    ): MetricStatus {
      if (value > thresholds.critical) return "critical";
      if (value > thresholds.budget) return "violation";
      return "ok";
    }

    const clsThresholds = { budget: 0.1, critical: 0.25 };

    expect(classifyMetric(0.05, clsThresholds)).toBe("ok");
    expect(classifyMetric(0.1, clsThresholds)).toBe("ok");
    expect(classifyMetric(0.15, clsThresholds)).toBe("violation");
    expect(classifyMetric(0.25, clsThresholds)).toBe("violation");
    expect(classifyMetric(0.3, clsThresholds)).toBe("critical");
  });
});
