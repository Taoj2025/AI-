/**
 * 简历编辑器 / AI 生成页
 * 核心交互页面：创建向导 + AI生成 + 预览 + 导出
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';

// 步骤定义
interface Step {
  id: number;
  name: string;
  icon: string;
}

interface Model {
  id: string;
  name: string;
  provider: string;
  color: string;
  badge?: string;
}

interface CompanyType {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

interface Style {
  id: string;
  name: string;
  desc: string;
  color: string;
}

interface InputMethod {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

const STEPS: Step[] = [
  { id: 1, name: '输入方式', icon: '📝' },
  { id: 2, name: '选择模型', icon: '🤖' },
  { id: 3, name: '公司类型', icon: '🏢' },
  { id: 4, name: '简历风格', icon: '🎨' },
  { id: 5, name: '开始生成', icon: '🚀' },
];

const INPUT_METHODS: InputMethod[] = [
  { id: 'text', name: '文字输入', icon: '✏️', desc: '直接填写个人信息' },
  { id: 'pdf', name: '上传 PDF', icon: '📄', desc: '解析已有 PDF 简历' },
  { id: 'word', name: '上传 Word', icon: '📝', desc: '解析 Word 文档' },
  { id: 'image', name: '上传图片', icon: '🖼️', desc: 'OCR 识别图片内容' },
  { id: 'ppt', name: '上传 PPT', icon: '📊', desc: '提取 PPT 信息' },
  { id: 'voice', name: '语音录入', icon: '🎤', desc: '语音转文字输入' },
];

const MODELS: Model[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', color: 'bg-green-500', badge: '推荐' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', color: 'bg-blue-500', badge: '推荐' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', color: 'bg-purple-500' },
  { id: 'wenxin-4.0', name: '文心一言 4.0', provider: '百度', color: 'bg-orange-500' },
  { id: 'qwen-max', name: '通义千问 Max', provider: '阿里', color: 'bg-orange-500' },
  { id: 'hunyuan-pro', name: '混元 Pro', provider: '腾讯', color: 'bg-red-500', badge: '新' },
  { id: 'glm-4-plus', name: 'GLM-4 Plus', provider: '智谱', color: 'bg-red-500', badge: '新' },
  { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek', color: 'bg-teal-500', badge: '超值' },
  { id: 'MiniMax-M3', name: 'MiniMax M3', provider: 'MiniMax', color: 'bg-amber-500', badge: '新' },
  { id: 'moonshot-v1-128k', name: 'Moonshot 128K', provider: 'Moonshot', color: 'bg-indigo-500' },
  { id: 'yi-large', name: 'Yi-Large', provider: '零一万物', color: 'bg-indigo-500' },
];

const COMPANY_TYPES: CompanyType[] = [
  { id: 'internet', name: '互联网大厂', icon: '🏢', desc: '字节/阿里/腾讯/美团' },
  { id: 'foreign', name: '外企', icon: '🌍', desc: 'Google/Apple/McKinsey' },
  { id: 'soe', name: '国企/体制', icon: '🏛️', desc: '央企/国企/事业单位' },
  { id: 'startup', name: '创业公司', icon: '🚀', desc: 'A轮+/独角兽' },
  { id: 'consulting', name: '咨询/金融', icon: '📊', desc: 'MBB/四大/投行' },
];

const STYLES: Style[] = [
  { id: 'classic', name: '经典', desc: '传统商务风格', color: 'from-gray-600 to-gray-700' },
  { id: 'modern', name: '现代', desc: '简约时尚设计', color: 'from-blue-500 to-indigo-600' },
  { id: 'minimal', name: '极简', desc: 'Less is more', color: 'from-gray-400 to-gray-500' },
  { id: 'creative', name: '创意', desc: '大胆独特设计', color: 'from-pink-500 to-purple-600' },
  { id: 'academic', name: '学术', desc: '论文/项目突出', color: 'from-indigo-500 to-blue-600' },
  { id: 'executive', name: '高管', desc: '高端领导力风格', color: 'from-amber-600 to-orange-700' },
];

export default function EditorPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedInput, setSelectedInput] = useState('text');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [selectedCompany, setSelectedCompany] = useState('internet');
  const [selectedStyle, setSelectedStyle] = useState('modern');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    personal: { name: '', title: '', email: '' },
    experience: [] as { company: string; position: string; start_date: string; end_date: string; description: string; tech_stack: string[] }[],
    education: [] as { school: string; degree: string; major: string; start_date: string; end_date: string }[],
    skills: [] as string[],
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedResult(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personal: formData.personal,
          experience: formData.experience,
          education: formData.education,
          skills: formData.skills,
          target_job: (document.querySelector('input[name="targetJob"]') as HTMLInputElement)?.value || '',
          company_type: selectedCompany,
          style: selectedStyle,
          model: selectedModel,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || '生成失败');
      }
      const data = await res.json();
      setGeneratedResult(data.summary);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '网络错误，请稍后重试';
      alert('生成失败: ' + message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold gradient-text">ResumeAI</Link>
          <div className="flex items-center gap-2">
            {STEPS.map((step, i) => (
              <div key={step.id} className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    currentStep >= step.id
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}
                >
                  <span>{step.icon}</span>
                  <span className="hidden md:inline">{step.name}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`w-6 h-0.5 ${currentStep > step.id ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Step 1: 输入方式 */}
        {currentStep === 1 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-2">选择输入方式</h2>
            <p className="text-gray-500 mb-8">你可以直接输入信息，也可以上传已有简历让 AI 解析</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {INPUT_METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedInput(m.id)}
                  className={`card p-6 text-left transition-all ${
                    selectedInput === m.id ? 'ring-2 ring-brand-500 border-brand-500' : ''
                  }`}
                >
                  <div className="text-3xl mb-3">{m.icon}</div>
                  <h3 className="font-semibold">{m.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{m.desc}</p>
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-end">
              <button onClick={() => setCurrentStep(2)} className="btn-primary">下一步 →</button>
            </div>
          </div>
        )}

        {/* Step 2: AI 模型选择 */}
        {currentStep === 2 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-2">选择 AI 模型</h2>
            <p className="text-gray-500 mb-8">通过 Hermes 统一适配层，无缝切换不同模型</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`card p-4 text-center transition-all ${
                    selectedModel === m.id ? 'ring-2 ring-brand-500 border-brand-500' : ''
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full ${m.color} mx-auto mb-2 block`} />
                  <div className="font-medium text-sm">{m.name}</div>
                  <div className="text-xs text-gray-500">{m.provider}</div>
                  {m.badge && (
                    <span className="mt-2 inline-block text-xs px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600">
                      {m.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <button onClick={() => setCurrentStep(1)} className="btn-secondary">← 上一步</button>
              <button onClick={() => setCurrentStep(3)} className="btn-primary">下一步 →</button>
            </div>
          </div>
        )}

        {/* Step 3: 公司类型 */}
        {currentStep === 3 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-2">选择目标公司类型</h2>
            <p className="text-gray-500 mb-8">OpenClaw 编排链将根据公司类型调整生成策略</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {COMPANY_TYPES.map((ct) => (
                <button
                  key={ct.id}
                  onClick={() => setSelectedCompany(ct.id)}
                  className={`card p-6 text-center transition-all ${
                    selectedCompany === ct.id ? 'ring-2 ring-brand-500 border-brand-500' : ''
                  }`}
                >
                  <div className="text-4xl mb-3">{ct.icon}</div>
                  <h3 className="font-semibold text-sm">{ct.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{ct.desc}</p>
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <button onClick={() => setCurrentStep(2)} className="btn-secondary">← 上一步</button>
              <button onClick={() => setCurrentStep(4)} className="btn-primary">下一步 →</button>
            </div>
          </div>
        )}

        {/* Step 4: 简历风格 */}
        {currentStep === 4 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-2">选择简历风格</h2>
            <p className="text-gray-500 mb-8">不同风格适合不同行业和职位</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStyle(s.id)}
                  className={`card overflow-hidden text-left transition-all ${
                    selectedStyle === s.id ? 'ring-2 ring-brand-500 border-brand-500' : ''
                  }`}
                >
                  <div className={`h-32 bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                    <div className="w-20 h-28 bg-white/20 backdrop-blur rounded shadow-lg p-2">
                      <div className="h-2 bg-white/50 rounded w-2/3 mb-1.5" />
                      <div className="h-1 bg-white/30 rounded w-full mb-1" />
                      <div className="h-1 bg-white/30 rounded w-4/5" />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold">{s.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <button onClick={() => setCurrentStep(3)} className="btn-secondary">← 上一步</button>
              <button onClick={() => setCurrentStep(5)} className="btn-primary">下一步 →</button>
            </div>
          </div>
        )}

        {/* Step 5: 确认 & 生成 */}
        {currentStep === 5 && (
          <div className="animate-fade-in max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">确认生成配置</h2>
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">输入方式</span>
                <span className="font-medium">{INPUT_METHODS.find(m => m.id === selectedInput)?.name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">AI 模型</span>
                <span className="font-medium">{MODELS.find(m => m.id === selectedModel)?.name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">目标公司</span>
                <span className="font-medium">{COMPANY_TYPES.find(c => c.id === selectedCompany)?.name}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-500">简历风格</span>
                <span className="font-medium">{STYLES.find(s => s.id === selectedStyle)?.name}</span>
              </div>
            </div>

            {!isGenerating && !generatedResult ? (
              <div className="mt-8 flex justify-between">
                <button onClick={() => setCurrentStep(4)} className="btn-secondary">← 上一步</button>
                <button onClick={handleGenerate} className="btn-primary text-lg px-8">
                  🚀 开始生成简历
                </button>
              </div>
            ) : isGenerating ? (
              <div className="mt-12 text-center">
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-brand-50 dark:bg-brand-900/30">
                  <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-brand-600 font-medium">AI 正在生成你的简历...</span>
                </div>
                <p className="mt-4 text-sm text-gray-500">预计 10-30 秒，请稍候</p>
              </div>
            ) : (
              <div className="mt-8">
                <div className="card p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">✅</span>
                    <h3 className="font-bold text-lg">简历生成成功！</h3>
                  </div>
                  <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
                    {generatedResult}
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button className="btn-primary" onClick={() => setGeneratedResult(null)}>重新生成</button>
                  <Link href="/export" className="btn-secondary">导出简历</Link>
                  <Link href="/dashboard" className="btn-secondary">查看全部</Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
