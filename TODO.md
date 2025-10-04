# .do Workers - Prioritized Backlog

This backlog ensures every .do SDK package (105 domain packages) has a corresponding worker with RPC functions to provide all platform capabilities.

## Priority Levels

- **P0** - Critical infrastructure (blocks other work)
- **P1** - Core platform capabilities (API-facing)
- **P2** - Developer tools & conveniences
- **P3** - Business & domain services
- **P4** - Enhancement & optimization

---

## P0: Core Infrastructure (Critical)

### DO Unified Service Updates
- [ ] Update all 8 core services (db, auth, email, queue, schedule, webhooks, mcp, gateway) to accept ServiceContext
- [ ] Add `/rpc/:method` endpoints to each service
- [ ] Implement permission checks via context in all services
- [ ] Add context-based logging and auditing
- [ ] Complete integration tests for DO → Service flow

### Foundation Services
- [ ] `llm.do` - LLM generation service (RPC interface to Workers AI + OpenRouter)
  - Capabilities: text generation, chat completion, streaming, model routing
  - Methods: `generate()`, `chat()`, `stream()`, `listModels()`
- [ ] `models.do` - Model registry and management
  - Capabilities: model metadata, pricing, capabilities, availability
  - Methods: `getModel()`, `listModels()`, `compareModels()`, `getProviders()`
- [ ] `vectors.do` - Vector database and embeddings service
  - Capabilities: vector storage, similarity search, clustering
  - Methods: `index()`, `search()`, `cluster()`, `delete()`

---

## P1: Core Platform Capabilities (API-Facing)

### RPC & API Services
- [ ] `actions.do` - Action execution service (GitHub Actions-style workflows)
  - Capabilities: run actions, manage workflows, action registry
  - Methods: `execute()`, `list()`, `register()`, `getStatus()`
- [ ] `functions.do` - Serverless function execution
  - Capabilities: execute functions, manage deployments, logs
  - Methods: `invoke()`, `deploy()`, `list()`, `getLogs()`
- [ ] `workflows.do` - Workflow orchestration (already has worker, needs RPC)
  - Capabilities: define workflows, execute steps, handle state
  - Methods: `create()`, `execute()`, `getStatus()`, `cancel()`
- [ ] `tasks.do` - Task queue and management
  - Capabilities: create tasks, schedule, prioritize, track progress
  - Methods: `create()`, `schedule()`, `update()`, `getStatus()`, `cancel()`

### Data & Storage Services
- [ ] `searches.do` - Search service (full-text, vector, hybrid)
  - Capabilities: index documents, search, faceting, suggestions
  - Methods: `index()`, `search()`, `suggest()`, `delete()`
- [ ] `lists.do` - List management service
  - Capabilities: create lists, add/remove items, filter, sort
  - Methods: `create()`, `add()`, `remove()`, `query()`, `update()`
- [ ] `services.do` - Service registry and discovery
  - Capabilities: register services, health checks, routing
  - Methods: `register()`, `discover()`, `health()`, `deregister()`

### Developer Tools
- [ ] `repo.do` - Repository management (Git operations via GitHub API)
  - Capabilities: clone, push, pull, diff, branch management
  - Methods: `clone()`, `push()`, `pull()`, `createBranch()`, `diff()`
- [ ] `issues.do` - Issue tracking service
  - Capabilities: create issues, assign, comment, labels, milestones
  - Methods: `create()`, `update()`, `comment()`, `assign()`, `close()`
- [ ] `payload.do` - Payload CMS integration service
  - Capabilities: content management, collections, fields
  - Methods: `getCollections()`, `getDocument()`, `upsert()`, `delete()`

---

## P2: Developer Tools & Conveniences

### Code & Build Tools
- [ ] `esbuild.do` - Build service (already has worker, needs RPC)
  - Capabilities: bundle JS/TS, minify, tree-shake
  - Methods: `build()`, `transform()`, `analyze()`
- [ ] `yaml.do` - YAML processing service (already has worker, needs RPC)
  - Capabilities: parse, stringify, validate YAML
  - Methods: `parse()`, `stringify()`, `validate()`
- [ ] `ast.do` - AST parsing and transformation (already has worker, needs RPC)
  - Capabilities: parse code, transform, analyze
  - Methods: `parse()`, `transform()`, `query()`, `generate()`

