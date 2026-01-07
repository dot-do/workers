# Business-as-Code: Complete Financial Platform Design

**Date:** 2026-01-07
**Status:** Approved
**Epic:** workers-ba5w

## Vision

A complete financial operating system for autonomous startups. Everything a business needs to operate—incorporated, banked, paid, compliant—from code.

```typescript
// The dream
import { startup } from 'business.as/code'

const acme = await startup.create({
  name: 'Acme Inc',
  type: 'c_corp',
  state: 'DE',
  founders: [{ name: 'Jane Doe', ownership: 100 }]
})

// Instantly get:
// ✅ Delaware C-Corp (incorporate.do)
// ✅ Registered agent (agents.do)
// ✅ Business address (address.do)
// ✅ Bank account (accounts.do)
// ✅ Virtual cards (cards.do)
// ✅ Domain (builder.domains)
// ✅ Email (email.do)
// ✅ Phone (phone.numbers.do)
// ✅ Accounting (accounting.do)
// ✅ SOC 2 compliance (soc2.do)
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        id.org.ai                                     │
│            (Unified Identity - Humans + AI Agents)                   │
│         MCP 2.1 OAuth · CIMD · Client Credentials · PKCE            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼─────────────────────────────────┐
│                         FINANCIAL                                   │
├─────────────────────────────────┼─────────────────────────────────┤
│  payments.do     accounting.do     treasury.do                      │
│  accounts.do     cards.do          soc2.do                         │
└─────────────────────────────────┼─────────────────────────────────┘
                                  │
┌─────────────────────────────────┼─────────────────────────────────┐
│                         BUSINESS                                    │
├─────────────────────────────────┼─────────────────────────────────┤
│  incorporate.do     agents.do     address.do                       │
│                                   ├── mailing.address.do           │
│                                   └── email.address.do             │
└─────────────────────────────────┼─────────────────────────────────┘
                                  │
┌─────────────────────────────────┼─────────────────────────────────┐
│                       COMMUNICATIONS                                │
├─────────────────────────────────┼─────────────────────────────────┤
│  builder.domains / domain.names.do                                  │
│  email.do     phone.numbers.do     calls.do     texts.do           │
└─────────────────────────────────┴─────────────────────────────────┘
```

## Services

### Financial Layer

#### payments.do (Stripe Infrastructure)
Full Stripe SDK wrapper with RPC and id.org.ai auth.

| Module | APIs | Description |
|--------|------|-------------|
| Core Payments | charges, intents, methods, refunds, disputes, links, checkout | Payment processing |
| Billing | subscriptions, invoices, quotes, usage, coupons, portal, credits | Recurring billing |
| Connect | accounts, onboarding, capabilities, payouts, fees, transfers | Marketplace |
| Treasury | accounts, balances, inbound, outbound, transactions | Banking |
| Issuing | cardholders, cards, authorizations, transactions, controls | Card issuing |
| Identity | sessions, reports | KYC verification |
| Radar | rules, reviews, lists | Fraud prevention |
| Tax | calculations, registrations, transactions, reports | Tax compliance |
| Terminal | readers, locations, connections | In-person payments |
| Financial Connections | sessions, accounts, owners, transactions | Bank linking |
| Capital | offers, financing, transactions | Business financing |

#### accounting.do (Autonomous Accounting)
Full double-entry accounting with AI automation.

| Module | APIs | Description |
|--------|------|-------------|
| Chart of Accounts | create, get, update, archive, list | Account management |
| General Ledger | journals, balances, transactions | Core ledger |
| Accounts Receivable | entries, aging, payments | Customer invoices |
| Accounts Payable | entries, vendors, payments | Bills and vendors |
| Bank Reconciliation | start, match, auto, complete | Bank rec |
| Financial Reports | balanceSheet, incomeStatement, cashFlow, trialBalance | Reporting |
| Revenue Recognition | schedules, recognize, deferred | ASC 606 |
| AI Features | categorize, reconcile, anomalies, forecast, close | Automation |

#### treasury.do (Money Movement)
Cash management powered by Stripe Treasury.

| Module | APIs | Description |
|--------|------|-------------|
| Inbound | ach, wire | Receive money |
| Outbound | ach, wire, check | Send money |
| Internal | transfer | Between accounts |
| Scheduling | schedule, cancel | Recurring transfers |
| Forecasting | forecast, pending | Cash flow |

#### accounts.do (bank.accounts.do)
Financial accounts with routing/account numbers.

| API | Description |
|-----|-------------|
| create | Create financial account with features |
| get, list | Retrieve accounts |
| balance | Current and historical balance |
| statements | Monthly bank statements |
| transactions | Transaction history |

#### cards.do (virtual.cards.do, physical.cards.do)
Card issuance and management.

| Module | APIs | Description |
|--------|------|-------------|
| Cardholders | create, get, list, update | Cardholder management |
| Virtual Cards | create, update, cancel | Instant virtual cards |
| Physical Cards | create, ship, replace | Physical cards |
| Controls | limits, categories, merchants | Spending controls |
| Authorizations | list, approve, decline | Real-time auth |
| Transactions | list, get | Card transactions |
| PIN | set, reveal | PIN management |
| Disputes | create, list | Card disputes |

