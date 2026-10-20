import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { LocaleProvider } from "@/components/provider/LocaleProvider";

import "./globals.scss";

// Do not attribute visits to the fork to the original author's analytics account.
const isGitHubPagesBuild = process.env.GITHUB_PAGES === "true";
const siteBasePath = isGitHubPagesBuild ? "/mtgprimer-italiano" : "";
const siteUrl = isGitHubPagesBuild
  ? "https://rikkacoder.github.io/mtgprimer-italiano/"
  : "https://mtgprimer.com";

export const metadata: Metadata = {
  authors: [
    {
      name: "Garrett Gardner",
      url: "https://github.com/GarrettGardner",
    },
  ],
  creator: "Garrett Gardner",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  applicationName: "MTG Primer",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "MTG Primer",
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: [{ url: `${siteBasePath}/favicon.ico` }],
    apple: [],
    shortcut: [`${siteBasePath}/favicon.ico`],
  },
  metadataBase: new URL(siteUrl),
};

export const viewport: Viewport = {
  initialScale: 1,
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <head>
        <meta httpEquiv="cache-control" content="max-age=0" />
        <meta httpEquiv="cache-control" content="no-cache" />
        <meta httpEquiv="expires" content="0" />
        <meta httpEquiv="expires" content="Tue, 01 Jan 1980 1:00:00 GMT" />
        <meta httpEquiv="pragma" content="no-cache" />
      </head>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
      {!isGitHubPagesBuild && <GoogleAnalytics gaId="UA-61176008-6" />}
    </html>
  );
}
