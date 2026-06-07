import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: '#FFF',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#222' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#222', flex: 1, marginRight: 8 },
  badge: { backgroundColor: '#F0F0FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeInternet: { backgroundColor: '#FFF0F0' },
  badgeText: { fontSize: 11, color: '#6366F1' },
  cardMeta: { fontSize: 12, color: '#999', marginTop: 6 },
  cardActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  actionText: { fontSize: 13, color: '#6366F1' },
  actionDanger: {},
  actionDangerText: { color: '#EF4444' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#999', marginTop: 12 },
});
