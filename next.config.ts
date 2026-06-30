import type { NextConfig } from "next";

const isPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isPages ? "/SavorTea" : "",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
