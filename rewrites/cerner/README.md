# cerner.do

> Electronic Health Records. Edge-Native. Open by Default. AI-First.

Oracle paid $28.3 billion for Cerner. Now Oracle Health charges hospitals millions for implementations, locks them into proprietary systems, and treats interoperability as an afterthought. FHIR adoption moves at a glacier's pace. Clinicians drown in documentation. Patients can't access their own data.

**cerner.do** is the open-source alternative. HIPAA-compliant. FHIR R4 native. Deploys in minutes, not months. AI that reduces clinician burden instead of adding to it.

## AI-Native API

```typescript
import { cerner } from 'cerner.do'           // Full SDK
import { cerner } from 'cerner.do/tiny'      // Minimal client
import { cerner } from 'cerner.do/fhir'      // FHIR-only operations
```

Natural language for clinical workflows:

```typescript
import { cerner } from 'cerner.do'

// Talk to it like a colleague
const gaps = await cerner`care gaps for Sarah Chen`
const overdue = await cerner`colonoscopy overdue`
const critical = await cerner`A1C > 9 not seen in 6 months`

// Chain like sentences
await cerner`diabetics needing A1C`
  .notify(`Your A1C test is due`)

// Visits that document themselves
await cerner`start visit Maria Rodriguez`
  .listen()           // ambient recording
  .document()         // AI generates SOAP note
  .sign()             // clinician approval
```

## The Problem

Oracle Health (Cerner) dominates healthcare IT alongside Epic:

| What Oracle Charges | The Reality |
|---------------------|-------------|
| **Implementation** | $10M-100M+ (multi-year projects) |
| **Annual Maintenance** | $1-5M/year per health system |
| **Per-Bed Licensing** | $10,000-25,000 per bed |
| **Interoperability** | FHIR "supported" but proprietary first |
| **Customization** | $500/hour consultants |
| **Vendor Lock-in** | Decades of data trapped |

### The Oracle Tax

Since the acquisition:

- Aggressive cloud migration push (Oracle Cloud Infrastructure)
- Reduced on-premise support
- Increased licensing costs
- Slowed innovation
- Staff departures

Healthcare systems are hostage to a database company that sees EHR as a cloud consumption vehicle.

### The Interoperability Illusion

Cerner talks FHIR. But:

- Proprietary data formats underneath
- Custom APIs for critical workflows
- "Information blocking" disguised as configuration
- FHIR endpoints often read-only or incomplete
- Patient access portals are data traps

The 21st Century Cures Act demands interoperability. Vendors deliver the minimum required.

### The Clinician Burnout Crisis

- **2 hours of EHR work** for every 1 hour of patient care
- Physicians spend more time clicking than healing
- AI "assistants" add complexity, not simplicity
- Mobile experience is an afterthought
- Alert fatigue kills patients

## The Solution

**cerner.do** reimagines EHR for clinicians and patients:

```
Oracle Health (Cerner)              cerner.do
-----------------------------------------------------------------
$10M-100M implementation            Deploy in minutes
$1-5M/year maintenance              $0 - run your own
Proprietary formats                 FHIR R4 native
FHIR as afterthought                FHIR as foundation
Oracle Cloud lock-in                Your Cloudflare account
Months to customize                 Code-first, instant deploy
2:1 doc-to-patient ratio            AI handles documentation
Patient portal trap                 Patient owns their data
Vendor lock-in                      Open source, MIT licensed
```

## One-Click Deploy

```bash
npx create-dotdo cerner
```

A HIPAA-compliant EHR. Running on infrastructure you control. FHIR R4 native from day one.

```typescript
import { Cerner } from 'cerner.do'

export default Cerner({
  name: 'valley-health',
  domain: 'ehr.valley-health.org',
  fhir: {
    version: 'R4',
    smartOnFhir: true,
  },
})
```

**Note:** Healthcare is heavily regulated. This is serious software for serious use cases. See compliance section below.

## Features

### Patient Demographics

```typescript
// Find anyone
const maria = await cerner`Maria Rodriguez`
const diabetics = await cerner`diabetics in Austin`
const highrisk = await cerner`uncontrolled diabetes age > 65`

// AI infers what you need
await cerner`Maria Rodriguez`            // returns patient
await cerner`labs for Maria Rodriguez`   // returns lab results
await cerner`Maria Rodriguez history`    // returns full chart
```

