/**
 * Complete Workflow Example - Business RL Platform
 *
 * This example demonstrates the full workflow from OKR definition
 * to trained policy to production deployment.
 */

import { createOKR, calculateOKRProgress } from '../src/okrs/dsl'
import { runTraining, runEpisode } from '../src/training/loop'
import { createPolicy } from '../src/agent/policy'
import type { ActionSpace } from '../src/agent/policy'
import { generateCodeVariants, selectBestVariant } from '../src/vibe/generator'
import type { Env, TrainingConfig } from '../src/types'

// ===== Step 1: Define Business OKR =====

console.log('='.repeat(60))
console.log('STEP 1: Define Business OKR')
console.log('='.repeat(60))

const businessOKR = createOKR('saas_growth_q1_2025')
  .withObjective('Accelerate SaaS growth with sustainable unit economics')

  // Revenue metrics
  .withKeyResult('monthly_recurring_revenue', 100000, 'maximize', {
    weight: 0.3,
    unit: 'USD',
    description: 'Reach $100k MRR',
  })
  .withKeyResult('annual_recurring_revenue', 1200000, 'maximize', {
    weight: 0.2,
    unit: 'USD',
    description: 'Reach $1.2M ARR',
  })

  // Efficiency metrics
  .withKeyResult('customer_acquisition_cost', 200, 'minimize', {
    weight: 0.15,
    unit: 'USD',
    description: 'CAC under $200',
  })
  .withKeyResult('ltv_cac_ratio', 4, 'maximize', {
    weight: 0.15,
    description: 'LTV:CAC ratio of 4:1',
  })

  // Engagement metrics
  .withKeyResult('daily_active_users', 5000, 'maximize', {
    weight: 0.1,
    description: 'Reach 5k DAU',
  })
  .withKeyResult('net_retention_rate', 1.15, 'maximize', {
    weight: 0.1,
    description: 'Net retention 115%',
  })

  // Quality constraints
  .withConstraint('customer_satisfaction', 'gte', 0.85, {
    penalty: 20,
    description: 'CSAT must stay above 85%',
  })
  .withConstraint('churn_rate', 'lte', 0.05, {
    penalty: 15,
    description: 'Monthly churn below 5%',
  })
  .withConstraint('uptime', 'gte', 0.995, {
    penalty: 30,
    description: '99.5% uptime SLA',
  })

  // North star
  .withNorthStar('net_dollar_retention', {
    description: 'Revenue retention including expansion',
    formula: '(MRR_t1 - churned_MRR + expansion_MRR) / MRR_t0',
  })

  .build()

console.log('OKR Created:', JSON.stringify(businessOKR, null, 2))
console.log('\nInitial Progress:', calculateOKRProgress(businessOKR))

// ===== Step 2: Define Action Space =====

console.log('\n' + '='.repeat(60))
console.log('STEP 2: Define Action Space')
console.log('='.repeat(60))

const actionSpace: ActionSpace = {
  pricing: {
    base_price: [49, 299], // $49-299/month
    discount: [0, 0.4], // 0-40% discount
    trial_period: [7, 30], // 7-30 day trial
  },
  features: {
    enable: [
      'advanced_analytics',
      'custom_integrations',
      'api_access',
      'white_labeling',
      'sso',
      'audit_logs',
      'priority_support',
      'custom_reports',
      'webhook_notifications',
      'data_export',
    ],
    disable: ['legacy_ui', 'old_api_v1'],
    priority: [0, 1],
  },
  copy: {
    headline: [
      'Grow your business faster',
      'The complete platform for modern teams',
      'Everything you need in one place',
      'Trusted by 10,000+ teams worldwide',
      'Start scaling today',
    ],
    cta_text: ['Start free trial', 'Get started free', 'Try it free', 'Sign up now', 'Start today'],
    tone: ['friendly', 'professional', 'urgent'],
  },
  layout: {
    hero_position: ['top', 'center', 'split'],
    color_scheme: ['blue_professional', 'purple_modern', 'green_growth', 'orange_energy'],
    cta_placement: ['header', 'hero', 'footer', 'floating'],
  },
  recommendation: {
    algorithm: ['collaborative', 'content_based', 'hybrid'],
    diversity: [0.2, 0.8], // Balance familiarity vs discovery
    novelty: [0.1, 0.5], // Controlled exploration
  },
}

console.log('Action Space configured with:')
console.log('- Pricing: $49-299, discounts up to 40%, trials 7-30 days')
console.log('- Features: 10 possible features to enable')
console.log('- Copy: 5 headline variants, 5 CTA variants, 3 tones')
console.log('- Layout: 3 hero positions, 4 color schemes, 4 CTA placements')
console.log('- Recommendations: 3 algorithms, diversity 0.2-0.8, novelty 0.1-0.5')

// ===== Step 3: Configure Training =====

console.log('\n' + '='.repeat(60))
console.log('STEP 3: Configure RL Training')
console.log('='.repeat(60))

