#!/bin/bash
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"
# =============================================================================
# SCRIPT TEMPORAL — solo crea lo que falta
# Borrar después de ejecutar con éxito.
# =============================================================================

set -euo pipefail

SUBSCRIPTION_ID="4c06f1c1-1f17-4525-bd66-da47f685c960"
RESOURCE_GROUP="dataagent-rg"
LOCATION="eastus"

# SQL — ya existe el server, solo necesitamos las DBs y las credentials
SQL_SERVER_NAME="dataliticsdb"
SQL_ADMIN_USER="sqladmin"
SQL_ADMIN_PASSWORD="DataAgent@2026!"   # ← la misma que usaste antes
SQL_DB_A="empresa_a"
SQL_DB_B="empresa_b"

# Nuevos recursos
SEARCH_NAME="dataagent-search"
STORAGE_NAME="dataagentskillsst"
FUNCTIONS_NAME="dataagent-skills"
APPINSIGHTS_NAME="dataagent-insights"

BACKEND_APP="dataagent-backend"
FRONTEND_URL="https://your-frontend.vercel.app"

az account set --subscription "$SUBSCRIPTION_ID"

# =============================================================================
# Recoger keys de los recursos ya existentes
# =============================================================================
echo ">>> Recogiendo keys de recursos existentes..."

OPENAI_ENDPOINT=$(az cognitiveservices account show \
  --name "dataagent-openai" --resource-group "$RESOURCE_GROUP" \
  --query properties.endpoint -o tsv)

OPENAI_KEY=$(az cognitiveservices account keys list \
  --name "dataagent-openai" --resource-group "$RESOURCE_GROUP" \
  --query key1 -o tsv)

CONTENT_SAFETY_ENDPOINT=$(az cognitiveservices account show \
  --name "dataagent-content-safety" --resource-group "$RESOURCE_GROUP" \
  --query properties.endpoint -o tsv)

CONTENT_SAFETY_KEY=$(az cognitiveservices account keys list \
  --name "dataagent-content-safety" --resource-group "$RESOURCE_GROUP" \
  --query key1 -o tsv)

echo "    ✓ OpenAI y Content Safety keys recogidas"

# =============================================================================
# 1. Azure AI Search — YA CREADO, solo recogemos la key
# =============================================================================
echo ">>> [1/4] AI Search ya existe, recogiendo key..."

SEARCH_ENDPOINT="https://${SEARCH_NAME}.search.windows.net"

SEARCH_KEY=$(az search admin-key show \
  --service-name "$SEARCH_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query primaryKey -o tsv)

echo "    ✓ AI Search key recogida: $SEARCH_ENDPOINT"

# =============================================================================
# 2. SQL Server + bases de datos
# =============================================================================
echo ">>> [2/4] Creando SQL Server y bases de datos..."

az sql server create \
  --name "$SQL_SERVER_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "westus2" \
  --admin-user "$SQL_ADMIN_USER" \
  --admin-password "$SQL_ADMIN_PASSWORD"

# Regla de firewall para Azure Services
az sql server firewall-rule create \
  --server "$SQL_SERVER_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --name "AllowAzureServices" \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

az sql db create \
  --server "$SQL_SERVER_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$SQL_DB_A" \
  --edition Basic \
  --capacity 5

az sql db create \
  --server "$SQL_SERVER_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$SQL_DB_B" \
  --edition Basic \
  --capacity 5

SQL_SERVER_FQDN="${SQL_SERVER_NAME}.database.windows.net"
SQL_CONN_A="Server=tcp:${SQL_SERVER_FQDN},1433;Database=${SQL_DB_A};User ID=${SQL_ADMIN_USER};Password=${SQL_ADMIN_PASSWORD};Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"
SQL_CONN_B="Server=tcp:${SQL_SERVER_FQDN},1433;Database=${SQL_DB_B};User ID=${SQL_ADMIN_USER};Password=${SQL_ADMIN_PASSWORD};Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"

echo "    ✓ SQL DBs: $SQL_DB_A, $SQL_DB_B en $SQL_SERVER_FQDN"

# =============================================================================
# 3. Storage Account + Azure Function App (Skills)
# =============================================================================
echo ">>> [3/4] Creando Storage Account y Function App..."

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

FUNCTIONS_KEY=$(az functionapp keys list \
  --name "$FUNCTIONS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query masterKey -o tsv 2>/dev/null || echo "")

echo "    ✓ Function App: $FUNCTIONS_URL"

# =============================================================================
# 4. Application Insights
# =============================================================================
echo ">>> [4/4] Creando Application Insights..."

az extension add --name application-insights --only-show-errors 2>/dev/null || true

az monitor app-insights component create \
  --app "$APPINSIGHTS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --application-type web \
  --kind web

APPINSIGHTS_CONN=$(az monitor app-insights component show \
  --app "$APPINSIGHTS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query connectionString -o tsv)

echo "    ✓ Application Insights listo"

# =============================================================================
# Inyectar todo en el backend Container App
# =============================================================================
echo ""
echo ">>> Inyectando env vars en $BACKEND_APP..."

az containerapp update \
  --name "$BACKEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    AZURE_OPENAI_ENDPOINT="$OPENAI_ENDPOINT" \
    AZURE_OPENAI_API_KEY="$OPENAI_KEY" \
    AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4.1" \
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT="text-embedding-3-large" \
    AZURE_SEARCH_ENDPOINT="$SEARCH_ENDPOINT" \
    AZURE_SEARCH_KEY="$SEARCH_KEY" \
    AZURE_CONTENT_SAFETY_ENDPOINT="$CONTENT_SAFETY_ENDPOINT" \
    AZURE_CONTENT_SAFETY_KEY="$CONTENT_SAFETY_KEY" \
    SKILLS_FUNCTION_APP_URL="$FUNCTIONS_URL" \
    SKILLS_FUNCTION_KEY="$FUNCTIONS_KEY" \
    APPLICATIONINSIGHTS_CONNECTION_STRING="$APPINSIGHTS_CONN" \
    TENANT_EMPRESA_A_CONNECTION="$SQL_CONN_A" \
    TENANT_EMPRESA_B_CONNECTION="$SQL_CONN_B" \
    FRONTEND_URL="$FRONTEND_URL" \
    ENVIRONMENT="production"

az containerapp update \
  --name dataagent-dab-empresa-a \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars TENANT_EMPRESA_A_CONNECTION="$SQL_CONN_A"

az containerapp update \
  --name dataagent-dab-empresa-b \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars TENANT_EMPRESA_B_CONNECTION="$SQL_CONN_B"

# =============================================================================
echo ""
echo "=========================================="
echo "LISTO"
echo "=========================================="
echo ""
echo "Falta agregar manualmente (no automatizable):"
echo ""
echo "  FIREBASE_PROJECT_ID y FIREBASE_SERVICE_ACCOUNT_JSON:"
echo "  az containerapp update --name $BACKEND_APP \\"
echo "    --resource-group $RESOURCE_GROUP \\"
echo "    --set-env-vars FIREBASE_PROJECT_ID='<id>' FIREBASE_SERVICE_ACCOUNT_JSON='<json>'"
echo ""
BACKEND_FQDN=$(az containerapp show \
  --name "$BACKEND_APP" --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)
echo "  Backend URL: https://$BACKEND_FQDN"
echo "  Health check: https://$BACKEND_FQDN/health"
echo ""
echo "  SQL Server: $SQL_SERVER_FQDN"
echo "  Usuario SQL: $SQL_ADMIN_USER"
