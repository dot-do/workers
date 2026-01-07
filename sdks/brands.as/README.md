# brands.as

**Look like a million bucks. Spend like a startup.**

```bash
npm install brands.as
```

---

## You're Building a Company, Not a Design Agency

Your startup needs a brand. A real one—with logos, colors, typography, guidelines.

But you're a builder, not a designer. And you can't afford to:
- Spend $10K+ on a branding agency
- Wait 6 weeks for deliverables
- Iterate through endless revision cycles
- End up with something that still doesn't feel right

**What if world-class branding was an API call away?**

## Professional Brands in Minutes

```typescript
import { brands } from 'brands.as'

const brand = await brands.create({
  name: 'acme',
  displayName: 'Acme Inc',
  industry: 'developer-tools',
  values: ['simplicity', 'speed', 'reliability']
})

// Generate logos
const logos = await brands.generateLogo('acme', {
  style: 'modern',
  iconStyle: 'abstract'
})

// Get complete brand guidelines
const guidelines = await brands.guidelines('acme')
```

**brands.as** gives you:
- AI-generated logos that don't look AI-generated
- Professional color palettes
- Typography that works
- Complete brand guidelines
- Social media kits
- Everything in every format

## Build Your Brand in 3 Steps

### 1. Define Who You Are

```typescript
import { brands } from 'brands.as'

const brand = await brands.create({
  name: 'launchfast',
  displayName: 'LaunchFast',
  tagline: 'Ship products, not excuses',
  industry: 'saas',
  values: ['speed', 'simplicity', 'craftsmanship'],
  personality: ['confident', 'approachable', 'direct'],
  audience: 'Startup founders and indie hackers'
})
```

### 2. Generate Your Assets

```typescript
// Generate logo options
const logos = await brands.generateLogo('launchfast', {
  style: 'bold',
  iconStyle: 'lettermark',
  variations: 5
})

// Choose your favorite, set as primary
await brands.setPrimaryLogo('launchfast', logos[0].id)

// Generate matching colors
const colors = await brands.generateColors('launchfast', {
  baseColor: '#3B82F6',
  mood: 'energetic'
})

// Get typography that fits
const typography = await brands.generateTypography('launchfast', {
  style: 'modern'
})
```

### 3. Export Everything

```typescript
// Complete brand guidelines
const guidelines = await brands.guidelines('launchfast')
console.log(guidelines.downloadUrl)

// Social media kit
const social = await brands.socialKit('launchfast', [
  'twitter', 'linkedin', 'producthunt'
])

// Export for designers
await brands.export('launchfast', 'figma')
```

## Professional Results, Startup Budget

**Agency route:**
- $10,000 - $50,000
- 4-8 weeks
- 3-5 revision rounds
- Fixed deliverables

**brands.as route:**
- Fraction of the cost
- Minutes, not weeks
- Unlimited iterations
- Every format you need

## Everything for Brand Building

```typescript
// Let AI create from a description
const brand = await brands.generate(
  'A playful but professional brand for a developer tool that makes deployment fun'
)

// Full color system
const colors = await brands.colors('launchfast')
// colors.primary, colors.secondary, colors.accent
// colors.variations['primary'] = ['#1D4ED8', '#3B82F6', '#60A5FA', ...]

// Upload your own assets
await brands.uploadAsset('launchfast', {
  type: 'illustration',
  name: 'hero-image',
  file: imageBuffer,
  tags: ['marketing', 'homepage']
})

// Typography with all the details
const type = await brands.typography('launchfast')
// type.headings.fontFamily, type.headings.weights, type.headings.sizes
```

## Your Brand Is Your First Impression

Customers judge in milliseconds. Investors pattern-match. Partners evaluate.

**Look like a company that's going somewhere. Because you are.**

```bash
npm install brands.as
```

[Build your brand at brands.as](https://brands.as)

---

MIT License
