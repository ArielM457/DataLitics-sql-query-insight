#!/bin/bash
# Fix Git Bash on Windows path conversion
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"
# =============================================================================
# DataAgent — Azure AI Services Setup
#
# Crea todos los servicios de IA y datos que necesita el backend.
# Ejecutar DESPUÉS de setup.sh (que crea Container Apps + ACR).
#
# Servicios que crea este script:
#   1. Azure OpenAI  (GPT-4.1 + text-embedding-3-large)
#   2. Azure AI Search
#   3. Azure AI Content Safety  (Prompt Shields)
#   4. Azure SQL Server  +  2 bases de demo (empresa_a, empresa_b)
#   5. Storage Account + Azure Function App  (para las skills)
#   6. Application Insights  (monitoreo)
#   7. Inyecta todas las keys en el Container App del backend
#
# Prerequisites:
#   - Azure CLI instalado y logueado: az login
#   - setup.sh ya ejecutado (necesita el Container App dataagent-backend)
#   - Suscripción con acceso a Azure OpenAI aprobado
#
# Uso:
#   chmod +x infra/setup-services.sh
#   ./infra/setup-services.sh
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# EDITAR ESTOS VALORES antes de ejecutar
# ---------------------------------------------------------------------------
SUBSCRIPTION_ID="4c06f1c1-1f17-4525-bd66-da47f685c960"   # tu subscription
RESOURCE_GROUP="dataagent-rg"
LOCATION="eastus"                      # eastus tiene la mejor disponibilidad de OpenAI
SQL_LOCATION="eastus2"                 # SQL Server usa región diferente si eastus no acepta
FRONTEND_URL="https://your-frontend.vercel.app"   # URL del frontend desplegado

# Azure OpenAI — nombre del recurso (globalmente único)
OPENAI_NAME="dataagent-openai"
OPENAI_DEPLOYMENT_CHAT="gpt-4.1"            # nombre del deployment de chat
OPENAI_DEPLOYMENT_EMBED="text-embedding-3-large"
OPENAI_MODEL_CHAT="gpt-4o"                  # modelo base en Azure (mapea a gpt-4.1)
OPENAI_MODEL_CHAT_VERSION="2024-11-20"
OPENAI_MODEL_EMBED="text-embedding-3-large"
OPENAI_MODEL_EMBED_VERSION="1"

# Azure AI Search
SEARCH_NAME="dataagent-search"     # globalmente único, solo letras/números/guiones
SEARCH_SKU="basic"                 # basic = $72/mes, free solo 1 por suscripción

# Azure AI Content Safety
CONTENT_SAFETY_NAME="dataagent-content-safety"

# Azure SQL
SQL_SERVER_NAME="dataagent-sql"    # globalmente único
SQL_ADMIN_USER="sqladmin"
SQL_ADMIN_PASSWORD="DataAgent@2026!"   # ← CAMBIA ESTO a algo seguro
SQL_DB_A="empresa_a"
SQL_DB_B="empresa_b"

# Azure Functions (para las skills)
STORAGE_NAME="dataagentskillsst"   # globalmente único, solo minúsculas, 3-24 chars
FUNCTIONS_NAME="dataagent-skills"  # globalmente único

# Application Insights
APPINSIGHTS_NAME="dataagent-insights"

# Container App del backend (creado por setup.sh)
BACKEND_APP="dataagent-backend"

# ---------------------------------------------------------------------------
# Computed
# ---------------------------------------------------------------------------
echo ""
echo "=========================================="
echo "DataAgent — Azure Services Setup"
echo "Subscription: $SUBSCRIPTION_ID"
echo "Resource Group: $RESOURCE_GROUP ($LOCATION)"
echo "=========================================="
echo ""

az account set --subscription "$SUBSCRIPTION_ID"

# =============================================================================
# 1. AZURE OPENAI
# =============================================================================
echo ">>> [1/6] Creando Azure OpenAI..."

az cognitiveservices account create \
  --name "$OPENAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --kind OpenAI \
  --sku S0 \
  --yes

