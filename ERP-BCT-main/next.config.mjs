const outputMode = process.env.NEXT_OUTPUT_MODE === "dev" ? "dev" : "build"

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: outputMode === "dev" ? ".next-dev" : ".next-build",
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'q-bit.uz',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '9000',
      },
    ],
  },
};

export default nextConfig;
