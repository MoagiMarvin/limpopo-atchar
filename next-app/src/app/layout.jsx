import "./globals.css";

export const BRAND_LOGO_URL = "/Limpopo%20logo.png";
const SITE_URL = "https://limpopoatchar.co.za";
const FULL_LOGO_URL = `${SITE_URL}${BRAND_LOGO_URL}`;
const SITE_NAME = "Limpopo Atchar";
const DEFAULT_TITLE = "Limpopo Atchar | Traditional Taste";
const DEFAULT_DESC = "Small-batch homemade Atchar from Limpopo. Bold mango flavour, traditional taste, homemade with love in convenient plastic tubs.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s | Limpopo Atchar",
  },
  description: DEFAULT_DESC,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  keywords: ["atchar", "limpopo", "mango atchar", "south africa", "homemade atchar", "traditional atchar", "mango", "achar", "pickle"],
  category: "Food & Drink",
  icons: {
    icon: [
      { url: BRAND_LOGO_URL, type: "image/png", sizes: "any" },
      { url: BRAND_LOGO_URL, type: "image/png", sizes: "32x32" },
      { url: BRAND_LOGO_URL, type: "image/png", sizes: "48x48" },
      { url: BRAND_LOGO_URL, type: "image/png", sizes: "64x64" },
    ],
    shortcut: BRAND_LOGO_URL,
    apple: [
      { url: BRAND_LOGO_URL, sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "apple-touch-icon-precomposed", url: BRAND_LOGO_URL },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    locale: "en_ZA",
    countryName: "South Africa",
    images: [
      {
        url: FULL_LOGO_URL,
        width: 1200,
        height: 630,
        alt: "Limpopo Atchar Logo",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    site: "@limpopoatchar",
    creator: "@limpopoatchar",
    images: [FULL_LOGO_URL],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  themeColor: "#0a3d1c",
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
