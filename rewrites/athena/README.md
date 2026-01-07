# athena.do

> Practice Management. Revenue Cycle. Patient-First. AI-Native.

Athenahealth built a $17B empire on the backs of independent physicians. Cloud-based practice management that promised to simplify healthcare, but instead delivered $250/patient/year in administrative burden, opaque billing, and interoperability that exists only in marketing materials.

**athena.do** is the open-source alternative. Deploy your own practice management system. AI-native revenue cycle. FHIR-first interoperability. Zero per-claim fees.

## The Problem

Independent practices are being squeezed out of existence:

- **$250/patient/year** in administrative costs - Documentation, billing, prior auth, phone tag
- **6-8% of revenue** to Athenahealth - Per-claim percentages on top of monthly fees
- **30% of healthcare spending** is administrative - $1.2 trillion annually in the US
- **45% claim denial rate** for first submissions - Rework costs $25-35 per claim
- **Prior auth purgatory** - 34 hours/week per practice on prior authorizations alone
- **Interoperability theater** - "FHIR-enabled" but data still trapped in silos

Meanwhile, hospital systems with armies of billing staff acquire struggling practices for pennies on the dollar. The independent physician - the backbone of American healthcare - is disappearing.

## The Solution

**athena.do** levels the playing field:

```
Athenahealth                    athena.do
-----------------------------------------------------------------
$250/patient/year admin         AI handles the paperwork
6-8% per-claim fee              $0 - run your own
45% first-pass denial           AI-optimized clean claims
34 hrs/week prior auth          Automated PA submissions
Months to implement             Deploy in hours
Proprietary everything          Open source, MIT licensed
```

## One-Click Deploy

```bash
npx create-dotdo athena
```

That's it. A complete practice management system. Running on infrastructure you control. With AI that fights for your revenue, not against it.

Or deploy with full customization:

```bash
git clone https://github.com/dotdo/athena.do
cd athena.do
npm install
npm run deploy
```

## Features

### Patient Management

The longitudinal patient record:

```typescript
import { pm } from 'athena.do'

// Create patient with demographics and insurance
const patient = await pm.patients.create({
  name: {
    given: ['Maria', 'Elena'],
    family: 'Rodriguez',
  },
  birthDate: '1978-04-12',
  gender: 'female',
  ssn: '***-**-6789', // Encrypted at rest
  contact: {
    phone: '555-234-5678',
    email: 'maria.rodriguez@email.com',
    preferredMethod: 'text',
  },
  address: {
    line: ['456 Oak Avenue'],
    city: 'Austin',
    state: 'TX',
    zip: '78701',
  },
  insurance: {
    primary: {
      payer: 'BCBS Texas',
      memberId: 'XYZ123456789',
      groupNumber: 'GRP001',
      relationship: 'self',
    },
    secondary: {
      payer: 'Medicare',
      memberId: '1EG4-TE5-MK72',
      relationship: 'self',
    },
  },
  emergencyContact: {
    name: 'Carlos Rodriguez',
    relationship: 'spouse',
    phone: '555-234-5679',
  },
})
```

### Scheduling

Intelligent appointment management:

```typescript
// Book appointment
const appointment = await pm.scheduling.book({
  patient: patient.id,
  provider: 'DR-001',
  type: 'office-visit',
  visitReason: 'Annual wellness exam',
  duration: 30,
  slot: '2025-02-15T09:00:00',
  room: 'Exam-2',
})

// Check availability across providers
const slots = await pm.scheduling.availability({
  providers: ['DR-001', 'DR-002', 'NP-001'],
  dateRange: {
    start: '2025-02-15',
    end: '2025-02-28',
  },
  duration: 30,
  appointmentType: 'office-visit',
})

// Smart scheduling suggestions
const suggestion = await pm.scheduling.suggest({
  patient: patient.id,
  visitReason: 'Diabetes follow-up',
  preferences: {
    provider: 'DR-001',
    timeOfDay: 'morning',
    daysOfWeek: ['tuesday', 'thursday'],
  },
})

// Waitlist management
await pm.scheduling.waitlist({
  patient: patient.id,
  provider: 'DR-001',
  desiredWindow: '1-2 weeks',
  flexibility: 'high',
  notifyVia: ['sms'],
})
```

