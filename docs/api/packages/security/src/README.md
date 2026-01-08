[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / packages/security/src

# packages/security/src

## Classes

- [BoundedSet](classes/BoundedSet.md)
- [BoundedMap](classes/BoundedMap.md)
- [SqlInjectionError](classes/SqlInjectionError.md)
- [PrototypePollutionError](classes/PrototypePollutionError.md)

## Interfaces

- [BoundedSetStats](interfaces/BoundedSetStats.md)
- [BoundedSetOptions](interfaces/BoundedSetOptions.md)
- [BoundedMapOptions](interfaces/BoundedMapOptions.md)
- [SqlInjectionResult](interfaces/SqlInjectionResult.md)
- [SanitizeOptions](interfaces/SanitizeOptions.md)
- [ParameterizedQuery](interfaces/ParameterizedQuery.md)
- [PrototypePollutionResult](interfaces/PrototypePollutionResult.md)
- [CspDirectives](interfaces/CspDirectives.md)

## Type Aliases

- [EvictionPolicy](type-aliases/EvictionPolicy.md)

## Functions

- [createBoundedSet](functions/createBoundedSet.md)
- [createBoundedMap](functions/createBoundedMap.md)
- [detectSqlInjection](functions/detectSqlInjection.md)
- [sanitizeInput](functions/sanitizeInput.md)
- [createParameterizedQuery](functions/createParameterizedQuery.md)
- [escapeString](functions/escapeString.md)
- [isValidIdentifier](functions/isValidIdentifier.md)
- [hasPrototypePollutionKey](functions/hasPrototypePollutionKey.md)
- [detectPrototypePollution](functions/detectPrototypePollution.md)
- [safeDeepClone](functions/safeDeepClone.md)
- [safeDeepMerge](functions/safeDeepMerge.md)
- [safeJsonParse](functions/safeJsonParse.md)
- [freezePrototypes](functions/freezePrototypes.md)
- [encodeHtmlEntities](functions/encodeHtmlEntities.md)
- [decodeHtmlEntities](functions/decodeHtmlEntities.md)
- [detectScriptTags](functions/detectScriptTags.md)
- [escapeScriptTags](functions/escapeScriptTags.md)
- [sanitizeEventHandlers](functions/sanitizeEventHandlers.md)
- [isValidUrl](functions/isValidUrl.md)
- [isJavaScriptUrl](functions/isJavaScriptUrl.md)
- [sanitizeUrl](functions/sanitizeUrl.md)
- [generateCspHeader](functions/generateCspHeader.md)
- [createCspNonce](functions/createCspNonce.md)
