# MDX LandingPage Renderer - Tailwind

Renders landing page MDX content with Tailwind CSS components.

## Features

- ✅ Pre-loaded Tailwind components (Hero, Features, CTA, Form, Card, Button)
- ✅ Static HTML generation (optimized for landing pages)
- ✅ Tailwind CSS via CDN
- ✅ POST endpoint for MDX rendering
- ✅ Accepts content from router worker

## Components

- **Hero** - Full-width hero section
- **Features** - Feature grid with icons
- **CTA** - Call-to-action section
- **Form** - Contact/signup forms
- **Card** - Content cards
- **Button** - Styled buttons

## Usage

### From Router Worker

The router worker sends POST requests to this worker:

```bash
POST /render
Content-Type: application/json

{
  "content": "MDX content here...",
  "frontmatter": {
    "$type": "LandingPage",
    "$style": "tailwind",
    "title": "My Page"
  }
}
```

### Example MDX

```mdx
---
$type: LandingPage
$style: tailwind
title: My Awesome Product
---

<Hero 
  title="Welcome to Our Product"
  subtitle="The best solution for your needs"
  cta="Get Started"
  ctaLink="/signup"
/>

<Features 
  title="Why Choose Us"
  features={[
    { icon: "⚡", title: "Fast", description: "Lightning fast performance" },
    { icon: "🔒", title: "Secure", description: "Bank-level security" },
    { icon: "📱", title: "Mobile", description: "Works on any device" }
  ]}
/>

<CTA 
  title="Ready to get started?"
  description="Join thousands of happy customers"
  primaryText="Start Free Trial"
  primaryLink="/signup"
/>
```

## Development

```bash
pnpm dev
```

## Deployment

```bash
pnpm deploy
```

## Integration

This worker is called by `mdx-router` via Service Binding when:
- `$type: LandingPage`
- `$style: tailwind`

## Architecture

```
Router Worker
     ↓ POST /render
Landing Page Worker
     ↓ Parse MDX
@hono/mdx + Tailwind Components
     ↓ Render
Static HTML Response
```
