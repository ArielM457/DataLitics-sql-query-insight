#!/bin/bash
# Fix Git Bash on Windows path conversion (MSYS converts /subscriptions/... to Windows paths)
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"
# =============================================================================
# DataAgent — Azure one-time infrastructure setup
# Run this ONCE to provision all Azure resources for the project.
#
# Prerequisites:
#   - Azure CLI installed and logged in: az login
#   - Docker installed (for the initial image push)
#   - Variables below filled in before running
#
# Usage:
#   chmod +x infra/setup.sh
#   ./infra/setup.sh
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# EDIT THESE VALUES before running
# ---------------------------------------------------------------------------
SUBSCRIPTION_ID=4c06f1c1-1f17-4525-bd66-da47f685c960
RESOURCE_GROUP="dataagent-rg"
LOCATION="eastus"
ACR_NAME="dataagentacr"              # must be globally unique, lowercase, no hyphens
ENVIRONMENT_PROD="dataagent-env"
ENVIRONMENT_STAGING="dataagent-env-staging"
SP_NAME="dataagent-cicd"             # service principal for GitLab CI

# ---------------------------------------------------------------------------
# Computed values — do not edit
# ---------------------------------------------------------------------------
ACR_REGISTRY="${ACR_NAME}.azurecr.io"

echo "=========================================="
echo "DataAgent — Azure Infrastructure Setup"
echo "Subscription: $SUBSCRIPTION_ID"
echo "Resource Group: $RESOURCE_GROUP ($LOCATION)"
echo "ACR: $ACR_REGISTRY"
echo "=========================================="
echo ""

# ---------------------------------------------------------------------------
# 1. Set active subscription
# ---------------------------------------------------------------------------
echo ">>> [1/9] Setting subscription..."
az account set --subscription "$SUBSCRIPTION_ID"

# ---------------------------------------------------------------------------
# 2. Create resource group
# ---------------------------------------------------------------------------
echo ">>> [2/9] Creating resource group..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION"

# ---------------------------------------------------------------------------
# 3. Create Azure Container Registry
# ---------------------------------------------------------------------------
echo ">>> [3/9] Creating Container Registry..."
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --admin-enabled true

ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

# ---------------------------------------------------------------------------
# 4. Push placeholder images so Container Apps can start
# Uses 'az acr import' — no Docker installation required locally
# ---------------------------------------------------------------------------
echo ">>> [4/9] Importing placeholder images into ACR (no Docker needed)..."
PLACEHOLDER="mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"

az acr import --name "$ACR_NAME" --source "$PLACEHOLDER" \
  --image dataagent-backend:latest --force

az acr import --name "$ACR_NAME" --source "$PLACEHOLDER" \
  --image dataagent-dab-empresa-a:latest --force

az acr import --name "$ACR_NAME" --source "$PLACEHOLDER" \
  --image dataagent-dab-empresa-b:latest --force

# ---------------------------------------------------------------------------
# 5. Create Container Apps Environments (prod + staging)
# ---------------------------------------------------------------------------
echo ">>> [5/9] Creating Container Apps environments..."

az containerapp env create \
  --name "$ENVIRONMENT_PROD" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION"

az containerapp env create \
  --name "$ENVIRONMENT_STAGING" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION"

# ---------------------------------------------------------------------------
# 6. Create PRODUCTION Container Apps
# ---------------------------------------------------------------------------
echo ">>> [6/9] Creating production Container Apps..."

# --- FastAPI backend (external ingress) ---
az containerapp create \
  --name dataagent-backend \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT_PROD" \
  --image "$ACR_REGISTRY/dataagent-backend:latest" \
  --registry-server "$ACR_REGISTRY" \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 8000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 5 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --env-vars \
    ENVIRONMENT=production \
    FRONTEND_URL=https://your-frontend.vercel.app

# --- DAB empresa_a (internal ingress) ---
az containerapp create \
  --name dataagent-dab-empresa-a \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT_PROD" \
  --image "$ACR_REGISTRY/dataagent-dab-empresa-a:latest" \
  --registry-server "$ACR_REGISTRY" \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 5000 \
  --ingress internal \
  --min-replicas 0 \
  --max-replicas 3 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --env-vars TENANT_EMPRESA_A_CONNECTION="<fill-after-azure-sql-is-created>"

# --- DAB empresa_b (internal ingress) ---
az containerapp create \
  --name dataagent-dab-empresa-b \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT_PROD" \
  --image "$ACR_REGISTRY/dataagent-dab-empresa-b:latest" \
  --registry-server "$ACR_REGISTRY" \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 5000 \
  --ingress internal \
  --min-replicas 0 \
  --max-replicas 3 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --env-vars TENANT_EMPRESA_B_CONNECTION="<fill-after-azure-sql-is-created>"

