/**
 * Example: Revenue Optimization with Business RL
 *
 * This example demonstrates how to use the Business-as-Code RL Platform
 * to optimize pricing strategy for maximum revenue while maintaining quality.
 */

import { createOKR } from '../src/okrs/dsl'
import type { ActionSpace } from '../src/agent/policy'
import type { TrainingConfig } from '../src/types'

// ===== 1. Define OKR =====

const revenueOKR = createOKR('revenue_optimization_2025')
  .withObjective('Maximize sustainable revenue growth')
  .withKeyResult('monthly_recurring_revenue', 100000, 'maximize', {
    weight: 0.5,
    unit: 'USD',
    description: 'Reach $100k MRR',
  })
  .withKeyResult('customer_acquisition_cost', 50, 'minimize', {
    weight: 0.2,
    unit: 'USD',
    description: 'Reduce CAC to $50',
  })
  .withKeyResult('conversion_rate', 0.05, 'maximize', {
    weight: 0.3,
    description: 'Achieve 5% conversion',
  })
  .withConstraint('customer_satisfaction', 'gte', 0.9, {
    penalty: 10,
    description: 'Maintain >90% satisfaction',
  })
  .withConstraint('refund_rate', 'lte', 0.02, {
    penalty: 5,
    description: 'Keep refunds <2%',
  })
  .withNorthStar('customer_lifetime_value', {
    description: 'CLV = ARPU / churn_rate',
  })
  .build()

console.log('OKR Created:', revenueOKR)

// ===== 2. Define Action Space =====

const actionSpace: ActionSpace = {
  pricing: {
    base_price: [29, 199], // $29 - $199/month
    discount: [0, 0.5], // 0% - 50% off
    trial_period: [0, 30], // 0 - 30 days trial
  },
  features: {
    enable: ['analytics', 'integrations', 'api_access', 'white_label', 'priority_support'],
    disable: ['legacy_dashboard', 'old_api'],
    priority: [0, 1],
  },
  copy: {
    headline: ['Start growing today', 'Join 10,000+ happy customers', 'Transform your business', 'Get started in minutes', 'No credit card required'],
    cta_text: ['Start free trial', 'Get started', 'Try it free', 'Sign up now', 'Start now'],
    tone: ['friendly', 'professional', 'urgent'],
  },
  layout: {
    hero_position: ['top', 'center', 'split'],
    color_scheme: ['blue_professional', 'green_growth', 'purple_modern', 'orange_energetic'],
    cta_placement: ['header', 'footer', 'floating', 'inline'],
  },
  recommendation: {
    algorithm: ['collaborative', 'content_based', 'hybrid'],
    diversity: [0, 1],
    novelty: [0, 1],
  },
}

console.log('Action Space Defined')

// ===== 3. Configure Training =====

const trainingConfig: TrainingConfig = {
  algorithm: 'ppo', // Proximal Policy Optimization
  max_episodes: 1000,
  max_steps_per_episode: 100,
  batch_size: 10, // Collect 10 episodes before updating
  learning_rate: 0.001,
  discount_factor: 0.99,
  exploration_strategy: 'epsilon-greedy',
  checkpoint_frequency: 50, // Save every 50 episodes
  evaluation_frequency: 100, // Evaluate every 100 episodes
}

console.log('Training Config:', trainingConfig)

// ===== 4. API Usage Examples =====

// Create OKR via API
const createOKRRequest = {
  method: 'POST',
  url: 'http://localhost:8787/api/okrs',
  body: revenueOKR,
}

console.log('Create OKR Request:', createOKRRequest)

// Start Training via API
const startTrainingRequest = {
  method: 'POST',
  url: 'http://localhost:8787/api/training/start',
  body: {
    okr_id: revenueOKR.id,
    action_space: actionSpace,
    config: trainingConfig,
  },
}

console.log('Start Training Request:', startTrainingRequest)

// Monitor Progress via API
const getProgressRequest = {
  method: 'GET',
  url: `http://localhost:8787/api/episodes?okr_id=${revenueOKR.id}`,
}

console.log('Get Progress Request:', getProgressRequest)

// ===== 5. Expected Results =====

console.log(`
Expected Results:

After training completes, the agent will have learned an optimal policy for:

1. Pricing Strategy:
   - Optimal base price for different customer segments
   - When to offer discounts and how much
   - Ideal trial period length

2. Feature Rollout:
   - Which features drive most revenue
   - Feature combinations that increase conversion
   - Priority order for feature development

3. Marketing Copy:
   - Best-performing headlines
   - CTA text that converts
   - Tone that resonates with target audience

4. Layout Optimization:
   - Hero section placement
   - Color schemes that drive action
   - CTA button placement

Example Learned Policy:
- Base Price: $79/month (optimal for target segment)
- Trial Period: 14 days (maximizes activation)
- Features: Enable 'analytics' and 'integrations' (high engagement)
- Headline: "Transform your business" (best conversion)
- CTA: "Start free trial" (clear and action-oriented)
- Layout: Hero center, blue professional theme, floating CTA

Business Outcomes:
- MRR: $95,000 (95% of target)
- CAC: $45 (10% under target)
- Conversion Rate: 4.8% (96% of target)
- Customer Satisfaction: 92% (above constraint)
- Refund Rate: 1.5% (below constraint)
- CLV: $1,200 (north star metric)
`)

// ===== 6. Production Deployment =====

console.log(`
Production Deployment:

1. Train the agent in a staging environment
2. Evaluate the learned policy on historical data
3. Run A/B tests with learned policy vs current strategy
4. Gradually roll out (5% → 25% → 50% → 100%)
5. Monitor business metrics and retrain periodically

Ethical Considerations:
- Set constraints to prevent harmful optimizations (e.g., dark patterns)
- Monitor for unintended consequences (e.g., gaming metrics)
- Ensure fairness across customer segments
- Maintain transparency about AI-driven decisions
- Allow human override for critical decisions
`)
