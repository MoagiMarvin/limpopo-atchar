import "./globals.css";

export const BRAND_LOGO_URL = "/mango-atchar.png";

export const metadata = {
  title: "Limpopo Atchar | Traditional Taste",
  description: "Small-batch homemade Atchar from Limpopo.",
  icons: {
    icon: [{ url: "/mango-atchar.png", type: "image/png" }],
    shortcut: "/mango-atchar.png",
    apple: "/mango-atchar.png",
  },
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
