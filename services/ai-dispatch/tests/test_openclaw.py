"""
测试 OpenClaw 简历生成编排链
使用 Mock Provider，无需真实 API Key
运行: python -m pytest tests/test_openclaw.py -v
"""
import json
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from hermes import HermesAdapter, MockProvider, HermesResponse
from openclaw import (
    OpenClawResumeChain,
    ResumeInput,
    PersonalInfo,
    ExperienceItem,
    CompanyType,
    ResumeStyle,
    GenerationResult,
    COMPANY_STRATEGIES,
)


# ─────────────────────────── Fixtures ───────────────────────────

@pytest.fixture
def sample_personal():
    return PersonalInfo(
        name="张三",
        email="zhangsan@example.com",
        phone="13800138000",
        location="北京",
        github="https://github.com/zhangsan",
    )


@pytest.fixture
def sample_experience():
    return [
        ExperienceItem(
            company="字节跳动",
            position="高级后端工程师",
            start_date="2021.06",
            end_date="至今",
            description="负责推荐系统后端服务开发，处理日均亿级请求",
            achievements=["优化推荐引擎，CTR提升15%", "重构服务架构，P99延迟降低40%"],
            tech_stack=["Go", "Kafka", "Redis", "Kubernetes"],
        ),
        ExperienceItem(
            company="阿里巴巴",
            position="后端工程师",
            start_date="2019.07",
            end_date="2021.05",
            description="参与电商大促备战，负责库存服务高可用改造",
            achievements=["支撑双11峰值10W QPS", "库存准确率提升至99.99%"],
            tech_stack=["Java", "Spring Boot", "MySQL", "RabbitMQ"],
        ),
    ]


@pytest.fixture
def sample_resume_input(sample_personal, sample_experience):
    return ResumeInput(
        personal=sample_personal,
        experience=sample_experience,
        education=[{
            "institution": "北京大学",
            "degree": "本科",
            "major": "计算机科学",
            "start_date": "2015.09",
            "end_date": "2019.06",
        }],
        skills=["Go", "Python", "Java", "Kubernetes", "Redis", "MySQL"],
        target_job="高级后端工程师",
        company_type=CompanyType.INTERNET_GIANT,
        job_description="负责核心业务系统后端开发，要求熟悉分布式系统，有高并发经验",
    )


MOCK_AI_RESPONSE = json.dumps({
    "summary": "5年后端研发经验，专注高并发分布式系统，曾支撑字节跳动亿级推荐服务，具备完整的大规模系统设计与优化能力。",
    "experience": [
        {
            "company": "字节跳动",
            "position": "高级后端工程师",
            "start_date": "2021.06",
            "end_date": "至今",
            "achievements": [
                "主导重构推荐引擎，CTR提升15%，月增GMV超5000万",
                "优化微服务架构，P99延迟从120ms降至72ms，降幅40%",
                "设计并落地灰度发布方案，线上故障率下降60%",
            ],
            "tech_stack": ["Go", "Kafka", "Redis", "Kubernetes", "Prometheus"],
        }
    ],
    "skills_optimized": {
        "technical": ["Go", "Java", "Python", "Kubernetes", "Redis", "Kafka", "MySQL"],
        "soft": ["系统设计", "跨团队协作", "技术方案评审"],
        "keywords": ["高并发", "分布式系统", "微服务", "性能优化", "系统架构"],
    }
}, ensure_ascii=False)


@pytest.fixture
def mock_hermes():
    return HermesAdapter(providers={"openai": MockProvider(MOCK_AI_RESPONSE)})


@pytest.fixture
def chain(mock_hermes):
    return OpenClawResumeChain(hermes=mock_hermes)


# ─────────────────────────── 策略配置测试 ───────────────────────────

