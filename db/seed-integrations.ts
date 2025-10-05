/**
 * Seed Integration Data - Phase 7 Universal API
 *
 * Seeds the integrations table with 3 sample providers:
 * - Stripe (payments)
 * - GitHub (code hosting)
 * - OpenWeather (weather data)
 *
 * Run with: pnpm tsx seed-integrations.ts
 */

import 'dotenv/config'
import { createClient } from '@clickhouse/client-web'

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_URL,
  database: process.env.CLICKHOUSE_DATABASE,
  username: process.env.CLICKHOUSE_USERNAME,
  password: process.env.CLICKHOUSE_PASSWORD,
})

const integrations = [
  {
    id: 'integration_stripe',
    provider: 'stripe',
    name: 'Stripe',
    base_url: 'https://api.stripe.com',
    oauth_config: JSON.stringify({
      authUrl: 'https://connect.stripe.com/oauth/authorize',
      tokenUrl: 'https://connect.stripe.com/oauth/token',
      clientId: process.env.STRIPE_CLIENT_ID || 'STRIPE_CLIENT_ID_PLACEHOLDER',
      scopes: ['read_write'],
    }),
    requires_oauth: true,
    api_docs_url: 'https://stripe.com/docs/api',
    rate_limit_per_min: 100,
    rate_limit_per_hour: 1000,
    ts: new Date(),
    ulid: `stripe_${Date.now()}`,
  },
  {
    id: 'integration_github',
    provider: 'github',
    name: 'GitHub',
    base_url: 'https://api.github.com',
    oauth_config: JSON.stringify({
      authUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      clientId: process.env.GITHUB_CLIENT_ID || 'GITHUB_CLIENT_ID_PLACEHOLDER',
      scopes: ['repo', 'user', 'gist'],
    }),
    requires_oauth: true,
    api_docs_url: 'https://docs.github.com/en/rest',
    rate_limit_per_min: 60,
    rate_limit_per_hour: 5000,
    ts: new Date(),
    ulid: `github_${Date.now()}`,
  },
  {
    id: 'integration_openweather',
    provider: 'openweather',
    name: 'OpenWeather',
    base_url: 'https://api.openweathermap.org/data/2.5',
    oauth_config: JSON.stringify({
      // OpenWeather uses API key instead of OAuth
      authType: 'api_key',
      apiKeyParam: 'appid',
    }),
    requires_oauth: false,
    api_docs_url: 'https://openweathermap.org/api',
    rate_limit_per_min: 60,
    rate_limit_per_hour: 1000,
    ts: new Date(),
    ulid: `openweather_${Date.now()}`,
  },
]

async function seed() {
  console.log('🌱 Seeding integrations...')

  try {
    await clickhouse.insert({
      table: 'integrations',
      values: integrations,
      format: 'JSONEachRow',
      clickhouse_settings: {
        enable_json_type: 1,
      },
    })

    console.log('✅ Successfully seeded 3 integrations:')
    console.log('  - Stripe (payments)')
    console.log('  - GitHub (code hosting)')
    console.log('  - OpenWeather (weather data)')

    // Verify insertion
    const result = await clickhouse.query({
      query: 'SELECT provider, name, base_url FROM integrations ORDER BY provider',
      format: 'JSON',
    })
    const data = await result.json()
    console.log('\n📊 Current integrations in database:')
    console.table(data.data)

  } catch (error) {
    console.error('❌ Failed to seed integrations:', error)
    process.exit(1)
  }
}

seed().then(() => {
  console.log('\n✅ Seed complete!')
  process.exit(0)
})
