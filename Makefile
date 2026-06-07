.PHONY: dev build test clean deploy logs down

# ─── 开发 ───────────────────────────────────────
dev:
	docker-compose up -d postgres redis minio clickhouse
	docker-compose logs -f

dev-all:
	docker-compose up -d
	docker-compose logs -f

build:
	docker-compose build

# ─── 测试 ───────────────────────────────────────
test-python:
	@for svc in ai-dispatch export-service analytics-service payment-service; do \
		echo "=== Testing $$svc ==="; \
		cd services/$$svc && python -m pytest tests/ -v --tb=short; \
	done

# ─── 部署 ───────────────────────────────────────
deploy:
	bash deploy.sh dev

deploy-prod:
	bash deploy.sh prod

# ─── 管理 ───────────────────────────────────────
logs:
	docker-compose logs -f

down:
	docker-compose down

clean:
	docker-compose down -v
	rm -rf volumes/

ps:
	docker-compose ps

# ─── Git ─────────────────────────────────────────
git-init:
	git init
	git add -A
	git commit -m "feat: initial commit - ResumeAI AI简历生成平台"
	git branch -M main
	git remote add origin https://github.com/Taoj2025/AI-.git

git-push:
	git push -u origin main --force