#### soc2.do (Instant Compliance)
Free SOC 2 for platform builders.

| Module | APIs | Description |
|--------|------|-------------|
| Evidence | accessLogs, changes, encryption, incidents, vendors, availability | Auto-collected |
| Controls | list, status | Trust Service Criteria |
| Reports | type2, bridgeLetter, pentest | SOC 2 reports |
| Trust Center | publish, nda | Public portal |
| Questionnaires | respond | Auto-fill security questionnaires |

### Business Formation Layer

#### incorporate.do
Entity formation and management.

| API | Description |
|-----|-------------|
| create | Form LLC, C-Corp, S-Corp, nonprofit |
| status | Formation status |
| documents | Articles, bylaws, EIN letter |
| entities.list/get/update | Entity management |
| compliance.annualReport | Annual reports |
| compliance.filings | Required filings |
| compliance.status | Good standing |
| dissolve | Entity dissolution |

#### agents.do
Registered agent service (all 50 states).

| API | Description |
|-----|-------------|
| states.list/available | State availability |
| assign | Assign agent to entity |
| service.list/get/forward | Service of process |
| notifications.configure | Alert configuration |

#### address.do
Virtual mailbox and business addresses.

| Subdomain | API | Description |
|-----------|-----|-------------|
| mailing.address.do | mailbox.create | Create virtual mailbox |
| | mail.list/scan/forward/shred | Mail handling |
| | packages.list/forward/hold | Package handling |
| email.address.do | aliases.create | Email aliases |
| | forwarding | Email forwarding |
| | catchall | Catch-all addresses |
| | create | Multiple address types |

### Communications Layer

#### builder.domains / domain.names.do
Domain management.

| Module | APIs | Description |
|--------|------|-------------|
| Subdomains | claim, release | Free *.hq.com.ai, etc. |
| Registration | register, transfer, verify | Domain registration |
| DNS | list, create, update, delete | DNS records |
| SSL | status, provision | SSL certificates |
| Routing | route | Domain to worker routing |

#### email.do
Business email.

| Module | APIs | Description |
|--------|------|-------------|
| Domains | add, verify | Email domain setup |
| Mailboxes | create, list, update, delete | Mailbox management |
| Aliases | create | Email aliases |
| Send | send | Transactional email |
| Templates | create, send | Email templates |
| Campaigns | create, send | Marketing email |
| Webhooks | inbound | Inbound email |
| Analytics | sends, opens, clicks | Email analytics |

#### phone.numbers.do
Phone number provisioning.

| API | Description |
|-----|-------------|
| provision | Get new number |
| list | List numbers |
| release | Release number |
| port | Port number in |
| configure | Set capabilities, webhooks |

#### texts.do
SMS messaging.

| API | Description |
|-----|-------------|
| send | Send SMS |
| bulk | Bulk SMS |
| mms | Send MMS |
| webhook | Inbound SMS |
| conversations.list/get | Conversation threading |

#### calls.do
Voice calls.

| API | Description |
|-----|-------------|
| call | Outbound call |
| tts | Text-to-speech |
| flow | IVR flow |
| forward | Call forwarding |
| record | Call recording |
| transcribe | AI transcription |
| conference.create/add | Conferencing |

## Implementation Strategy

### Phase 1: Stripe Infrastructure (P0)
Wrap full Stripe SDK with rpc.do + id.org.ai.

1. payments.do - All Stripe APIs
2. accounts.do - Stripe Treasury financial accounts
3. cards.do - Stripe Issuing
4. treasury.do - Stripe Treasury money movement

### Phase 2: Accounting (P0)
Build custom accounting engine.

1. accounting.do - Double-entry ledger
2. Sync with payments.do (invoices → AR, payments → cash)

### Phase 3: Communications (P1)
Integrate providers.

1. builder.domains - Cloudflare DNS + SSL
2. email.do - Resend/Postmark
3. phone.numbers.do, texts.do, calls.do - Twilio/Vonage

### Phase 4: Business Formation (P1)
Partner integrations.

1. incorporate.do - Stripe Atlas or similar
2. agents.do - Registered agent service
3. address.do - Virtual mailbox provider

### Phase 5: Compliance (P1)
Build on platform data.

1. soc2.do - Evidence from all services

## Revenue Model

- **15% platform fee** on all financial transactions via Stripe Connect
- Free tier includes: domains, SOC 2, basic APIs
- Paid tiers for higher limits, premium features

## TDD Approach

Each service follows RED → GREEN → REFACTOR:

1. **RED**: Write failing tests defining the API contract
2. **GREEN**: Implement to make tests pass
3. **REFACTOR**: Optimize, add edge cases, improve DX

All issues tracked in Beads under parent epics:
- workers-ba5w (Master)
- workers-ur2y (payments.do)
- workers-rvdy (accounting.do)
- workers-61kn (Banking)
- workers-0ah6 (Business Formation)
- workers-9vdq (Communications)
- workers-9qod (soc2.do)
