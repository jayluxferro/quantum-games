#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "    Build Verification Script"
echo "========================================"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$ROOT_DIR"

FAILED=0

verify_build() {
    local service=$1
    local dir=$2
    local expected_output=$3
    
    echo ""
    echo -e "${YELLOW}Building $service...${NC}"
    
    cd "$dir"
    
    if ! pnpm install --no-frozen-lockfile > /dev/null 2>&1; then
        echo -e "${RED}✗ $service: pnpm install failed${NC}"
        FAILED=1
        cd "$ROOT_DIR"
        return 1
    fi
    
    if ! pnpm build > /dev/null 2>&1; then
        echo -e "${RED}✗ $service: pnpm build failed${NC}"
        FAILED=1
        cd "$ROOT_DIR"
        return 1
    fi
    
    if [ ! -f "$expected_output" ]; then
        echo -e "${RED}✗ $service: $expected_output not found${NC}"
        FAILED=1
        cd "$ROOT_DIR"
        return 1
    fi
    
    echo -e "${GREEN}✓ $service: Build successful${NC}"
    cd "$ROOT_DIR"
    return 0
}

# Verify multiplayer service
verify_build "multiplayer" "$ROOT_DIR/apps/multiplayer" "dist/index.js"

# Verify LTI service
verify_build "lti" "$ROOT_DIR/apps/lti" "dist/index.js"

# Verify web frontend
echo ""
echo -e "${YELLOW}Building web frontend...${NC}"
cd "$ROOT_DIR/apps/web"
if ! pnpm install --no-frozen-lockfile > /dev/null 2>&1; then
    echo -e "${RED}✗ web: pnpm install failed${NC}"
    FAILED=1
else
    if ! pnpm build > /dev/null 2>&1; then
        echo -e "${RED}✗ web: pnpm build failed${NC}"
        FAILED=1
    else
        if [ ! -d "dist" ]; then
            echo -e "${RED}✗ web: dist directory not found${NC}"
            FAILED=1
        else
            echo -e "${GREEN}✓ web: Build successful${NC}"
        fi
    fi
fi

cd "$ROOT_DIR"

echo ""
echo "========================================"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All builds passed!${NC}"
    exit 0
else
    echo -e "${RED}Some builds failed!${NC}"
    exit 1
fi
