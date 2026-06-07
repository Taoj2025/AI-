import Link from "next/link";
import { Header } from "@/components/Header";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: "我的简历", value: "12", change: "+3 本月", icon: "📄", color: "from-blue-500 to-blue-600" },
            { label: "AI 次数", value: "47/100", change: "专业版", icon: "🤖", color: "from-purple-500 to-purple-600" },
            { label: "导出次数", value: "23/999", change: "本月", icon: "📤", color: "from-green-500 to-green-600" },
            { label: "收藏模板", value: "8", change: "+2 新增", icon: "⭐", color: "from-orange-500 to-orange-600" },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">{card.icon}</span>
                <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${card.color} text-white`}>
                  {card.change}
                </span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{card.value}</div>
              <div className="text-sm text-gray-500 mt-1">{card.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 最近简历 */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">最近简历</h2>
              <Link href="/editor" className="text-blue-600 text-sm hover:underline">+ 创建新简历</Link>
            </div>
            <div className="space-y-4">
              {[
                { name: "前端工程师-字节跳动版", model: "GPT-4o", time: "2小时前", status: "已完成", style: "现代" },
                { name: "全栈开发-AI创业公司版", model: "DeepSeek", time: "昨天", status: "已完成", style: "极简" },
                { name: "产品经理-外企投递版", model: "Claude-3.5", time: "3天前", status: "草稿", style: "经典" },
                { name: "数据分析师-国企版", model: "文心一言", time: "上周", status: "已完成", style: "学术" },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-lg">📄</div>
                    <div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-400">{item.model} · {item.style}风格 · {item.time}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${item.status === '已完成' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {item.status}
                    </span>
                    <button className="text-gray-400 hover:text-gray-600">⋮</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧面板 */}
          <div className="space-y-6">
            {/* 快捷操作 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-4">快捷操作</h2>
              <div className="space-y-3">
                <Link href="/editor" className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors">
                  <span className="text-xl">✨</span>
                  <span className="font-medium text-blue-700">AI 智能生成简历</span>
                </Link>
                <Link href="/templates" className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors">
                  <span className="text-xl">🎨</span>
                  <span className="font-medium text-purple-700">浏览模板市场</span>
                </Link>
                <Link href="/export" className="flex items-center gap-3 p-3 rounded-xl bg-green-50 hover:bg-green-100 transition-colors">
                  <span className="text-xl">📤</span>
                  <span className="font-medium text-green-700">批量导出简历</span>
                </Link>
              </div>
            </div>

            {/* AI 模型用量 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-4">AI 模型用量 TOP 3</h2>
              <div className="space-y-3">
                {[
                  { model: "GPT-4o", pct: 45, color: "bg-green-500" },
                  { model: "DeepSeek Chat", pct: 28, color: "bg-teal-500" },
                  { model: "Claude-3.5", pct: 18, color: "bg-blue-500" },
                ].map((m) => (
                  <div key={m.model}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{m.model}</span>
                      <span className="text-gray-400">{m.pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
