import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pbcoms/ui", "@pbcoms/shared"],
  // The login redirect carries the invitation URL in its `next` query too.
  logging: {
    incomingRequests: { ignore: [/invitations/i, /^\/login(?:\?|$)/i] },
  },
  async headers() {
    return [
      ...["/app/invitations/:path*", "/login"].map((source) => ({
        source,
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0",
          },
        ],
      })),
      {
        source: "/api/invitations/respond",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
