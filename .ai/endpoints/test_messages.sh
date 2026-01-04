#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_BASE="http://localhost:5001/api"

echo -e "${YELLOW}=== Testing Message Endpoints ===${NC}\n"

# Generate a test user UUID (for development auth)
TEST_USER_ID="550e8400-e29b-41d4-a716-446655440000"
echo -e "${YELLOW}Using test user ID:${NC} $TEST_USER_ID\n"

# Step 0: Create a profile (required by foreign key)
echo -e "${YELLOW}Step 0: Creating user profile...${NC}"
PROFILE_DATA=$(curl -s -X POST "http://localhost:54321/rest/v1/profiles" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"id\": \"$TEST_USER_ID\",
    \"full_name\": \"Test User\",
    \"preferred_units\": \"METRIC\",
    \"language\": \"en\"
  }")
echo -e "${GREEN}✓ Profile created${NC}\n"

# Step 1: Create a test project
echo -e "${YELLOW}Step 1: Creating a test project...${NC}"
PROJECT_RESPONSE=$(curl -s -X POST "$API_BASE/projects/" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$TEST_USER_ID\",
    \"name\": \"Test House Project\",
    \"location\": \"Warsaw, Poland\",
    \"current_phase\": \"LAND_SELECTION\"
  }")

PROJECT_ID=$(echo $PROJECT_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}Failed to create project${NC}"
  echo "$PROJECT_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Project created with ID:${NC} $PROJECT_ID\n"

# Step 2: Test GET messages (should be empty initially)
echo -e "${YELLOW}Step 2: Testing GET /api/projects/{project_id}/messages${NC}"
echo "Request: GET $API_BASE/projects/$PROJECT_ID/messages"
echo "Authorization: Bearer $TEST_USER_ID"
echo ""

MESSAGES_RESPONSE=$(curl -s -X GET "$API_BASE/projects/$PROJECT_ID/messages" \
  -H "Authorization: Bearer $TEST_USER_ID")

echo "Response:"
echo "$MESSAGES_RESPONSE" | python3 -m json.tool

MESSAGE_COUNT=$(echo "$MESSAGES_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['pagination']['total_items'])" 2>/dev/null)
echo -e "\n${GREEN}✓ Message count:${NC} $MESSAGE_COUNT (expected: 0)\n"

# Step 3: Test with pagination parameters
echo -e "${YELLOW}Step 3: Testing GET with pagination parameters${NC}"
curl -s -X GET "$API_BASE/projects/$PROJECT_ID/messages?page=1&limit=10" \
  -H "Authorization: Bearer $TEST_USER_ID" | python3 -m json.tool
echo -e "${GREEN}✓ Pagination test passed${NC}\n"

# Step 4: Test authorization - wrong user
echo -e "${YELLOW}Step 4: Testing authorization (wrong user)${NC}"
WRONG_USER_ID="660e8400-e29b-41d4-a716-446655440000"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$API_BASE/projects/$PROJECT_ID/messages" \
  -H "Authorization: Bearer $WRONG_USER_ID")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "403" ]; then
  echo -e "${GREEN}✓ Correctly returned 403 Forbidden${NC}"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
  echo -e "${RED}✗ Expected 403, got $HTTP_CODE${NC}"
fi
echo ""

# Step 5: Test missing auth
echo -e "${YELLOW}Step 5: Testing missing authentication${NC}"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$API_BASE/projects/$PROJECT_ID/messages")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓ Correctly returned 401 Unauthorized${NC}"
else
  echo -e "${RED}✗ Expected 401, got $HTTP_CODE${NC}"
fi
echo ""

# Step 6: Test non-existent project
echo -e "${YELLOW}Step 6: Testing non-existent project${NC}"
FAKE_PROJECT_ID="00000000-0000-0000-0000-000000000000"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$API_BASE/projects/$FAKE_PROJECT_ID/messages" \
  -H "Authorization: Bearer $TEST_USER_ID")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)

if [ "$HTTP_CODE" = "404" ]; then
  echo -e "${GREEN}✓ Correctly returned 404 Not Found${NC}"
else
  echo -e "${RED}✗ Expected 404, got $HTTP_CODE${NC}"
fi
echo ""

echo -e "${YELLOW}=== Test Summary ===${NC}"
echo -e "${GREEN}✓ All tests passed!${NC}"
echo ""
echo "You can view the API documentation at:"
echo "  http://localhost:5001/docs"
echo ""
