/**
 * 模板市场页
 * 展示所有简历模板，支持分类筛选和搜索
 */

import Link from 'next/link';

const CATEGORIES = [
  { id: 'all', name: '全部' },
  { id: 'tech', name: '技术' },
  { id: 'design', name: '设计' },
  { id: 'finance', name: '金融' },
  { id: 'marketing', name: '市场' },
  { id: 'management', name: '管理' },
  { id: 'education', name: '教育' },
  { id: 'general', name: '通用' },
];

const STYLES = [
  { id: 'classic', name: '经典', color: 'bg-gray-500' },
  { id: 'modern', name: '现代', color: 'bg-blue-500' },
  { id: 'minimal', name: '极简', color: 'bg-gray-400' },
  { id: 'creative', name: '创意', color: 'bg-pink-500' },
  { id: 'academic', name: '学术', color: 'bg-indigo-500' },
  { id: 'executive', name: '高管', color: 'bg-amber-600' },
];

const ALL_TEMPLATES = [
  { name: '互联网大厂技术岗', category: 'tech', style: 'modern', uses: 15280, rating: 4.8, premium: false, companyType: 'internet' },
  { name: '外企商务精英', category: 'management', style: 'classic', uses: 8930, rating: 4.7, premium: true, companyType: 'foreign' },
  { name: '国企公务员', category: 'general', style: 'classic', uses: 12450, rating: 4.6, premium: false, companyType: 'soe' },
  { name: '创业公司全能型', category: 'tech', style: 'creative', uses: 6720, rating: 4.5, premium: false, companyType: 'startup' },
  { name: '咨询顾问', category: 'finance', style: 'executive', uses: 4580, rating: 4.9, premium: true, companyType: 'consulting' },
  { name: 'UI/UX 设计师', category: 'design', style: 'creative', uses: 9810, rating: 4.7, premium: false },
  { name: '极简程序员', category: 'tech', style: 'minimal', uses: 11200, rating: 4.6, premium: false },
  { name: '学术研究员', category: 'education', style: 'academic', uses: 5340, rating: 4.8, premium: false },
  { name: '市场营销达人', category: 'marketing', style: 'modern', uses: 7890, rating: 4.5, premium: true },
  { name: '金融分析师', category: 'finance', style: 'executive', uses: 6120, rating: 4.7, premium: true },
  { name: '产品经理', category: 'management', style: 'modern', uses: 10500, rating: 4.8, premium: false },
  { name: '数据科学家', category: 'tech', style: 'minimal', uses: 7800, rating: 4.6, premium: false },
];

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold gradient-text">ResumeAI</Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/templates" className="text-brand-600 font-medium">模板市场</Link>
            <Link href="/editor" className="btn-primary text-sm !py-2 !px-4">创建简历</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 页面标题 + 搜索 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">模板市场</h1>
            <p className="mt-1 text-gray-500">{ALL_TEMPLATES.length} 个专业模板</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="搜索模板..."
              className="px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
            <select className="px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm">
              <option>按热度排序</option>
              <option>按评分排序</option>
              <option>最新上架</option>
            </select>
          </div>
        </div>

        {/* 分类标签 */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                cat.id === 'all'
                  ? 'bg-brand-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* 风格筛选 */}
        <div className="flex items-center gap-2 mb-8">
          <span className="text-sm text-gray-500 mr-2">风格:</span>
          {STYLES.map((s) => (
            <button
              key={s.id}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-500/30"
            >
              <span className={`w-2 h-2 rounded-full ${s.color}`} />
              {s.name}
            </button>
          ))}
        </div>

        {/* 模板网格 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {ALL_TEMPLATES.map((t) => (
            <Link key={t.name} href="/editor" className="card overflow-hidden group">
              {/* 模板预览 */}
              <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-850 flex items-center justify-center relative">
                <div className="w-36 h-48 bg-white dark:bg-gray-700 rounded shadow-sm p-4 text-xs transition-transform group-hover:scale-105">
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3 mb-2" />
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded w-full mb-1" />
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded w-4/5 mb-2" />
                  <div className="h-2 bg-brand-200 dark:bg-brand-700 rounded w-full mb-1" />
                  <div className="h-2 bg-brand-200 dark:bg-brand-700 rounded w-3/4 mb-2" />
                  <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-full mb-1" />
                  <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-5/6" />
                </div>
                {/* 付费标签 */}
                {t.premium && (
                  <span className="absolute top-3 right-3 badge-orange">PRO</span>
                )}
              </div>
              {/* 模板信息 */}
              <div className="p-4">
                <h3 className="font-semibold text-sm">{t.name}</h3>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <span className={STYLES.find(s => s.id === t.style)?.color?.replace('bg-', 'text-') || 'text-gray-500'}>
                      {STYLES.find(s => s.id === t.style)?.name}
                    </span>
                    <span>⭐ {t.rating}</span>
                  </div>
                  <span>{t.uses.toLocaleString()} 人使用</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
