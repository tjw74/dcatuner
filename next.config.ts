import type { NextConfig } from "next";

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  /* config options here */
  // You can add more Next.js config here
};

module.exports = withPWA(nextConfig);