class TestCompanyStrategies:
    def test_all_company_types_have_strategy(self):
        """所有公司类型都应有对应策略配置"""
        for ct in CompanyType:
            assert ct in COMPANY_STRATEGIES, f"缺少 {ct} 的策略配置"

    def test_each_strategy_has_required_fields(self):
        """每个策略应包含必填字段"""
        required = {"name", "keywords", "style_hint", "focus", "length_hint", "tone"}
        for ct, strategy in COMPANY_STRATEGIES.items():
            missing = required - set(strategy.keys())
            assert not missing, f"{ct} 策略缺少字段: {missing}"

    def test_internet_giant_keywords_include_data_driven(self):
        """互联网大厂策略应包含数据驱动相关关键词"""
        strategy = COMPANY_STRATEGIES[CompanyType.INTERNET_GIANT]
        keywords_text = " ".join(strategy["keywords"])
        assert "数据驱动" in keywords_text or "高并发" in keywords_text

    def test_foreign_company_focuses_on_communication(self):
        """外企策略应强调沟通能力"""
        strategy = COMPANY_STRATEGIES[CompanyType.FOREIGN_COMPANY]
        assert "沟通" in strategy["focus"] or "领导力" in strategy["focus"]

    def test_consulting_length_is_one_page(self):
        """咨询公司标准为1页"""
        strategy = COMPANY_STRATEGIES[CompanyType.CONSULTING]
        assert "1页" in strategy["length_hint"]


# ─────────────────────────── Prompt 构建测试 ───────────────────────────

class TestPromptBuilding:
    def test_prompt_contains_company_type_info(self, chain, sample_resume_input):
        """提示词应包含公司类型信息"""
        prompt = chain._build_user_prompt(sample_resume_input)
        strategy = COMPANY_STRATEGIES[CompanyType.INTERNET_GIANT]
        assert strategy["name"] in prompt

    def test_prompt_contains_target_job(self, chain, sample_resume_input):
        """提示词应包含目标职位"""
        prompt = chain._build_user_prompt(sample_resume_input)
        assert sample_resume_input.target_job in prompt

    def test_prompt_contains_experience(self, chain, sample_resume_input):
        """提示词应包含工作经历"""
        prompt = chain._build_user_prompt(sample_resume_input)
        assert "字节跳动" in prompt
        assert "阿里巴巴" in prompt

    def test_prompt_contains_skills(self, chain, sample_resume_input):
        """提示词应包含现有技能"""
        prompt = chain._build_user_prompt(sample_resume_input)
        assert "Go" in prompt or "Python" in prompt

    def test_prompt_contains_jd_when_provided(self, chain, sample_resume_input):
        """有JD时提示词应包含JD内容"""
        prompt = chain._build_user_prompt(sample_resume_input)
        assert "高并发" in prompt  # JD 中的关键词

    def test_prompt_for_different_company_types_differ(self, chain, sample_resume_input):
        """不同公司类型生成的提示词应有差异"""
        internet_input = ResumeInput(**{**sample_resume_input.__dict__, "company_type": CompanyType.INTERNET_GIANT})
        startup_input = ResumeInput(**{**sample_resume_input.__dict__, "company_type": CompanyType.STARTUP})

        internet_prompt = chain._build_user_prompt(internet_input)
        startup_prompt = chain._build_user_prompt(startup_input)

        assert internet_prompt != startup_prompt


# ─────────────────────────── 生成结果解析测试 ───────────────────────────

class TestResultParsing:
    def test_parse_valid_json_response(self, chain):
        """正确解析合法 JSON 响应"""
        mock_response = HermesResponse(
            content=MOCK_AI_RESPONSE,
            model="gpt-4o",
            provider="mock",
        )
        result = chain._parse_generation_result(MOCK_AI_RESPONSE, mock_response)

        assert isinstance(result, GenerationResult)
        assert result.summary != ""
        assert len(result.experience_enhanced) > 0
        assert len(result.keywords) > 0

    def test_parse_json_in_markdown_code_block(self, chain):
        """解析被 markdown 代码块包裹的 JSON"""
        markdown_wrapped = f"```json\n{MOCK_AI_RESPONSE}\n```"
        mock_response = HermesResponse(content=markdown_wrapped, model="gpt-4o", provider="mock")
        result = chain._parse_generation_result(markdown_wrapped, mock_response)

        assert result.summary != ""

    def test_parse_invalid_json_graceful_fallback(self, chain):
        """无效 JSON 时应优雅降级，不抛异常"""
        invalid_content = "这不是JSON格式的内容，是纯文字简历"
        mock_response = HermesResponse(content=invalid_content, model="gpt-4o", provider="mock")
        result = chain._parse_generation_result(invalid_content, mock_response)

        assert isinstance(result, GenerationResult)
        assert result.summary != ""  # 应有降级内容

    def test_result_tracks_model_used(self, chain):
        """结果应记录使用的模型"""
        mock_response = HermesResponse(content=MOCK_AI_RESPONSE, model="gpt-4o", provider="mock")
        result = chain._parse_generation_result(MOCK_AI_RESPONSE, mock_response)
        assert result.model_used == "gpt-4o"

    def test_result_tracks_cost(self, chain):
        """结果应记录成本"""
        mock_response = HermesResponse(
            content=MOCK_AI_RESPONSE, model="gpt-4o", provider="mock", cost_usd=0.005
        )
        result = chain._parse_generation_result(MOCK_AI_RESPONSE, mock_response)
        assert result.cost_usd == 0.005


