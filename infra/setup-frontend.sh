#!/bin/bash
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"
# =============================================================================
# DataAgent — Deploy Frontend como Container App
# Requiere: az login, ACR y Container Apps environment ya existentes
# =============================================================================

set -euo pipefail

SUBSCRIPTION_ID="4c06f1c1-1f17-4525-bd66-da47f685c960"
RESOURCE_GROUP="dataagent-rg"
ENVIRONMENT_PROD="dataagent-env"
ENVIRONMENT_STAGING="dataagent-env-staging"
ACR_NAME="dataagentacr"
ACR_REGISTRY="${ACR_NAME}.azurecr.io"

# ---------------------------------------------------------------------------
# EDIT ESTAS VARIABLES con los valores de tu proyecto Firebase
# ---------------------------------------------------------------------------
BACKEND_URL_PROD="https://dataagent-backend.victoriousground-38c4b160.eastus.azurecontainerapps.io"
BACKEND_URL_STAGING="https://dataagent-backend-staging.victoriousground-38c4b160.eastus.azurecontainerapps.io"

FIREBASE_API_KEY="AIzaSyBOuAP3RO29iqOLQoKWBdb9RxkoAOzjjWY"
FIREBASE_AUTH_DOMAIN="battletanks-auth.firebaseapp.com"
FIREBASE_PROJECT_ID="battletanks-auth"
FIREBASE_APP_ID="1:168422322242:web:a39cd07bb3ef600728fddb"
# ---------------------------------------------------------------------------

az account set --subscription "$SUBSCRIPTION_ID"

ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

# =============================================================================
# 1. Build y push al ACR usando ACR Tasks (no necesita Docker local)
# =============================================================================
echo ">>> [1/3] Construyendo imagen frontend en ACR..."

az acr build \
  --registry "$ACR_NAME" \
  --image dataagent-frontend:latest \
  --build-arg NEXT_PUBLIC_API_URL="$BACKEND_URL_PROD" \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="$FIREBASE_API_KEY" \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$FIREBASE_AUTH_DOMAIN" \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="$FIREBASE_PROJECT_ID" \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="$FIREBASE_APP_ID" \
  ./frontend

echo "    ✓ Imagen construida y subida al ACR"

# =============================================================================
# 2. Crear Container App PRODUCCIÓN
# =============================================================================
echo ">>> [2/3] Creando Container App frontend (prod)..."

az containerapp create \
  --name dataagent-frontend \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT_PROD" \
  --image "$ACR_REGISTRY/dataagent-frontend:latest" \
  --registry-server "$ACR_REGISTRY" \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 3000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1Gi \
  --env-vars \
    NODE_ENV=production \
    NEXT_PUBLIC_API_URL="$BACKEND_URL_PROD"

# =============================================================================
# 3. Crear Container App STAGING
# =============================================================================
echo ">>> [3/3] Creando Container App frontend (staging)..."

az containerapp create \
  --name dataagent-frontend-staging \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT_STAGING" \
  --image "$ACR_REGISTRY/dataagent-frontend:latest" \
  --registry-server "$ACR_REGISTRY" \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 3000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 2 \
  --cpu 0.5 \
  --memory 1Gi \
  --env-vars \
    NODE_ENV=production \
    NEXT_PUBLIC_API_URL="$BACKEND_URL_STAGING"

# =============================================================================
# Output
# =============================================================================
FRONTEND_FQDN=$(az containerapp show \
  --name dataagent-frontend \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)

FRONTEND_STAGING_FQDN=$(az containerapp show \
  --name dataagent-frontend-staging \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)

# Actualizar FRONTEND_URL en el backend
az containerapp update \
  --name dataagent-backend \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars FRONTEND_URL="https://$FRONTEND_FQDN"

az containerapp update \
  --name dataagent-backend-staging \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars FRONTEND_URL="https://$FRONTEND_STAGING_FQDN"

echo ""
echo "=========================================="
echo "FRONTEND DESPLEGADO"
echo "=========================================="
echo ""
echo "  Prod:    https://$FRONTEND_FQDN"
echo "  Staging: https://$FRONTEND_STAGING_FQDN"
echo ""