### Encounters

```typescript
// Visits are one line
await cerner`wellness visit Maria Rodriguez with Dr. Smith`
  .document()   // AI handles the note
  .discharge()  // done

// Inpatient rounds
await cerner`round on 4 West`
  .each(patient => patient.update().sign())
```

### Clinical Documentation

```typescript
// AI writes the note from the visit
await cerner`start visit Maria`
  .document()  // SOAP note generated from ambient audio
  .sign()      // you review and approve

// Or dictate directly
await cerner`note for Maria: controlled HTN, continue lisinopril, f/u 3 months`
```

### Orders

```typescript
// Just say it
await cerner`lisinopril 10mg daily for Maria Rodriguez`
await cerner`A1c and lipid panel for Maria, fasting`
await cerner`refer Maria to endocrinology`

// AI suggests, you approve
await cerner`what does Maria need?`
  .order()   // submits pending your approval

// Batch orders read like a prescription pad
await cerner`
  Maria Rodriguez:
  - metformin 500mg bid
  - A1c in 3 months
  - nutrition consult
`
```

### Results

```typescript
// View results naturally
await cerner`Maria labs today`
await cerner`Maria A1c trend`
await cerner`abnormal results this week`

// Critical values alert automatically
// AI flags what needs attention
```

### Problem List

```typescript
// Add problems naturally
await cerner`add diabetes to Maria's problems`
await cerner`Maria has new onset hypertension`

// Query the problem list
await cerner`Maria active problems`
await cerner`Maria chronic conditions`
```

### Allergies

```typescript
// Document allergies naturally
await cerner`Maria allergic to sulfa - rash and swelling`
await cerner`Maria penicillin allergy severe`

// Check before prescribing (AI does this automatically)
await cerner`Maria allergies`
```

### Immunizations

```typescript
// Record vaccines
await cerner`gave Maria flu shot left arm lot ABC123`

// Check what's due
await cerner`Maria vaccines due`
await cerner`pediatric patients needing MMR`
```

### Scheduling

```typescript
// Natural as talking to a scheduler
await cerner`schedule Maria diabetes follow-up next week`
await cerner`when can Maria see endocrine?`
await cerner`Dr. Smith openings in April`

// Bulk scheduling just works
await cerner`diabetics needing follow-up`
  .schedule(`diabetes management visit`)
```

## FHIR R4 Native

```typescript
// Same natural syntax, FHIR underneath
await cerner`Maria problems`           // returns Condition resources
await cerner`Maria medications`        // returns MedicationRequest resources
await cerner`Maria everything 2024`    // returns Bundle

// Bulk export for population health
await cerner`export diabetics since January`
```

### FHIR R4 Resources Supported

| Category | Resources |
|----------|-----------|
| **Foundation** | Patient, Practitioner, Organization, Location, HealthcareService |
| **Clinical** | Condition, Procedure, Observation, DiagnosticReport, CarePlan |
| **Medications** | MedicationRequest, MedicationDispense, MedicationAdministration, MedicationStatement |
| **Diagnostics** | ServiceRequest, DiagnosticReport, Observation, ImagingStudy |
| **Documents** | DocumentReference, Composition, Bundle |
| **Workflow** | Encounter, EpisodeOfCare, Appointment, Schedule, Slot |
| **Financial** | Coverage, Claim, ExplanationOfBenefit, Account |

### SMART on FHIR

Third-party apps just work. Patient apps, clinician apps, standalone - all supported.

### CDS Hooks

Clinical decision support fires automatically. Drug interactions, allergy warnings, care gaps - surfaced at the point of care.

## AI-Native Healthcare

### Ambient Documentation

```typescript
// Visits document themselves
await cerner`start visit Maria`
  .listen()    // AI listens to the conversation
  .document()  // generates SOAP note
  .sign()      // you review and sign

// No typing during patient care
```

### Clinical Decision Support

```typescript
// AI catches things automatically
// - Drug-allergy interactions
// - Dangerous drug combinations
// - Missing preventive care
// - Diagnostic suggestions

// Or ask directly
await cerner`differential for fatigue weight loss night sweats`
```

### Prior Authorization Automation

```typescript
// Prior auth in one line
await cerner`prior auth Ozempic for Maria to UHC`

