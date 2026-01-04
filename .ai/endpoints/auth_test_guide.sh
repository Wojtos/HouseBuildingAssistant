#!/bin/bash

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Authentication Testing Guide - Development Mode      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}\n"

API="http://localhost:5001/api"

# Generate a test user UUID
TEST_USER="550e8400-e29b-41d4-a716-446655440000"

echo -e "${YELLOW}📝 Current Authentication (Development):${NC}"
echo -e "   The API accepts ANY valid UUID as a Bearer token"
echo -e "   The UUID is treated as the user_id\n"

echo -e "${YELLOW}🔑 Test User ID:${NC} $TEST_USER\n"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Test 1: Using the token
echo -e "${YELLOW}[1] ✅ Valid Token Test${NC}"
echo -e "${GREEN}Command:${NC}"
cat << 'CMD'
curl -X GET "http://localhost:5001/api/projects/387d96a1-ee23-4845-b702-41b6c8f5cb03/messages" \
  -H "Authorization: Bearer 550e8400-e29b-41d4-a716-446655440000"
CMD
echo ""
echo -e "${GREEN}Result:${NC}"
curl -s -X GET "$API/projects/387d96a1-ee23-4845-b702-41b6c8f5cb03/messages" \
  -H "Authorization: Bearer $TEST_USER" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"  Status: OK\n  Messages: {d['pagination']['total_items']}\") if 'pagination' in d else print('  Error:', d.get('detail', 'Unknown error'))"
echo ""

# Test 2: Missing token
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
echo -e "${YELLOW}[2] ❌ Missing Token Test${NC}"
echo -e "${GREEN}Command:${NC}"
echo 'curl -X GET "http://localhost:5001/api/projects/.../messages"'
echo ""
echo -e "${GREEN}Result:${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/projects/387d96a1-ee23-4845-b702-41b6c8f5cb03/messages")
echo "  HTTP Status: $STATUS (Expected: 401 Unauthorized)"
echo ""

# Test 3: Invalid format
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
echo -e "${YELLOW}[3] ❌ Invalid Token Format Test${NC}"
echo -e "${GREEN}Command:${NC}"
echo 'curl -X GET "..." -H "Authorization: Bearer not-a-uuid"'
echo ""
echo -e "${GREEN}Result:${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/projects/387d96a1-ee23-4845-b702-41b6c8f5cb03/messages" \
  -H "Authorization: Bearer not-a-uuid")
echo "  HTTP Status: $STATUS (Expected: 401 Unauthorized)"
echo ""

# Test 4: Wrong user accessing project
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
echo -e "${YELLOW}[4] ❌ Wrong User Test (Authorization)${NC}"
WRONG_USER="660e8400-e29b-41d4-a716-446655440000"
echo -e "${GREEN}Command:${NC}"
echo "curl -X GET \"...\" -H \"Authorization: Bearer $WRONG_USER\""
echo ""
echo -e "${GREEN}Result:${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/projects/387d96a1-ee23-4845-b702-41b6c8f5cb03/messages" \
  -H "Authorization: Bearer $WRONG_USER")
echo "  HTTP Status: $STATUS (Expected: 403 Forbidden)"
echo ""

# Quick reference
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
echo -e "${YELLOW}📚 Quick Reference:${NC}\n"

echo -e "${GREEN}1. Generate a Test UUID:${NC}"
echo "   uuidgen  # Or use: python3 -c 'import uuid; print(uuid.uuid4())'"
echo ""

echo -e "${GREEN}2. Use as Bearer Token:${NC}"
echo "   curl ... -H \"Authorization: Bearer YOUR-UUID-HERE\""
echo ""

echo -e "${GREEN}3. Common Test User IDs:${NC}"
echo "   User 1: 550e8400-e29b-41d4-a716-446655440000"
echo "   User 2: 660e8400-e29b-41d4-a716-446655440000"
echo ""

echo -e "${GREEN}4. Create a Project for Your User:${NC}"
cat << 'EXAMPLE'
curl -X POST "http://localhost:5001/api/projects/" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR-UUID",
    "name": "My Test Project",
    "current_phase": "LAND_SELECTION"
  }'
EXAMPLE
echo ""

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ⚠️  WARNING: This is DEVELOPMENT MODE ONLY                 ║${NC}"
echo -e "${BLUE}║  Production requires proper Supabase Auth JWT validation    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}\n"

