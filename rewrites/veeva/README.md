# veeva.do

> Life Sciences CRM + Vault. AI-native. Open source.

Veeva built a $50B+ empire on pharma's regulatory burden. 21 CFR Part 11 compliance, medical affairs CRM, clinical trial management - all wrapped in per-seat pricing that makes Salesforce look cheap.

**veeva.do** is the open-source alternative. Deploy your own compliant life sciences platform. AI-native from day one. Audit-ready out of the box.

## AI-Native API

```typescript
import { veeva } from 'veeva.do'

// This is the entire API
await veeva`new protocol for Study 123`          // Creates, routes, tracks
await veeva`approve the amendment`.sign()         // Signs with Part 11 compliance
await veeva`what's blocking the NDA submission?`  // AI figures it out

// Compliance complexity is hidden
await veeva`Phase 3 deviation in patient 042`     // CAPA workflow starts automatically
await veeva`CMC question from FDA - draft response` // Pulls stability data, drafts, routes

// Parallel review - still natural
await veeva`get sign-off on Protocol v3`.from('IRB', 'medical monitor', 'sponsor')
```

### Queries

```typescript
// Say what you need. VQL is generated automatically.
await veeva`approved stability protocols from 2024`
await veeva`documents for NDA-123456`
await veeva`what did we submit in the last sequence?`

// For power users, raw VQL still works
await veeva.vql`SELECT * FROM documents WHERE study = ${studyId}`
```

### Submissions

```typescript
// Build a submission by describing what you need
await veeva`start NDA submission for Compound X`
await veeva`add the Phase 3 efficacy data to Module 2.7`
await veeva`what's missing for a complete eCTD?`

// Review and submit
await veeva`is this submission ready?`
await veeva`submit to FDA`.sign()
```

## The Philosophy

**Natural language IS the API.**

If you can say it in a meeting, you can say it to veeva.do:

```typescript
// Things regulatory affairs managers actually say:
await veeva`we need a safety report for the DSMB tomorrow`
await veeva`FDA wants clarity on the stability data`
await veeva`the amendment needs IRB sign-off before Monday`
await veeva`what's the status on our BLA?`
await veeva`pull everything we submitted for the Type A meeting`

// Compliance is automatic. Audit trails are automatic.
// 21 CFR Part 11 is automatic. You just work.
```

## Veeva vs veeva.do

```
Veeva                           veeva.do
-----------------------------------------------------------------
$500-1000+/user/month           $0 - run your own
12-24 month implementation      Deploy in hours
AI is a premium SKU             AI is the interface
Validation nightmare            Pre-validated
```

## Medical Affairs

```typescript
await veeva`who are the KOLs in oncology for the West region?`
await veeva`log my call with Dr. Chen - she wants the Phase 3 data`
await veeva`draft a follow-up for Dr. Chen`.review().send()
await veeva`I gave 5 samples of Product A to Dr. Chen`.sign()
```

## Documents

```typescript
await veeva`upload the protocol amendment`.route('QA', 'regulatory')
await veeva`what needs my signature?`
await veeva`sign the batch record`.sign()
await veeva`who touched the protocol since Monday?`
```

## Quality

```typescript
await veeva`deviation: batch temp exceeded limit by 2C for 15 min`
await veeva`investigate the temperature deviation`
await veeva`create CAPA for the temperature control issue`
await veeva`any overdue CAPAs?`
```

## Compliance

21 CFR Part 11 is **automatic**. You just work.

```typescript
await veeva`approve the protocol`.sign()  // Part 11 compliant
await veeva`show me the audit trail`       // Every action logged
await veeva`generate validation package`   // IQ/OQ/PQ ready
```

## Why Open Source?

| Concern | veeva.do |
|---------|----------|
| Auditors want to see the code | It's open source. Show them. |
| Validation costs $50K-500K | Pre-validated. Download the package. |
| Vendor holds you hostage | Fork it. Own it. |
| AI is a premium upsell | AI is the interface. |

## Deploy

```bash
npx create-dotdo veeva
```

That's it. 21 CFR Part 11 compliant. Your infrastructure.

## License

MIT - Build your life sciences platform on it.

---

<p align="center">
  <strong>veeva.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://veeva.do">Website</a> | <a href="https://docs.veeva.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