### Check-In & Intake

Frictionless patient arrival:

```typescript
// Digital check-in (patient does this on phone/kiosk)
await pm.checkin.start({
  appointment: appointment.id,
  method: 'mobile', // or 'kiosk', 'front-desk'
})

// Verify demographics
await pm.checkin.verifyDemographics({
  appointment: appointment.id,
  confirmed: true,
  updates: {
    phone: '555-234-9999', // New phone number
  },
})

// Insurance verification (real-time eligibility)
const eligibility = await pm.checkin.verifyInsurance({
  appointment: appointment.id,
  insurance: patient.insurance.primary,
})
// Returns: { active: true, copay: 25, deductible: { met: 850, remaining: 650 } }

// Collect copay
await pm.checkin.collectCopay({
  appointment: appointment.id,
  amount: eligibility.copay,
  method: 'card-on-file',
})

// Complete check-in
await pm.checkin.complete({
  appointment: appointment.id,
  arrivedAt: new Date(),
  forms: ['hipaa-acknowledgment', 'consent-to-treat'],
})
```

### Clinical Documentation

Encounter documentation that doesn't burn out clinicians:

```typescript
// Start encounter
const encounter = await pm.encounters.start({
  appointment: appointment.id,
  provider: 'DR-001',
})

// Vitals (from nurse station)
await pm.encounters.vitals({
  encounter: encounter.id,
  measurements: {
    bloodPressure: { systolic: 128, diastolic: 82 },
    heartRate: 76,
    temperature: 98.4,
    weight: { value: 165, unit: 'lb' },
    height: { value: 65, unit: 'in' },
    oxygenSaturation: 98,
  },
  recordedBy: 'MA-001',
})

// Chief complaint and HPI
await pm.encounters.note({
  encounter: encounter.id,
  section: 'subjective',
  content: `
    CC: Annual wellness exam
    HPI: 46 y/o female here for annual exam. Reports good health overall.
    Controlled T2DM on metformin. No chest pain, SOB, or concerning symptoms.
    Exercising 3x/week. Following diabetic diet.
  `,
})

// Assessment and plan
await pm.encounters.assess({
  encounter: encounter.id,
  diagnoses: [
    { code: 'Z00.00', description: 'Annual wellness visit' },
    { code: 'E11.9', description: 'Type 2 diabetes mellitus' },
  ],
  plan: [
    'Continue metformin 500mg BID',
    'Order HbA1c, lipid panel, CMP',
    'Refer to ophthalmology for diabetic eye exam',
    'Return in 3 months for diabetes follow-up',
  ],
})
```

### Orders

Labs, imaging, referrals, prescriptions:

```typescript
// Lab order
await pm.orders.lab({
  patient: patient.id,
  encounter: encounter.id,
  tests: [
    { code: '83036', name: 'Hemoglobin A1c' },
    { code: '80061', name: 'Lipid Panel' },
    { code: '80053', name: 'Comprehensive Metabolic Panel' },
  ],
  priority: 'routine',
  fasting: true,
  instructions: 'Fast for 12 hours before blood draw',
  sendTo: 'Quest Diagnostics',
})

// Referral
await pm.orders.referral({
  patient: patient.id,
  encounter: encounter.id,
  specialty: 'Ophthalmology',
  reason: 'Diabetic retinopathy screening',
  urgency: 'routine',
  preferredProvider: 'Austin Eye Associates',
  clinicalNotes: 'T2DM x 5 years, last eye exam 18 months ago',
})

// Prescription (e-prescribe)
await pm.orders.prescription({
  patient: patient.id,
  encounter: encounter.id,
  medication: {
    name: 'Metformin',
    strength: '500mg',
    form: 'tablet',
    route: 'oral',
    sig: 'Take one tablet twice daily with meals',
    quantity: 60,
    refills: 5,
    daysSupply: 30,
  },
  pharmacy: patient.preferredPharmacy,
  method: 'erx', // Electronic prescribe
})
```

## Revenue Cycle Management

This is where athena.do changes the game. AI-native billing that fights for every dollar.

### Charge Capture

Never miss a billable service:

```typescript
import { rcm } from 'athena.do'

// Auto-capture charges from encounter
const charges = await rcm.charges.capture({
  encounter: encounter.id,
  autoCode: true, // AI suggests codes based on documentation
})

// Returns suggested charges with confidence scores:
// [
//   { cpt: '99395', description: 'Preventive visit 40-64', confidence: 0.98 },
//   { cpt: '83036', description: 'Hemoglobin A1c', confidence: 0.99 },
//   { cpt: '80061', description: 'Lipid panel', confidence: 0.99 },
//   { cpt: '99214', description: 'E/M moderate complexity', confidence: 0.72 },
// ]

// Coder reviews and approves
await rcm.charges.approve({
  encounter: encounter.id,
  charges: charges.filter(c => c.confidence > 0.9),
  reviewed: true,
  coder: 'CODER-001',
})
```

### Claims Generation

Clean claims, first time:

```typescript
// Generate claim
const claim = await rcm.claims.create({
  encounter: encounter.id,
  charges: approvedCharges,
  diagnoses: encounter.diagnoses,
})

// AI scrubs the claim before submission
const scrubResult = await rcm.claims.scrub(claim.id)
// {
//   status: 'clean',
//   warnings: [],
//   suggestions: [
//     { type: 'modifier', message: 'Consider modifier 25 for E/M with preventive' }
//   ],
//   denialRisk: 0.08
// }

// Submit claim
await rcm.claims.submit({
  claim: claim.id,
  clearinghouse: 'availity',
  method: 'electronic',
})
```

### Denial Management

AI that fights denials:

```typescript
// Track claim status
const status = await rcm.claims.status(claim.id)
// { status: 'denied', reason: 'Medical necessity not established', code: 'CO-50' }

// AI analyzes denial and recommends action
const analysis = await rcm.denials.analyze(claim.id)
// {
//   rootCause: 'Missing documentation of prior treatment failure',
//   recommendation: 'appeal',
//   successProbability: 0.78,
//   requiredDocumentation: ['Treatment history', 'Lab results'],
//   appealDeadline: '2025-03-15'
// }

// Generate appeal
const appeal = await rcm.denials.appeal({
  claim: claim.id,
  reason: analysis.recommendation,
  supportingDocs: ['treatment-history.pdf', 'lab-results.pdf'],
  letterType: 'medical-necessity',
})

// AI-drafted appeal letter
console.log(appeal.letter)
// "Dear Medical Director, we are appealing the denial of claim #12345..."
```

### Prior Authorization

Automated PA that doesn't waste 34 hours/week:

```typescript
// Check if PA required
const paCheck = await rcm.priorAuth.required({
  patient: patient.id,
  service: {
    code: '27447',
    description: 'Total knee arthroplasty',
  },
  insurance: patient.insurance.primary,
})
// { required: true, turnaround: '5-7 business days' }

// Submit PA with AI-generated clinical summary
const pa = await rcm.priorAuth.submit({
  patient: patient.id,
  service: paCheck.service,
  provider: 'DR-001',
  clinicalInfo: {
    diagnosis: 'M17.11 - Primary osteoarthritis, right knee',
    failedTreatments: ['Physical therapy x 12 weeks', 'NSAIDs', 'Corticosteroid injection'],
    functionalLimitation: 'Unable to walk >100 feet, stairs impossible',
    imagingFindings: 'Bone-on-bone medial compartment, varus deformity 8 degrees',
  },
  attachments: ['xray-knee.pdf', 'pt-notes.pdf'],
  autoGenerateLetter: true, // AI writes the medical necessity letter
})

// Track PA status
await rcm.priorAuth.track(pa.id)
// Notifies when approved/denied, auto-appeals if denied
```

### Payment Posting

Automated ERA/EOB processing:

```typescript
// Receive ERA (Electronic Remittance Advice)
const era = await rcm.payments.processERA({
  file: eraFile,
  autoPost: true,
})

// ERA parsed and payments posted automatically:
// {
//   claims: 47,
//   totalPaid: 12847.50,
//   adjustments: 2340.00,
//   patientResponsibility: 1250.00,
//   denials: 3
// }

// Patient statements generated automatically
await rcm.statements.generate({
  patients: era.patientResponsibility.map(p => p.patientId),
  method: 'electronic', // or 'paper'
})
```

