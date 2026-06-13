import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    logging: {
        fetches: {
          fullUrl: true,
        },
    },
    allowedDevOrigins: ['127.0.0.1', 'localhost']
};

export default nextConfig;