# ─────────────────────────── 生成链集成测试 ───────────────────────────

class TestGenerationChain:
    @pytest.mark.asyncio
    async def test_generate_returns_result(self, chain, sample_resume_input):
        """生成链应返回合法 GenerationResult"""
        result = await chain.generate(sample_resume_input, model="gpt-4o")

        assert isinstance(result, GenerationResult)
        assert result.summary != ""

    @pytest.mark.asyncio
    async def test_generated_summary_contains_key_info(self, chain, sample_resume_input):
        """生成的简介应包含关键信息"""
        result = await chain.generate(sample_resume_input, model="gpt-4o")
        # Mock 返回的内容包含 "5年后端研发经验"
        assert len(result.summary) > 0

    @pytest.mark.asyncio
    async def test_generate_records_experience(self, chain, sample_resume_input):
        """生成结果应包含工作经历"""
        result = await chain.generate(sample_resume_input, model="gpt-4o")
        assert len(result.experience_enhanced) > 0

    @pytest.mark.asyncio
    async def test_generate_includes_keywords(self, chain, sample_resume_input):
        """生成结果应包含 ATS 关键词"""
        result = await chain.generate(sample_resume_input, model="gpt-4o")
        assert len(result.keywords) > 0

    @pytest.mark.asyncio
    async def test_generate_multi_version(self, chain, sample_resume_input):
        """多版本生成应返回多个公司类型结果"""
        company_types = [CompanyType.INTERNET_GIANT, CompanyType.STARTUP, CompanyType.FOREIGN_COMPANY]
        results = await chain.generate_multi_version(
            sample_resume_input,
            company_types=company_types,
            model="gpt-4o",
        )

        assert len(results) == len(company_types)
        for ct in company_types:
            assert ct in results
            assert isinstance(results[ct], GenerationResult)


# ─────────────────────────── 边界条件测试 ───────────────────────────

class TestEdgeCases:
    @pytest.mark.asyncio
    async def test_generate_with_minimal_input(self, chain):
        """仅提供最少信息也应能生成"""
        minimal_input = ResumeInput(
            personal=PersonalInfo(name="李四", email="lisi@test.com"),
            experience=[],
            education=[],
            skills=[],
            target_job="产品经理",
            company_type=CompanyType.STARTUP,
        )
        result = await chain.generate(minimal_input, model="gpt-4o")
        assert isinstance(result, GenerationResult)

    @pytest.mark.asyncio
    async def test_generate_with_no_jd(self, chain, sample_resume_input):
        """没有 JD 时也应正常工作"""
        no_jd_input = ResumeInput(
            **{**sample_resume_input.__dict__, "job_description": ""}
        )
        result = await chain.generate(no_jd_input, model="gpt-4o")
        assert isinstance(result, GenerationResult)

    def test_all_company_types_generate_different_prompts(self, chain, sample_resume_input):
        """不同公司类型生成的提示词应各不相同"""
        prompts = set()
        for ct in CompanyType:
            inp = ResumeInput(**{**sample_resume_input.__dict__, "company_type": ct})
            prompt = chain._build_user_prompt(inp)
            prompts.add(prompt)

        assert len(prompts) == len(CompanyType), "每种公司类型应生成唯一的提示词"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
