#!/bin/bash
# =============================================================================
# Seed Skills to Azure Function App via REST API
#
# Carga las 20 skills JSON files en la Azure Function App usando la API REST.
# Las skills se cargan en orden (agent_intention, agent_sql, agent_execution, agent_insights).
#
# NOTA: Este script es OPCIONAL. Si deploy-skills.sh ya subió el código con
# las skills incluidas en el zip, el Function App las carga automáticamente
# al arrancar. Usa seed-skills.sh solo si necesitas re-cargar o agregar skills.
#
# Prerequisites:
#   - deploy-skills.sh ya ejecutado (el Function App debe estar corriendo)
#   - curl instalado
#
# Uso:
#   chmod +x infra/seed-skills.sh
#   FUNCTION_KEY="..." ./infra/seed-skills.sh
#
# O si quieres que obtenga la clave de Azure automáticamente:
#   ./infra/seed-skills.sh
# =============================================================================

set -uo pipefail
# NOTA: No usamos 'set -e' aquí para que errores en skills individuales
# no detengan el proceso completo. Manejamos errores manualmente.

# ---------------------------------------------------------------------------
# EDITAR ESTOS VALORES
# ---------------------------------------------------------------------------
SUBSCRIPTION_ID="4c06f1c1-1f17-4525-bd66-da47f685c960"
RESOURCE_GROUP="dataagent-rg"
FUNCTIONS_NAME="dataagent-skills"
FUNCTIONS_URL="https://${FUNCTIONS_NAME}.azurewebsites.net"
SKILLS_DIR="./functions/skills/skills"

# ---------------------------------------------------------------------------
# Obtener FUNCTION_KEY
# ---------------------------------------------------------------------------
echo ""
echo "=========================================="
echo "Seed 20 Skills → Azure Function App"
echo "=========================================="
echo ""

