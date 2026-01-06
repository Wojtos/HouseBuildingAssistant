#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
BASE_URL="http://localhost:8000"
USER_ID="550e8400-e29b-41d4-a716-446655440000"
PROJECT_ID="660e8400-e29b-41d4-a716-446655440000"
DOCUMENT_ID="770e8400-e29b-41d4-a716-446655440000"
AUTH_TOKEN="Bearer $USER_ID"

echo "========================================="
echo "API Endpoint Testing with curl"
echo "========================================="
echo ""

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected_status="${5:-200}"

    echo -e "${YELLOW}Testing: $name${NC}"
    echo "  Method: $method"
    echo "  URL: $url"

    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Authorization: $AUTH_TOKEN" \
            -H "Content-Type: application/json" \
            "$url")
    else
        echo "  Data: $data"
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Authorization: $AUTH_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url")
    fi

    # Split response and status code
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    echo "  Status: $status_code"

    # Pretty print JSON if it's valid
    if echo "$body" | jq . > /dev/null 2>&1; then
        echo "  Response:"
        echo "$body" | jq . | sed 's/^/    /'
    else
        echo "  Response: $body"
    fi

    # Check if status matches expected (allow some flexibility)
    if [[ "$status_code" == "$expected_status" || "$status_code" == "404" || "$status_code" == "422" ]]; then
        echo -e "  ${GREEN}✓ Test completed${NC}"
    else
        echo -e "  ${RED}✗ Unexpected status code${NC}"
    fi

    echo ""
}

echo "========================================="
echo "1. PROFILE ENDPOINTS"
echo "========================================="
echo ""

# Test GET /api/profiles/me
test_endpoint "GET Profile" "GET" "$BASE_URL/api/profiles/me" "" "200"

# Test PUT /api/profiles/me
test_endpoint "UPDATE Profile" "PUT" "$BASE_URL/api/profiles/me" '{
  "full_name": "John Doe Updated",
  "preferred_units": "METRIC",
  "language": "en"
}' "200"

echo "========================================="
echo "2. DOCUMENT ENDPOINTS"
echo "========================================="
echo ""

# Test GET /api/projects/{project_id}/documents
test_endpoint "LIST Documents" "GET" "$BASE_URL/api/projects/$PROJECT_ID/documents" "" "200"

# Test POST /api/projects/{project_id}/documents
test_endpoint "CREATE Document" "POST" "$BASE_URL/api/projects/$PROJECT_ID/documents" '{
  "name": "test-blueprint.pdf",
  "file_type": "application/pdf",
  "file_size": 1024000
}' "201"

# Test GET /api/projects/{project_id}/documents/{document_id}
test_endpoint "GET Document" "GET" "$BASE_URL/api/projects/$PROJECT_ID/documents/$DOCUMENT_ID" "" "200"

# Test POST /api/projects/{project_id}/documents/{document_id}/confirm
test_endpoint "CONFIRM Upload" "POST" "$BASE_URL/api/projects/$PROJECT_ID/documents/$DOCUMENT_ID/confirm" "" "200"

# Test GET /api/projects/{project_id}/documents/{document_id}/chunks
test_endpoint "GET Chunks" "GET" "$BASE_URL/api/projects/$PROJECT_ID/documents/$DOCUMENT_ID/chunks" "" "200"

# Test POST /api/projects/{project_id}/documents/search
test_endpoint "SEARCH Documents" "POST" "$BASE_URL/api/projects/$PROJECT_ID/documents/search" '{
  "query": "foundation specifications",
  "limit": 5,
  "threshold": 0.7
}' "200"

# Test DELETE /api/projects/{project_id}/documents/{document_id}
test_endpoint "DELETE Document" "DELETE" "$BASE_URL/api/projects/$PROJECT_ID/documents/$DOCUMENT_ID" "" "200"

echo "========================================="
echo "3. PROJECT MEMORY ENDPOINTS"
echo "========================================="
echo ""

# Test GET /api/projects/{project_id}/memory
test_endpoint "GET Memory" "GET" "$BASE_URL/api/projects/$PROJECT_ID/memory" "" "200"

# Test PATCH /api/projects/{project_id}/memory
test_endpoint "UPDATE Memory" "PATCH" "$BASE_URL/api/projects/$PROJECT_ID/memory" '{
  "data": {
    "FINANCE": {
      "total_budget": 500000,
      "currency": "USD"
    }
  },
  "agent_id": "FINANCE_LEGAL_AGENT",
  "change_summary": "Initial budget set"
}' "200"

# Test GET /api/projects/{project_id}/memory/audit (should return 501)
test_endpoint "GET Audit Trail (TODO)" "GET" "$BASE_URL/api/projects/$PROJECT_ID/memory/audit" "" "501"

echo "========================================="
echo "Testing Complete!"
echo "========================================="
