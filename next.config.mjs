/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // ✅ Bỏ chặn build khi có lỗi type
    ignoreBuildErrors: true,
  },
  eslint: {
    // ✅ Bỏ chặn build khi có lỗi ESLint
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