# ---------------------------------------------------------------------------
# 7. Create STAGING Container Apps (same pattern, -staging suffix)
# ---------------------------------------------------------------------------
echo ">>> [7/9] Creating staging Container Apps..."

az containerapp create \
  --name dataagent-backend-staging \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT_STAGING" \
  --image "$ACR_REGISTRY/dataagent-backend:latest" \
  --registry-server "$ACR_REGISTRY" \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 8000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 2 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --env-vars ENVIRONMENT=staging

az containerapp create \
  --name dataagent-dab-empresa-a-staging \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT_STAGING" \
  --image "$ACR_REGISTRY/dataagent-dab-empresa-a:latest" \
  --registry-server "$ACR_REGISTRY" \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 5000 \
  --ingress internal \
  --min-replicas 0 \
  --max-replicas 2 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --env-vars TENANT_EMPRESA_A_CONNECTION="<fill-after-azure-sql-is-created>"

az containerapp create \
  --name dataagent-dab-empresa-b-staging \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT_STAGING" \
  --image "$ACR_REGISTRY/dataagent-dab-empresa-b:latest" \
  --registry-server "$ACR_REGISTRY" \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 5000 \
  --ingress internal \
  --min-replicas 0 \
  --max-replicas 2 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --env-vars TENANT_EMPRESA_B_CONNECTION="<fill-after-azure-sql-is-created>"

# ---------------------------------------------------------------------------
# 8. Get the Container App internal URLs for DAB → inject into backend
# ---------------------------------------------------------------------------
echo ">>> [8/9] Collecting internal DAB URLs..."

DAB_A_FQDN=$(az containerapp show \
  --name dataagent-dab-empresa-a \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)

DAB_B_FQDN=$(az containerapp show \
  --name dataagent-dab-empresa-b \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)

DAB_A_STAGING_FQDN=$(az containerapp show \
  --name dataagent-dab-empresa-a-staging \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)

# Update backend env vars with DAB internal URLs
az containerapp update \
  --name dataagent-backend \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    DAB_BASE_URL_EMPRESA_A="https://$DAB_A_FQDN" \
    DAB_BASE_URL_EMPRESA_B="https://$DAB_B_FQDN"

az containerapp update \
  --name dataagent-backend-staging \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    DAB_BASE_URL_EMPRESA_A="https://$DAB_A_STAGING_FQDN" \
    DAB_BASE_URL_EMPRESA_B="https://$DAB_A_STAGING_FQDN"

# ---------------------------------------------------------------------------
# 9. Create Service Principal for GitLab CI/CD
# ---------------------------------------------------------------------------
echo ">>> [9/9] Creating Service Principal for GitLab CI..."

SP_OUTPUT=$(az ad sp create-for-rbac \
  --name "$SP_NAME" \
  --role contributor \
  --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
  --output json)

SP_CLIENT_ID=$(echo "$SP_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['appId'])")
SP_CLIENT_SECRET=$(echo "$SP_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['password'])")
SP_TENANT_ID=$(echo "$SP_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['tenant'])")

# Also grant ACR push permission to the SP
ACR_ID=$(az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query id -o tsv)
az role assignment create \
  --assignee "$SP_CLIENT_ID" \
  --role "AcrPush" \
  --scope "$ACR_ID"

# ---------------------------------------------------------------------------
# Summary — COPY THESE VALUES to GitLab CI/CD > Settings > Variables
# ---------------------------------------------------------------------------
BACKEND_URL=$(az containerapp show \
  --name dataagent-backend \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)

echo ""
echo "=========================================="
echo "SETUP COMPLETE"
echo "=========================================="
echo ""
echo "Backend (prod): https://$BACKEND_URL"
echo "Backend /health: https://$BACKEND_URL/health"
echo ""
echo "--- GITLAB CI/CD VARIABLES (Settings > CI/CD > Variables) ---"
echo ""
echo "ACR_REGISTRY      = $ACR_REGISTRY"
echo "ACR_USERNAME      = $ACR_USERNAME"
echo "ACR_PASSWORD      = $ACR_PASSWORD          (mark as masked)"
echo "AZURE_CLIENT_ID   = $SP_CLIENT_ID"
echo "AZURE_CLIENT_SECRET = $SP_CLIENT_SECRET     (mark as masked)"
echo "AZURE_TENANT_ID   = $SP_TENANT_ID"
echo "AZURE_SUBSCRIPTION_ID = $SUBSCRIPTION_ID"
echo "AZURE_RESOURCE_GROUP  = $RESOURCE_GROUP"
echo ""
echo "--- NEXT STEP: add the real env vars to the Container Apps ---"
echo "Run this for each secret (example):"
echo "  az containerapp update --name dataagent-backend \\"
echo "    --resource-group $RESOURCE_GROUP \\"
echo "    --set-env-vars AZURE_OPENAI_API_KEY=<your-key>"
echo ""
