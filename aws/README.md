# AWS Integration Worker

Complete AWS integration for the .do platform with OAuth authentication via AWS Cognito and service wrappers for S3, Lambda, and more.

## Features

- **AWS Cognito OAuth 2.0** - Complete OAuth flow with authorization code grant
- **Automatic Token Refresh** - Transparent token refresh before expiration
- **S3 Integration** - List buckets, list objects, get/put/delete objects
- **Lambda Integration** - List functions, get function details, invoke functions
- **Credential Management** - Temporary AWS credentials via Cognito Identity Pools
- **KV Caching** - Fast token and credential caching
- **Database Persistence** - Long-term connection storage

## Architecture

```
User → OAuth Flow → AWS Cognito
                      ↓
                 Access Token + ID Token + Refresh Token
                      ↓
              Store in KV + Database
                      ↓
         Get AWS Credentials (via Cognito Identity)
                      ↓
              AWS SDK Clients (S3, Lambda, etc.)
```

## OAuth Flow

### 1. Initiate OAuth Flow

```bash
curl https://aws.services.do/connect \
  -H "X-User-Id: user_123" \
  -d "redirect_uri=https://app.do/oauth/aws/callback"
```

Response:
```json
{
  "success": true,
  "data": {
    "authUrl": "https://<domain>.auth.us-east-1.amazoncognito.com/oauth2/authorize?...",
    "state": "random-state-string"
  }
}
```

### 2. User Authorizes

User is redirected to AWS Cognito hosted UI to sign in and authorize.

### 3. Handle Callback

```bash
curl -X POST https://aws.services.do/callback \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "code": "authorization_code_from_cognito",
    "redirectUri": "https://app.do/oauth/aws/callback",
    "cognitoDomain": "my-domain"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "accessToken": "eyJraWQiOi...",
    "refreshToken": "eyJjdHkiOi...",
    "idToken": "eyJraWQiOi...",
    "expiresAt": 1735689000000,
    "region": "us-east-1",
    "cognitoDomain": "my-domain",
    "createdAt": 1735685400000,
    "updatedAt": 1735685400000
  },
  "timestamp": 1735685400000
}
```

## RPC Interface

### Connect Account

```typescript
const result = await env.AWS_SERVICE.connect(
  'user_123',
  'authorization_code',
  'https://app.do/oauth/aws/callback',
  'my-cognito-domain' // optional
)
```

### Disconnect Account

```typescript
const result = await env.AWS_SERVICE.disconnect('user_123')
```

### Get Connection

```typescript
const result = await env.AWS_SERVICE.getConnection('user_123')
```

### List S3 Buckets

```typescript
const result = await env.AWS_SERVICE.listBuckets('user_123')

// result.data = [
//   { name: 'my-bucket-1', creationDate: Date },
//   { name: 'my-bucket-2', creationDate: Date }
// ]
```

### List S3 Objects

```typescript
const result = await env.AWS_SERVICE.listObjects('user_123', 'my-bucket', 'prefix/', 100)

// result.data = {
//   objects: [
//     { key: 'file1.txt', size: 1024, lastModified: Date, etag: '...' }
//   ],
//   nextToken?: 'pagination-token'
// }
```

### List Lambda Functions

```typescript
const result = await env.AWS_SERVICE.listFunctions('user_123', 50)

// result.data = {
//   functions: [
//     {
//       functionName: 'my-function',
//       functionArn: 'arn:aws:lambda:...',
//       runtime: 'nodejs20.x',
//       handler: 'index.handler',
//       ...
//     }
//   ],
//   nextToken?: 'pagination-token'
// }
```

### Get Lambda Function

```typescript
const result = await env.AWS_SERVICE.getFunction('user_123', 'my-function')

// result.data = {
//   functionName: 'my-function',
//   functionArn: 'arn:aws:lambda:...',
//   runtime: 'nodejs20.x',
//   timeout: 30,
//   memorySize: 512,
//   ...
// }
```

### Invoke Lambda Function

```typescript
const result = await env.AWS_SERVICE.invokeLambda('user_123', 'my-function', {
  key: 'value',
})

// result.data = {
//   statusCode: 200,
//   payload: { result: 'success' },
//   logResult: 'START RequestId: ...',
//   executedVersion: '$LATEST'
// }
```

## HTTP API

### Connect

```bash
GET /connect?redirect_uri=https://app.do/oauth/callback
Headers: X-User-Id: user_123
```

### Callback

```bash
POST /callback
Body: { userId, code, redirectUri, cognitoDomain? }
```

### Disconnect

```bash
POST /disconnect
Headers: X-User-Id: user_123
```

### List S3 Buckets

```bash
GET /s3/buckets
Headers: X-User-Id: user_123
```

### List S3 Objects

```bash
GET /s3/buckets/{bucket}/objects?prefix=folder/&limit=100
Headers: X-User-Id: user_123
```

### List Lambda Functions

```bash
GET /lambda/functions?limit=50
Headers: X-User-Id: user_123
```

### Get Lambda Function

```bash
GET /lambda/functions/{name}
Headers: X-User-Id: user_123
```