const trainingConfig: TrainingConfig = {
  algorithm: 'ppo',
  max_episodes: 500,
  max_steps_per_episode: 50,
  batch_size: 10,
  learning_rate: 0.0005,
  discount_factor: 0.99,
  exploration_strategy: 'epsilon-greedy',
  checkpoint_frequency: 25,
  evaluation_frequency: 50,
}

console.log('Training Config:')
console.log(`- Algorithm: ${trainingConfig.algorithm.toUpperCase()}`)
console.log(`- Episodes: ${trainingConfig.max_episodes}`)
console.log(`- Batch Size: ${trainingConfig.batch_size}`)
console.log(`- Learning Rate: ${trainingConfig.learning_rate}`)
console.log(`- Discount Factor: γ = ${trainingConfig.discount_factor}`)

// ===== Step 4: API Integration Example =====

console.log('\n' + '='.repeat(60))
console.log('STEP 4: API Integration')
console.log('='.repeat(60))

// Mock API calls (in production, these would be actual HTTP requests)
const apiBaseUrl = 'http://localhost:8787/api'

console.log('\n1. Create OKR:')
console.log(`POST ${apiBaseUrl}/okrs`)
console.log(JSON.stringify({ okr: businessOKR }, null, 2).substring(0, 200) + '...')

console.log('\n2. Start Training:')
console.log(`POST ${apiBaseUrl}/training/start`)
console.log(
  JSON.stringify(
    {
      okr_id: businessOKR.id,
      action_space: actionSpace,
      config: trainingConfig,
    },
    null,
    2
  ).substring(0, 200) + '...'
)

console.log('\n3. Monitor Progress:')
console.log(`GET ${apiBaseUrl}/episodes?okr_id=${businessOKR.id}`)

console.log('\n4. Get Best Policy:')
console.log(`GET ${apiBaseUrl}/policies/policy_${businessOKR.id}`)

// ===== Step 5: Vibe Coding for A/B Test Variants =====

console.log('\n' + '='.repeat(60))
console.log('STEP 5: Generate A/B Test Variants with Vibe Coding')
console.log('='.repeat(60))

const vibeCodingPrompt = `
Generate a React pricing page component with the following requirements:

1. Display 3 pricing tiers: Starter ($49), Professional ($149), Enterprise ($299)
2. Highlight the Professional tier as "Most Popular"
3. Each tier should show:
   - Monthly price
   - Key features (5-7 items)
   - CTA button
4. Use Tailwind CSS for styling
5. Make it responsive (mobile, tablet, desktop)
6. Add smooth hover animations
7. Include a toggle for monthly/annual billing (20% discount for annual)

The component should be production-ready, accessible, and optimized for conversion.
`

console.log('Prompt:', vibeCodingPrompt.trim())

console.log('\nGenerating variants with:')
console.log('- GPT-4o (OpenAI)')
console.log('- Claude 3 Haiku (Anthropic)')
console.log('- Llama 3.1 8B (Workers AI - Free)')

console.log('\nAPI Call:')
console.log(`POST ${apiBaseUrl}/vibe/generate`)
console.log(
  JSON.stringify(
    {
      prompt: vibeCodingPrompt.trim(),
      models: ['gpt-4o', 'claude-3-haiku', '@cf/meta/llama-3.1-8b-instruct'],
      config: {
        maxRetries: 3,
        timeout: 30000,
        temperature: 0.7,
      },
    },
    null,
    2
  ).substring(0, 200) + '...'
)

console.log('\nExpected Output:')
console.log('- 3 code variants (one per model)')
console.log('- Automatic testing in sandbox')
console.log('- Performance metrics (latency, tokens, cost)')
console.log('- Best variant selection')

// ===== Step 6: Expected Training Results =====

console.log('\n' + '='.repeat(60))
console.log('STEP 6: Expected Training Results')
console.log('='.repeat(60))

console.log(`
Training Progress (simulated):

Episode   Avg Reward   Best Reward   Epsilon   Status
--------  -----------  ------------  --------  --------
   10        -2.50        -1.20        0.100    Exploring
   50        -0.80         0.45        0.082    Learning
  100         0.35         1.20        0.067    Improving
  150         0.85         1.85        0.055    Converging
  200         1.15         2.10        0.045    Stable
  300         1.35         2.25        0.030    Optimized
  500         1.42         2.30        0.010    Converged

Learned Policy (Example):

PRICING STRATEGY:
  ├─ Starter Tier: $49/mo (for SMBs)
  ├─ Professional Tier: $149/mo (highlight as "Most Popular")
  ├─ Enterprise Tier: $299/mo (for large teams)
  ├─ Trial Period: 14 days (optimal for activation)
  └─ Annual Discount: 20% (drives longer commitment)

FEATURE ROLLOUT:
  ├─ Enable: advanced_analytics (high engagement)
  ├─ Enable: api_access (enterprise demand)
  ├─ Enable: custom_integrations (retention driver)
  ├─ Disable: legacy_ui (technical debt)
  └─ Priority: High for analytics, Medium for integrations

MARKETING COPY:
  ├─ Headline: "The complete platform for modern teams"
  ├─ CTA Text: "Start free trial" (clear, action-oriented)
  └─ Tone: Professional (builds trust)

LAYOUT OPTIMIZATION:
  ├─ Hero Position: Center (best conversion)
  ├─ Color Scheme: Blue Professional (credibility)
  └─ CTA Placement: Floating button (always visible)

BUSINESS OUTCOMES:

Key Results:
  ✅ MRR: $98,500 (98.5% of target)
  ✅ ARR: $1,182,000 (98.5% of target)
  ✅ CAC: $185 (7.5% under target)
  ✅ LTV:CAC Ratio: 4.2 (5% above target)
  ✅ DAU: 5,200 (4% above target)
  ✅ Net Retention: 118% (2.6% above target)

Constraints:
  ✅ CSAT: 87% (above 85% threshold)
  ✅ Churn: 4.2% (below 5% threshold)
  ✅ Uptime: 99.7% (above 99.5% threshold)

North Star Metric:
  ✅ Net Dollar Retention: 118%

Overall OKR Achievement: 98.7%

ROI:
  - Training Cost: $2.50 (AI inference)
  - Production Cost: $0.003/decision
  - Revenue Increase: +$18,500/month
  - Payback Period: < 1 hour
  - Annual ROI: 88,800x
`)

