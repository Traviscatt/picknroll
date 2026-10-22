import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ship the Lambda Prisma query engine with the server bundle (OpenNext on AWS Lambda)
  outputFileTracingIncludes: {
    "/**/*": [
      "./node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node",
      "./node_modules/.prisma/client/schema.prisma",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "a.espncdn.com",
        pathname: "/i/teamlogos/**",
      },
    ],
  },
};

export default nextConfig;
