# 安全合规设计文档

**模块**: 09-security  
**版本**: v1.0.0  
**状态**: 规划中

---

## 1. 安全设计原则

ResumeAI 作为处理用户个人隐私数据的商业平台，严格遵守：

- **中华人民共和国个人信息保护法（PIPL）**
- **中华人民共和国网络安全法**
- **中华人民共和国数据安全法**
- **GDPR**（针对海外用户）
- **ISO/IEC 27001** 信息安全管理标准参考

---

## 2. 认证与鉴权

### 2.1 JWT 安全策略

```typescript
// JWT 配置
const JWT_CONFIG = {
  algorithm: 'RS256',            // 使用非对称加密（不用 HS256）
  accessTokenTTL: '1h',          // 访问令牌 1 小时有效
  refreshTokenTTL: '7d',         // 刷新令牌 7 天有效
  issuer: 'resumeai.app',
  audience: 'resumeai-users',
};

// 密钥管理
// - 使用 RSA 2048 位密钥对
// - 定期轮换（每 90 天）
// - 私钥存储在 AWS Secrets Manager / 腾讯云密钥管理
// - 公钥可通过 /.well-known/jwks.json 获取（标准 JWKS 端点）
```

### 2.2 密码安全

```typescript
// 密码存储（bcrypt，cost factor 12）
const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

// 密码强度要求
const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,  // 不强制，降低摩擦
  maxFailedAttempts: 5,        // 5次失败锁定 15 分钟
};
```

### 2.3 OAuth 2.0 安全

- 使用 PKCE（Proof Key for Code Exchange）防止授权码拦截
- State 参数防 CSRF 攻击
- 回调 URL 白名单严格限制

---

## 3. 数据安全

### 3.1 传输安全

- 所有 HTTP 请求强制 HTTPS（HSTS 头，max-age 1年）
- TLS 1.2+ 只允许强密码套件
- WebSocket 使用 WSS

### 3.2 存储安全

```python
# 敏感数据加密存储
class SensitiveDataEncryption:
    """AES-256-GCM 加密用户敏感数据"""
    
    # 加密的字段:
    ENCRYPTED_FIELDS = [
        "users.phone",               # 手机号
        "users.api_keys",            # 用户自定义 API Key
        "oauth_accounts.access_token",
        "oauth_accounts.refresh_token",
    ]
    
    # 加密密钥存储: 腾讯云 KMS / AWS KMS
    # 使用信封加密（DEK + KEK 两层密钥）
```

### 3.3 个人信息最小化原则

- 只收集简历生成必须的信息
- 头像/手机号等可选信息不强制填写
- 支持用户完整删除所有数据（GDPR 遗忘权）
- 日志中自动脱敏姓名、手机号、邮箱

```python
# 日志脱敏规则
SENSITIVE_PATTERNS = {
    r'\d{11}': '***手机号***',          # 11位手机号
    r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}': '***邮箱***',
    r'\d{18}': '***身份证***',           # 18位身份证
}
```

---

## 4. API 安全

### 4.1 输入校验

```typescript
// 所有 API 输入通过 Zod Schema 校验
const CreateResumeSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  targetCompanyType: z.enum(['internet_giant', 'foreign_company', 'state_owned', 'startup', 'consulting']),
  jobDescription: z.string().max(5000).optional(),
});

// SQL 注入: 使用 ORM（Prisma），不拼接 SQL
// XSS: 所有用户输入进行 HTML 转义
// SSRF: 文件上传/URL 解析时校验目标地址白名单
```

### 4.2 速率限制

```typescript
const RATE_LIMITS = {
  // 全局
  global: { windowMs: 60000, max: 100 },
  
  // 认证接口（防暴力破解）
  auth: { windowMs: 60000, max: 5 },
  
  // AI 生成（按会员等级）
  ai_free: { windowMs: 86400000, max: 3 },    // 免费：3次/天
  ai_basic: { windowMs: 86400000, max: 20 },   // Basic：20次/天
  ai_pro: { windowMs: 86400000, max: 9999 },   // Pro：无限
  
  // 文件上传
  upload: { windowMs: 3600000, max: 20 },
};
```

### 4.3 CORS 配置

```typescript
const corsOptions = {
  origin: [
    'https://resumeai.app',
    'https://www.resumeai.app',
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
```

---

## 5. 内容安全

### 5.1 用户上传文件安全

```python
# 文件上传安全检查
class FileSecurityChecker:
    
    ALLOWED_MIME_TYPES = {
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'image/webp',
        'text/plain',
    }
    
    MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
    
    def check(self, file: UploadFile) -> SecurityCheckResult:
        # 1. 文件大小检查
        if file.size > self.MAX_FILE_SIZE:
            raise FileTooLargeError()
        
        # 2. MIME 类型检查（不依赖文件扩展名，用 magic bytes）
        mime = magic.from_buffer(file.read(2048), mime=True)
        if mime not in self.ALLOWED_MIME_TYPES:
            raise InvalidFileTypeError()
        
        # 3. 病毒扫描（ClamAV，生产环境）
        if ENABLE_ANTIVIRUS:
            scan_result = clamav_scan(file.path)
            if scan_result.is_infected:
                raise InfectedFileError()
        
        return SecurityCheckResult(is_safe=True)
```

### 5.2 AI 内容安全审核

```python
# 输入/输出内容安全检查
class ContentModerator:
    
    async def check_input(self, text: str) -> ModerationResult:
        """检查用户输入是否包含违规内容"""
        # 使用 OpenAI Moderation API 或腾讯云内容安全
        result = await openai.moderations.create(input=text)
        
        if result.results[0].flagged:
            categories = result.results[0].categories
            raise ContentViolationError(categories=categories)
    
    async def check_output(self, resume_content: str) -> ModerationResult:
        """检查 AI 生成内容是否合规"""
        # 防止 AI 幻觉生成虚假学历/工作经历等
        # 简单规则检查 + AI 审核
        pass
```

---

## 6. 用户隐私权利

按照 PIPL 和 GDPR 要求，用户享有：

| 权利 | 实现方式 |
|------|---------|
| 知情权 | 清晰隐私政策，首次使用弹窗告知 |
| 访问权 | 账号设置页下载个人数据包（JSON）|
| 更正权 | 直接编辑个人信息 |
| 删除权 | 账号注销功能，30天内彻底删除 |
| 可携带权 | 数据导出功能（简历 JSON + 账户数据）|
| 撤回同意 | 关闭数据分析、营销推送开关 |

---

## 7. 安全审计

- 每季度进行渗透测试（第三方安全公司）
- 开发期间使用 SAST 工具（SonarQube）
- 依赖漏洞扫描（Dependabot + Snyk）
- 密钥泄漏检测（GitGuardian）
- 安全事件响应流程（24小时内通知用户）

---

## 8. 法律合规

- 用户协议、隐私政策由法律顾问审核
- ICP 备案（国内服务必须）
- 等保 2.0 二级认证（上线前完成）
- 数据跨境传输合规评估

---

*关联文档: [后端服务](../03-backend/BACKEND.md) | [数据层](../05-data/DATABASE.md) | [部署方案](../08-deployment/DEPLOYMENT.md)*
