import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  tab: { paddingVertical: 12, paddingHorizontal: 16, position: 'relative' as any },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366F1' },
  tabText: { fontSize: 15, color: '#666' },
  tabTextActive: { color: '#6366F1', fontWeight: '600' as any },
  // 列表
  list: { padding: 8, paddingBottom: 20 },
  // 帖子卡片
  postCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 8 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  authorInfo: { marginLeft: 10, flex: 1 },
  authorName: { fontSize: 14, fontWeight: '600' as any, color: '#222' },
  postTime: { fontSize: 12, color: '#999', marginTop: 2 },
  premiumBadge: { backgroundColor: '#6366F1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  premiumText: { fontSize: 10, color: '#FFF', fontWeight: '700' as any },
  postTitle: { fontSize: 15, color: '#222', lineHeight: 22, marginBottom: 10 },
  postImage: { width: '100%', height: 180, borderRadius: 8, marginBottom: 10, resizeMode: 'cover' as any },
  postActions: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionCount: { fontSize: 13, color: '#666' },
});
