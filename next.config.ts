import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
