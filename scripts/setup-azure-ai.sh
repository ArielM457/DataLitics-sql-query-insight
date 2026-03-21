#!/bin/bash
# =============================================================================
# DataLitics — Azure AI Resources Setup Script
# Creates: Azure OpenAI (GPT-4.1) + Azure AI Content Safety + Azure Function App (Skills)
# =============================================================================

set -euo pipefail

# ---- Configuration (edit these) ----
RESOURCE_GROUP="${RESOURCE_GROUP:-DataLitics-rg}"
LOCATION="${LOCATION:-eastus2}"
OPENAI_RESOURCE_NAME="${OPENAI_RESOURCE_NAME:-datalytics-openai}"
CONTENT_SAFETY_NAME="${CONTENT_SAFETY_NAME:-datalytics-content-safety}"
FUNCTION_APP_NAME="${FUNCTION_APP_NAME:-datalytics-skills}"
STORAGE_ACCOUNT_NAME="${STORAGE_ACCOUNT_NAME:-dataliticsstore}"
OPENAI_MODEL="gpt-4.1"
OPENAI_DEPLOYMENT_NAME="gpt-4.1"
OPENAI_SKU="Standard"
OPENAI_CAPACITY=10  # TPM in thousands (10 = 10K tokens per minute)

# ---- Colors ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ---- Pre-checks ----
if ! command -v az &> /dev/null; then
    error "Azure CLI (az) not found. Install: https://aka.ms/installazurecli"
    exit 1
fi

# Check login
if ! az account show &> /dev/null; then
    warn "Not logged in. Running 'az login'..."
    az login
fi

SUBSCRIPTION=$(az account show --query name -o tsv)
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo ""
info "Subscription: $SUBSCRIPTION ($SUBSCRIPTION_ID)"
info "Resource Group: $RESOURCE_GROUP"
info "Location: $LOCATION"
echo ""
read -p "Continue with this subscription? (y/n): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Aborted."
    exit 0
fi

# ---- 1. Create Resource Group (if not exists) ----
info "Checking resource group '$RESOURCE_GROUP'..."
if az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    ok "Resource group '$RESOURCE_GROUP' already exists"
else
    info "Creating resource group '$RESOURCE_GROUP' in '$LOCATION'..."
    az group create --name "$RESOURCE_GROUP" --location "$LOCATION" -o none
    ok "Resource group created"
fi

# ---- 2. Create Azure OpenAI Resource ----
echo ""
info "Creating Azure OpenAI resource '$OPENAI_RESOURCE_NAME'..."
if az cognitiveservices account show --name "$OPENAI_RESOURCE_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    ok "OpenAI resource '$OPENAI_RESOURCE_NAME' already exists"
else
    az cognitiveservices account create \
        --name "$OPENAI_RESOURCE_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --kind OpenAI \
        --sku S0 \
        --custom-domain "$OPENAI_RESOURCE_NAME" \
        -o none
    ok "OpenAI resource created"
fi

