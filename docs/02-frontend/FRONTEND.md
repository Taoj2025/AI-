# 前端开发规范文档

**模块**: 02-frontend  
**版本**: v1.0.0  
**状态**: 规划中

---

## 1. 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React Native | 0.74 | 移动端核心框架 |
| Expo | SDK 51 | 开发工具链、OTA 更新 |
| Next.js | 14 | Web 前端框架 |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 3.x | Web 端样式 |
| NativeWind | 4.x | RN 端 Tailwind 支持 |
| shadcn/ui | latest | Web 组件库 |
| React Query | 5.x | 服务端状态管理 |
| Zustand | 4.x | 客户端状态管理 |
| React Hook Form | 7.x | 表单管理 |
| Zod | 3.x | Schema 验证 |
| Framer Motion | 11.x | Web 端动画 |
| React Native Reanimated | 3.x | RN 端动画 |

---

## 2. 项目目录结构

### 2.1 Monorepo 结构

```
resumeai/
├── apps/
│   ├── mobile/          # React Native App
│   ├── web/             # Next.js Web App
│   └── admin/           # 管理后台
├── packages/
│   ├── ui/              # 共享 UI 组件库
│   ├── api-client/      # API 客户端 SDK
│   ├── types/           # 共享 TypeScript 类型
│   ├── resume-engine/   # 简历数据处理逻辑
│   └── utils/           # 工具函数
├── services/            # 后端微服务
├── docs/                # 项目文档
├── package.json         # pnpm workspace 根配置
└── turbo.json           # Turborepo 构建配置
```

### 2.2 移动端目录结构

```
apps/mobile/
├── src/
│   ├── app/             # Expo Router 页面
│   │   ├── (auth)/      # 认证相关页面
│   │   ├── (tabs)/      # 主导航页面
│   │   │   ├── index.tsx        # 首页（发现/社区）
│   │   │   ├── create.tsx       # 创建简历
│   │   │   ├── templates.tsx    # 模板市场
│   │   │   └── profile.tsx      # 个人中心
│   │   └── resume/      # 简历详情/编辑
│   ├── components/      # 可复用组件
│   │   ├── ui/          # 基础 UI 组件
│   │   ├── resume/      # 简历相关组件
│   │   ├── template/    # 模板相关组件
│   │   └── common/      # 公共组件
│   ├── screens/         # 页面级组件
│   ├── stores/          # Zustand 状态
│   ├── hooks/           # 自定义 Hooks
│   ├── services/        # API 调用
│   ├── utils/           # 工具函数
│   └── constants/       # 常量配置
├── assets/              # 静态资源
└── app.json             # Expo 配置
```

---

## 3. UI 设计规范（小红书 + 知乎风格融合）

### 3.1 设计语言

**核心理念**: 内容优先、清晰易读、社区感强

借鉴要素：
- **小红书**: 卡片式布局、圆角设计、暖色调、图片优先
- **知乎**: 内容可读性强、专业感、信息层次清晰

### 3.2 色彩系统

```typescript
// design-tokens/colors.ts
export const colors = {
  // 主色调 - 专业蓝
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    400: '#60A5FA',
    500: '#3B82F6',  // 主色
    600: '#2563EB',
    900: '#1E3A8A',
  },
  // 辅助色 - 活力橙（小红书感）
  accent: {
    50: '#FFF7ED',
    400: '#FB923C',
    500: '#F97316',  // 辅助色
    600: '#EA580C',
  },
  // 中性色
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    400: '#9CA3AF',
    600: '#4B5563',
    900: '#111827',
  },
  // 功能色
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
};
```

### 3.3 字体规范

```typescript
// 移动端
export const typography = {
  fontFamily: {
    sans: ['PingFang SC', 'Noto Sans SC', 'system-ui'],
    mono: ['SF Mono', 'Fira Code', 'monospace'],
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.6,
    relaxed: 1.8,
  },
};
```

### 3.4 间距系统

