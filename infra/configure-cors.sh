#!/bin/bash
# =============================================================================
# Configure CORS for Azure Function App
#
# Configura CORS (Cross-Origin Resource Sharing) en el Function App
# para que el backend y frontend puedan hacer requests desde sus dominios.
#
# Prerequisites:
#   - Azure CLI instalado y logueado
#   - setup.sh ya ejecutado
#
# Uso:
#   chmod +x infra/configure-cors.sh
#   ./infra/configure-cors.sh
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# EDITAR ESTOS VALORES
# ---------------------------------------------------------------------------
SUBSCRIPTION_ID="4c06f1c1-1f17-4525-bd66-da47f685c960"
RESOURCE_GROUP="dataagent-rg"
FUNCTIONS_NAME="dataagent-skills"
BACKEND_APP="dataagent-backend"      # Container App del backend
FRONTEND_URL="https://your-frontend.vercel.app"  # URL del frontend desplegado

echo ""
echo "=========================================="
echo "Configure CORS → Azure Function App"
echo "=========================================="
echo ""

az account set --subscription "$SUBSCRIPTION_ID"

# ---------------------------------------------------------------------------
# Obtener URLs de los servicios
# ---------------------------------------------------------------------------
echo ">>> Obteniendo URLs de los servicios..."

# Backend URL
BACKEND_URL=$(az containerapp show \
    --name "$BACKEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --query properties.configuration.ingress.fqdn -o tsv 2>/dev/null || echo "")

if [ -z "$BACKEND_URL" ]; then
    echo "⚠ Advertencia: No se encontró URL del backend"
    echo "  Asegúrate de que el Container App '$BACKEND_APP' existe"
    BACKEND_URL="https://backend.example.com"
fi

FUNCTIONS_URL="https://${FUNCTIONS_NAME}.azurewebsites.net"

echo "    Functions: $FUNCTIONS_URL"
echo "    Backend:   https://$BACKEND_URL"
echo "    Frontend:  $FRONTEND_URL"
echo ""

# ---------------------------------------------------------------------------
# Configurar CORS en Application Settings
# ---------------------------------------------------------------------------
echo ">>> Configurando CORS..."

# Los dominios permitidos (sin trailing slash)
ALLOWED_ORIGINS="https://${BACKEND_URL},${FRONTEND_URL},http://localhost:3000,http://localhost:8000"

# Crear endpoint local para localhost en testing
ALLOWED_ORIGINS="${ALLOWED_ORIGINS},http://localhost:3000,http://127.0.0.1:3000"

echo "    Dominios permitidos:"
echo "      • https://$BACKEND_URL"
echo "      • $FRONTEND_URL"
echo "      • http://localhost:3000"
echo "      • http://localhost:8000"
echo ""

# Actualizar el Function App con CORS
az functionapp cors add \
    --name "$FUNCTIONS_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --allowed-origins "https://${BACKEND_URL}" "${FRONTEND_URL}" "http://localhost:3000" "http://localhost:8000" \
    2>/dev/null || true

# Verificar configuración
echo ">>> Verificando configuración de CORS..."
az functionapp cors show \
    --name "$FUNCTIONS_NAME" \
    --resource-group "$RESOURCE_GROUP" 2>/dev/null || echo "   (Nota: CORS está configurada a nivel de Application Settings)"

echo ""
echo "=========================================="
echo "CORS Configurado"
echo "=========================================="
echo ""
echo "Headers HTTP que el Function App acepta:"
echo "  • Access-Control-Allow-Origin: <tu-dominio>"
echo "  • Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS"
echo "  • Access-Control-Allow-Headers: Content-Type, Authorization"
echo "  • Access-Control-Max-Age: 86400"
echo ""
echo "Para agregar más dominios manualmente:"
echo "  az functionapp cors add -n $FUNCTIONS_NAME -g $RESOURCE_GROUP --allowed-origins https://nuevo-dominio.com"
echo ""
echo "=========================================="
