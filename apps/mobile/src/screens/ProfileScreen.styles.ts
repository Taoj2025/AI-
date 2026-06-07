import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7', paddingTop: 16 },

  // 用户卡片
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', margin: 16, padding: 20,
    borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
  },
  avatarPlaceholder: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center',
  },
  profileInfo: { marginLeft: 16, flex: 1 },
  userName: { fontSize: 18, fontWeight: '700' as any, color: '#222' },
  userEmail: { fontSize: 13, color: '#999', marginTop: 2 },
  subscriptionBadge: {
    backgroundColor: '#F0F0FF', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4, alignSelf: 'flex-start', marginTop: 6,
  },
  subscriptionText: { fontSize: 11, color: '#6366F1', fontWeight: '600' as any },

  // 统计
  statsRow: {
    flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 16,
    borderRadius: 12, padding: 16, justifyContent: 'space-around',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700' as any, color: '#222' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 2 },

  // 菜单
  menuSection: {
    backgroundColor: '#FFF', margin: 16, marginTop: 8, borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F7',
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuLabel: { fontSize: 15, color: '#333' },

  // 退出登录
  logoutBtn: {
    backgroundColor: '#FFF', margin: 16, marginTop: 8, padding: 14,
    borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#FEE2E2',
  },
  logoutText: { fontSize: 15, color: '#EF4444', fontWeight: '600' as any },

  version: { textAlign: 'center', fontSize: 12, color: '#CCC', margin: 16 },
});