# Get OpenAI endpoint and key
OPENAI_ENDPOINT=$(az cognitiveservices account show \
    --name "$OPENAI_RESOURCE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query properties.endpoint -o tsv)

OPENAI_KEY=$(az cognitiveservices account keys list \
    --name "$OPENAI_RESOURCE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query key1 -o tsv)

ok "OpenAI Endpoint: $OPENAI_ENDPOINT"

# ---- 3. Deploy GPT-4.1 Model ----
echo ""
info "Deploying model '$OPENAI_MODEL' as '$OPENAI_DEPLOYMENT_NAME'..."
if az cognitiveservices account deployment show \
    --name "$OPENAI_RESOURCE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --deployment-name "$OPENAI_DEPLOYMENT_NAME" &> /dev/null; then
    ok "Deployment '$OPENAI_DEPLOYMENT_NAME' already exists"
else
    az cognitiveservices account deployment create \
        --name "$OPENAI_RESOURCE_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --deployment-name "$OPENAI_DEPLOYMENT_NAME" \
        --model-name "$OPENAI_MODEL" \
        --model-version "2025-04-14" \
        --model-format OpenAI \
        --sku-name "$OPENAI_SKU" \
        --sku-capacity "$OPENAI_CAPACITY" \
        -o none
    ok "Model '$OPENAI_MODEL' deployed as '$OPENAI_DEPLOYMENT_NAME'"
fi

# ---- 4. Create Azure AI Content Safety Resource ----
echo ""
info "Creating Azure AI Content Safety resource '$CONTENT_SAFETY_NAME'..."
if az cognitiveservices account show --name "$CONTENT_SAFETY_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    ok "Content Safety resource '$CONTENT_SAFETY_NAME' already exists"
else
    az cognitiveservices account create \
        --name "$CONTENT_SAFETY_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --kind ContentSafety \
        --sku S0 \
        --custom-domain "$CONTENT_SAFETY_NAME" \
        -o none
    ok "Content Safety resource created"
fi

# Get Content Safety endpoint and key
CONTENT_SAFETY_ENDPOINT=$(az cognitiveservices account show \
    --name "$CONTENT_SAFETY_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query properties.endpoint -o tsv)

CONTENT_SAFETY_KEY=$(az cognitiveservices account keys list \
    --name "$CONTENT_SAFETY_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query key1 -o tsv)

ok "Content Safety Endpoint: $CONTENT_SAFETY_ENDPOINT"

# ---- 5. Create Storage Account for Function App ----
echo ""
info "Creating Storage Account '$STORAGE_ACCOUNT_NAME' for Function App..."
if az storage account show --name "$STORAGE_ACCOUNT_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    ok "Storage account '$STORAGE_ACCOUNT_NAME' already exists"
else
    az storage account create \
        --name "$STORAGE_ACCOUNT_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --sku Standard_LRS \
        -o none
    ok "Storage account created"
fi

# ---- 6. Create Azure Function App (Skills) ----
echo ""
info "Creating Azure Function App '$FUNCTION_APP_NAME'..."
if az functionapp show --name "$FUNCTION_APP_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    ok "Function App '$FUNCTION_APP_NAME' already exists"
else
    az functionapp create \
        --name "$FUNCTION_APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --storage-account "$STORAGE_ACCOUNT_NAME" \
        --consumption-plan-location "$LOCATION" \
        --runtime python \
        --runtime-version 3.11 \
        --functions-version 4 \
        --os-type Linux \
        -o none
    ok "Function App created"
fi

# Configure Function App settings (pass Azure OpenAI credentials)
info "Configuring Function App settings..."
az functionapp config appsettings set \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --settings \
        "AZURE_OPENAI_ENDPOINT=${OPENAI_ENDPOINT}" \
        "AZURE_OPENAI_API_KEY=${OPENAI_KEY}" \
        "AZURE_OPENAI_DEPLOYMENT_NAME=${OPENAI_DEPLOYMENT_NAME}" \
    -o none
ok "Function App settings configured"

# Get Function App URL and default key
FUNCTION_APP_URL="https://${FUNCTION_APP_NAME}.azurewebsites.net"
FUNCTION_KEY=$(az functionapp keys list \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query functionKeys.default -o tsv 2>/dev/null || echo "")

ok "Function App URL: $FUNCTION_APP_URL"

# ---- 7. Generate .env file ----
echo ""
ENV_FILE="$(dirname "$0")/../backend/.env"
info "Writing configuration to $ENV_FILE ..."

if [ -f "$ENV_FILE" ]; then
    warn ".env file already exists. Creating backup at .env.backup"
    cp "$ENV_FILE" "${ENV_FILE}.backup"
fi

cat > "$ENV_FILE" << EOF
# Azure OpenAI — generated by setup-azure-ai.sh
AZURE_OPENAI_ENDPOINT=${OPENAI_ENDPOINT}
AZURE_OPENAI_API_KEY=${OPENAI_KEY}
AZURE_OPENAI_DEPLOYMENT_NAME=${OPENAI_DEPLOYMENT_NAME}
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-large

# Azure AI Search (configure when M3 is ready)
AZURE_SEARCH_ENDPOINT=
AZURE_SEARCH_KEY=
AZURE_SEARCH_INDEX_BOOKS=books-index
AZURE_SEARCH_INDEX_SCHEMA=schema-index

# Azure AI Content Safety (Prompt Shields)
AZURE_CONTENT_SAFETY_ENDPOINT=${CONTENT_SAFETY_ENDPOINT}
AZURE_CONTENT_SAFETY_KEY=${CONTENT_SAFETY_KEY}

# Skills Azure Function App
SKILLS_FUNCTION_APP_URL=${FUNCTION_APP_URL}
SKILLS_FUNCTION_KEY=${FUNCTION_KEY}

# Data API Builder
DAB_BASE_URL=http://localhost:5000

# Firebase (configure when M2 is ready)
FIREBASE_PROJECT_ID=
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json

# App
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
EOF

ok ".env file created at $ENV_FILE"

# ---- Summary ----
echo ""
echo "=============================================="
echo -e "${GREEN}  Setup Complete!${NC}"
echo "=============================================="
echo ""
echo "Resources created:"
echo "  - Azure OpenAI:        $OPENAI_RESOURCE_NAME"
echo "  - Model deployed:      $OPENAI_MODEL → $OPENAI_DEPLOYMENT_NAME"
echo "  - Content Safety:      $CONTENT_SAFETY_NAME"
echo "  - Function App:        $FUNCTION_APP_NAME ($FUNCTION_APP_URL)"
echo "  - Storage Account:     $STORAGE_ACCOUNT_NAME"
echo ""
echo "Configuration saved to: $ENV_FILE"
echo ""
echo "Next steps:"
echo "  1. Deploy Skills Function App:"
echo "     cd functions/skills && func azure functionapp publish $FUNCTION_APP_NAME"
echo "  2. Start backend:"
echo "     cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload"
echo ""
