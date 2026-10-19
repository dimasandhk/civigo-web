import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/kiosk",
        destination: "/display",
        permanent: false,
      },
      {
        source: "/officer",
        destination: "/admin/antrean",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
