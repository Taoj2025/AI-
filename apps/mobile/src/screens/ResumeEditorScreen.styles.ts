import { StyleSheet, Dimensions } from 'react-native';
const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // 顶部工具栏
  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    paddingTop: 48,
  },
  toolbarBtn: { fontSize: 20, color: '#4F46E5', padding: 4 },
  toolbarTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  toolbarActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiBtn: {
    backgroundColor: '#EEF2FF', borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  aiBtnText: { fontSize: 12, color: '#4F46E5', fontWeight: '600' },

  // AI 建议
  aiSuggestionCard: {
    margin: 16, padding: 16, borderRadius: 12,
    backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A',
  },
  aiSuggestionText: { fontSize: 13, color: '#92400E', lineHeight: 20 },
  aiSuggestionClose: { fontSize: 12, color: '#4F46E5', marginTop: 8, textAlign: 'right' },

  // 编辑器
  editorContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  // Section Card
  sectionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    marginBottom: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIcon: { fontSize: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  sectionArrow: { fontSize: 12, color: '#94A3B8' },

  // Section Content
  sectionContent: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, color: '#64748B', marginBottom: 6, fontWeight: '500' },
  fieldInput: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: '#1E293B', backgroundColor: '#F8FAFC',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },

  // 空状态
  emptySection: { alignItems: 'center', paddingVertical: 24 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#94A3B8', marginBottom: 12 },
  addButton: {
    backgroundColor: '#EEF2FF', borderRadius: 20,
    paddingHorizontal: 24, paddingVertical: 8,
  },
  addButtonText: { fontSize: 13, color: '#4F46E5', fontWeight: '600' },

  // 添加模块
  addSectionButton: {
    alignItems: 'center', paddingVertical: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', borderRadius: 12,
  },
  addSectionText: { fontSize: 14, color: '#94A3B8' },

  // 保存按钮
  saveButton: {
    backgroundColor: '#4F46E5', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginBottom: 32,
  },
  saveButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },

  // 预览模式
  previewContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  previewCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
    elevation: 4,
  },
  previewName: { fontSize: 24, fontWeight: '700', color: '#1E293B', textAlign: 'center' },
  previewTitle: { fontSize: 15, color: '#4F46E5', textAlign: 'center', marginTop: 4 },
  previewContact: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 8 },
  previewDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 16 },
  previewSectionTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  previewBodyText: { fontSize: 13, color: '#64748B', marginTop: 8, lineHeight: 20 },

  // 导出按钮
  exportButton: {
    backgroundColor: '#4F46E5', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 20, marginBottom: 32,
  },
  exportButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  exportOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  exportOptionIcon: { fontSize: 24, marginRight: 14 },
  exportOptionInfo: { flex: 1 },
  exportOptionTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  exportOptionDesc: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  exportOptionArrow: { fontSize: 20, color: '#CBD5E1' },
  modalClose: {
    alignItems: 'center', paddingVertical: 16, marginTop: 8,
  },
  modalCloseText: { fontSize: 15, color: '#94A3B8' },
});
