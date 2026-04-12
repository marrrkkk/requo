export const legalConfig = {
  companyName: "Requo",
  productName: "Requo",
  supportEmail: "support@requo.app",
  privacyEmail: "privacy@requo.app",
  domain: "https://requo.app",
  address: "Lucena City, Quezon, Philippines",
  country: "Philippines",
  effectiveDate: "April 13, 2026",
  hostingProvider: "Vercel",
  storageProvider: "Supabase",
  governingLaw: "The laws of the Republic of the Philippines",
  venue: "the proper courts of Lucena City, Quezon, Philippines",
} as const;

export const legalNavItems = [
  { href: "/", label: "Home" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
] as const;