```
spacing: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
border-radius: 4, 8, 12, 16, 24, full
```

### 3.5 组件规范

#### 卡片组件
- 圆角: 12-16px
- 阴影: 轻柔投影（shadow-sm）
- 间距: padding 16px
- 背景: 纯白 #FFFFFF

#### 按钮组件
- 主按钮: 渐变蓝（Primary）
- 次按钮: 描边/文字按钮
- 大小: lg(48px) / md(40px) / sm(32px)
- 圆角: 8-24px（可选胶囊形）

---

## 4. 核心页面设计

### 4.1 首页（社区发现）

```
布局: 顶部搜索栏 + 分类标签 + 瀑布流简历卡片
功能:
  - 探索优质简历样例（脱敏展示）
  - 按行业/岗位/风格筛选
  - 点赞/收藏/分享
  - 「用这个模板」一键创建
```

### 4.2 简历创建流程（向导式）

```
Step 1: 选择输入方式
  ├── 全新填写
  ├── 上传旧简历（PDF/Word/图片/PPT）
  ├── 导入 LinkedIn/GitHub
  └── 语音录入

Step 2: 完善个人信息
  ├── 基本信息
  ├── 工作经历
  ├── 教育背景
  ├── 技能特长
  └── 项目经验

Step 3: 目标设置
  ├── 目标岗位 JD 粘贴
  ├── 目标公司类型选择
  └── 简历侧重点选择

Step 4: AI 生成
  ├── 选择 AI 模型
  ├── 流式生成展示（打字机效果）
  └── 生成多个版本预览

Step 5: 选择风格模板
  ├── 浏览模板市场
  └── 预览效果

Step 6: 编辑与微调
  ├── 可视化编辑器
  └── 实时预览

Step 7: 导出
  └── 选择格式导出
```

### 4.3 简历编辑器

```
布局: 左侧面板（编辑区）+ 右侧预览（实时渲染）
功能:
  - 模块拖拽排序
  - 富文本编辑
  - AI 辅助写作（单模块重写/润色）
  - 撤销/重做历史
  - 实时字数统计
  - 关键词高亮（匹配JD）
```

### 4.4 模板市场

```
分类:
  - 极简风 (Minimal)
  - 商务风 (Business)
  - 创意风 (Creative)
  - 技术风 (Technical)
  - 学术风 (Academic)
  - 海外风 (International)

标签系统:
  - 行业标签（互联网/金融/设计/教育...）
  - 公司类型（大厂/外企/国企/创业）
  - 经验等级（应届/1-3年/3-5年/资深）
```

---

## 5. 状态管理设计

```typescript
// stores/resumeStore.ts
interface ResumeStore {
  // 当前编辑的简历
  currentResume: Resume | null;
  // 简历列表
  resumes: Resume[];
  // 生成状态
  generationStatus: 'idle' | 'generating' | 'completed' | 'failed';
  // 生成进度（0-100）
  generationProgress: number;
  // Actions
  createResume: () => void;
  updateResume: (id: string, data: Partial<Resume>) => void;
  generateWithAI: (params: AIGenerationParams) => Promise<void>;
  exportResume: (id: string, format: ExportFormat) => Promise<string>;
}
```

---

## 6. 性能优化策略

- **列表虚拟化**: 模板列表使用 FlashList（RN）/ react-virtual（Web）
- **图片懒加载**: 模板缩略图按需加载
- **离线缓存**: React Query + MMKV 持久化
- **代码分割**: Next.js 动态导入，按需加载路由
- **资源预加载**: 常用模板数据预加载

---

## 7. 无障碍设计

- 所有交互元素有 `accessibilityLabel`
- 颜色对比度满足 WCAG 2.1 AA 标准
- 支持系统字体大小调整
- 支持 VoiceOver / TalkBack

---

*关联文档: [架构设计](../01-architecture/ARCHITECTURE.md) | [测试方案](../07-testing/TESTING.md)*