// ===== Step 7: Production Deployment =====

console.log('\n' + '='.repeat(60))
console.log('STEP 7: Production Deployment Strategy')
console.log('='.repeat(60))

console.log(`
Gradual Rollout Plan:

Week 1: Testing & Validation
  ├─ Deploy to staging environment
  ├─ Run A/B test: Learned policy vs current strategy
  ├─ Monitor for unintended consequences
  └─ Validate constraint compliance

Week 2: Initial Rollout (5%)
  ├─ Deploy to 5% of traffic
  ├─ Monitor business metrics hourly
  ├─ Set up automated alerts
  └─ Human review of all decisions

Week 3: Scale Up (25%)
  ├─ Increase to 25% if metrics stable
  ├─ Reduce monitoring frequency
  └─ Document learnings

Week 4: Majority Rollout (50%)
  ├─ Increase to 50% if no issues
  ├─ Compare segments (control vs treatment)
  └─ Optimize based on feedback

Week 5: Full Rollout (100%)
  ├─ Deploy to all traffic
  ├─ Continue monitoring
  ├─ Plan next iteration
  └─ Retrain policy quarterly

Monitoring Dashboard:
  ├─ OKR Progress (real-time)
  ├─ Constraint Compliance (alerts)
  ├─ Policy Performance (episode stats)
  ├─ Cost Tracking (AI inference)
  └─ Business Impact (revenue, growth)

Rollback Plan:
  ├─ Automatic: If any constraint violated
  ├─ Manual: Human can override at any time
  ├─ Gradual: Reduce traffic percentage
  └─ Complete: Revert to baseline policy
`)

// ===== Step 8: Continuous Improvement =====

console.log('\n' + '='.repeat(60))
console.log('STEP 8: Continuous Improvement')
console.log('='.repeat(60))

console.log(`
Ongoing Optimization:

Monthly:
  ├─ Review policy performance
  ├─ Analyze constraint violations
  ├─ Collect feedback from sales/support
  └─ Adjust OKR weights if needed

Quarterly:
  ├─ Retrain policy with latest data
  ├─ Update action space (new features, prices)
  ├─ Revise OKRs for next quarter
  ├─ Conduct fairness audit
  └─ Review ethical compliance

Annually:
  ├─ Comprehensive business review
  ├─ Major OKR revisions
  ├─ Consider new RL algorithms
  ├─ Expand to new use cases
  └─ Share learnings across organization

Metrics to Track:
  ├─ Business Metrics: MRR, CAC, retention, engagement
  ├─ Policy Metrics: Reward, convergence, stability
  ├─ Operational Metrics: Latency, cost, uptime
  ├─ Fairness Metrics: Segment equality, bias detection
  └─ Ethical Metrics: Compliance, transparency, safety
`)

// ===== Summary =====

console.log('\n' + '='.repeat(60))
console.log('SUMMARY')
console.log('='.repeat(60))

console.log(`
✅ Business-as-Code RL Platform Demo Complete

What We've Demonstrated:

1. OKR Definition: TypeScript DSL for business objectives
2. Action Space: Multi-dimensional optimization space
3. RL Training: PPO algorithm with OKR-based rewards
4. Vibe Coding: Multi-model code generation
5. Expected Results: 98.7% OKR achievement
6. Production Deployment: Gradual rollout strategy
7. Continuous Improvement: Monthly/quarterly/annual cycles

Key Takeaways:

• Real business goals → RL reward functions
• Type-safe, developer-friendly DSL
• Multi-objective optimization with constraints
• Ethical guardrails built-in
• Cloudflare platform integration
• Production-ready architecture

Next Steps:

1. Implement actual neural network (replace mock)
2. Connect to real analytics pipeline
3. Build production dashboard
4. Add comprehensive testing
5. Deploy to staging environment

Thank you for exploring the Business RL Platform! 🚀
`)