### Testing & Quality
- [ ] `evals.do` - Evaluation service (already has worker, needs RPC)
  - Capabilities: run evaluations, score outputs, compare models
  - Methods: `evaluate()`, `compare()`, `getMetrics()`
- [ ] `benchmarks.do` - Benchmarking service (already has worker, needs RPC)
  - Capabilities: run benchmarks, compare performance
  - Methods: `run()`, `compare()`, `getResults()`

### Utilities
- [ ] `barcode.do` - Barcode generation and scanning
  - Capabilities: generate barcodes/QR codes, scan/decode
  - Methods: `generate()`, `scan()`, `validate()`
- [ ] `qrcode.do` - QR code generation (may merge with barcode.do)
  - Capabilities: generate QR codes, customize styling
  - Methods: `generate()`, `decode()`, `validate()`
- [ ] `hash.do` - Hashing utilities (already has worker, needs RPC)
  - Capabilities: hash data, verify hashes, multiple algorithms
  - Methods: `hash()`, `verify()`, `compare()`
- [ ] `html.do` - HTML processing (already has worker, needs RPC)
  - Capabilities: parse HTML, sanitize, transform
  - Methods: `parse()`, `sanitize()`, `transform()`

---

## P3: Business & Domain Services

### Human Capital & Identity
- [ ] `humans.do` - Human identity service (already has worker, needs RPC)
  - Capabilities: user profiles, identity verification
  - Methods: `getProfile()`, `verify()`, `update()`
- [ ] `careers.do` - Career management service
  - Capabilities: job postings, applications, career paths
  - Methods: `listJobs()`, `apply()`, `getCareerPath()`
- [ ] `programmers.do` - Developer profiles and skills
  - Capabilities: developer profiles, skill tracking, certifications
  - Methods: `getProfile()`, `addSkill()`, `getCertifications()`

### Sales & Marketing
- [ ] `cfo.do`, `cmo.do`, `coo.do`, `cpo.do`, `cro.do`, `cto.do` - Executive role services
  - Capabilities: role-specific insights, metrics, workflows
  - Methods: `getMetrics()`, `getInsights()`, `runWorkflow()`
- [ ] `bdr.do`, `sdr.do` - Sales development rep services
  - Capabilities: lead management, outreach, tracking
  - Methods: `getLeads()`, `createOutreach()`, `getMetrics()`

### Content & Media
- [ ] `blogs.do` - Blog management (blog-stream exists, needs RPC)
  - Capabilities: create posts, manage content, SEO
  - Methods: `createPost()`, `update()`, `publish()`, `getSEO()`
- [ ] `photos.do` - Photo management and processing
  - Capabilities: upload, resize, optimize, CDN
  - Methods: `upload()`, `resize()`, `optimize()`, `getUrl()`
- [ ] `podcast.do` - Podcast management (already has worker, needs RPC)
  - Capabilities: upload episodes, RSS feed, analytics
  - Methods: `uploadEpisode()`, `getRSS()`, `getAnalytics()`

### AI Agents (Named Personas)
- [ ] `amy.do`, `ari.do`, `dara.do`, `ivy.do`, `lena.do`, `lexi.do`, `nat.do`, `tom.do`, `vera.do` - Named AI agents
  - Capabilities: persona-specific chat, tasks, expertise
  - Methods: `chat()`, `executeTask()`, `getExpertise()`

---

## P4: Enhancement & Optimization

### Data & Analytics
- [ ] `experiments.do` - A/B testing and experimentation (already has worker, needs RPC)
  - Capabilities: create experiments, track variants, analyze
  - Methods: `create()`, `assignVariant()`, `getResults()`
- [ ] `okrs.do` - OKR tracking service
  - Capabilities: set objectives, track key results, reporting
  - Methods: `setObjective()`, `updateProgress()`, `getReport()`
- [ ] `kpis.do` - KPI tracking and dashboards
  - Capabilities: define KPIs, track metrics, visualize
  - Methods: `define()`, `track()`, `getDashboard()`
- [ ] `trace.do`, `traces.do` - Request tracing and observability
  - Capabilities: trace requests, spans, performance
  - Methods: `startTrace()`, `addSpan()`, `getTrace()`

### Specialized Tools
- [ ] `nouns.do`, `verbs.do`, `objects.do` - Linguistic/ontology services
  - Capabilities: word analysis, relationships, definitions
  - Methods: `define()`, `getRelated()`, `getSynonyms()`
