"""
OpenClaw — 多模型编排框架
负责简历生成的完整 Prompt 工程、任务链编排、结果后处理
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Optional
from enum import Enum

from hermes import HermesAdapter, Message, MessageRole, HermesResponse


# ─────────────────────────── 公司类型 ───────────────────────────

class CompanyType(str, Enum):
    INTERNET_GIANT = "internet_giant"       # 互联网大厂
    FOREIGN_COMPANY = "foreign_company"     # 外资/跨国
    STATE_OWNED = "state_owned"             # 国企/央企
    STARTUP = "startup"                     # 创业公司
    CONSULTING = "consulting"               # 咨询/金融


class ResumeStyle(str, Enum):
    MINIMAL = "minimal"           # 极简风
    BUSINESS = "business"         # 商务风
    CREATIVE = "creative"         # 创意风
    TECHNICAL = "technical"       # 技术风
    ACADEMIC = "academic"         # 学术风
    INTERNATIONAL = "international"  # 海外风


# ─────────────────────────── 提示词库 ───────────────────────────

COMPANY_STRATEGIES = {
    CompanyType.INTERNET_GIANT: {
        "name": "互联网大厂",
        "keywords": ["数据驱动", "高并发", "微服务", "敏捷开发", "OKR", "A/B测试"],
        "style_hint": "量化所有成果（使用数字和百分比），突出技术深度，采用STAR法则叙述",
        "focus": "技术能力 > 业务影响 > 团队协作",
        "length_hint": "1-2页，内容密实",
        "tone": "专业、数据导向",
    },
    CompanyType.FOREIGN_COMPANY: {
        "name": "外资/跨国企业",
        "keywords": ["Global mindset", "Cross-functional", "Stakeholder management", "Leadership"],
        "style_hint": "简洁专业，突出国际化视野和跨文化沟通能力，使用主动语态",
        "focus": "沟通能力 > 领导力 > 专业能力",
        "length_hint": "1页（国际标准），内容精炼",
        "tone": "国际化、简洁",
    },
    CompanyType.STATE_OWNED: {
        "name": "国有企业/央企",
        "keywords": ["责任心", "合规", "稳定", "专业资质", "团队精神", "服务意识"],
        "style_hint": "规范正式，突出稳定性、专业资质证书、工龄经验，措辞严谨",
        "focus": "资质证书 > 工作年限 > 专业背景",
        "length_hint": "1-2页，结构规范",
        "tone": "正式、稳重",
    },
    CompanyType.STARTUP: {
        "name": "创业公司",
        "keywords": ["0→1", "快速学习", "全栈能力", "自驱力", "增长", "ownership"],
        "style_hint": "展现潜力、学习速度和多元经验，突出主动解决问题的案例",
        "focus": "成长潜力 > 全栈能力 > 个性亮点",
        "length_hint": "1页，简洁有力",
        "tone": "活力、务实",
    },
    CompanyType.CONSULTING: {
        "name": "咨询/金融",
        "keywords": ["问题解决", "逻辑分析", "商业洞察", "客户导向", "框架思维"],
        "style_hint": "逻辑清晰，量化商业影响，使用案例驱动叙述，麦肯锡风格",
        "focus": "教育背景 > 逻辑能力 > 行业经验",
        "length_hint": "1页（咨询行业标准）",
        "tone": "严谨、逻辑导向",
    },
}

RESUME_GENERATION_SYSTEM_PROMPT = """你是一位拥有15年经验的顶级职业规划师和简历撰写专家。
你曾帮助数千位求职者成功进入世界500强企业。

你的任务是根据用户提供的个人信息，为其撰写一份专业、针对性强的中文简历。

【输出要求】
1. 严格按照给定的JSON格式输出，不要输出任何其他内容
2. 每段工作经历都必须包含3-5条量化成果（使用具体数字）
3. 个人简介必须简洁有力（80-120字），直接说明核心价值
4. 技能部分要与目标岗位高度匹配
5. 时间格式统一使用 "YYYY.MM - YYYY.MM" 或 "YYYY.MM - 至今"

