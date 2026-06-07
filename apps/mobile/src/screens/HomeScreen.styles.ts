import { StyleSheet, View, Text, TouchableOpacity, TextInput } from 'react-native';

// 主容器
export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // 搜索栏
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    margin: 12, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#FFF', borderRadius: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
  },
  searchPlaceholder: { marginLeft: 8, color: '#999', fontSize: 14 },

  // 卡片（双列瀑布流）
  list: { paddingHorizontal: 8, paddingBottom: 20 },
  row: { justifyContent: 'space-between' },
  card: {
    width: '48%', backgroundColor: '#FFF', borderRadius: 12,
    marginBottom: 12, overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
  },
  cardImage: { width: '100%', height: 180, resizeMode: 'cover' },
  cardBody: { padding: 10 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#222', lineHeight: 20, minHeight: 40 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  cardAuthor: { fontSize: 12, color: '#666' },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  likeCount: { fontSize: 12, color: '#999' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tag: { backgroundColor: '#F0F0FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 10, color: '#6366F1' },

  // 表单
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#222', backgroundColor: '#FAFAFA',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },

  // 按钮
  btnPrimary: {
    backgroundColor: '#6366F1', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  btnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  btnSecondary: {
    backgroundColor: '#F0F0FF', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  btnSecondaryText: { color: '#6366F1', fontSize: 16, fontWeight: '600' },

  // 标题
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#222', marginBottom: 16 },
  subTitle: { fontSize: 15, color: '#666', marginBottom: 20, lineHeight: 22 },
});
