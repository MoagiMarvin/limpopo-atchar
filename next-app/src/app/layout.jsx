import "./globals.css";

export const BRAND_LOGO_URL = "/Limpopo%20logo.png";

export const metadata = {
  title: "Limpopo Atchar | Traditional Taste",
  description: "Small-batch homemade Atchar from Limpopo.",
  icons: {
    icon: [{ url: "/Limpopo%20logo.png", type: "image/png" }],
    shortcut: "/Limpopo%20logo.png",
    apple: "/Limpopo%20logo.png",
  },
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