【禁止事项】
- 不得捏造任何经历、数字或资质
- 不得包含任何虚假信息
- 只能对用户提供的真实信息进行润色和优化
"""

RESUME_OUTPUT_SCHEMA = """{
  "summary": "个人简介（80-120字，突出核心价值）",
  "experience": [
    {
      "company": "公司名称",
      "position": "职位名称",
      "start_date": "YYYY.MM",
      "end_date": "YYYY.MM 或 至今",
      "achievements": [
        "量化成果描述1（动词+数字+影响）",
        "量化成果描述2",
        "量化成果描述3"
      ],
      "tech_stack": ["技术1", "技术2"]
    }
  ],
  "skills_optimized": {
    "technical": ["与岗位最相关的技术技能"],
    "soft": ["与公司文化匹配的软技能"],
    "keywords": ["ATS关键词列表"]
  }
}"""


# ─────────────────────────── 数据模型 ───────────────────────────

@dataclass
class ExperienceItem:
    company: str
    position: str
    start_date: str
    end_date: str
    description: str = ""
    achievements: list[str] = field(default_factory=list)
    tech_stack: list[str] = field(default_factory=list)


@dataclass
class PersonalInfo:
    name: str
    email: str
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    github: str = ""
    portfolio: str = ""


@dataclass
class ResumeInput:
    """简历生成的输入数据"""
    personal: PersonalInfo
    experience: list[ExperienceItem]
    education: list[dict]
    skills: list[str]
    target_job: str
    company_type: CompanyType
    job_description: str = ""
    style: ResumeStyle = ResumeStyle.BUSINESS
    language: str = "zh"  # zh / en


@dataclass
class GenerationResult:
    """AI 生成结果"""
    summary: str
    experience_enhanced: list[dict]
    skills_optimized: dict
    keywords: list[str]
    raw_response: str
    model_used: str
    is_fallback: bool = False
    cost_usd: float = 0.0
    latency_ms: float = 0.0


# ─────────────────────────── OpenClaw 核心 ───────────────────────────

class OpenClawResumeChain:
    """
    简历生成编排链

    使用示例:
        chain = OpenClawResumeChain(hermes=hermes_instance)
        result = await chain.generate(resume_input, model="gpt-4o")
    """

    def __init__(self, hermes: HermesAdapter):
        self.hermes = hermes

    def _build_user_prompt(self, resume_input: ResumeInput) -> str:
        """构建用户侧提示词"""
        strategy = COMPANY_STRATEGIES[resume_input.company_type]

        experience_text = "\n".join([
            f"- {exp.position} @ {exp.company} ({exp.start_date} - {exp.end_date})\n"
            f"  描述: {exp.description}\n"
            f"  技术栈: {', '.join(exp.tech_stack)}"
            for exp in resume_input.experience
        ])

        prompt = f"""请为以下求职者优化并生成简历内容。

【目标公司类型】{strategy['name']}
【公司策略要求】{strategy['style_hint']}
【侧重点】{strategy['focus']}
【简历长度要求】{strategy['length_hint']}
【语气风格】{strategy['tone']}
【重点关键词】{', '.join(strategy['keywords'])}

【目标职位】{resume_input.target_job}

【工作经历原始信息】
{experience_text}

【现有技能】{', '.join(resume_input.skills)}

【目标岗位JD（如有）】
{resume_input.job_description or "（未提供，请根据目标职位和公司类型推断）"}

请严格按照以下JSON格式输出优化后的简历内容：
{RESUME_OUTPUT_SCHEMA}
"""
        return prompt

    def _parse_generation_result(
        self, raw: str, response: HermesResponse
    ) -> GenerationResult:
        """解析 AI 生成结果"""
        # 尝试从 markdown 代码块中提取 JSON
        content = raw.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            # 降级处理：返回原始内容
            data = {
                "summary": raw[:300],
                "experience": [],
                "skills_optimized": {"technical": [], "soft": [], "keywords": []},
            }

        return GenerationResult(
            summary=data.get("summary", ""),
            experience_enhanced=data.get("experience", []),
            skills_optimized=data.get("skills_optimized", {}),
            keywords=data.get("skills_optimized", {}).get("keywords", []),
            raw_response=raw,
            model_used=response.model,
            is_fallback=response.is_fallback,
            cost_usd=response.cost_usd,
            latency_ms=response.latency_ms,
        )

    async def generate(
        self,
        resume_input: ResumeInput,
        model: str = "gpt-4o",
        temperature: float = 0.7,
    ) -> GenerationResult:
        """执行简历生成链"""
        messages = [
            Message(
                role=MessageRole.SYSTEM,
                content=RESUME_GENERATION_SYSTEM_PROMPT,
            ),
            Message(
                role=MessageRole.USER,
                content=self._build_user_prompt(resume_input),
            ),
        ]

        response = await self.hermes.chat(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=4096,
        )

        return self._parse_generation_result(response.content, response)

    async def generate_multi_version(
        self,
        resume_input: ResumeInput,
        company_types: list[CompanyType],
        model: str = "gpt-4o-mini",  # 多版本用便宜模型
    ) -> dict[CompanyType, GenerationResult]:
        """
        并行生成多个公司类型版本的简历
        """
        import asyncio

        tasks = {
            ct: self.generate(
                ResumeInput(
                    **{**resume_input.__dict__, "company_type": ct}
                ),
                model=model,
            )
            for ct in company_types
        }

        results = await asyncio.gather(*tasks.values(), return_exceptions=True)

        return {
            ct: result
            for ct, result in zip(tasks.keys(), results)
            if not isinstance(result, Exception)
        }
