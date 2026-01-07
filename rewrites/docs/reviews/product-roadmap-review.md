# Product & Roadmap Review: workers.do Rewrites Platform

**Review Date:** 2026-01-07
**Reviewer:** Product/Vision Analysis

---

## Executive Summary

The workers.do platform represents an ambitious vision to reimagine enterprise SaaS infrastructure on Cloudflare's edge platform. The "rewrites" directory contains 70+ packages aiming to replace billion-dollar enterprise software with edge-native, AI-first alternatives. While the vision is compelling and market timing is optimal, execution is currently fragmented across too many initiatives with insufficient depth in core foundational services.

**Overall Assessment:** Strong vision, solid architectural patterns, but needs focus. The platform is trying to boil the ocean when it should be proving the model with 3-4 deeply implemented showcases.

---

## 1. Vision Alignment Analysis

### Main Vision (CLAUDE.md)
The workers.do vision centers on:
- **Autonomous Startups** - Business-as-Code with AI agents
- **Named Agents** (Priya, Ralph, Tom, etc.) as tagged template functions
- **CapnWeb Pipelining** for multi-step agent workflows
- **Platform Services** - Identity, Payments, AI Gateway built-in

### Rewrites Vision (VISION.md)
The rewrites vision focuses on:
- **Enterprise SaaS replacement** at 1/100th the cost
- **One-click deploy** via `npx create-dotdo salesforce`
- **AI-native operations** from day one
- **Edge-native global deployment**

### Alignment Score: 7/10

**Alignments:**
- Both emphasize AI-native design
- Both target startup founders as the hero
- Both leverage Cloudflare edge infrastructure
- Both use Durable Objects as the core primitive

**Gaps:**
- Main vision focuses on named agents (Priya, Ralph) but rewrites barely mention them
- CapnWeb pipelining is not visible in any rewrite implementation
- The "Supabase for every agent" story in supabase.do README doesn't connect to the main agent architecture
- No visible integration between agents/ and rewrites/ directories

**Recommendation:** Create explicit integration points. Show how `tom.db` maps to a supabase.do instance. Demonstrate `ralph`'s filesystem is an fsx.do instance.

---

## 2. Product Completeness Assessment

### Tier 1: Production-Ready (Feature Complete with Tests)

| Package | Files | Tests | Status | Notes |
|---------|-------|-------|--------|-------|
| **fsx** | 78 | 30+ | 80% | Core FS ops implemented, TDD in progress |
| **gitx** | 61 | 20+ | 70% | Pack format, wire protocol, MCP tools done |
| **mongo** | 100+ | 15+ | 75% | Full MongoDB API, vector search, MCP |
| **kafka** | 33 | 8 | 60% | Consumer groups, schema registry started |

### Tier 2: Substantial Scaffold (Has Code, Needs Work)

| Package | Files | Tests | Status | Notes |
|---------|-------|-------|--------|-------|
| **nats** | 34 | 18 | 50% | JetStream types, coordinator DO started |
| **redis** | 14 | - | 40% | Basic structure only |
| **neo4j** | 14 | - | 35% | Graph DB types defined |
| **convex** | 13 | - | 30% | React bindings, real-time |
| **firebase** | 14 | - | 30% | Auth + RTDB scaffold |

### Tier 3: README Only (Vision Documented)

| Package | Status | Market Cap Target |
|---------|--------|-------------------|
| **supabase** | README only | N/A (Supabase) |
| **salesforce** | README only | $200B |
| **hubspot** | README only | $30B |
| **servicenow** | README only | $150B |
| **zendesk** | README only | $10B |
| **workday** | README only | $60B |
| 60+ others | Empty/README | Various |

### Summary Statistics

```
Total rewrites directories: 73
With package.json: 10
With substantial src/: 6
With test coverage: 4
Production-ready: 0
```

**Verdict:** The project is in early-mid development. Core infrastructure (fsx, gitx, mongo) is progressing well, but the enterprise SaaS rewrites are aspirational.

---

## 3. Beads Issues Roadmap Analysis

### Issue Statistics by Repository

| Repo | Total | Open | Closed | Blocked | Ready | Avg Lead Time |
|------|-------|------|--------|---------|-------|---------------|
| workers (parent) | 2,324 | 1,606 | 709 | 375 | 1,233 | 13.5 hrs |
| fsx | 294 | 236 | 58 | 136 | 100 | 1.0 hrs |
| gitx | 52 | 52 | 0 | 33 | 19 | 0 hrs |
| nats | 37 | 37 | 0 | 34 | 3 | 0 hrs |
| segment | - | - | - | - | - | - |
| supabase | 0 | 0 | 0 | 0 | 0 | - |

### Key Themes from Ready Issues

