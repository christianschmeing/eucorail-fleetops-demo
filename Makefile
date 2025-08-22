.PHONY: help deploy test setup preview status trigger

help:
	@echo "Available commands:"
	@echo "  make setup     - Initial setup"
	@echo "  make test      - Run local tests"
	@echo "  make deploy    - Deploy to production"
	@echo "  make preview   - Deploy preview"
	@echo "  make status    - Check deployment status"
	@echo "  make trigger   - Touch DEPLOY_NOW to trigger fallback workflow"

setup:
	npm install
	cp -n .env.example .env.local || true
	@echo "✏️  Edit .env.local with your tokens"

test:
	npm run deploy:test

deploy:
	git push origin main

preview:
	npm run deploy:preview

status:
	@gh run list --workflow="Deploy Production (Vercel)" --limit 5 || echo "Install gh CLI: brew install gh"

trigger:
	@touch DEPLOY_NOW && git add DEPLOY_NOW && git commit -m "trigger: deployment" && git push


