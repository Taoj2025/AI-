/**
 * 简历编辑器 - 简化版
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';

const STEPS = [
  { id: 1, name: '输入方式' },
  { id: 2, name: '选择模型' },
  { id: 3, name: '目标公司' },
  { id: 4, name: '简历风格' },
  { id: 5, name: '确认生成' },
];

const INPUT_METHODS = [
  { id: 'text', name: '文字输入', desc: '直接填写个人信息' },
  { id: 'pdf', name: '上传 PDF', desc: '解析已有 PDF 简历' },
];

const AI_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', badge: '推荐' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5', provider: 'Anthropic', badge: '推荐' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5', provider: 'Google' },
  { id: 'deepseek-chat', name: 'DeepSeek', provider: 'DeepSeek', badge: '性价比' },
];

const COMPANY_TYPES = [
  { id: 'internet_giant', name: '互联网大厂', desc: '字节/阿里/腾讯' },
  { id: 'foreign_company', name: '外资企业', desc: 'Google/Apple' },
  { id: 'state_owned', name: '国企央企', desc: '央企/国企' },
  { id: 'startup', name: '创业公司', desc: 'A轮+/独角兽' },
  { id: 'consulting', name: '咨询金融', desc: 'MBB/四大' },
];

const RESUME_STYLES = [
  { id: 'business', name: '商务经典', desc: '传统专业风格' },
  { id: 'modern', name: '现代简约', desc: '简洁大方' },
  { id: 'creative', name: '创意活力', desc: '大胆独特' },
  { id: 'technical', name: '技术导向', desc: '突出技术能力' },
];

export default function EditorPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [selectedCompany, setSelectedCompany] = useState('internet_giant');
  const [selectedStyle, setSelectedStyle] = useState('business');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    title: '',
    company: '',
    position: '',
    startDate: '',
    endDate: '',
    description: '',
    skills: '',
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('http://localhost:3003/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personal: { name: formData.name, email: formData.email, phone: formData.phone, title: formData.title },
          experience: [{ company: formData.company, position: formData.position, start_date: formData.startDate, end_date: formData.endDate, description: formData.description, tech_stack: formData.skills.split(',').map(s => s.trim()) }],
          education: [],
          skills: formData.skills.split(',').map(s => s.trim()),
          target_job: formData.title,
          company_type: selectedCompany,
          style: selectedStyle,
          model: selectedModel,
        }),
      });
      if (!res.ok) throw new Error('生成失败');
      const data = await res.json();
      setGeneratedResult(data.summary);
    } catch {
      alert('生成失败，请检查后端服务是否运行');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-gray-600 hover:text-gray-900">← 返回首页</Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <span className="text-lg font-bold text-gray-900">ResumeAI</span>
            </div>
            <div className="w-24"></div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    currentStep >= step.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {step.name}
                </button>
                {index < STEPS.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${currentStep > step.id ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Step 1: Input */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">基本信息</h2>
              <p className="mt-2 text-gray-600">填写你的个人信息和工作经历</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入姓名"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">手机</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="138-0000-0000"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">目标职位</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="如：高级前端工程师"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">公司名称</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="公司名称"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">职位</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="职位名称"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">工作描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="描述你的工作职责和成就..."
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">技能（用逗号分隔）</label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="React, TypeScript, Node.js"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-8 py-3 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
              >
                下一步 →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: AI Model */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">选择 AI 模型</h2>
              <p className="mt-2 text-gray-600">选择用于生成简历的 AI 模型</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {AI_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${
                    selectedModel === model.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{model.name}</div>
                      <div className="text-sm text-gray-500">{model.provider}</div>
                    </div>
                    {model.badge && (
                      <span className="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-100 rounded-full">
                        {model.badge}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button onClick={() => setCurrentStep(1)} className="px-6 py-3 text-gray-600 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
                ← 上一步
              </button>
              <button onClick={() => setCurrentStep(3)} className="px-8 py-3 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium">
                下一步 →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Company */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">选择目标公司类型</h2>
              <p className="mt-2 text-gray-600">AI 将根据公司类型调整简历内容</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {COMPANY_TYPES.map((company) => (
                <button
                  key={company.id}
                  onClick={() => setSelectedCompany(company.id)}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${
                    selectedCompany === company.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{company.name}</div>
                  <div className="mt-1 text-sm text-gray-500">{company.desc}</div>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button onClick={() => setCurrentStep(2)} className="px-6 py-3 text-gray-600 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
                ← 上一步
              </button>
              <button onClick={() => setCurrentStep(4)} className="px-8 py-3 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium">
                下一步 →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Style */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">选择简历风格</h2>
              <p className="mt-2 text-gray-600">不同风格适合不同行业</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {RESUME_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${
                    selectedStyle === style.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{style.name}</div>
                  <div className="mt-1 text-sm text-gray-500">{style.desc}</div>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button onClick={() => setCurrentStep(3)} className="px-6 py-3 text-gray-600 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
                ← 上一步
              </button>
              <button onClick={() => setCurrentStep(5)} className="px-8 py-3 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium">
                下一步 →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Confirm */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">确认并生成</h2>
              <p className="mt-2 text-gray-600">确认配置后开始生成简历</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              <div className="p-4 flex justify-between">
                <span className="text-gray-600">姓名</span>
                <span className="font-medium">{formData.name || '未填写'}</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-gray-600">目标职位</span>
                <span className="font-medium">{formData.title || '未填写'}</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-gray-600">AI 模型</span>
                <span className="font-medium">{AI_MODELS.find(m => m.id === selectedModel)?.name}</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-gray-600">目标公司</span>
                <span className="font-medium">{COMPANY_TYPES.find(c => c.id === selectedCompany)?.name}</span>
              </div>
            </div>

            {!isGenerating && !generatedResult ? (
              <div className="flex justify-between">
                <button onClick={() => setCurrentStep(4)} className="px-6 py-3 text-gray-600 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
                  ← 上一步
                </button>
                <button
                  onClick={handleGenerate}
                  className="px-8 py-3 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium shadow-lg"
                >
                  开始生成简历
                </button>
              </div>
            ) : isGenerating ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center gap-3 px-6 py-4 rounded-full bg-indigo-50 border border-indigo-100">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-indigo-700 font-medium">AI 正在生成...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <h3 className="font-bold text-lg text-green-900 mb-4">简历生成成功！</h3>
                  <div className="bg-white rounded-lg p-4 text-gray-700 whitespace-pre-wrap text-sm">
                    {generatedResult}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setGeneratedResult(null)} className="px-6 py-3 text-gray-600 bg-white border border-gray-300 rounded-lg font-medium">
                    重新生成
                  </button>
                  <Link href="/export" className="px-6 py-3 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium">
                    导出简历
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}