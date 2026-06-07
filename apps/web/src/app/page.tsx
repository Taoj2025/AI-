/**
 * ResumeAI Web 首页
 * 小红书+知乎风格融合设计
 */

import Link from 'next/link';

// ---- 模型数据 ----
const MODELS = [
  { name: 'GPT-4o', provider: 'OpenAI', color: 'bg-green-500', badge: '推荐' },
  { name: 'Claude 3.5', provider: 'Anthropic', color: 'bg-blue-500', badge: '推荐' },
  { name: 'Gemini 1.5', provider: 'Google', color: 'bg-purple-500' },
  { name: '文心一言 4.0', provider: '百度', color: 'bg-orange-500' },
  { name: '通义千问', provider: '阿里', color: 'bg-orange-500' },
  { name: '混元 Pro', provider: '腾讯', color: 'bg-red-500', badge: '新' },
  { name: 'GLM-4 Plus', provider: '智谱', color: 'bg-red-500', badge: '新' },
  { name: 'DeepSeek', provider: 'DeepSeek', color: 'bg-teal-500', badge: '超值' },
];

const COMPANY_TYPES = [
  { type: 'internet', name: '互联网大厂', icon: '🏢', desc: '字节/阿里/腾讯/美团' },
  { type: 'foreign', name: '外企', icon: '🌍', desc: 'Google/Apple/McKinsey' },
  { type: 'soe', name: '国企/体制', icon: '🏛️', desc: '央企/国企/事业单位' },
  { type: 'startup', name: '创业公司', icon: '🚀', desc: 'A轮+/独角兽' },
  { type: 'consulting', name: '咨询/金融', icon: '📊', desc: 'MBB/四大/投行' },
];

const TEMPLATES = [
  { name: '互联网技术岗', category: 'tech', style: 'modern', uses: 15280 },
  { name: '外企商务精英', category: 'management', style: 'classic', uses: 8930 },
  { name: '国企公务员', category: 'general', style: 'classic', uses: 12450 },
  { name: 'UI/UX设计师', category: 'design', style: 'creative', uses: 9810 },
  { name: '极简程序员', category: 'tech', style: 'minimal', uses: 11200 },
  { name: '学术研究员', category: 'education', style: 'academic', uses: 5340 },
];

const FEATURES = [
  { icon: '🤖', title: '14+ AI 模型', desc: '支持 GPT-4o、Claude、Gemini、DeepSeek 等主流大模型，一键切换' },
  { icon: '🎯', title: '5 种公司适配', desc: '互联网大厂/外企/国企/创业/咨询，每种类型差异化生成策略' },
  { icon: '📄', title: '7 种导出格式', desc: 'PDF/Word/PPT/PNG/HTML/Markdown，满足各种场景需求' },
  { icon: '✨', title: '6 种风格模板', desc: '经典/现代/极简/创意/学术/高管，100+专业模板随心选' },
  { icon: '📡', title: '多模态输入', desc: '支持文字/PDF/Word/PPT/图片/语音，上传即生成' },
  { icon: '🔄', title: 'ATS 优化', desc: '智能关键词优化，通过率提升 300%' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-950 dark:via-indigo-950/20 dark:to-purple-950/20" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300/20 rounded-full blur-3xl" />
          <div className="absolute top-40 right-20 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-pink-300/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-32">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-gray-200/50 dark:border-gray-700/50 text-sm text-gray-600 dark:text-gray-400 mb-8">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              支持 14+ 款主流大模型 · 5 种公司类型适配 · 100+ 专业模板
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              AI 驱动的
              <br />
              <span className="gradient-text">智能简历</span>
              生成平台
            </h1>

            <p className="mt-6 text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              输入你的信息或上传已有简历，AI 自动生成针对目标公司的专业简历。
              支持多种格式导出，帮你在面试中脱颖而出。
            </p>

            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/editor" className="btn-primary text-lg px-8 py-3">
                免费开始生成
              </Link>
              <Link href="/templates" className="btn-secondary text-lg px-8 py-3">
                浏览模板市场
              </Link>
            </div>

            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-500">
              <span>无需信用卡</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span>30秒生成</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span>已有 100,000+ 用户</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- AI 模型展示 ---- */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">选择你的 AI 模型</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              通过 Hermes 统一适配层，无缝切换 14+ 款主流大模型
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {MODELS.map((model) => (
              <div key={model.name} className="card p-4 flex items-center gap-3 cursor-pointer hover:border-brand-500/30">
                <span className={`w-3 h-3 rounded-full ${model.color}`} />
                <div>
                  <div className="font-medium text-sm">{model.name}</div>
                  <div className="text-xs text-gray-500">{model.provider}</div>
                </div>
                {model.badge && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                    {model.badge}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- 公司类型适配 ---- */}
      <section className="py-20 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">针对目标公司精准生成</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              不同公司看重不同特质，OpenClaw 编排链自动调整生成策略
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {COMPANY_TYPES.map((ct) => (
              <div key={ct.type} className="card p-6 text-center group">
                <div className="text-4xl mb-3">{ct.icon}</div>
                <h3 className="font-semibold text-sm">{ct.name}</h3>
                <p className="mt-1 text-xs text-gray-500">{ct.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- 热门模板 ---- */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold">热门模板</h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">专业设计，帮你脱颖而出</p>
            </div>
            <Link href="/templates" className="text-brand-600 hover:text-brand-700 font-medium text-sm">
              查看全部 &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {TEMPLATES.map((t) => (
              <div key={t.name} className="card overflow-hidden group cursor-pointer">
                <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-850 flex items-center justify-center">
                  <div className="w-32 h-44 bg-white dark:bg-gray-700 rounded shadow-sm p-3 text-xs">
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3 mb-2" />
                    <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-full mb-1.5" />
                    <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-4/5 mb-3" />
                    <div className="h-2 bg-brand-200 dark:bg-brand-700 rounded w-full mb-1" />
                    <div className="h-2 bg-brand-200 dark:bg-brand-700 rounded w-3/4" />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold">{t.name}</h3>
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <span className="badge-green">{t.style}</span>
                    <span>{t.uses.toLocaleString()} 人使用</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- 功能亮点 ---- */}
      <section className="py-20 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">为什么选择 ResumeAI？</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold">
            准备好打造你的
            <span className="gradient-text">专业简历</span>
            了吗？
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            免费注册，30 秒内生成第一份简历
          </p>
          <Link href="/editor" className="btn-primary inline-block mt-8 text-lg px-10 py-4">
            免费开始
          </Link>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="py-12 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
          <p>&copy; 2026 ResumeAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