### Invoke Lambda Function

```bash
POST /lambda/functions/{name}/invoke
Headers: X-User-Id: user_123
Body: { payload: { key: "value" } }
```

## Configuration

### Environment Variables

Add to `.dev.vars`:

```bash
AWS_COGNITO_DOMAIN=my-domain
AWS_COGNITO_CLIENT_ID=1example23456789
AWS_COGNITO_CLIENT_SECRET=secret-value-here
AWS_REGION=us-east-1
```

### Service Bindings

Configure in `wrangler.jsonc`:

```jsonc
{
  "services": [
    { "binding": "DB", "service": "db" },
    { "binding": "AUTH", "service": "auth" }
  ],
  "kv_namespaces": [
    { "binding": "AWS_CACHE", "id": "your-kv-id" }
  ]
}
```

## Setup

### 1. Create Cognito User Pool

```bash
aws cognito-idp create-user-pool \
  --pool-name my-user-pool \
  --region us-east-1
```

### 2. Create Cognito Domain

```bash
aws cognito-idp create-user-pool-domain \
  --user-pool-id us-east-1_ABC123456 \
  --domain my-domain \
  --region us-east-1
```

### 3. Create App Client

```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id us-east-1_ABC123456 \
  --client-name my-app \
  --generate-secret \
  --allowed-o-auth-flows authorization_code_grant \
  --allowed-o-auth-scopes openid email profile \
  --callback-urls https://app.do/oauth/aws/callback \
  --allowed-o-auth-flows-user-pool-client \
  --region us-east-1
```

### 4. Create Identity Pool (for AWS Credentials)

```bash
aws cognito-identity create-identity-pool \
  --identity-pool-name my-identity-pool \
  --allow-unauthenticated-identities false \
  --cognito-identity-providers \
    ProviderName=cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123456,ClientId=1example23456789
```

### 5. Create IAM Role for Authenticated Users

```bash
aws iam create-role \
  --role-name CognitoAuthRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Federated": "cognito-identity.amazonaws.com" },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": { "cognito-identity.amazonaws.com:aud": "IDENTITY_POOL_ID" },
        "ForAnyValue:StringLike": { "cognito-identity.amazonaws.com:amr": "authenticated" }
      }
    }]
  }'

# Attach policies for S3, Lambda access
aws iam attach-role-policy \
  --role-name CognitoAuthRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

aws iam attach-role-policy \
  --role-name CognitoAuthRole \
  --policy-arn arn:aws:iam::aws:policy/AWSLambda_ReadOnlyAccess
```

## Token Management

### Automatic Refresh

Tokens are automatically refreshed when:
- Access token is within 1 minute of expiration
- Any API call is made requiring AWS credentials

### Manual Refresh

```typescript
import { ensureValidConnection } from './cognito'

const connection = await ensureValidConnection(env, userId, cognito)
// Connection now has fresh tokens
```

### Caching

- **KV Cache** - Access tokens and credentials cached for fast access
- **Database** - Refresh tokens and connection metadata persisted
- **TTL** - Cache expires 1 hour before token expiration

## Error Handling

All methods return `ApiResponse<T>`:

```typescript
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  code?: string
  timestamp: number
}
```

Error codes:
- `CONNECT_FAILED` - OAuth connection failed
- `DISCONNECT_FAILED` - Disconnect operation failed
- `LIST_BUCKETS_FAILED` - S3 bucket listing failed
- `LIST_OBJECTS_FAILED` - S3 object listing failed
- `LIST_FUNCTIONS_FAILED` - Lambda function listing failed
- `GET_FUNCTION_FAILED` - Lambda function details failed
- `INVOKE_LAMBDA_FAILED` - Lambda invocation failed

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Deploy
pnpm deploy
```

## Testing

```bash
# Health check
curl https://aws.services.do/health

# Initiate OAuth (requires valid user ID)
curl https://aws.services.do/connect?redirect_uri=https://app.do/callback \
  -H "X-User-Id: user_123"

# List S3 buckets (requires connected account)
curl https://aws.services.do/s3/buckets \
  -H "X-User-Id: user_123"

# Invoke Lambda function
curl -X POST https://aws.services.do/lambda/functions/my-function/invoke \
  -H "X-User-Id: user_123" \
  -H "Content-Type: application/json" \
  -d '{"payload": {"test": true}}'
```

## Security

- **OAuth 2.0** - Authorization code grant with client secret
- **Token Encryption** - Tokens stored encrypted in database
- **Automatic Refresh** - Tokens refreshed before expiration
- **KV Caching** - Fast access without database queries
- **Temporary Credentials** - AWS credentials expire after 1 hour
- **No Long-Term Keys** - No AWS access keys stored

## See Also

- [AWS Cognito OAuth Guide](/notes/2025-10-04-aws-cognito-oauth-setup-guide.md)
- [Master OAuth Plan](/notes/2025-10-04-master-oauth-integration-plan.md)
- [Workers Architecture](/workers/CLAUDE.md)

---

**Status:** Complete
**Version:** 1.0.0
**Last Updated:** 2025-10-04
