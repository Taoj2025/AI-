// ============================================================
// 创建简历向导 - 多步骤表单
// ============================================================
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuthStore, useResumeStore } from '../store';
import { Ionicons } from '@expo/vector-icons';
import styles, { styles as s } from './CreateScreen.styles';

const STEPS = ['输入方式', 'AI 模型', '公司类型', '风格选择', '生成'];

// 公司类型选项
const COMPANY_TYPES = [
  { value: 'internet', label: '互联网大厂', icon: 'business', desc: '字节/腾讯/阿里巴巴' },
  { value: 'foreign', label: '外企/跨国', icon: 'globe', desc: 'Google/Meta/微软' },
  { value: 'state', label: '国企/事业单位', icon: 'library', desc: '银行/央企/学校' },
  { value: 'startup', label: '创业公司', icon: 'rocket', desc: 'AI初创/独角兽' },
  { value: 'consulting', label: '咨询/金融', icon: 'briefcase', desc: 'MBB/投行/PE' },
];

// 风格选项
const STYLES = [
  { value: 'modern', label: '现代简约', color: '#6366F1' },
  { value: 'classic', label: '经典商务', color: '#1A1A2E' },
  { value: 'minimal', label: '极简清新', color: '#16A085' },
  { value: 'creative', label: '创意设计', color: '#E91E63' },
  { value: 'executive', label: '高管精英', color: '#0D47A1' },
];

