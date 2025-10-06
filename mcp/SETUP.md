# MCP Server OAuth Setup

## Prerequisites

1. WorkOS account: https://dashboard.workos.com
2. Cloudflare account with Workers access
3. `wrangler` CLI installed
4. **Note**: Redirect URI `https://oauth.do/callback` is already configured in WorkOS

## Step 1: Verify WorkOS Configuration

1. Login to WorkOS dashboard
2. Go to **Redirects** section
3. Verify redirect URI exists: `https://oauth.do/callback`
4. Copy your credentials:
   - **Client ID**: `client_xxx`
   - **Client Secret** (or API Key): `sk_xxx`

## Step 2: Set Cloudflare Secrets

```bash
# Navigate to mcp worker directory
cd workers/mcp

# Set WorkOS Client ID
wrangler secret put WORKOS_CLIENT_ID
# Paste: client_xxx

# Set WorkOS Client Secret
wrangler secret put WORKOS_CLIENT_SECRET
# Paste: sk_xxx
```

## Step 3: Verify Deployment

```bash
# Check if secrets are set
wrangler secret list

# Test OAuth flow
curl https://oauth.do/authorize
# Should redirect to WorkOS login

# Or test via mcp.do (will redirect to oauth.do)
curl https://mcp.do/authorize
```

## Step 4: Connect ChatGPT

1. Open ChatGPT
2. Go to Settings → MCP Servers
3. Add new server: `https://mcp.do/sse`
4. ChatGPT will redirect to WorkOS for authentication
5. After auth, you'll have access to all tools

## Troubleshooting

### Redirect URI Mismatch
**Error**: "redirect_uri_mismatch"
**Fix**: Ensure `https://oauth.do/callback` is configured in WorkOS dashboard

### Missing Client ID
**Error**: "WORKOS_CLIENT_ID not configured"
**Fix**: Run `wrangler secret put WORKOS_CLIENT_ID`

### Authentication Failed
**Error**: "Invalid authorization code"
**Fix**: Check that WORKOS_CLIENT_SECRET is set correctly

## Testing Locally

```bash
# Create .dev.vars file
cat > .dev.vars << EOF
WORKOS_CLIENT_ID=client_xxx
WORKOS_CLIENT_SECRET=sk_xxx
EOF

# Start local dev server
pnpm dev

# Test OAuth flow
open http://localhost:8787/authorize
```

## Next Steps

Once OAuth is working:
1. Test all 49 tools in ChatGPT
2. Verify permission-based tool filtering
3. Enable admin-only tools for your account
4. Document any issues or improvements
