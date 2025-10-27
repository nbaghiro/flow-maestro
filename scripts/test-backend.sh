#!/bin/bash

echo "🧪 Testing FlowMaestro Backend API"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3001"

# Test 1: Health Check
echo "1. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s $BASE_URL/health)
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✓${NC} Health check passed"
else
    echo -e "${RED}✗${NC} Health check failed"
    echo "$HEALTH_RESPONSE"
    exit 1
fi
echo ""

# Test 2: Register User
echo "2. Testing user registration..."
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test-$(date +%s)@example.com\",\"password\":\"password123\",\"name\":\"Test User\"}")

if echo "$REGISTER_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✓${NC} Registration successful"
    TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
    USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":"[^"]*' | grep -o '[^"]*$' | head -1)
    echo "   Token: ${TOKEN:0:20}..."
    echo "   User ID: $USER_ID"
else
    echo -e "${RED}✗${NC} Registration failed"
    echo "$REGISTER_RESPONSE"
    exit 1
fi
echo ""

# Test 3: Create Workflow
echo "3. Testing workflow creation..."
WORKFLOW_RESPONSE=$(curl -s -X POST $BASE_URL/api/workflows \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Test Workflow",
        "description": "A test workflow created by the test script",
        "definition": {
            "name": "Test Workflow",
            "nodes": {
                "node_1": {
                    "type": "user-input",
                    "name": "Get Input",
                    "config": {
                        "prompt": "Enter your name"
                    },
                    "position": {"x": 100, "y": 100}
                }
            },
            "edges": [],
            "entryPoint": "node_1"
        }
    }')

if echo "$WORKFLOW_RESPONSE" | grep -q "Test Workflow"; then
    echo -e "${GREEN}✓${NC} Workflow creation successful"
    WORKFLOW_ID=$(echo "$WORKFLOW_RESPONSE" | grep -o '"id":"[^"]*' | grep -o '[^"]*$' | head -1)
    echo "   Workflow ID: $WORKFLOW_ID"
else
    echo -e "${RED}✗${NC} Workflow creation failed"
    echo "$WORKFLOW_RESPONSE"
    exit 1
fi
echo ""

# Test 4: Get Workflow
echo "4. Testing workflow retrieval..."
GET_RESPONSE=$(curl -s $BASE_URL/api/workflows/$WORKFLOW_ID \
    -H "Authorization: Bearer $TOKEN")

if echo "$GET_RESPONSE" | grep -q "Test Workflow"; then
    echo -e "${GREEN}✓${NC} Workflow retrieval successful"
else
    echo -e "${RED}✗${NC} Workflow retrieval failed"
    echo "$GET_RESPONSE"
    exit 1
fi
echo ""

# Test 5: List Workflows
echo "5. Testing workflow listing..."
LIST_RESPONSE=$(curl -s "$BASE_URL/api/workflows?limit=10&offset=0" \
    -H "Authorization: Bearer $TOKEN")

if echo "$LIST_RESPONSE" | grep -q "items"; then
    echo -e "${GREEN}✓${NC} Workflow listing successful"
    COUNT=$(echo "$LIST_RESPONSE" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
    echo "   Total workflows: $COUNT"
else
    echo -e "${RED}✗${NC} Workflow listing failed"
    echo "$LIST_RESPONSE"
    exit 1
fi
echo ""

# Test 6: Update Workflow
echo "6. Testing workflow update..."
UPDATE_RESPONSE=$(curl -s -X PUT $BASE_URL/api/workflows/$WORKFLOW_ID \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Updated Test Workflow",
        "description": "Updated description"
    }')

if echo "$UPDATE_RESPONSE" | grep -q "Updated Test Workflow"; then
    echo -e "${GREEN}✓${NC} Workflow update successful"
else
    echo -e "${RED}✗${NC} Workflow update failed"
    echo "$UPDATE_RESPONSE"
    exit 1
fi
echo ""

# Test 7: Delete Workflow
echo "7. Testing workflow deletion..."
DELETE_RESPONSE=$(curl -s -w "%{http_code}" -X DELETE $BASE_URL/api/workflows/$WORKFLOW_ID \
    -H "Authorization: Bearer $TOKEN")

if echo "$DELETE_RESPONSE" | grep -q "204"; then
    echo -e "${GREEN}✓${NC} Workflow deletion successful"
else
    echo -e "${RED}✗${NC} Workflow deletion failed"
    echo "$DELETE_RESPONSE"
    exit 1
fi
echo ""

echo "=================================="
echo -e "${GREEN}✅ All tests passed!${NC}"
echo "=================================="
