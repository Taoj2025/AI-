/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'cdn.resumeai.com'],
  },
  async rewrites() {
    return [
      {
        // AI 调度服务 (ai-dispatch) - 端口 3003
        source: '/api/ai/:path*',
        destination: `${process.env.AI_SERVICE_URL || 'http://localhost:3003'}/api/ai/:path*`,
      },
      {
        // 简历服务 (resume-service) - 端口 3001
        source: '/api/resumes/:path*',
        destination: `${process.env.RESUME_SERVICE_URL || 'http://localhost:3001'}/api/resumes/:path*`,
      },
      {
        // 用户服务 (user-service) - 端口 3004
        source: '/api/auth/:path*',
        destination: `${process.env.USER_SERVICE_URL || 'http://localhost:3004'}/api/auth/:path*`,
      },
      {
        // 模板服务 (template-service) - 端口 3005
        source: '/api/templates/:path*',
        destination: `${process.env.TEMPLATE_SERVICE_URL || 'http://localhost:3005'}/api/templates/:path*`,
      },
      {
        // 导出服务 (export-service) - 端口 3002
        source: '/api/export/:path*',
        destination: `${process.env.EXPORT_SERVICE_URL || 'http://localhost:3002'}/api/export/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
