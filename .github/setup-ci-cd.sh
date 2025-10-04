#!/bin/bash

# CI/CD Setup Script for Workers Microservices
# This script helps you configure GitHub secrets and test the CI/CD pipeline

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 not found"
        return 1
    else
        print_success "$1 found"
        return 0
    fi
}

# Start
clear
print_header "🚀 CI/CD Setup for Workers Microservices"
echo ""

# Step 1: Check prerequisites
print_header "Step 1: Checking Prerequisites"
echo ""

PREREQ_FAILED=0

if check_command "gh"; then
    GH_VERSION=$(gh --version | head -n1)
    print_info "$GH_VERSION"
else
    PREREQ_FAILED=1
    print_error "Install: brew install gh"
fi

if check_command "git"; then
    GIT_VERSION=$(git --version)
    print_info "$GIT_VERSION"
else
    PREREQ_FAILED=1
fi

if check_command "wrangler"; then
    WRANGLER_VERSION=$(wrangler --version | head -n1)
    print_info "$WRANGLER_VERSION"
else
    print_warning "wrangler not found (optional but recommended)"
    print_info "Install: pnpm add -D wrangler"
fi

# Check gh authentication
echo ""
print_info "Checking GitHub CLI authentication..."
if gh auth status &> /dev/null; then
    print_success "GitHub CLI authenticated"
    GH_USER=$(gh api user --jq .login)
    print_info "Logged in as: $GH_USER"
else
    print_error "GitHub CLI not authenticated"
    print_info "Run: gh auth login"
    PREREQ_FAILED=1
fi

if [ $PREREQ_FAILED -eq 1 ]; then
    echo ""
    print_error "Prerequisites not met. Please install missing tools."
    exit 1
fi

echo ""
print_success "All prerequisites met!"
echo ""

# Step 2: Get Cloudflare credentials
print_header "Step 2: Cloudflare Credentials"
echo ""

print_info "You need two things from Cloudflare:"
echo "  1. Account ID"
echo "  2. API Token"
echo ""

# Check if wrangler is authenticated
if command -v wrangler &> /dev/null; then
    print_info "Checking wrangler authentication..."
    if wrangler whoami &> /dev/null; then
        print_success "Wrangler authenticated"
        echo ""
        print_info "You can get your Account ID from wrangler whoami"
        wrangler whoami | grep "Account ID"
    else
        print_warning "Wrangler not authenticated"
        print_info "Run: wrangler login"
    fi
fi

echo ""
print_info "Getting Cloudflare credentials:"
echo ""
echo "  Account ID:"
echo "    1. Go to: https://dash.cloudflare.com"
echo "    2. Click any domain"
echo "    3. Find 'Account ID' in right sidebar"
echo ""
echo "  API Token:"
echo "    1. Go to: https://dash.cloudflare.com/profile/api-tokens"
echo "    2. Click 'Create Token'"
echo "    3. Use 'Edit Cloudflare Workers' template"
echo "    4. Copy the token (shown only once!)"
echo ""

read -p "Press Enter when ready to continue..."
echo ""

# Prompt for credentials
read -p "Enter your Cloudflare Account ID: " ACCOUNT_ID
echo ""
read -sp "Enter your Cloudflare API Token: " API_TOKEN
echo ""
echo ""

if [ -z "$ACCOUNT_ID" ] || [ -z "$API_TOKEN" ]; then
    print_error "Account ID and API Token are required"
    exit 1
fi

print_success "Credentials received"
echo ""

# Step 3: Set GitHub secrets
print_header "Step 3: Setting GitHub Secrets"
echo ""

print_info "Setting CLOUDFLARE_ACCOUNT_ID..."
echo "$ACCOUNT_ID" | gh secret set CLOUDFLARE_ACCOUNT_ID
print_success "CLOUDFLARE_ACCOUNT_ID set"

print_info "Setting CLOUDFLARE_API_TOKEN..."
echo "$API_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN
print_success "CLOUDFLARE_API_TOKEN set"

echo ""
print_info "Verifying secrets..."
gh secret list
echo ""

print_success "GitHub secrets configured!"
echo ""

# Step 4: Test CI workflow
print_header "Step 4: Test CI/CD Workflow"
echo ""

print_info "We'll create a test commit to trigger the CI workflow"
echo ""
read -p "Press Enter to create test commit and push..."

# Create test commit
git commit --allow-empty -m "test: Verify CI/CD workflows" || true
git push

echo ""
print_success "Test commit pushed!"
echo ""

print_info "Starting workflow monitoring..."
echo ""
print_info "This will take ~5-10 minutes"
echo ""
print_info "You can also view in browser:"
echo "  https://github.com/dot-do/workers/actions"
echo ""

# Watch workflow (will block until complete)
gh run watch || true

echo ""
print_header "✓ Setup Complete!"
echo ""

print_success "CI/CD pipeline is now configured and tested"
echo ""

print_info "Next steps:"
echo "  1. Review workflow results: gh run view --log"
echo "  2. Deploy to staging: gh workflow run deploy.yml --field service=all --field environment=staging"
echo "  3. Configure monitoring (optional): gh secret set CODECOV_TOKEN"
echo ""

print_info "Documentation:"
echo "  • Setup Guide: .github/SETUP_GUIDE.md"
echo "  • CI/CD Guide: .github/CI_CD_GUIDE.md"
echo "  • Secrets: .github/SECRETS.md"
echo ""

print_success "All done! 🎉"
