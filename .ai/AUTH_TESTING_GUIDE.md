# Authentication Guide - Development Mode

## 🔑 How Authentication Currently Works

The API uses a **simplified placeholder authentication** for development. Any valid UUID is accepted as a Bearer token and treated as the user_id.

⚠️ **WARNING:** This is NOT secure. Production requires proper Supabase Auth with JWT validation.

## 📝 Quick Start

### 1. Generate a Test User ID

```bash
# Option 1: Using uuidgen (macOS/Linux)
uuidgen

# Option 2: Using Python
python3 -c 'import uuid; print(uuid.uuid4())'

# Option 3: Use pre-defined test UUIDs
# User 1: 550e8400-e29b-41d4-a716-446655440000
# User 2: 660e8400-e29b-41d4-a716-446655440000
```

### 2. Use as Bearer Token in curl

```bash
curl -X GET "http://localhost:5001/api/projects/{project_id}/messages" \
  -H "Authorization: Bearer 550e8400-e29b-41d4-a716-446655440000"
```

## 🧪 Complete Testing Workflow

### Step 1: Create a Project

```bash
# Replace YOUR-UUID with your test user ID
curl -X POST "http://localhost:5001/api/projects/" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Dream House",
    "location": "Warsaw, Poland",
    "current_phase": "LAND_SELECTION"
  }'

# Response will include project_id - save it!
```

### Step 2: List Messages for the Project

```bash
# Use the project_id from Step 1
curl -X GET "http://localhost:5001/api/projects/{project_id}/messages" \
  -H "Authorization: Bearer 550e8400-e29b-41d4-a716-446655440000"
```

### Step 3: Test Pagination

```bash
# Get first page with 10 items
curl -X GET "http://localhost:5001/api/projects/{project_id}/messages?page=1&limit=10" \
  -H "Authorization: Bearer 550e8400-e29b-41d4-a716-446655440000"
```

### Step 4: Test Timestamp Filters

```bash
# Get messages before a specific time
curl -X GET "http://localhost:5001/api/projects/{project_id}/messages?before=2026-01-05T00:00:00Z" \
  -H "Authorization: Bearer 550e8400-e29b-41d4-a716-446655440000"
```

## 🎯 Testing Different Scenarios

### ✅ Valid Request
```bash
curl -X GET "http://localhost:5001/api/projects/{project_id}/messages" \
  -H "Authorization: Bearer 550e8400-e29b-41d4-a716-446655440000"

# Expected: 200 OK with message list
```

### ❌ Missing Authentication
```bash
curl -X GET "http://localhost:5001/api/projects/{project_id}/messages"

# Expected: 401 Unauthorized
# Response: {"detail": "Authentication required"}
```

### ❌ Invalid Token Format
```bash
curl -X GET "http://localhost:5001/api/projects/{project_id}/messages" \
  -H "Authorization: Bearer not-a-valid-uuid"

# Expected: 401 Unauthorized
# Response: {"detail": "Invalid or expired token"}
```

### ❌ Wrong User (Authorization Error)
```bash
# Try to access another user's project
curl -X GET "http://localhost:5001/api/projects/{project_id}/messages" \
  -H "Authorization: Bearer 660e8400-e29b-41d4-a716-446655440000"

# Expected: 403 Forbidden
# Response: {"detail": "Access denied to this project"}
```

### ❌ Non-existent Project
```bash
curl -X GET "http://localhost:5001/api/projects/00000000-0000-0000-0000-000000000000/messages" \
  -H "Authorization: Bearer 550e8400-e29b-41d4-a716-446655440000"

# Expected: 404 Not Found
# Response: {"detail": "Project not found"}
```

## 🔧 Setting Up Test Data

### Create Multiple Users and Projects

```bash
#!/bin/bash
API="http://localhost:5001/api"

# User 1
USER1="550e8400-e29b-41d4-a716-446655440000"
PROJECT1=$(curl -s -X POST "$API/projects/" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$USER1\",\"name\":\"House Project 1\",\"current_phase\":\"LAND_SELECTION\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo "User 1: $USER1"
echo "Project 1: $PROJECT1"

# User 2
USER2="660e8400-e29b-41d4-a716-446655440000"
PROJECT2=$(curl -s -X POST "$API/projects/" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$USER2\",\"name\":\"House Project 2\",\"current_phase\":\"FOUNDATION\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo "User 2: $USER2"
echo "Project 2: $PROJECT2"
```

### Insert Test Messages

```bash
# Insert messages directly via Supabase REST API
APIKEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

curl -X POST "http://localhost:54321/rest/v1/messages" \
  -H "apikey: $APIKEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{
    \"project_id\": \"$PROJECT1\",
    \"user_id\": \"$USER1\",
    \"role\": \"user\",
    \"content\": \"What permits do I need?\",
    \"routing_metadata\": {}
  }"
```

## 📚 Response Examples

### Successful Message List
```json
{
  "data": [
    {
      "id": "8412bce3-6015-4284-a7b3-98b54add88aa",
      "project_id": "387d96a1-ee23-4845-b702-41b6c8f5cb03",
      "role": "user",
      "content": "What permits do I need?",
      "agent_id": null,
      "csat_rating": null,
      "created_at": "2026-01-04T19:46:46.201208Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_items": 1,
    "total_pages": 1
  }
}
```

### Error Response (401)
```json
{
  "detail": "Authentication required"
}
```

### Error Response (403)
```json
{
  "detail": "Access denied to this project"
}
```

## 🔒 Migration to Production Auth

When ready for production, replace the placeholder auth with Supabase Auth:

```python
# app/api/dependencies.py (Future Implementation)
async def get_current_user(
    authorization: str = Header(None)
) -> UUID:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    token = authorization.split()[1]
    
    # Proper Supabase Auth validation
    try:
        user = await supabase.auth.get_user(token)
        return UUID(user.id)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
```

### Getting Real Supabase Tokens

In production, users will:
1. Sign up via Supabase Auth
2. Receive a JWT token on login
3. Frontend stores token and includes in all API requests
4. Backend validates JWT signature and extracts user_id

## 🎯 Useful Resources

- **API Documentation:** http://localhost:5001/docs
- **Supabase Studio:** http://127.0.0.1:54323
- **Backend API:** http://localhost:5001

## 💡 Tips

1. **Save Your Test UUIDs:** Keep a list of test user IDs for consistent testing
2. **Use Environment Variables:** Store tokens in `.env` files for scripts
3. **Check Logs:** `docker logs homebuild-backend` shows auth attempts
4. **Clear State:** Delete projects/messages between tests for clean slate

```bash
# Clear all test data
docker exec supabase_db_HouseBuildingAssistant psql -U postgres -d postgres -c "
  DELETE FROM messages;
  DELETE FROM projects;
"
```

---

**Last Updated:** 2026-01-04  
**Status:** Development Mode Only - Not Production Ready

