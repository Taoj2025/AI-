export default function ExportPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">导出中心</h1>
        <p className="text-gray-500 mb-8">选择简历并导出为所需格式</p>

        {/* 选择简历 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold mb-4">选择简历</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "前端工程师-字节跳动版", ver: "v3", updated: "2小时前" },
              { name: "全栈开发-AI创业公司版", ver: "v1", updated: "昨天" },
              { name: "产品经理-外企投递版", ver: "v2", updated: "3天前" },
            ].map((item, i) => (
              <label key={item.name} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${i === 0 ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                <input type="radio" name="resume" defaultChecked={i === 0} className="mt-1" />
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-400">{item.ver} · {item.updated}</div>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* 选择格式 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold mb-4">导出格式</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { fmt: "PDF", desc: "A4尺寸 · 适合打印投递", icon: "📄", popular: true },
              { fmt: "Word", desc: ".docx · 可二次编辑", icon: "📝", popular: true },
              { fmt: "PPT", desc: "演示版 · 适合面试展示", icon: "📊", popular: false },
              { fmt: "PNG", desc: "高清图片 · 适合分享", icon: "🖼️", popular: true },
              { fmt: "HTML", desc: "网页版 · 在线展示", icon: "🌐", popular: false },
              { fmt: "Markdown", desc: "纯文本 · 开发者友好", icon: "📋", popular: false },
            ].map((item) => (
              <label key={item.fmt} className="relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 cursor-pointer transition-all">
                <input type="checkbox" defaultChecked={item.popular} className="absolute top-2 right-2" />
                <span className="text-3xl">{item.icon}</span>
                <div className="font-medium">{item.fmt}</div>
                <div className="text-xs text-gray-400 text-center">{item.desc}</div>
              </label>
            ))}
          </div>
        </section>

        {/* 导出选项 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold mb-4">导出选项</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">纸张尺寸</label>
              <select className="w-full px-3 py-2 rounded-lg border border-gray-200">
                <option>A4 (210×297mm)</option>
                <option>Letter (8.5×11in)</option>
                <option>自定义</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">色彩模式</label>
              <select className="w-full px-3 py-2 rounded-lg border border-gray-200">
                <option>彩色</option>
                <option>黑白</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">DPI</label>
              <select className="w-full px-3 py-2 rounded-lg border border-gray-200">
                <option>150 DPI（标准）</option>
                <option>300 DPI（高清）</option>
                <option>600 DPI（印刷级）</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">文件名模板</label>
              <input type="text" defaultValue="张三_前端工程师_GPT-4o" className="w-full px-3 py-2 rounded-lg border border-gray-200" />
            </div>
          </div>
        </section>

        {/* 导出按钮 */}
        <div className="flex gap-4">
          <button className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity">
            开始导出（选中 3 种格式）
          </button>
          <button className="px-6 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium hover:bg-gray-200">
            预览
          </button>
        </div>
      </div>
    </main>
  );
}
