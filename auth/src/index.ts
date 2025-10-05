validateToken(token: string): Promise<ValidateTokenResponse>


validateApiKey(apiKey: string): Promise<User | null>


createApiKey(input: ApiKeyCreateInput): Promise<CreateApiKeyResponse>


revokeApiKey(userId: string, keyId: string): Promise<boolean>


createSession(
  userId: string,
  device?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<SessionResponse>


getSession(sessionId: string): Promise<Session | null>


revokeSession(sessionId: string): Promise<boolean>


refreshSession(refreshToken: string): Promise<{
  token: string
  refreshToken: string
}>


checkPermission(check: PermissionCheck): Promise<boolean>


grantPermission(
  userId: string,
  resource: string,
  action: string,
  organizationId?: string
): Promise<boolean>


revokePermission(
  userId: string,
  resource: string,
  action: string,
  organizationId?: string
): Promise<boolean>


getWorkOSAuthURL(redirectUri: string, state?: string): Promise<string>


exchangeWorkOSCode(code: string): Promise<WorkOSAuthResponse>