- [ ] `state.do` - State management service
  - Capabilities: store state, sync across clients, persistence
  - Methods: `get()`, `set()`, `subscribe()`, `sync()`
- [ ] `trigger.do`, `triggers.do` - Event trigger service
  - Capabilities: define triggers, fire events, handle webhooks
  - Methods: `create()`, `fire()`, `subscribe()`
- [ ] `lodash.do` - Utility functions service (lodash via RPC)
  - Capabilities: data manipulation, functional utilities
  - Methods: Various lodash methods as RPC functions

### Business Intelligence
- [ ] `dashboard.do`, `dash.do` - Dashboard service
  - Capabilities: create dashboards, widgets, real-time data
  - Methods: `create()`, `addWidget()`, `getData()`
- [ ] `perf.do` - Performance monitoring
  - Capabilities: track performance, identify bottlenecks
  - Methods: `track()`, `getReport()`, `getRecommendations()`
- [ ] `extract.do` - Data extraction service
  - Capabilities: extract structured data from unstructured sources
  - Methods: `extract()`, `transform()`, `load()`

### Additional Services
- [ ] `browser.do`, `browsers.do` - Browser automation (browser exists, needs RPC)
  - Capabilities: headless browsing, screenshots, scraping
  - Methods: `navigate()`, `screenshot()`, `scrape()`
- [ ] `waitlist.do` - Waitlist management (waitlist-beta-management exists, needs RPC)
  - Capabilities: manage signups, send invites, track conversions
  - Methods: `signup()`, `invite()`, `getMetrics()`

---

## Current Implementation Tasks

### Immediate (This Sprint)
- [ ] Fix schema & s3queue ingest
- [ ] Get AI prompts running
- [ ] Get AI tools & research running
- [ ] Get MCP proxy going
- [ ] Ingest DeepWiki & scraper.md content
- [ ] Chunk Markdown
- [ ] Embed Markdown
- [ ] Get Domain Search
- [ ] Get Brand Name Generation
- [ ] Ingest Industries & Occupations
- [ ] Generate Ideas and Market Research for market
- [ ] Generate LeanCanvas and StoryBrand for each idea
- [ ] Create simple Markdown -> HTML renderer
- [ ] `mdxe` w/ globs and remote URL
- [ ] WorkOS RBAC & FGA API/Proxy
- [ ] Clickhouse HTTP Dictionary for WorkOS Auth/Tenants

### Active Backlog
- [ ] migrate `email` to `pipeline` for clarity
- [ ] `db` create simple fetch-based public markdown query
- [ ] `db` setup cloudflare monorepo deployment
- [ ] `db` add sql variables for r2 / s3 auth
- [ ] `db` add glob support to `id` filtering
- [ ] `db` add dynamic data filtering
- [ ] `db` add semantic / vector search
- [ ] `ai` support simple openrouter generations
- [ ] `ctx` confirm incoming `cf-worker` headers can't be overridden
- [ ] `ai` support getOrCreate? or in `db`?
- [ ] `ai` add mcp / tool support
- [ ] `ai` simplify model names from openrouter
- [ ] `events` webhook support?

---

## Done

- [x] `auth` extract authkit boilerplate
- [x] 8/8 core services implemented (gateway, db, auth, schedule, webhooks, email, mcp, queue)
- [x] DO unified service entry point created
- [x] SDK + Outbound handler security architecture

---

## Coverage Summary

**Total .do SDK Packages:** 105
**Workers with RPC Interfaces:** ~30 (many need RPC methods added)
**Missing Workers:** ~40 high-priority capabilities
**Estimated Completion:** 8-12 weeks for P0-P2, 16-20 weeks for full coverage

## Next Actions

1. **Week 1-2 (P0):** Complete DO service updates, implement llm.do, models.do, vectors.do
2. **Week 3-4 (P1):** Implement actions.do, functions.do, tasks.do, searches.do
3. **Week 5-6 (P1-P2):** Implement repo.do, issues.do, payload.do, developer tools
4. **Week 7-8 (P2-P3):** Implement business services, content services
5. **Week 9-12 (P3-P4):** Implement AI agents, analytics, specialized tools
6. **Ongoing:** Add RPC methods to existing workers that lack them
