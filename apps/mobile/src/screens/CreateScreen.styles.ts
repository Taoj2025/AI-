import { StyleSheet, TextStyle, ViewStyle } from 'react-native';

export const colors = {
  primary: '#6366F1',
  primaryLight: '#F0F0FF',
  success: '#10B981',
  bg: '#F5F5F7',
  text: '#222',
  textSecondary: '#666',
  border: '#E0E0E0',
};

export const styles = StyleSheet.create({
  // 容器
  container: { flex: 1, backgroundColor: colors.bg as string, paddingTop: 16 },

  // 步骤指示器
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DDD' },
  stepDotActive: { backgroundColor: colors.primary as string, width: 24 },

  stepTitle: { fontSize: 22, fontWeight: '700' as TextStyle['fontWeight'], color: colors.text as string, textAlign: 'center', marginBottom: 20 },

  // 内容区
  content: { flex: 1, paddingHorizontal: 16 },

  // 标签
  label: { fontSize: 15, fontWeight: '600' as TextStyle['fontWeight'], color: colors.text as string, marginBottom: 10 },

  // 输入框
  input: {
    borderWidth: 1, borderColor: colors.border as string, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text as string,
    backgroundColor: '#FFF', marginBottom: 8,
  },

  // AI 模型卡片
  modelCard: {
    padding: 14, borderRadius: 10, backgroundColor: '#FFF', marginBottom: 8,
    borderWidth: 2, borderColor: 'transparent',
  } as ViewStyle,
  modelCardActive: { borderColor: colors.primary as string, backgroundColor: colors.primaryLight as string },
  modelName: { fontSize: 15, fontWeight: '600' as TextStyle['fontWeight'], color: colors.text as string },
  modelNameActive: { color: colors.primary as string },
  modelDesc: { fontSize: 12, color: colors.textSecondary as string, marginTop: 2 },

  // 公司类型卡片
  companyCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10,
    backgroundColor: '#FFF', marginBottom: 8, borderWidth: 2, borderColor: 'transparent',
  } as ViewStyle,
  companyCardActive: { borderColor: colors.primary as string, backgroundColor: colors.primary as string },
  companyLabel: { fontSize: 15, fontWeight: '600' as TextStyle['fontWeight'], color: colors.text as string },
  companyLabelActive: { color: '#FFF' },
  companyDesc: { fontSize: 12, color: colors.textSecondary as string, marginTop: 2 },
  companyDescActive: { color: '#FFF' },

  // 风格卡片
  styleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  styleCard: {
    width: '48%', padding: 16, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', marginBottom: 8,
  } as ViewStyle,
  styleLabel: { fontSize: 14, fontWeight: '600' as TextStyle['fontWeight'], marginTop: 4 },

  // 确认页
  reviewContainer: { alignItems: 'center', paddingVertical: 30 },
  reviewTitle: { fontSize: 20, fontWeight: '700' as TextStyle['fontWeight'], color: colors.text as string, marginTop: 16 },
  reviewText: { fontSize: 14, color: colors.textSecondary as string, marginTop: 6 },

  // 底部导航
  bottomNav: { flexDirection: 'row', padding: 16, gap: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: colors.border as string },
});
