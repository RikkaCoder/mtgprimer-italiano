import type { NextConfig } from "next";

// GitHub Pages hosts project repositories below /<repository-name>/.
// Local development and the original site keep their root-relative routing.
const isGitHubPagesBuild = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  output: "export",
  ...(isGitHubPagesBuild ? { basePath: "/mtgprimer-italiano" } : {}),
  sassOptions: {
    silenceDeprecations: ["legacy-js-api"],
  },
  trailingSlash: true,
};

export default nextConfig;
