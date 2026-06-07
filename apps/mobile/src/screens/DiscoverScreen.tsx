// ============================================================
// 发现/社区页（知乎+小红书混合风格）
// ============================================================
import React from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './DiscoverScreen.styles';

const TABS = ['推荐', '模板', '攻略', '社区'];

const SAMPLE_POSTS = [
  { id: '1', type: 'hot', title: '2024年互联网校招简历避坑指南', author: '求职学长', avatar: 'https://i.pravatar.cc/100?1', likes: 1203, comments: 89, isPremium: false },
  { id: '2', type: 'template', title: '咨询公司专用简历模板（麦肯锡风格）', author: 'MBB顾问Lisa', avatar: 'https://i.pravatar.cc/100?2', likes: 892, comments: 34, isPremium: true },
  { id: '3', type: 'success', title: '双非本科如何拿到字节跳动offer？', author: '逆袭小王子', avatar: 'https://i.pravatar.cc/100?3', likes: 3402, comments: 156, isPremium: false },
  { id: '4', type: 'article', title: 'ATS系统到底是什么？如何让简历通过机器筛选', author: 'HR总监老王', avatar: 'https://i.pravatar.cc/100?4', likes: 2103, comments: 67, isPremium: false },
];

export default function DiscoverScreen() {
  const [activeTab, setActiveTab] = React.useState(0);

  const renderPost = ({ item }: any) => (
    <TouchableOpacity style={styles.postCard}>
      {/* 作者信息 */}
      <View style={styles.postHeader}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{item.author}</Text>
          <Text style={styles.postTime}>2小时前</Text>
        </View>
        {item.isPremium && <View style={styles.premiumBadge}><Text style={styles.premiumText}>PRO</Text></View>}
      </View>
      {/* 内容 */}
      <Text style={styles.postTitle}>{item.title}</Text>
      {/* 图片（部分帖子有）*/}
      {item.type === 'template' && (
        <Image source={{ uri: `https://picsum.photos/400/220?random=${item.id}` }} style={styles.postImage} />
      )}
      {/* 互动栏 */}
      <View style={styles.postActions}>
        <View style={styles.actionItem}><Ionicons name="heart-outline" size={18} color="#666" /><Text style={styles.actionCount}>{item.likes}</Text></View>
        <View style={styles.actionItem}><Ionicons name="chatbubble-outline" size={18} color="#666" /><Text style={styles.actionCount}>{item.comments}</Text></View>
        <View style={styles.actionItem}><Ionicons name="share-outline" size={18} color="#666" /></View>
        <View style={styles.actionItem}><Ionicons name="bookmark-outline" size={18} color="#666" /></View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 顶部 Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab, i) => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === i && styles.tabActive]} onPress={() => setActiveTab(i)}>
            <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={SAMPLE_POSTS}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
