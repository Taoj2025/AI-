export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">设置</h1>

        {/* 个人信息 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold mb-4">个人信息</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-2xl font-bold">U</div>
              <div>
                <div className="font-medium">用户昵称</div>
                <div className="text-sm text-gray-400">138****8888</div>
              </div>
              <button className="ml-auto px-4 py-2 rounded-lg bg-blue-50 text-blue-600 text-sm">编辑</button>
            </div>
          </div>
        </section>

        {/* 订阅管理 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold mb-4">我的订阅</h2>
          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50">
            <div>
              <div className="font-bold text-purple-600">专业版 PRO</div>
              <div className="text-xs text-gray-500">有效期至 2026-07-07 · ¥79/月</div>
            </div>
            <button className="px-4 py-2 rounded-lg bg-purple-500 text-white text-sm">管理订阅</button>
          </div>
        </section>

        {/* AI 偏好 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold mb-4">AI 偏好</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">默认 AI 模型</div>
                <div className="text-xs text-gray-400">创建简历时默认选择的模型</div>
              </div>
              <select className="px-3 py-2 rounded-lg border border-gray-200 text-sm">
                <option>GPT-4o</option>
                <option>Claude-3.5 Sonnet</option>
                <option>DeepSeek Chat</option>
                <option>文心一言 4.0</option>
                <option>通义千问 Max</option>
                <option>智谱 GLM-4 Plus</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">默认公司类型</div>
                <div className="text-xs text-gray-400">投递目标公司类型</div>
              </div>
              <select className="px-3 py-2 rounded-lg border border-gray-200 text-sm">
                <option>互联网大厂</option>
                <option>外企</option>
                <option>国企/事业单位</option>
                <option>创业公司</option>
                <option>咨询/金融</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">简历风格</div>
                <div className="text-xs text-gray-400">默认模板风格</div>
              </div>
              <select className="px-3 py-2 rounded-lg border border-gray-200 text-sm">
                <option>现代简约</option>
                <option>经典商务</option>
                <option>极简黑白</option>
                <option>创意设计</option>
                <option>学术论文</option>
              </select>
            </div>
          </div>
        </section>

        {/* 导出设置 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold mb-4">导出设置</h2>
          <div className="space-y-3">
            {["PDF (A4尺寸)", "Word (.docx)", "PPT 演示版", "高清图片 (PNG)", "HTML 网页版", "Markdown 纯文本"].map((fmt) => (
              <label key={fmt} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" defaultChecked={["PDF", "Word", "PNG"].some(f => fmt.includes(f))} className="rounded" />
                <span className="text-sm">{fmt}</span>
              </label>
            ))}
          </div>
        </section>

        {/* 危险操作 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4 text-red-600">危险操作</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">注销账号</div>
              <div className="text-xs text-gray-400">注销后所有数据将被永久删除</div>
            </div>
            <button className="px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm">注销</button>
          </div>
        </section>
      </div>
    </main>
  );
}
