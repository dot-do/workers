# veeva.do

> Life Sciences CRM + Vault. AI-native. Open source.

Veeva built a $50B+ empire on pharma's regulatory burden. 21 CFR Part 11 compliance, medical affairs CRM, clinical trial management - all wrapped in per-seat pricing that makes Salesforce look cheap.

**veeva.do** is the open-source alternative. Deploy your own compliant life sciences platform. AI-native from day one. Audit-ready out of the box.

## The API

```typescript
import { veeva } from 'veeva.do'

await veeva`new protocol for Study 123`
await veeva`approve the amendment`.sign()
await veeva`what's blocking the NDA submission?`
await veeva`submit to FDA`.sign()
```

That's it. No document IDs. No lifecycle states. No workflow configuration.

The AI infers intent. Compliance is automatic. Audit trails are automatic.

## The Test

**If you can say it in a meeting, you can say it to veeva.do:**

```typescript
await veeva`we need a safety report for the DSMB tomorrow`
await veeva`FDA wants clarity on the stability data`
await veeva`the amendment needs IRB sign-off before Monday`
await veeva`what's the status on our BLA?`
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
await veeva`approve the protocol`.sign()
await veeva`show me the audit trail`
await veeva`generate validation package`
```

Every `.sign()` is Part 11 compliant. Every action is audit-trailed. IQ/OQ/PQ documentation is generated.

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
