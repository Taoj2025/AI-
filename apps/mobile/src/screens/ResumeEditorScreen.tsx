/**
 * ResumeEditorScreen — 简历编辑器
 * 支持拖拽排序、实时预览、AI优化建议
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Switch, Modal, Dimensions,
} from 'react-native';
import { styles } from './ResumeEditorScreen.styles';

const { width } = Dimensions.get('window');

interface ResumeSection {
  id: string;
  type: 'personal' | 'summary' | 'work' | 'education' | 'skills' | 'projects' | 'certificates';
  title: string;
  icon: string;
  expanded: boolean;
  data: any;
}

export default function ResumeEditorScreen({ route, navigation }: any) {
  const { resumeId } = route?.params || {};
  const [sections, setSections] = useState<ResumeSection[]>([
    { id: '1', type: 'personal', title: '个人信息', icon: '👤', expanded: true, data: { name: '', title: '', email: '', phone: '', location: '' } },
    { id: '2', type: 'summary', title: '个人总结', icon: '📝', expanded: false, data: { content: '' } },
    { id: '3', type: 'work', title: '工作经历', icon: '💼', expanded: false, data: [] },
    { id: '4', type: 'education', title: '教育背景', icon: '🎓', expanded: false, data: [] },
    { id: '5', type: 'skills', title: '专业技能', icon: '⚡', expanded: false, data: [] },
    { id: '6', type: 'projects', title: '项目经历', icon: '🚀', expanded: false, data: [] },
    { id: '7', type: 'certificates', title: '证书荣誉', icon: '🏆', expanded: false, data: [] },
  ]);
  const [isPreview, setIsPreview] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, expanded: !s.expanded } : s));
  };

  const updatePersonalField = (field: string, value: string) => {
    setSections(prev => prev.map(s =>
      s.type === 'personal' ? { ...s, data: { ...s.data, [field]: value } } : s
    ));
  };

  const handleAIOptimize = () => {
    setAiSuggestion('💡 AI 建议：\n\n1. 个人总结可以加入具体数据（如"提升转化率30%"）\n2. 技能描述建议按熟练度排序\n3. 工作经历每段建议控制在3-5条成果');
  };

  const renderSection = (section: ResumeSection) => (
    <View key={section.id} style={styles.sectionCard}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection(section.id)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionIcon}>{section.icon}</Text>
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
        <Text style={styles.sectionArrow}>{section.expanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {section.expanded && (
        <View style={styles.sectionContent}>
          {section.type === 'personal' && (
            <View>
              {[
                { key: 'name', label: '姓名', placeholder: '张三' },
                { key: 'title', label: '职位', placeholder: '高级前端工程师' },
                { key: 'email', label: '邮箱', placeholder: 'example@email.com' },
                { key: 'phone', label: '手机', placeholder: '13812345678' },
                { key: 'location', label: '城市', placeholder: '北京' },
              ].map(field => (
                <View key={field.key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder={field.placeholder}
                    value={section.data[field.key]}
                    onChangeText={(v) => updatePersonalField(field.key, v)}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              ))}
            </View>
          )}

          {section.type === 'summary' && (
            <TextInput
              style={[styles.fieldInput, styles.textArea]}
              placeholder="简要描述你的职业背景和核心优势..."
              multiline
              numberOfLines={5}
              placeholderTextColor="#9CA3AF"
            />
          )}

          {(section.type === 'work' || section.type === 'education') && (
            <View style={styles.emptySection}>
              <Text style={styles.emptyIcon}>{section.type === 'work' ? '💼' : '🎓'}</Text>
              <Text style={styles.emptyText}>
                {section.type === 'work' ? '添加你的工作经历' : '添加你的教育背景'}
              </Text>
              <TouchableOpacity style={styles.addButton}>
                <Text style={styles.addButtonText}>+ 添加</Text>
              </TouchableOpacity>
            </View>
          )}

          {['skills', 'projects', 'certificates'].includes(section.type) && (
            <View style={styles.emptySection}>
              <Text style={styles.emptyIcon}>
                {section.type === 'skills' ? '⚡' : section.type === 'projects' ? '🚀' : '🏆'}
              </Text>
              <TouchableOpacity style={styles.addButton}>
                <Text style={styles.addButtonText}>+ 添加</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 顶部工具栏 */}
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Text style={styles.toolbarBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.toolbarTitle}>编辑简历</Text>
        <View style={styles.toolbarActions}>
          <TouchableOpacity onPress={handleAIOptimize} style={styles.aiBtn}>
            <Text style={styles.aiBtnText}>🤖 AI优化</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsPreview(!isPreview)}>
            <Text style={styles.toolbarBtn}>👁</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* AI建议浮层 */}
      {aiSuggestion && (
        <View style={styles.aiSuggestionCard}>
          <Text style={styles.aiSuggestionText}>{aiSuggestion}</Text>
          <TouchableOpacity onPress={() => setAiSuggestion(null)}>
            <Text style={styles.aiSuggestionClose}>关闭</Text>
          </TouchableOpacity>
        </View>
      )}

      {isPreview ? (
        // 预览模式
        <ScrollView style={styles.previewContainer}>
          <View style={styles.previewCard}>
            <Text style={styles.previewName}>{sections[0]?.data?.name || '你的名字'}</Text>
            <Text style={styles.previewTitle}>{sections[0]?.data?.title || '你的职位'}</Text>
            <Text style={styles.previewContact}>
              {[sections[0]?.data?.email, sections[0]?.data?.phone, sections[0]?.data?.location].filter(Boolean).join(' | ')}
            </Text>
            <View style={styles.previewDivider} />
            <Text style={styles.previewSectionTitle}>个人总结</Text>
            <Text style={styles.previewBodyText}>在这里展示你的个人总结...</Text>
            <Text style={[styles.previewSectionTitle, { marginTop: 16 }]}>工作经历</Text>
            <Text style={styles.previewBodyText}>添加你的工作经历后，AI 会帮你优化表达...</Text>
          </View>
          <TouchableOpacity onPress={() => setShowExport(true)} style={styles.exportButton}>
            <Text style={styles.exportButtonText}>📤 导出简历</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        // 编辑模式
        <ScrollView style={styles.editorContainer}>
          {sections.map(renderSection)}
          <TouchableOpacity style={styles.addSectionButton}>
            <Text style={styles.addSectionText}>+ 添加更多模块</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowExport(true)} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>💾 保存并导出</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* 导出弹窗 */}
      <Modal visible={showExport} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>导出简历</Text>
            <Text style={styles.modalSubtitle}>选择导出格式</Text>
            {[
              { format: 'PDF', icon: '📄', desc: '通用格式，适合打印和邮件' },
              { format: 'Word', icon: '📝', desc: '可编辑，适合进一步修改' },
              { format: 'PPT', icon: '📊', desc: '演示文稿，适合展示' },
              { format: '图片', icon: '🖼️', desc: '高清图片，适合社交分享' },
              { format: 'HTML', icon: '🌐', desc: '网页格式，适合在线查看' },
              { format: 'Markdown', icon: '📋', desc: '纯文本，适合版本控制' },
            ].map(f => (
              <TouchableOpacity key={f.format} style={styles.exportOption}>
                <Text style={styles.exportOptionIcon}>{f.icon}</Text>
                <View style={styles.exportOptionInfo}>
                  <Text style={styles.exportOptionTitle}>{f.format}</Text>
                  <Text style={styles.exportOptionDesc}>{f.desc}</Text>
                </View>
                <Text style={styles.exportOptionArrow}>›</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowExport(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