# Si no está seteada la env var, obtenerla de Azure
if [ -z "${FUNCTION_KEY:-}" ]; then
    echo ">>> Obteniendo FUNCTION_KEY de Azure..."
    az account set --subscription "$SUBSCRIPTION_ID"

    FUNCTION_KEY=$(az functionapp keys list \
        --name "$FUNCTIONS_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query masterKey -o tsv 2>/dev/null || echo "")

    if [ -z "$FUNCTION_KEY" ]; then
        echo "✗ Error: No se pudo obtener FUNCTION_KEY"
        echo "  Verifica que el Function App existe: $FUNCTIONS_NAME"
        exit 1
    fi
fi

echo "    FUNCTION_KEY: ${FUNCTION_KEY:0:20}...***"
echo ""

# ---------------------------------------------------------------------------
# Validaciones iniciales
# ---------------------------------------------------------------------------
if [ ! -d "$SKILLS_DIR" ]; then
    echo "✗ Error: Directorio de skills no encontrado: $SKILLS_DIR"
    echo "  Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

# Contar skills disponibles
AVAILABLE=$(find "$SKILLS_DIR" -name "*.json" | wc -l | tr -d ' ')
if [ "$AVAILABLE" -eq 0 ]; then
    echo "✗ Error: No se encontraron archivos .json en $SKILLS_DIR"
    exit 1
fi
echo ">>> Encontrados $AVAILABLE archivos de skills"
echo ""

# ---------------------------------------------------------------------------
# Verificar que el Function App responde
# ---------------------------------------------------------------------------
echo ">>> Verificando que el Function App está listo..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "${FUNCTIONS_URL}/api/skills?code=${FUNCTION_KEY}" \
    --connect-timeout 15 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo "    ✓ Function App responde (HTTP 200)"
elif [ "$HTTP_CODE" = "000" ]; then
    echo "    ⚠ Advertencia: El Function App no responde (timeout)"
    echo "      Asegúrate de que deploy-skills.sh se ejecutó correctamente"
    echo ""
    printf "¿Continuar de todas formas? (s/n) "
    read -r REPLY
    if [[ ! "$REPLY" =~ ^[Ss]$ ]]; then
        exit 1
    fi
else
    # Puede ser 401 (key incorrecta) u otro error — intentamos de todas formas
    echo "    ⚠ Function App responde con HTTP $HTTP_CODE — continuando..."
fi
echo ""

# ---------------------------------------------------------------------------
# Verificar si las skills ya están cargadas desde disco
# ---------------------------------------------------------------------------
echo ">>> Verificando skills actuales en el Function App..."

CURRENT_COUNT=$(curl -s \
    "${FUNCTIONS_URL}/api/skills?code=${FUNCTION_KEY}" \
    --connect-timeout 15 2>/dev/null \
    | grep -o '"total":[0-9]*' | grep -o '[0-9]*' || echo "0")

echo "    Skills actualmente cargadas: ${CURRENT_COUNT}"
if [ "${CURRENT_COUNT}" = "$AVAILABLE" ]; then
    echo ""
    echo "✓ Las $AVAILABLE skills ya están cargadas. No es necesario re-seedear."
    echo ""
    echo "  Si igual quieres re-cargar, el Function App las lee desde disco al arrancar."
    echo "  Puedes forzar un reload con:"
    echo "  curl -X POST '${FUNCTIONS_URL}/api/skills/reload?code=${FUNCTION_KEY}'"
    echo ""
    exit 0
fi
echo ""

# ---------------------------------------------------------------------------
# Cargar las skills
# ---------------------------------------------------------------------------
echo ">>> Cargando $AVAILABLE skills..."
echo ""

TOTAL_LOADED=0
FAILED=0

for agent_dir in "$SKILLS_DIR"/agent_*/; do
    [ -d "$agent_dir" ] || continue

    agent=$(basename "$agent_dir")
    count=0

    # Verificar que hay archivos JSON en este directorio
    shopt -s nullglob
    json_files=("$agent_dir"*.json)
    shopt -u nullglob

    if [ ${#json_files[@]} -eq 0 ]; then
        echo "  [${agent}] Sin archivos JSON"
        continue
    fi

    for skill_file in "${json_files[@]}"; do
        skill_name=$(basename "$skill_file" .json)
        skill_title=$(python3 -c "import json,sys; d=json.load(open('$skill_file')); print(d.get('title',''))" 2>/dev/null || echo "$skill_name")

        printf "  [%-20s] %-35s ... " "$agent" "$skill_title"

        # POST el JSON file al endpoint /api/skills
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
            "${FUNCTIONS_URL}/api/skills?code=${FUNCTION_KEY}" \
            -H "Content-Type: application/json" \
            --connect-timeout 30 \
            --data @"$skill_file" 2>/dev/null || echo -e "\n000")

        HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

        if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
            echo "✓"
            TOTAL_LOADED=$((TOTAL_LOADED + 1))
        elif [ "$HTTP_CODE" = "400" ]; then
            # Puede ser que ya existe — intenta verificar
            BODY=$(echo "$RESPONSE" | head -n -1)
            if echo "$BODY" | grep -qi "already exists\|duplicate\|exists"; then
                echo "⚠ (ya existe)"
                TOTAL_LOADED=$((TOTAL_LOADED + 1))
            else
                echo "✗ (HTTP $HTTP_CODE: $(echo "$BODY" | grep -o '"error":"[^"]*"' || echo 'ver log'))"
                FAILED=$((FAILED + 1))
            fi
        else
            echo "✗ (HTTP $HTTP_CODE)"
            FAILED=$((FAILED + 1))
        fi

        count=$((count + 1))
    done

    echo "    → $count skills procesadas en $agent"
    echo ""
done

# ---------------------------------------------------------------------------
# Verificación final
# ---------------------------------------------------------------------------
FINAL_COUNT=$(curl -s \
    "${FUNCTIONS_URL}/api/skills?code=${FUNCTION_KEY}" \
    --connect-timeout 15 2>/dev/null \
    | grep -o '"total":[0-9]*' | grep -o '[0-9]*' || echo "?")

echo "=========================================="
echo "SEED COMPLETO"
echo "=========================================="
echo ""
echo "Resultados:"
echo "  ✓ Cargadas en esta sesión: $TOTAL_LOADED"
if [ $FAILED -gt 0 ]; then
    echo "  ✗ Errores:                 $FAILED"
fi
echo "  Total en Function App:     $FINAL_COUNT"
echo ""
echo "Verificación:"
echo ""
echo "1. Listar todas las skills:"
echo "   curl '${FUNCTIONS_URL}/api/skills?code=${FUNCTION_KEY}' | python3 -m json.tool | grep '\"total\"'"
echo ""
echo "2. Listar skills de un agente específico:"
echo "   curl '${FUNCTIONS_URL}/api/skills?agent=agent_sql&code=${FUNCTION_KEY}' | python3 -m json.tool"
echo ""
echo "3. Seleccionar skills relevantes:"
echo "   curl -X POST '${FUNCTIONS_URL}/api/skills/select?code=${FUNCTION_KEY}' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"agent\": \"agent_sql\", \"query\": \"agregacion de ventas\", \"top\": 3}'"
echo ""
echo "=========================================="
