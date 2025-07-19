import type { NextConfig } from "next";

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB limit
});

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  /* config options here */
  // You can add more Next.js config here
};

module.exports = withPWA(nextConfig);