## API Compatibility

athena.do provides API compatibility with Athenahealth's API structure:

### Patient API

```typescript
// Athenahealth-compatible endpoints
GET    /patients                    // List patients
POST   /patients                    // Create patient
GET    /patients/:id                // Get patient
PUT    /patients/:id                // Update patient
GET    /patients/:id/insurances     // Get patient insurance
POST   /patients/:id/insurances     // Add insurance

// athena.do SDK
import { patients } from 'athena.do'

const patient = await patients.get('12345')
const insurances = await patients.insurances.list('12345')
```

### Appointment API

```typescript
// Athenahealth-compatible endpoints
GET    /appointments                // List appointments
POST   /appointments                // Book appointment
GET    /appointments/:id            // Get appointment
PUT    /appointments/:id            // Update appointment
DELETE /appointments/:id            // Cancel appointment
GET    /appointments/open           // Find open slots

// athena.do SDK
import { appointments } from 'athena.do'

const slots = await appointments.openSlots({
  departmentId: 'DEPT-001',
  providerId: 'DR-001',
  startDate: '2025-02-15',
  endDate: '2025-02-28',
})
```

### Claims API

```typescript
// Athenahealth-compatible endpoints
GET    /claims                      // List claims
POST   /claims                      // Create claim
GET    /claims/:id                  // Get claim
GET    /claims/:id/status           // Claim status
POST   /claims/:id/submit           // Submit to payer

// athena.do SDK
import { claims } from 'athena.do'

const claim = await claims.create({
  patientId: '12345',
  encounterId: 'ENC-001',
  charges: [{ cpt: '99214', units: 1 }],
})
```

### Document API

```typescript
// Athenahealth-compatible endpoints
GET    /documents                   // List documents
POST   /documents                   // Upload document
GET    /documents/:id               // Get document
GET    /documents/:id/content       // Download content
DELETE /documents/:id               // Delete document

// athena.do SDK
import { documents } from 'athena.do'

const doc = await documents.upload({
  patientId: '12345',
  type: 'lab-result',
  file: labResultPdf,
})
```

## AI-Native Practice

### Ambient Documentation

End documentation burden:

```typescript
import { scribe } from 'athena.do/agents'

// Configure ambient documentation
await pm.ambient.configure({
  consent: 'required',
  recording: {
    audio: true,
    transcription: 'real-time',
    storage: 'encrypted-ephemeral',
  },
  output: {
    format: 'soap',
    icdSuggestions: true,
    cptSuggestions: true,
    requireReview: true,
  },
})

// Visit happens, audio transcribed, note generated
// Provider reviews and attests
await pm.encounters.attest({
  encounter: encounter.id,
  provider: 'DR-001',
  attestation: 'I have reviewed this AI-generated note and confirm its accuracy',
})
```

### Intelligent Coding

AI coding assistant:

```typescript
import { ada } from 'athena.do/agents'

// Suggest codes from documentation
await ada`
  Review this encounter note and suggest appropriate:
  1. E/M level with supporting documentation
  2. ICD-10 diagnoses in order of specificity
  3. Any applicable modifiers
  4. Potential missed charges

  Note: ${encounterNote}
`

// Ada responds with coded suggestions and rationale
```

### Patient Communication

AI-powered, human-supervised:

```typescript
import { mark } from 'agents.do'

// Generate patient message
await mark`
  The patient's A1c came back at 7.8% (was 7.2% last time).
  Write a portal message explaining:
  - What this means in plain language
  - That we'd like to adjust their medication
  - They should schedule a follow-up
  - Diet and exercise reminders

  Tone: Encouraging but direct
  Reading level: 8th grade
`

// Staff reviews before sending
await pm.messages.sendWithReview({
  patient: patient.id,
  draft: generatedMessage,
  reviewer: 'MA-001',
  type: 'lab-result',
})
```

### Recall Management

Proactive patient outreach:

```typescript
import { priya } from 'agents.do'

// Identify care gaps
await priya`
  Find patients who:
  1. Have diabetes but no A1c in 6+ months
  2. Are due for annual wellness visit
  3. Have open referrals not scheduled
  4. Missed appointments without reschedule

  For each, generate appropriate outreach.
`

// Automated campaigns
await pm.outreach.campaign({
  name: 'Diabetic Recall Q1 2025',
  patients: diabeticCareGaps,
  messages: [
    { day: 0, channel: 'sms', template: 'a1c-reminder-text' },
    { day: 3, channel: 'email', template: 'a1c-reminder-email' },
    { day: 7, channel: 'phone', template: 'a1c-reminder-call' },
  ],
  scheduling: {
    enabled: true,
    appointmentType: 'diabetes-followup',
  },
})
```

## Architecture

### Multi-Tenant Isolation

Each practice runs in complete isolation:

```
family-medicine.athena.do    <- Dr. Smith's Family Practice
ortho-associates.athena.do   <- Ortho Associates of Austin
urgent-care-tx.athena.do     <- Texas Urgent Care Network
```

Data never comingles. Billing is separate. Compliance is independent.

### Durable Object Architecture

```
PracticeDO (config, users, providers, payers)
  |
  +-- PatientDO (demographics, insurance, history)
  |     |-- SQLite: Patient data (encrypted)
  |     +-- R2: Documents, images (encrypted)
  |
  +-- SchedulingDO (appointments, resources, rooms)
  |     |-- SQLite: Schedule data
  |     +-- WebSocket: Real-time updates
  |
  +-- EncounterDO (notes, orders, charges)
  |     |-- SQLite: Clinical data (encrypted)
  |     +-- R2: Attachments, dictations
  |
  +-- BillingDO (claims, payments, denials)
        |-- SQLite: Financial data (encrypted)
        +-- R2: ERA/EOB archives
```

### Data Flow

```
                    Cloudflare Edge
                          |
Patient Check-in --> [SchedulingDO] --> Appointment Ready
                          |
Provider Visit   --> [EncounterDO]  --> Clinical Note
                          |
Charge Capture   --> [BillingDO]    --> Claim Generated
                          |
Claim Submission --> [Clearinghouse] --> Payer
                          |
Payment/Denial   --> [BillingDO]    --> Posted/Appealed
```

### HIPAA Architecture

```
Patient Data Flow:
                                    Encrypted at Rest (AES-256)
                                              |
Internet --> Cloudflare WAF --> Edge Auth --> Durable Object --> SQLite
                 |                  |              |
            DDoS Protection    RBAC + MFA    Per-Patient Keys
                              (id.org.ai)
```

## Use Cases

### Solo Practice / Small Group

```bash
npx create-dotdo athena

# Configure for small practice
athena.do/setup
- 1-3 providers
- Basic scheduling
- Standard billing
- Patient portal
```

**Cost**: Self-hosted free, or $99/month managed

### Telehealth Practice

```typescript
// Enable telehealth
await pm.telehealth.configure({
  platform: 'integrated', // Built-in video
  scheduling: {
    virtualSlots: true,
    bufferTime: 5,
  },
  documentation: {
    autoStartOnConnect: true,
    ambientEnabled: true,
  },
  billing: {
    modifiers: ['95'], // Synchronous telemedicine
    posCode: '02', // Telehealth
  },
})
```

### Billing-Only / RCM Service

```typescript
// Use athena.do for RCM without PM
import { rcm } from 'athena.do'

// Connect to external EHR
await rcm.connect({
  source: 'external-ehr',
  type: 'hl7-fhir',
  endpoint: 'https://ehr.hospital.com/fhir/r4',
})

// Process claims from any source
await rcm.claims.import({
  source: 'hl7-837',
  file: claimBatch,
})
```

### Multi-Location Group

```typescript
// Configure multi-site
await pm.organization.configure({
  name: 'Austin Medical Group',
  locations: [
    { id: 'downtown', name: 'Downtown Clinic', timezone: 'America/Chicago' },
    { id: 'north', name: 'North Austin', timezone: 'America/Chicago' },
    { id: 'south', name: 'South Austin', timezone: 'America/Chicago' },
  ],
  providers: [
    { id: 'DR-001', locations: ['downtown', 'north'] },
    { id: 'DR-002', locations: ['south'] },
    { id: 'NP-001', locations: ['downtown', 'south'] },
  ],
  centralBilling: true,
  sharedScheduling: true,
})
```