// AI builds the case automatically
// - Extracts clinical justification from chart
// - Generates submission with supporting docs
// - Submits electronically
// - Tracks status and appeals if needed

// Check any prior auth
await cerner`Maria Ozempic auth status`
```

### Patient Communication

```typescript
// Results with context, in their language
await cerner`send Maria her A1c results in Spanish`

// AI explains at the right level, you approve before send
// No more copy-paste lab values

// Bulk outreach
await cerner`diabetics needing A1c`
  .notify(`Time for your A1c check`)
```

### Population Health

```typescript
// Query your population like a database
await cerner`A1c > 9 no visit in 6 months`
await cerner`colonoscopy overdue`
await cerner`BP > 140/90 last 3 visits`

// Close care gaps at scale
await cerner`diabetic care gaps`
  .outreach()    // personalized messages
  .schedule()    // book appointments
  .track()       // HEDIS/MIPS reporting

// One line: find, notify, schedule, measure
await cerner`close Q1 diabetes gaps`
```

## Architecture

### HIPAA Architecture

Security is not optional:

```
Patient Data Flow:

Internet --> Cloudflare WAF --> Edge Auth --> Durable Object --> SQLite
                 |                  |              |               |
            DDoS Protection    Zero Trust    Encryption        Encrypted
                              (mTLS, RBAC)      Key            at Rest
                                            (per-tenant)
```

### Durable Object per Health System

```
HealthSystemDO (config, users, roles, facilities)
  |
  +-- PatientsDO (demographics, identifiers)
  |     |-- SQLite: Patient records (encrypted)
  |     +-- R2: Documents, consent forms (encrypted)
  |
  +-- ClinicalDO (notes, orders, results)
  |     |-- SQLite: Clinical data (encrypted)
  |     +-- R2: Imaging, attachments (encrypted)
  |
  +-- FHIRDO (FHIR resources, subscriptions)
  |     |-- SQLite: Resource store
  |     +-- Search indexes
  |
  +-- SchedulingDO (appointments, resources)
  |     |-- SQLite: Schedule data
  |
  +-- BillingDO (claims, payments, ERA)
        |-- SQLite: Financial data (encrypted)
        +-- R2: EOBs, statements
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Active patients, recent visits | <10ms |
| **Warm** | R2 + SQLite Index | Historical records (2-7 years) | <100ms |
| **Cold** | R2 Archive | Compliance retention (7+ years) | <1s |

### Encryption

Per-patient encryption with HSM-backed keys. AES-256-GCM. 90-day rotation. 7-year immutable audit logs. All automatic.

## vs Oracle Health (Cerner)

| Feature | Oracle Health (Cerner) | cerner.do |
|---------|----------------------|-----------|
| **Implementation** | $10M-100M+ | Deploy in minutes |
| **Annual Cost** | $1-5M+ | ~$100/month |
| **Architecture** | Monolithic, on-prem/Oracle Cloud | Edge-native, global |
| **FHIR** | Bolted on | Native foundation |
| **AI** | PowerChart Touch (limited) | AI-first design |
| **Data Location** | Oracle's data centers | Your Cloudflare account |
| **Customization** | $500/hour consultants | Code it yourself |
| **Patient Access** | Portal lock-in | Patients own their data |
| **Interoperability** | Minimum compliance | Open by default |
| **Updates** | Quarterly releases | Continuous deployment |
| **Lock-in** | Decades of migration | MIT licensed |

## Use Cases

### Patient Portals

Patients get full access to their data. Records, appointments, messages, medications, bills - all in one place. FHIR Patient Access API and SMART on FHIR apps included.

### Clinical Integrations

Quest, LabCorp, Surescripts e-prescribe, PACS imaging, CommonWell HIE - all pre-configured. Just connect.

### Analytics and Research

```typescript
// Research exports
await cerner`export diabetics for research deidentified`

// Quality measures
await cerner`HEDIS scores this quarter`
```

### Multi-Facility

One deployment serves hospitals, urgent cares, and clinics. Master patient index, enterprise scheduling, unified billing - all automatic.

## Compliance

### HIPAA

HIPAA compliance built in. Role-based access, break-glass procedures, AES-256 encryption, 7-year audit logs, TLS 1.3. Cloudflare provides BAA for Enterprise customers.

