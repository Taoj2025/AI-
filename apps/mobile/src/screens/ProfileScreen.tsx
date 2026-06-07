// ============================================================
// 个人中心
// ============================================================
import React from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { useAuthStore } from '../store';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './ProfileScreen.styles';

const MENU_ITEMS = [
  { icon: 'person-outline', label: '编辑资料', route: 'EditProfile' },
  { icon: 'card-outline', label: '订阅管理', route: 'Subscription' },
  { icon: 'download-outline', label: '导出记录', route: 'ExportHistory' },
  { icon: 'help-circle-outline', label: '帮助与反馈', route: 'Help' },
  { icon: 'information-circle-outline', label: '关于 ResumeAI', route: 'About' },
];

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuthStore();
  const [notifications, setNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);

  const subscriptionLabels: Record<string, string> = {
    free: '免费版', basic: '基础版 (¥29/月)', pro: '专业版 (¥79/月)', enterprise: '企业版',
  };

  return (
    <View style={styles.container}>
      {/* 用户信息卡片 */}
      <View style={styles.profileCard}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={36} color="#FFF" />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{user?.name ?? '未登录'}</Text>
          <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
          <View style={styles.subscriptionBadge}>
            <Text style={styles.subscriptionText}>
              {subscriptionLabels[user?.subscription ?? 'free']}
            </Text>
          </View>
        </View>
      </View>

      {/* 快速统计 */}
      <View style={styles.statsRow}>
        {[
          { label: '简历', value: '3' },
          { label: '导出', value: '12' },
          { label: 'AI生成', value: '8' },
        ].map(s => (
          <View key={s.label} style={styles.statItem}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* 设置项 */}
      <View style={styles.menuSection}>
        {MENU_ITEMS.map(item => (
          <TouchableOpacity
            key={item.route}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.route)}
          >
            <View style={styles.menuLeft}>
              <Ionicons name={item.icon as any} size={20} color="#6366F1" />
              <Text style={styles.menuLabel}>{item.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#CCC" />
          </TouchableOpacity>
        ))}
      </View>

      {/* 开关设置 */}
      <View style={styles.menuSection}>
        <View style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="notifications-outline" size={20} color="#6366F1" />
            <Text style={styles.menuLabel}>推送通知</Text>
          </View>
          <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: '#6366F1' }} />
        </View>
        <View style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="moon-outline" size={20} color="#6366F1" />
            <Text style={styles.menuLabel}>深色模式</Text>
          </View>
          <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ true: '#6366F1' }} />
        </View>
      </View>

      {/* 退出登录 */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>退出登录</Text>
      </TouchableOpacity>

      <Text style={styles.version}>ResumeAI v1.0.0</Text>
    </View>
  );
}
