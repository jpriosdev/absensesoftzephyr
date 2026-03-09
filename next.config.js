/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    images: {
      unoptimized: true
    },
    trailingSlash: true,
    experimental: {
      optimizeCss: true,
    },
    env: {
      CUSTOM_KEY: 'QA_DASHBOARD_2024',
    },
    onDemandEntries: {
      maxInactiveAge: 60 * 1000,
      pagesBufferLength: 5,
    },
    // Evitar errores de pre-rendering en Vercel
    staticPageGenerationTimeout: undefined,
  }
  
  module.exports = nextConfig
  