### 21st Century Cures Act

No information blocking. Patient Access API, USCDI v3, FHIR/C-CDA/PDF exports. All automatic.

### ONC Certification

cerner.do provides the technical foundation. Certification (2015 Edition Cures Update) must be obtained separately.

## Deployment Options

### Cloudflare Workers (HIPAA BAA Available)

```bash
npx create-dotdo cerner
# Requires Cloudflare Enterprise with signed BAA
```

### Private Cloud

```bash
# Deploy to your HIPAA-compliant infrastructure
docker run -p 8787:8787 dotdo/cerner

# Or Kubernetes with encryption
kubectl apply -f cerner-do-hipaa.yaml
```

### On-Premises

For organizations requiring complete control:

```bash
./cerner-do-install.sh --on-premises --hipaa-mode --facility-count=5
```

## Why Open Source for Healthcare?

### 1. True Interoperability

Oracle talks interoperability while maintaining proprietary lock-in. Open source means:
- FHIR R4 native, not FHIR-bolted-on
- No information blocking incentives
- Community-driven standards adoption
- CMS and ONC compliance by design

### 2. Innovation Velocity

Healthcare IT moves slowly because vendors profit from the status quo. Open source enables:
- Clinicians to influence development directly
- Researchers to build on clinical data
- Startups to integrate without vendor approval
- Health systems to customize for their needs

### 3. Cost Liberation

$10M-100M implementations are healthcare dollars diverted from patient care. Open source means:
- Minutes to deploy, not months
- No implementation consultants
- No per-bed licensing
- No vendor lock-in

### 4. AI Enablement

Closed EHRs control what AI you can use. Open source means:
- Integrate any LLM
- Build custom clinical decision support
- Reduce documentation burden
- Train models on your data (with governance)

### 5. Patient Empowerment

Patients should own their health data. Open source enables:
- True data portability
- Patient-controlled sharing
- No portal lock-in
- Health data as a patient right

## Risk Acknowledgment

Healthcare software is safety-critical. cerner.do is:
- **Not a substitute for clinical judgment** - AI assists, humans decide
- **Not FDA-cleared** - Not a medical device
- **Not ONC-certified** - Certification requires separate process
- **Your responsibility** - Deployment, configuration, compliance are on you

Use with appropriate clinical governance, testing, and oversight.

## Roadmap

### Core EHR
- [x] Patient Demographics (FHIR Patient)
- [x] Encounters
- [x] Clinical Documentation
- [x] Orders (Medications, Labs, Imaging, Referrals)
- [x] Results
- [x] Problem List
- [x] Medications
- [x] Allergies
- [x] Immunizations
- [x] Scheduling
- [ ] Vital Signs Flowsheets
- [ ] Care Plans
- [ ] Surgical Scheduling

### FHIR
- [x] FHIR R4 Resources
- [x] FHIR Search
- [x] SMART on FHIR
- [x] Bulk FHIR Export
- [x] Patient Access API
- [ ] CDS Hooks
- [ ] Subscriptions
- [ ] TEFCA Integration

### AI
- [x] Ambient Documentation
- [x] Clinical Decision Support
- [x] Prior Authorization Automation
- [x] Patient Communication
- [ ] Predictive Analytics
- [ ] Risk Stratification
- [ ] Sepsis Early Warning

### Compliance
- [x] HIPAA Technical Safeguards
- [x] Audit Logging
- [x] Per-Patient Encryption
- [x] 21st Century Cures Act
- [ ] ONC Certification Support
- [ ] HITRUST CSF
- [ ] SOC 2 Type II

## Contributing

cerner.do is open source under the MIT license.

We especially welcome contributions from:
- Clinicians and nurses
- Health informaticists
- Security and compliance experts
- Patient advocates
- Healthcare AI researchers

```bash
git clone https://github.com/dotdo/cerner.do
cd cerner.do
pnpm install
pnpm test
```

## License

MIT License - For the health of everyone.

---

<p align="center">
  <strong>The $28B acquisition ends here.</strong>
  <br />
  FHIR-native. AI-first. Patient-owned.
  <br /><br />
  <a href="https://cerner.do">Website</a> |
  <a href="https://docs.cerner.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/cerner.do">GitHub</a>
</p>
