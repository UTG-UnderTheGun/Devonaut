/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
	output: "standalone",
  images: {
    domains: ['res.cloudinary.com'],
  },
}

export default nextConfig;
