/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // For Docker deployment, adjust the basePath if serving from a subdirectory
  // basePath: '',
};

export default nextConfig;