OPENAI_ENDPOINT=$(az cognitiveservices account show \
  --name "$OPENAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.endpoint -o tsv)

OPENAI_KEY=$(az cognitiveservices account keys list \
  --name "$OPENAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query key1 -o tsv)

echo "    Endpoint: $OPENAI_ENDPOINT"

# Deployment: chat (gpt-4o como modelo base, nombre deployment = gpt-4.1)
echo "    Desplegando modelo de chat ($OPENAI_DEPLOYMENT_CHAT)..."
az cognitiveservices account deployment create \
  --name "$OPENAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --deployment-name "$OPENAI_DEPLOYMENT_CHAT" \
  --model-name "$OPENAI_MODEL_CHAT" \
  --model-version "$OPENAI_MODEL_CHAT_VERSION" \
  --model-format OpenAI \
  --sku-capacity 40 \
  --sku-name GlobalStandard

# Deployment: embeddings
echo "    Desplegando modelo de embeddings ($OPENAI_DEPLOYMENT_EMBED)..."
az cognitiveservices account deployment create \
  --name "$OPENAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --deployment-name "$OPENAI_DEPLOYMENT_EMBED" \
  --model-name "$OPENAI_MODEL_EMBED" \
  --model-version "$OPENAI_MODEL_EMBED_VERSION" \
  --model-format OpenAI \
  --sku-capacity 40 \
  --sku-name GlobalStandard

echo "    ✓ Azure OpenAI listo"

# =============================================================================
# 2. AZURE AI SEARCH
# =============================================================================
echo ">>> [2/6] Creando Azure AI Search..."

az search service create \
  --name "$SEARCH_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku "$SEARCH_SKU"

SEARCH_ENDPOINT="https://${SEARCH_NAME}.search.windows.net"

SEARCH_KEY=$(az search admin-key show \
  --service-name "$SEARCH_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query primaryKey -o tsv)

echo "    Endpoint: $SEARCH_ENDPOINT"
echo "    ✓ Azure AI Search listo"

# =============================================================================
# 3. AZURE AI CONTENT SAFETY (Prompt Shields)
# =============================================================================
echo ">>> [3/6] Creando Azure AI Content Safety..."

az cognitiveservices account create \
  --name "$CONTENT_SAFETY_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --kind ContentSafety \
  --sku S0 \
  --yes

CONTENT_SAFETY_ENDPOINT=$(az cognitiveservices account show \
  --name "$CONTENT_SAFETY_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.endpoint -o tsv)

CONTENT_SAFETY_KEY=$(az cognitiveservices account keys list \
  --name "$CONTENT_SAFETY_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query key1 -o tsv)

echo "    Endpoint: $CONTENT_SAFETY_ENDPOINT"
echo "    ✓ Content Safety listo"

# =============================================================================
# 4. AZURE SQL SERVER + BASES DE DATOS DE DEMO
# =============================================================================
echo ">>> [4/6] Creando Azure SQL Server y bases de datos..."

az sql server create \
  --name "$SQL_SERVER_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$SQL_LOCATION" \
  --admin-user "$SQL_ADMIN_USER" \
  --admin-password "$SQL_ADMIN_PASSWORD"

# Permitir acceso desde Azure services (para que el backend + onboarding conecte)
az sql server firewall-rule create \
  --server "$SQL_SERVER_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --name "AllowAzureServices" \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Base de datos demo A (Contoso Sales) — SKU Basic = ~$5/mes
az sql db create \
  --server "$SQL_SERVER_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$SQL_DB_A" \
  --edition Basic \
  --capacity 5

# Base de datos demo B (RRHH)
az sql db create \
  --server "$SQL_SERVER_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$SQL_DB_B" \
  --edition Basic \
  --capacity 5

SQL_SERVER_FQDN="${SQL_SERVER_NAME}.database.windows.net"

# Connection strings en formato pyodbc (para el backend / DAB)
SQL_CONN_A="Server=tcp:${SQL_SERVER_FQDN},1433;Database=${SQL_DB_A};User ID=${SQL_ADMIN_USER};Password=${SQL_ADMIN_PASSWORD};Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"
SQL_CONN_B="Server=tcp:${SQL_SERVER_FQDN},1433;Database=${SQL_DB_B};User ID=${SQL_ADMIN_USER};Password=${SQL_ADMIN_PASSWORD};Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"

echo "    Server: $SQL_SERVER_FQDN"
echo "    ✓ Azure SQL listo (empresa_a + empresa_b)"

# =============================================================================
# 5. STORAGE ACCOUNT + AZURE FUNCTION APP (Skills)
# =============================================================================
echo ">>> [5/6] Creando Storage Account y Function App para skills..."

az storage account create \
  --name "$STORAGE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2

az functionapp create \
  --name "$FUNCTIONS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --storage-account "$STORAGE_NAME" \
  --consumption-plan-location "$LOCATION" \
  --runtime python \
  --runtime-version 3.11 \
  --functions-version 4 \
  --os-type Linux

FUNCTIONS_URL="https://${FUNCTIONS_NAME}.azurewebsites.net"

# Obtener la master key de Functions
FUNCTIONS_KEY=$(az functionapp keys list \
  --name "$FUNCTIONS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query masterKey -o tsv 2>/dev/null || echo "")

echo "    URL: $FUNCTIONS_URL"
echo "    ✓ Function App listo"

# =============================================================================
# 6. APPLICATION INSIGHTS
# =============================================================================
echo ">>> [6/6] Creando Application Insights..."

# Habilitar la extensión de App Insights si no está
az extension add --name application-insights --only-show-errors 2>/dev/null || true

az monitor app-insights component create \
  --app "$APPINSIGHTS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --application-type web \
  --kind web

APPINSIGHTS_KEY=$(az monitor app-insights component show \
  --app "$APPINSIGHTS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query instrumentationKey -o tsv)

APPINSIGHTS_CONN=$(az monitor app-insights component show \
  --app "$APPINSIGHTS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query connectionString -o tsv)

echo "    ✓ Application Insights listo"

# =============================================================================
# INYECTAR TODAS LAS ENV VARS EN EL BACKEND CONTAINER APP
# =============================================================================
echo ""
echo ">>> Inyectando variables de entorno en $BACKEND_APP..."

az containerapp update \
  --name "$BACKEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    AZURE_OPENAI_ENDPOINT="$OPENAI_ENDPOINT" \
    AZURE_OPENAI_API_KEY="$OPENAI_KEY" \
    AZURE_OPENAI_DEPLOYMENT_NAME="$OPENAI_DEPLOYMENT_CHAT" \
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT="$OPENAI_DEPLOYMENT_EMBED" \
    AZURE_SEARCH_ENDPOINT="$SEARCH_ENDPOINT" \
    AZURE_SEARCH_KEY="$SEARCH_KEY" \
    AZURE_CONTENT_SAFETY_ENDPOINT="$CONTENT_SAFETY_ENDPOINT" \
    AZURE_CONTENT_SAFETY_KEY="$CONTENT_SAFETY_KEY" \
    SKILLS_FUNCTION_APP_URL="$FUNCTIONS_URL" \
    SKILLS_FUNCTION_KEY="$FUNCTIONS_KEY" \
    APPLICATIONINSIGHTS_CONNECTION_STRING="$APPINSIGHTS_CONN" \
    FRONTEND_URL="$FRONTEND_URL" \
    ENVIRONMENT="production"

# Inyectar connection strings en los DAB containers
echo ">>> Inyectando connection strings en los DAB containers..."

az containerapp update \
  --name dataagent-dab-empresa-a \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    TENANT_EMPRESA_A_CONNECTION="$SQL_CONN_A"

az containerapp update \
  --name dataagent-dab-empresa-b \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    TENANT_EMPRESA_B_CONNECTION="$SQL_CONN_B"

# También en el backend (para el endpoint /onboarding/schema)
az containerapp update \
  --name "$BACKEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    TENANT_EMPRESA_A_CONNECTION="$SQL_CONN_A" \
    TENANT_EMPRESA_B_CONNECTION="$SQL_CONN_B"

# =============================================================================
# RESUMEN FINAL
# =============================================================================
echo ""
echo "=========================================="
echo "SETUP COMPLETO"
echo "=========================================="
echo ""
echo "--- SERVICIOS CREADOS ---"
echo ""
echo "Azure OpenAI:"
echo "  Endpoint:    $OPENAI_ENDPOINT"
echo "  Deployment chat:   $OPENAI_DEPLOYMENT_CHAT  (modelo: $OPENAI_MODEL_CHAT)"
echo "  Deployment embed:  $OPENAI_DEPLOYMENT_EMBED"
echo ""
echo "Azure AI Search:"
echo "  Endpoint:    $SEARCH_ENDPOINT"
echo ""
echo "Content Safety:"
echo "  Endpoint:    $CONTENT_SAFETY_ENDPOINT"
echo ""
echo "Azure SQL:"
echo "  Server:      $SQL_SERVER_FQDN"
echo "  Databases:   $SQL_DB_A, $SQL_DB_B"
echo ""
echo "Function App (Skills):"
echo "  URL:         $FUNCTIONS_URL"
echo ""
echo "Application Insights:"
echo "  Instrumentacion: $APPINSIGHTS_KEY"
echo ""
echo "--- PASOS SIGUIENTES ---"
echo ""
echo "1. Firebase — añade manualmente FIREBASE_SERVICE_ACCOUNT_JSON al backend:"
echo "   az containerapp update --name $BACKEND_APP \\"
echo "     --resource-group $RESOURCE_GROUP \\"
echo "     --set-env-vars FIREBASE_SERVICE_ACCOUNT_JSON='<json-del-service-account>'"
echo "   az containerapp update --name $BACKEND_APP \\"
echo "     --resource-group $RESOURCE_GROUP \\"
echo "     --set-env-vars FIREBASE_PROJECT_ID='<tu-project-id>'"
echo ""
echo "2. Frontend — actualiza NEXT_PUBLIC_API_URL con la URL del backend:"
BACKEND_URL=$(az containerapp show \
  --name "$BACKEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)
echo "   NEXT_PUBLIC_API_URL=https://$BACKEND_URL"
echo ""
echo "3. Carga datos demo en las bases de datos (ver docs/demo-data/):"
echo "   SQL Server: $SQL_SERVER_FQDN"
echo "   Usuario: $SQL_ADMIN_USER"
echo "   Contraseña: (la que pusiste en SQL_ADMIN_PASSWORD)"
echo ""
echo "4. Despliega las skills en la Function App:"
echo "   cd skills/ && func azure functionapp publish $FUNCTIONS_NAME"
echo ""
echo "=========================================="