export default function CreateScreen() {
  const { token } = useAuthStore();
  const { createResume } = useResumeStore();
  const [step, setStep] = useState(0);
  const [inputMode, setInputMode] = useState<string>('text');
  const [companyType, setCompanyType] = useState<string>('internet');
  const [resumeStyle, setResumeStyle] = useState<string>('modern');
  const [aiProvider, setAiProvider] = useState<string>('openai');
  const [rawText, setRawText] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // 调用后端 AI 生成接口
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { modality: inputMode, content: rawText },
          companyType,
          style: resumeStyle,
          modelPreference: { provider: aiProvider, model: getDefaultModel(aiProvider) },
        }),
      });
      const json = await res.json();
      if (json.success) {
        Alert.alert('生成成功！', '可前往「我的」查看简历');
      }
    } catch (e) {
      Alert.alert('生成失败', String(e));
    } finally {
      setGenerating(false);
    }
  };

  const getDefaultModel = (provider: string) => {
    const map: Record<string, string> = {
      openai: 'gpt-4o', anthropic: 'claude-3-5-sonnet-20241022',
      google: 'gemini-1.5-pro', baidu: 'ernie-4.0-turbo',
      ali: 'qwen-max', deepseek: 'deepseek-chat',
    };
    return map[provider] ?? 'gpt-4o';
  };

  const renderStepContent = () => {
    switch (step) {
      case 0: return (
        <View>
          <Text style={s.label}>选择信息输入方式</Text>
          {['text', 'pdf', 'docx', 'image', 'voice'].map(mode => (
            <TouchableOpacity
              key={mode}
              style={[s.input, { flexDirection: 'row', alignItems: 'center', marginBottom: 8 }]}
              onPress={() => setInputMode(mode)}
            >
              <Ionicons name={mode === 'text' ? 'create' : mode === 'pdf' ? 'document' : 'image'} size={20} color={inputMode === mode ? '#6366F1' : '#999'} />
              <Text style={{ marginLeft: 8, color: inputMode === mode ? '#6366F1' : '#333' }}>
                {mode === 'text' ? '直接输入文字' : mode === 'pdf' ? '上传 PDF' : mode === 'docx' ? '上传 Word' : mode === 'image' ? '上传图片' : '语音输入'}
              </Text>
            </TouchableOpacity>
          ))}
          {inputMode === 'text' && (
            <TextInput
              style={[s.input, s.textArea, { height: 150 }]}
              placeholder="粘贴你的经历、技能、项目描述..."
              multiline
              value={rawText}
              onChangeText={setRawText}
            />
          )}
        </View>
      );
      case 1: return (
        <View>
          <Text style={s.label}>选择 AI 模型</Text>
          {[
            { provider: 'openai', label: 'OpenAI GPT-4o', desc: '综合实力最强' },
            { provider: 'anthropic', label: 'Claude 3.5 Sonnet', desc: '长文本理解最佳' },
            { provider: 'google', label: 'Gemini 1.5 Pro', desc: '多模态能力强' },
            { provider: 'deepseek', label: 'DeepSeek Chat', desc: '中文理解优秀，性价比高' },
            { provider: 'ali', label: '通义千问 Qwen', desc: '中文简历首选' },
          ].map(opt => (
            <TouchableOpacity
              key={opt.provider}
              style={[styles.modelCard, aiProvider === opt.provider && styles.modelCardActive]}
              onPress={() => setAiProvider(opt.provider)}
            >
              <Text style={[styles.modelName, aiProvider === opt.provider && styles.modelNameActive]}>{opt.label}</Text>
              <Text style={styles.modelDesc}>{opt.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
      case 2: return (
        <View>
          <Text style={s.label}>目标公司类型</Text>
          {COMPANY_TYPES.map(ct => (
            <TouchableOpacity
              key={ct.value}
              style={[styles.companyCard, companyType === ct.value && styles.companyCardActive]}
              onPress={() => setCompanyType(ct.value)}
            >
              <Ionicons name={ct.icon as any} size={24} color={companyType === ct.value ? '#FFF' : '#6366F1'} />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.companyLabel, companyType === ct.value && styles.companyLabelActive]}>{ct.label}</Text>
                <Text style={styles.companyDesc}>{ct.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      );
      case 3: return (
        <View>
          <Text style={s.label}>简历风格</Text>
          <View style={styles.styleGrid}>
            {STYLES.map(st => (
              <TouchableOpacity
                key={st.value}
                style={[styles.styleCard, { borderColor: st.color }, resumeStyle === st.value && { backgroundColor: st.color }]}
                onPress={() => setResumeStyle(st.value)}
              >
                <Text style={[styles.styleLabel, { color: resumeStyle === st.value ? '#FFF' : st.color }]}>{st.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
      case 4: return (
        <View style={styles.reviewContainer}>
          <Ionicons name="checkmark-circle" size={64} color="#10B981" />
          <Text style={styles.reviewTitle}>确认生成</Text>
          <Text style={styles.reviewText}>AI 模型: {aiProvider}</Text>
          <Text style={styles.reviewText}>公司类型: {COMPANY_TYPES.find(c => c.value === companyType)?.label}</Text>
          <Text style={styles.reviewText}>简历风格: {STYLES.find(s => s.value === resumeStyle)?.label}</Text>
          <TouchableOpacity
            style={[s.btnPrimary, { marginTop: 24, width: '100%' }]}
            onPress={handleGenerate}
            disabled={generating}
          >
            <Text style={s.btnPrimaryText}>{generating ? 'AI 生成中...' : '🚀 开始生成简历'}</Text>
          </TouchableOpacity>
        </View>
      );
      default: return null;
    }
  };

  return (
    <View style={s.container}>
      {/* 步骤指示器 */}
      <View style={styles.stepIndicator}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.stepDot, i <= step && styles.stepDotActive]} />
        ))}
      </View>
      <Text style={styles.stepTitle}>{STEPS[step]}</Text>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {renderStepContent()}
      </ScrollView>

      {/* 底部导航 */}
      <View style={styles.bottomNav}>
        {step > 0 && (
          <TouchableOpacity style={s.btnSecondary} onPress={() => setStep(step - 1)}>
            <Text style={s.btnSecondaryText}>上一步</Text>
          </TouchableOpacity>
        )}
        {step < STEPS.length - 1 && (
          <TouchableOpacity style={s.btnPrimary} onPress={() => setStep(step + 1)}>
            <Text style={s.btnPrimaryText}>下一步</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const API_BASE = __DEV__ ? 'http://localhost:3000' : 'https://api.resumeai.com';
