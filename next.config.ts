import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url))),
  async redirects() {
    return [
      {
        source: "/products/hygyr",
        destination: "/products/careermate",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