## Deployment Options

### Cloudflare Workers (Recommended)

```bash
npx create-dotdo athena
# Deploys to your Cloudflare account
# HIPAA BAA available through Cloudflare Enterprise
```

### Private Cloud

```bash
# Deploy to your infrastructure
docker run -p 8787:8787 dotdo/athena

# Or Kubernetes
kubectl apply -f athena-do-hipaa.yaml
```

### On-Premises

For organizations requiring complete control:

```bash
./athena-do-install.sh --on-premises --hipaa-mode
```

## vs Athenahealth

| Feature | Athenahealth | athena.do |
|---------|--------------|-----------|
| Starting Price | $250+/patient/year | $0 (self-host) |
| Per-Claim Fee | 6-8% of collections | $0 |
| Implementation | 3-6 months | Hours |
| AI Features | Premium add-on | Included |
| Prior Auth | Manual + fees | AI-automated |
| Denial Management | Basic reporting | AI-powered appeals |
| Data Ownership | Theirs | Yours |
| FHIR API | Limited | Native |
| Open Source | No | Yes |

## Interoperability

### FHIR R4 Native

```typescript
// Every resource is FHIR R4 compliant
const patient = await pm.fhir.read('Patient', 'patient-123')
// Returns: FHIR R4 Patient resource

// FHIR search
const conditions = await pm.fhir.search('Condition', {
  patient: 'patient-123',
  'clinical-status': 'active',
})

// Bulk FHIR export
const exportJob = await pm.fhir.bulkExport({
  type: 'patient',
  patients: ['patient-123', 'patient-456'],
  types: ['Patient', 'Encounter', 'Condition', 'Observation'],
})
```

### Health Information Exchange

```typescript
// Carequality / CommonWell integration
await pm.hie.query({
  patient: patient.id,
  networks: ['carequality', 'commonwell'],
  documentTypes: ['ccd', 'discharge-summary'],
})

// Receive documents from other providers
pm.hie.onDocument(async (doc) => {
  await pm.documents.import({
    patient: doc.patientId,
    content: doc.content,
    type: doc.type,
    source: doc.source,
  })
})
```

## Roadmap

### Core
- [x] Patient Management
- [x] Scheduling
- [x] Check-in & Intake
- [x] Clinical Documentation
- [x] Orders (Labs, Imaging, Rx)
- [ ] Immunizations
- [ ] Growth Charts
- [ ] Patient Portal

### Revenue Cycle
- [x] Charge Capture
- [x] Claims Generation
- [x] ERA Processing
- [x] Denial Management
- [x] Prior Authorization
- [ ] Patient Collections
- [ ] Payment Plans
- [ ] Credit Card on File

### Interoperability
- [x] FHIR R4 API
- [x] HL7 ADT/ORM/ORU
- [ ] Carequality
- [ ] CommonWell
- [ ] Direct Messaging
- [ ] e-Prescribing (NCPDP)

### AI
- [x] Ambient Documentation
- [x] Coding Suggestions
- [x] Denial Analysis
- [ ] Prior Auth Automation
- [ ] Patient Communication
- [ ] Population Health Analytics

## Contributing

athena.do is open source under the MIT license.

We especially welcome contributions from:
- Practice administrators
- Medical billers and coders
- Healthcare IT professionals
- Independent physicians

```bash
git clone https://github.com/dotdo/athena.do
cd athena.do
npm install
npm test
```

## Risk Acknowledgment

Healthcare software is safety-critical and heavily regulated. athena.do is:
- **Not a substitute for professional judgment** - AI assists, humans decide
- **Not ONC-certified** - Certification requires separate process
- **Your responsibility** - Deployment, configuration, and compliance are on you

Use with appropriate clinical and administrative governance.

## License

MIT License - For the health of independent practice.

---

<p align="center">
  <strong>athena.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://athena.do">Website</a> | <a href="https://docs.athena.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>

<div align="center">

**Built with [workers.do](https://workers.do)**

*Workers work for you.*

</div>
