#!/bin/bash
# =============================================================================
# Deploy Skills to Azure Function App
#
# Despliega el código de Azure Functions (SkillsManager) a la Function App.
# Las 20 skills se cargan automáticamente desde disk cuando arranca el Function App.
#
# NO requiere Node.js/func CLI — usa Azure CLI zip deploy directamente.
#
# Prerequisites:
#   - Azure CLI instalado y logueado: az login
#   - zip instalado (apt install zip)
#   - setup.sh ya ejecutado (el Function App debe existir)
#
# Uso:
#   chmod +x infra/deploy-skills.sh
#   ./infra/deploy-skills.sh
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# EDITAR ESTOS VALORES
# ---------------------------------------------------------------------------
SUBSCRIPTION_ID="4c06f1c1-1f17-4525-bd66-da47f685c960"   # Tu subscription
RESOURCE_GROUP="dataagent-rg"
FUNCTIONS_NAME="dataagent-skills"               # Nombre del Function App
FUNCTIONS_DIR="./functions/skills"              # Ruta relativa al código

# ---------------------------------------------------------------------------
# Validaciones iniciales
# ---------------------------------------------------------------------------
echo ""
echo "=========================================="
echo "Deploy Skills → Azure Function App"
echo "=========================================="
echo ""

az account set --subscription "$SUBSCRIPTION_ID"

# Verificar que el directorio existe
if [ ! -d "$FUNCTIONS_DIR" ]; then
    echo "✗ Error: Directorio $FUNCTIONS_DIR no encontrado"
    echo "  Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

# Verificar que zip está disponible
if ! command -v zip &> /dev/null; then
    echo "✗ Error: zip no está instalado"
    echo "  Instala con: apt install zip"
    exit 1
fi

# Verificar que el Function App existe en Azure
echo ">>> Verificando que el Function App existe..."
if ! az functionapp show \
    --name "$FUNCTIONS_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    &> /dev/null; then
    echo "✗ Error: Function App no encontrado: $FUNCTIONS_NAME"
    echo "  Ejecuta primero: ./infra/setup-services.sh"
    exit 1
fi

FUNCTIONS_URL="https://${FUNCTIONS_NAME}.azurewebsites.net"
echo "    URL: $FUNCTIONS_URL"

# ---------------------------------------------------------------------------
# Habilitar Remote Build (Azure instala dependencias Python desde requirements.txt)
# ---------------------------------------------------------------------------
echo ""
echo ">>> Configurando remote build..."

az functionapp config appsettings set \
    --name "$FUNCTIONS_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --settings \
        "SCM_DO_BUILD_DURING_DEPLOYMENT=true" \
        "ENABLE_ORYX_BUILD=true" \
        "WEBSITE_RUN_FROM_PACKAGE=0" \
    --output none

echo "    ✓ Remote build habilitado"

# ---------------------------------------------------------------------------
# Crear zip del código (sin pycache ni packages locales — Azure los rebuilda)
# ---------------------------------------------------------------------------
echo ""
echo ">>> Creando zip del código..."

DEPLOY_ZIP="/tmp/skills-deploy.zip"
rm -f "$DEPLOY_ZIP"

# Guardar directorio actual
ORIGINAL_DIR="$(pwd)"

cd "$FUNCTIONS_DIR"
zip -r "$DEPLOY_ZIP" . \
    --exclude "*.pyc" \
    --exclude "*/__pycache__/*" \
    --exclude "__pycache__/*" \
    --exclude ".python_packages/*" \
    --exclude "local.settings.json" \
    --exclude ".env" \
    --exclude ".funcignore" \
    --exclude ".git/*" \
    -q

cd "$ORIGINAL_DIR"

ZIP_SIZE=$(du -sh "$DEPLOY_ZIP" | cut -f1)
echo "    ✓ Zip creado: $DEPLOY_ZIP ($ZIP_SIZE)"

# ---------------------------------------------------------------------------
# Desplegar el código
# ---------------------------------------------------------------------------
echo ""
echo ">>> Desplegando código en $FUNCTIONS_NAME..."
echo "    (Remote build puede tardar 2-5 minutos mientras Azure instala dependencias Python)"
echo ""

az functionapp deployment source config-zip \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FUNCTIONS_NAME" \
    --src "$DEPLOY_ZIP"

echo ""
echo "✓ Código desplegado exitosamente"

# ---------------------------------------------------------------------------
# Esperar a que el Function App esté listo
# ---------------------------------------------------------------------------
echo ""
echo ">>> Esperando que el Function App arranque..."
echo "    (Primer arranque con remote build puede tardar 1-2 minutos extra)"

FUNCTION_KEY=$(az functionapp keys list \
    --name "$FUNCTIONS_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query masterKey -o tsv 2>/dev/null || echo "")

MAX_WAIT=120
WAITED=0
READY=false

while [ $WAITED -lt $MAX_WAIT ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        "${FUNCTIONS_URL}/api/skills?code=${FUNCTION_KEY}" \
        --connect-timeout 10 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        READY=true
        break
    fi

    echo -n "."
    sleep 5
    WAITED=$((WAITED + 5))
done
echo ""

if [ "$READY" = true ]; then
    echo "    ✓ Function App responde (HTTP $HTTP_CODE)"
else
    echo "    ⚠ Function App tarda en responder — continúa de todas formas"
    echo "      Puede necesitar 1-2 min más para completar remote build"
fi

# ---------------------------------------------------------------------------
# Resultado final
# ---------------------------------------------------------------------------
echo ""
echo "=========================================="
echo "DEPLOY COMPLETO"
echo "=========================================="
echo ""
echo "Function App:"
echo "  Nombre:  $FUNCTIONS_NAME"
echo "  URL:     $FUNCTIONS_URL"
echo ""
echo "FUNCTION_KEY=${FUNCTION_KEY}"
echo ""
echo "Próximos pasos:"
echo ""
echo "1. Verificar que las skills cargaron (la Function App las carga desde disco al arrancar):"
echo "   curl '${FUNCTIONS_URL}/api/skills?code=${FUNCTION_KEY}' | jq '.total'"
echo ""
echo "2. Cargar skills adicionales vía API (si necesitas):"
echo "   ./infra/seed-skills.sh"
echo ""
echo "=========================================="

# Limpiar zip
rm -f "$DEPLOY_ZIP"