1. **TDD Cycles Dominate** - Most ready issues follow [RED]/[GREEN]/[REFACTOR] pattern
2. **MCP Migration** - Multiple packages migrating to standard DO MCP tools
3. **Core Foundation** - Types, constants, errors, path utils still in progress for fsx
4. **Glyphs Visual DSL** - Novel visual programming initiative (packages/glyphs)
5. **Event-Sourced Lakehouse** - Architecture epic for analytics layer

### Implied Roadmap (Q1 2026)

**Phase 1 - Foundation (Current)**
- Complete fsx core operations (file, directory, metadata)
- Finish gitx MCP migration
- Implement nats JetStream basics

**Phase 2 - Integration**
- Connect fsx + gitx (git operations use virtual filesystem)
- Add CAS (Content-Addressable Storage) layer
- Implement DO base class standardization

**Phase 3 - Database Layer**
- Port mongo.do production features to supabase.do
- Implement tiered storage across all data packages
- Add vector search to all applicable packages

**Phase 4 - Enterprise Showcase**
- Pick ONE enterprise rewrite (recommend: zendesk or intercom)
- Build complete vertical with agents integration
- Create `npx create-dotdo` generator

---

## 4. Market Positioning Analysis

### Competitive Landscape

| Competitor | What They Do | workers.do Advantage |
|------------|--------------|---------------------|
| **Supabase** | Postgres + Auth + Storage | Edge-native, per-agent isolation |
| **PlanetScale** | Serverless MySQL | SQLite simplicity, no connection limits |
| **Neon** | Serverless Postgres | True edge (DO), not just branching |
| **Convex** | Reactive backend | Same vision, but Cloudflare platform |
| **Firebase** | BaaS for mobile | AI-native, not bolted on |
| **Turso** | Edge SQLite | Integrated with DO ecosystem |

### Unique Value Propositions

1. **Per-Agent Databases** - No one else offers this model
2. **MCP-Native** - AI tool calling built into every service
3. **Edge-First** - True edge compute, not just edge CDN
4. **Unified Platform** - One account for DB, Git, Messaging, Storage
5. **Free Tier Optimization** - Designed for Cloudflare's free limits

### Market Timing: Excellent

- AI agents need isolated state (2025-2026 emerging need)
- Enterprise SaaS fatigue at all-time high
- Cloudflare continuously improving DO/R2/Vectorize
- MCP becoming industry standard for AI tool calling

### Positioning Recommendation

**Current Position:** "Enterprise SaaS rewrites for startups"
**Recommended Position:** "AI-native infrastructure where every agent has its own backend"

The "every agent has its own Supabase" story is more compelling and differentiated than "Salesforce but cheaper."

---

## 5. Target User Analysis

### Primary Persona: "The AI-First Startup Founder"

**Demographics:**
- Solo founder or 2-3 person team
- Building AI-powered product
- Technical enough to deploy to Cloudflare
- Budget-conscious but values quality

**Jobs to Be Done:**
1. Give my AI agents persistent memory
2. Let agents collaborate without stepping on each other
3. Build without enterprise SaaS overhead
4. Scale from 0 to millions without architecture changes

**Current Pain Points:**
- Supabase/Neon requires manual multi-tenancy for agents
- Firebase feels legacy, not AI-native
- Convex is close but not on Cloudflare
- Vector databases don't integrate with traditional DBs

### Is the Story Compelling? 8/10

The "AI agent with its own database" story IS compelling because:

1. **Real Pain Point** - AI agents DO need isolated state
2. **No Good Solution Exists** - No one optimizes for agent-per-DB
3. **Economic Model Works** - DO pricing allows millions of instances
4. **Technical Moat** - Hard to replicate without Cloudflare

**But** the story needs clearer articulation:
- Show agents.do actually using these databases
- Demonstrate real workflows (Tom reviewing code stored in gitx)
- Prove the economic model with pricing calculator

---

## 6. Feature Gap Analysis

### Critical for MVP (P0)

| Feature | Current Status | Gap |
|---------|---------------|-----|
| **Authentication** | Not implemented | Need agent identity + human OAuth |
| **CLI Generator** | Not started | `npx create-dotdo <template>` promised but missing |
| **Deployment Pipeline** | Manual | Need one-click deploy to user's CF account |
| **Pricing/Billing** | Not visible | Need usage metering + billing integration |
| **Admin Dashboard** | Not present | Need single pane of glass for all services |

### Important for Launch (P1)

| Feature | Current Status | Gap |
|---------|---------------|-----|
| **End-to-End Test Suite** | Partial | Need integration tests across packages |
| **Documentation Site** | Missing | Need docs.workers.do with tutorials |
| **SDK Packages** | Defined but not published | npm publish pipeline |
| **Agent Integration** | Not connected | agents/ doesn't use rewrites/ |
| **Real-Time Subscriptions** | Designed in README | Not implemented |

