const nextConfig = { async rewrites() { return [{ source: "/api/v1/:path*", destination: `${process.env.BACKEND_API_URL || "http://localhost:4000"}/api/v1/:path*` }]; } };
export default nextConfig;
