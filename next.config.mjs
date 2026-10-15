/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        // The legacy user dashboard lived under /application. It will be
        // rebuilt on shadcn in a later release; until then old bookmarks
        // land on /account instead of 404ing.
        source: "/application/:path*",
        destination: "/account",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