### Nice to Have (P2)

| Feature | Current Status | Gap |
|---------|---------------|-----|
| **Multi-Region Replication** | Planned | Complex, can defer |
| **Enterprise SSO** | WorkOS mentioned | Integration needed |
| **Audit Logging** | Mentioned in mongo | Standardize across packages |
| **Schema Migrations** | Not present | Need versioned migrations |

---

## 7. Priority Recommendations

### Immediate Focus (Next 2 Weeks)

1. **Complete fsx Core** - Finish file operations, pass all TDD tests
2. **Ship mongo.do** - It's the most complete; polish and publish
3. **Create Integration Demo** - Show Ralph agent using gitx + fsx together
4. **Build CLI Generator** - Even a simple `npx create-dotdo` validates the vision

### Short-Term (Next Month)

5. **Implement supabase.do** - The README writes checks; the code must cash them
6. **Connect agents/ to rewrites/** - Make `tom.db` resolve to a supabase.do instance
7. **Publish 3 npm packages** - fsx.do, gitx.do, mongo.do
8. **Create Pricing Page** - Even beta pricing clarifies the value prop

### Medium-Term (Q1 2026)

9. **Pick ONE Enterprise Vertical** - Recommend Intercom or Zendesk (smaller surface area)
10. **Build Complete Showcase** - Full vertical with agents, workflow, deployment
11. **Launch Developer Preview** - Public beta with limited slots
12. **Write Architecture Guide** - How to build your own .do service

### What to STOP Doing

- **Stop creating new rewrite directories** - 73 is too many; depth > breadth
- **Stop writing READMEs without code** - Only document what exists
- **Stop parallel development** - Focus on finishing vs. starting
- **Stop the Glyphs initiative** - Interesting but tangential to core value

---

## 8. Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| DO SQLite limits hit | Medium | High | Tiered storage already designed |
| R2 costs spike | Low | Medium | Archive tier + compression |
| Cloudflare pricing changes | Low | High | Abstract storage layer |
| MCP protocol changes | Medium | Medium | Adapter pattern in use |

### Market Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Supabase launches AI features | High | High | Move faster on agent story |
| Vercel/Neon integration | Medium | Medium | Differentiate on edge |
| Cloudflare builds competing | Low | Critical | Partner relationship |
| AI hype cycle deflates | Medium | Medium | Focus on real utility |

### Execution Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Too broad, nothing ships | High | Critical | Focus on 3-4 packages |
| TDD slows development | Medium | Low | Accept for quality |
| Solo/small team burnout | High | High | Prioritize ruthlessly |
| Technical debt accumulation | Medium | Medium | Refactor phases in TDD |

---

## 9. Metrics to Track

### Leading Indicators (Track Weekly)

- Issues closed / Issues opened ratio
- Lines of test code / Lines of source code
- npm package downloads (once published)
- GitHub stars on rewrites/

### Lagging Indicators (Track Monthly)

- Deployments to user CF accounts
- Active agent-database instances
- Revenue from usage fees
- Developer satisfaction (NPS)

### North Star Metric

**"Agent-Database Pairs in Production"**

This captures the core value prop: AI agents with their own persistent state, deployed and running in the real world.

---

## 10. Conclusion

### Strengths

1. Visionary positioning at the intersection of AI agents and edge infrastructure
2. Solid architectural foundation with Durable Objects
3. Strong TDD discipline ensuring quality
4. Comprehensive MCP integration for AI-native operations
5. Compelling economics (pay-per-use vs. per-seat)

### Weaknesses

1. Scope explosion (73 packages, most empty)
2. Disconnect between agents/ vision and rewrites/ implementation
3. No shipped, deployed products yet
4. Missing critical infrastructure (auth, billing, CLI)
5. Documentation promises features that don't exist

### Opportunities

1. First-mover in "database per AI agent" market
2. Cloudflare platform continually improving
3. Enterprise SaaS fatigue creating switching momentum
4. AI tooling (MCP) becoming standardized

### Threats

1. Well-funded competitors could pivot quickly
2. Cloudflare could build competing products
3. AI hype cycle deflation could reduce interest
4. Execution risk from scope sprawl

### Final Recommendation

**Focus ruthlessly on proving the core thesis:**

"AI agents need their own databases, and workers.do makes that trivial."

Ship 3 packages (mongo.do, fsx.do, gitx.do), integrate them with agents/, and demonstrate a complete workflow where named agents (Tom, Ralph, Priya) use these services to accomplish real work. The enterprise SaaS rewrites can come later once the foundation is proven.

The vision is right. The architecture is sound. The market timing is excellent. Now execute with focus.

---

*Review completed 2026-01-07*
