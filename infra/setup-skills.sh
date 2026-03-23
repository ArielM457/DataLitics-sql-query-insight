#!/bin/bash
# =============================================================================
# Complete Skills Setup Orchestrator
#
# Ejecuta todos los pasos necesarios para desplegar y cargar las 20 skills:
#   1. Deploy: Sube el código del Function App a Azure
#   2. Configure CORS: Permite requests desde backend/frontend
#   3. Seed: Carga todas las 20 skills via API
#
# Usage:
#   chmod +x infra/setup-skills.sh
#   ./infra/setup-skills.sh [--skip-deploy] [--skip-cors] [--skip-seed]
# =============================================================================

set -euo pipefail

# Parsear opciones
SKIP_DEPLOY=false
SKIP_CORS=false
SKIP_SEED=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-deploy) SKIP_DEPLOY=true; shift ;;
        --skip-cors) SKIP_CORS=true; shift ;;
        --skip-seed) SKIP_SEED=true; shift ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --skip-deploy    Skip Function App code deployment"
            echo "  --skip-cors      Skip CORS configuration"
            echo "  --skip-seed      Skip skills seeding"
            echo "  --help           Show this help"
            exit 0
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║   DataAgent Skills — Complete Setup       ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# ---------------------------------------------------------------------------
# 1. Deploy
# ---------------------------------------------------------------------------
if [ "$SKIP_DEPLOY" = false ]; then
    echo "Step 1/3: Deploying Function App code..."
    echo ""
    if bash "$SCRIPT_DIR/deploy-skills.sh"; then
        echo ""
        echo "✓ Deployment successful"
    else
        echo ""
        echo "✗ Deployment failed"
        exit 1
    fi
    echo ""
    read -p "Press Enter to continue..." || true
else
    echo "[SKIPPED] Deploy Function App code"
    echo ""
fi

# ---------------------------------------------------------------------------
# 2. Configure CORS
# ---------------------------------------------------------------------------
if [ "$SKIP_CORS" = false ]; then
    echo "Step 2/3: Configuring CORS..."
    echo ""
    if bash "$SCRIPT_DIR/configure-cors.sh"; then
        echo ""
        echo "✓ CORS configured"
    else
        echo ""
        echo "⚠ CORS configuration had issues (non-critical)"
    fi
    echo ""
    read -p "Press Enter to continue..." || true
else
    echo "[SKIPPED] Configure CORS"
    echo ""
fi

# ---------------------------------------------------------------------------
# 3. Seed Skills
# ---------------------------------------------------------------------------
if [ "$SKIP_SEED" = false ]; then
    echo "Step 3/3: Seeding 20 skills..."
    echo ""
    if bash "$SCRIPT_DIR/seed-skills.sh"; then
        echo ""
        echo "✓ Skills seeding successful"
    else
        echo ""
        echo "✗ Skills seeding failed"
        echo "  Intenta manualmente: ./infra/seed-skills.sh"
    fi
    echo ""
else
    echo "[SKIPPED] Seed skills"
    echo ""
fi

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║   Setup Complete ✓                         ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo ""
echo "1. Test the skills API:"
echo "   FUNCTION_KEY=\$(az functionapp keys list --name dataagent-skills --resource-group dataagent-rg --query masterKey -o tsv)"
echo "   curl 'https://dataagent-skills.azurewebsites.net/api/skills?code=\$FUNCTION_KEY' | jq '.total'"
echo ""
echo "2. Test skill selection:"
echo "   curl -X POST 'https://dataagent-skills.azurewebsites.net/api/skills/select?code=\$FUNCTION_KEY' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"agent\": \"agent_sql\", \"query\": \"agregacion de ventas\", \"top\": 3}'"
echo ""
echo "3. Update your backend to call the skills API:"
echo "   GET  https://dataagent-skills.azurewebsites.net/api/skills?agent=agent_sql&code=\$FUNCTION_KEY"
echo "   POST https://dataagent-skills.azurewebsites.net/api/skills/select?code=\$FUNCTION_KEY"
echo ""
