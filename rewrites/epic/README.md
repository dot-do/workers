# epic.do

> Electronic Health Records. AI-native. Patient-first.

Epic Systems dominates healthcare IT with 38% market share and a private campus in Verona, Wisconsin that looks like a theme park. Hospitals pay $500M+ for implementations. Patients can't access their own data. Interoperability is a joke.

**epic.do** is the open-source alternative. HIPAA-compliant from day one. FHIR-native. AI that actually helps clinicians instead of creating documentation burden.

## The Problem

Epic (the company) prints money while healthcare burns:

- **$100M-500M implementations** - Multi-year projects that regularly fail
- **$1-5M annual maintenance** - After the implementation
- **Information blocking** - Epic-to-Epic works; everyone else struggles
- **Physician burnout** - 2 hours of documentation for every hour of patient care
- **Patient data hostage** - Your health data trapped in a portal you can't export from
- **AI as afterthought** - "Ambient listening" bolted on, not built in

The American healthcare system spends $4 trillion annually. A significant portion goes to EHR vendors who make care harder, not easier.

## The Solution

**epic.do** reimagines EHR for clinicians and patients:

```
Epic                            epic.do
-----------------------------------------------------------------
$100M-500M implementation       Deploy in hours
$1-5M/year maintenance          $0 - run your own
Information blocking            FHIR-native, open by design
2:1 doc-to-patient ratio        AI handles documentation
Patient portal trap             Patient owns their data
Proprietary everything          Open source, MIT licensed
```

## One-Click Deploy

```bash
npx create-dotdo epic
```

A HIPAA-compliant EHR. Running on infrastructure you control. With AI that reduces documentation burden instead of adding to it.

**Note:** Healthcare is heavily regulated. This is serious software for serious use cases. See compliance section below.

## Features

### Patient Records

The longitudinal health record:

```typescript
import { ehr } from 'epic.do'

// Create patient
const patient = await ehr.patients.create({
  name: {
    given: ['Sarah', 'Jane'],
    family: 'Johnson',
  },
  birthDate: '1985-03-15',
  gender: 'female',
  identifiers: [
    { system: 'http://hospital.org/mrn', value: 'MRN-001234' },
    { system: 'http://hl7.org/fhir/sid/us-ssn', value: '***-**-1234' },
  ],
  telecom: [
    { system: 'phone', value: '555-123-4567', use: 'mobile' },
    { system: 'email', value: 'sarah.johnson@email.com' },
  ],
  address: [{
    line: ['123 Main St', 'Apt 4B'],
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
    country: 'US',
  }],
  contact: [{
    relationship: 'spouse',
    name: { given: ['Michael'], family: 'Johnson' },
    telecom: [{ system: 'phone', value: '555-234-5678' }],
  }],
})
```

### Clinical Documentation

SOAP notes, progress notes, all note types:

```typescript
// Clinical note (traditional)
await ehr.notes.create({
  patient: patient.id,
  encounter: 'ENC-001',
  type: 'progress-note',
  author: 'DR-001',
  content: {
    subjective: `
      Patient presents with persistent cough x 2 weeks.
      Describes as dry, nonproductive. Worse at night.
      No fever, chills, or shortness of breath.
      No sick contacts.
    `,
    objective: {
      vitals: {
        temperature: { value: 98.6, unit: 'F' },
        bloodPressure: { systolic: 122, diastolic: 78 },
        heartRate: 72,
        respiratoryRate: 16,
        oxygenSaturation: 99,
      },
      physical: `
        General: Alert, no acute distress
        HEENT: Oropharynx clear, no erythema
        Lungs: Clear to auscultation bilaterally, no wheezes/rales
        Heart: RRR, no murmurs
      `,
    },
    assessment: `
      1. Persistent dry cough - likely post-viral
         - DDx: Post-nasal drip, GERD, ACE-inhibitor (not on)
    `,
    plan: `
      1. Trial of OTC dextromethorphan PRN
      2. Honey and warm liquids
      3. Return if symptoms worsen or persist > 2 weeks
      4. Consider CXR if no improvement
    `,
  },
})
```

### Orders

Medications, labs, imaging, referrals:

```typescript
// Medication order
await ehr.orders.create({
  patient: patient.id,
  encounter: 'ENC-001',
  type: 'medication',
  orderer: 'DR-001',
  medication: {
    name: 'Amoxicillin',
    strength: '500mg',
    form: 'capsule',
    route: 'oral',
    frequency: 'TID',
    duration: { value: 10, unit: 'days' },
    quantity: 30,
    refills: 0,
    instructions: 'Take one capsule three times daily with food',
  },
  indication: 'Acute bacterial sinusitis',
})

// Lab order
await ehr.orders.create({
  patient: patient.id,
  type: 'lab',
  orderer: 'DR-001',
  tests: [
    { code: 'CBC', name: 'Complete Blood Count' },
    { code: 'BMP', name: 'Basic Metabolic Panel' },
    { code: 'TSH', name: 'Thyroid Stimulating Hormone' },
  ],
  priority: 'routine',
  fasting: false,
  indication: 'Annual wellness visit',
})

// Imaging order
await ehr.orders.create({
  patient: patient.id,
  type: 'imaging',
  orderer: 'DR-001',
  study: {
    modality: 'XR',
    bodyPart: 'Chest',
    views: ['PA', 'Lateral'],
  },
  priority: 'routine',
  indication: 'Persistent cough, rule out pneumonia',
  transportMode: 'ambulatory',
})
```

### Results

Lab values, imaging reports, pathology:

```typescript
// Lab result
await ehr.results.create({
  order: 'ORD-001',
  patient: patient.id,
  type: 'lab',
  status: 'final',
  observations: [
    {
      code: 'WBC',
      name: 'White Blood Cells',
      value: 7.2,
      unit: '10*3/uL',
      referenceRange: { low: 4.5, high: 11.0 },
      interpretation: 'normal',
    },
    {
      code: 'HGB',
      name: 'Hemoglobin',
      value: 14.1,
      unit: 'g/dL',
      referenceRange: { low: 12.0, high: 16.0 },
      interpretation: 'normal',
    },
    {
      code: 'TSH',
      name: 'Thyroid Stimulating Hormone',
      value: 5.8,
      unit: 'mIU/L',
      referenceRange: { low: 0.4, high: 4.0 },
      interpretation: 'high',
      flag: 'abnormal',
    },
  ],
  performedAt: new Date(),
  reportedAt: new Date(),
})

// Imaging result
await ehr.results.create({
  order: 'ORD-002',
  patient: patient.id,
  type: 'imaging',
  status: 'final',
  study: 'Chest X-Ray PA and Lateral',
  findings: `
    FINDINGS:
    Lungs are clear bilaterally. No focal consolidation, effusion, or
    pneumothorax. Cardiomediastinal silhouette is normal. Bony structures
    are intact.

    IMPRESSION:
    No acute cardiopulmonary abnormality.
  `,
  radiologist: 'DR-RAD-001',
  dictatedAt: new Date(),
  verifiedAt: new Date(),
  images: ['img-001.dcm', 'img-002.dcm'],
})
```

### Problem List

Active diagnoses and conditions:

```typescript
// Add to problem list
await ehr.problems.create({
  patient: patient.id,
  condition: {
    code: 'E11.9',
    system: 'ICD-10',
    display: 'Type 2 diabetes mellitus without complications',
  },
  clinicalStatus: 'active',
  verificationStatus: 'confirmed',
  severity: 'moderate',
  onsetDate: '2020-06-15',
  recordedBy: 'DR-001',
  notes: 'Well controlled on metformin. Last A1c 6.8%',
})

// Update problem
await ehr.problems.update('PROB-001', {
  clinicalStatus: 'resolved',
  abatementDate: '2025-01-15',
  notes: 'Resolved following weight loss. No longer on medication.',
})
```

### Medications

Current and historical medications:

```typescript
// Medication list
const medications = await ehr.medications.list(patient.id)

// Add medication
await ehr.medications.create({
  patient: patient.id,
  medication: {
    name: 'Metformin',
    strength: '500mg',
    form: 'tablet',
  },
  dosage: {
    route: 'oral',
    frequency: 'BID',
    instructions: 'Take with breakfast and dinner',
  },
  status: 'active',
  prescribedBy: 'DR-001',
  startDate: '2020-06-20',
  indication: 'Type 2 diabetes mellitus',
})

// Medication reconciliation
await ehr.medications.reconcile({
  patient: patient.id,
  source: 'patient-reported',
  reviewed: true,
  reviewer: 'DR-001',
  changes: [
    { medication: 'MED-001', action: 'continue' },
    { medication: 'MED-002', action: 'discontinue', reason: 'Side effects' },
    { medication: 'OTC-001', action: 'add', details: 'Vitamin D 2000 IU daily' },
  ],
})
```

### Allergies

Critical safety information:

```typescript
await ehr.allergies.create({
  patient: patient.id,
  type: 'allergy', // or 'intolerance'
  category: 'medication',
  substance: {
    code: '7984',
    system: 'RxNorm',
    display: 'Penicillin',
  },
  reaction: [{
    manifestation: 'Hives, throat swelling',
    severity: 'severe',
    onset: 'immediate',
  }],
  criticality: 'high',
  clinicalStatus: 'active',
  verificationStatus: 'confirmed',
  recordedDate: '2015-03-20',
  recorder: 'DR-001',
})
```

### Scheduling

Appointments and resources:

```typescript
// Schedule appointment
await ehr.scheduling.book({
  patient: patient.id,
  provider: 'DR-001',
  type: 'follow-up',
  specialty: 'Internal Medicine',
  duration: 30,
  slot: '2025-02-01T10:30:00',
  reason: 'Diabetes follow-up, review labs',
  notes: 'Patient requested morning appointment',
})

// Check availability
const slots = await ehr.scheduling.availability({
  provider: 'DR-001',
  dateRange: {
    start: '2025-02-01',
    end: '2025-02-07',
  },
  duration: 30,
  appointmentType: 'follow-up',
})

// Waitlist
await ehr.scheduling.waitlist({
  patient: patient.id,
  provider: 'DR-001',
  preferredTimes: ['morning'],
  flexibility: 'next-available',
  notifyVia: ['sms', 'email'],
})
```

## AI-Native Healthcare

This is where epic.do transforms clinical workflows.

### Ambient Clinical Documentation

No more typing during patient visits:

```typescript
import { scribe } from 'epic.do/agents'

// Configure ambient documentation
await ehr.ambient.configure({
  consent: 'required', // Patient must consent
  recording: {
    audio: true,
    transcription: 'real-time',
    storage: 'encrypted-ephemeral', // Deleted after note generation
  },
  output: {
    format: 'soap',
    requireReview: true, // Clinician must approve
  },
})

// During visit, audio is transcribed
// AI generates clinical note

// Clinician reviews and approves
await ehr.notes.review({
  draftId: 'DRAFT-001',
  action: 'approve', // or 'edit', 'reject'
  clinician: 'DR-001',
  attestation: 'I reviewed this AI-generated note and confirm its accuracy',
})
```

### Clinical Decision Support

AI that helps clinicians catch things:

```typescript
import { ada } from 'epic.do/agents'

// Drug-drug interaction checking
await ada`
  Patient is on warfarin and we're considering adding amiodarone.
  What are the interaction concerns and dose adjustments needed?
`
// Ada: "CRITICAL: Amiodarone inhibits warfarin metabolism via CYP2C9.
//       Expected warfarin dose reduction: 30-50%
//       Recommendation: Reduce warfarin dose by 30% and check INR in 1 week.
//       Monitor for signs of bleeding."

// Diagnostic assistance
await ada`
  62yo male with:
  - 2 weeks progressive dyspnea on exertion
  - Bilateral lower extremity edema
  - BNP 890 pg/mL (normal <100)
  - CXR showing cardiomegaly

  What's the differential and recommended workup?
`
```

### Prior Authorization Automation

End the fax-and-wait nightmare:

```typescript
import { ralph } from 'agents.do'

// Auto-generate prior auth
await ralph`
  Generate prior authorization for:
  - Patient: Sarah Johnson (MRN-001234)
  - Medication: Ozempic 0.5mg pen
  - Indication: Type 2 diabetes, failed metformin
  - Insurance: Blue Cross Blue Shield

  Include:
  1. Clinical documentation supporting medical necessity
  2. Lab values (A1c history)
  3. Prior medication trial and failure
  4. BMI and weight history
`

// Submit electronically
await ehr.priorAuth.submit({
  request: 'PA-001',
  payer: 'bcbs',
  method: 'electronic', // via payer API
  urgency: 'routine',
})

// Track status
const status = await ehr.priorAuth.status('PA-001')
// { status: 'approved', approvedDate: '2025-01-20', validThrough: '2026-01-20' }
```

### Patient Communication

AI-powered, clinician-supervised:

```typescript
import { mark } from 'agents.do'

// Generate patient-friendly explanation
await mark`
  The patient's TSH came back at 5.8 (normal 0.4-4.0).
  Write a MyChart message explaining:
  - What this means in plain language
  - Why we want to repeat the test in 6 weeks
  - Symptoms to watch for
  - That this is usually not urgent

  Reading level: 8th grade
  Tone: Reassuring but informative
`

// Clinician reviews before sending
await ehr.messages.sendWithReview({
  patient: patient.id,
  draft: 'Generated message...',
  reviewer: 'DR-001',
  type: 'lab-result',
})
```

### Population Health

Identify gaps in care at scale:

```typescript
import { priya } from 'agents.do'

// Care gap analysis
await priya`
  Identify patients in our panel with:
  1. Diabetes (A1c not checked in >6 months)
  2. Age >50, never had colonoscopy
  3. Women 40-75, mammogram overdue

  For each, generate outreach message and
  create scheduling task.
`

// Bulk outreach
await ehr.outreach.campaign({
  name: 'Diabetic A1c Recall',
  patients: gapList,
  message: {
    template: 'diabetes-a1c-recall',
    channels: ['patient-portal', 'sms'],
  },
  scheduling: {
    enabled: true,
    appointmentType: 'lab-draw',
  },
})
```

## FHIR-Native

Built on open standards:

```typescript
// Every resource is FHIR R4 compliant
const patient = await ehr.fhir.read('Patient', 'patient-123')
// Returns: FHIR R4 Patient resource

// Search using FHIR syntax
const conditions = await ehr.fhir.search('Condition', {
  patient: 'patient-123',
  'clinical-status': 'active',
})

// SMART on FHIR apps work out of the box
await ehr.smartApps.register({
  name: 'Growth Charts',
  launchUrl: 'https://growthcharts.app/launch',
  redirectUri: 'https://growthcharts.app/callback',
  scopes: ['patient/*.read', 'launch'],
})

// Bulk FHIR export (for population health)
const exportJob = await ehr.fhir.bulkExport({
  type: 'system', // or 'group', 'patient'
  since: '2024-01-01',
  types: ['Patient', 'Condition', 'Observation'],
  format: 'ndjson',
})
```

### Patient Access

Patients own their data:

```typescript
// Patient can export everything
const myData = await ehr.patient.export({
  format: 'fhir-bundle', // or 'c-cda', 'pdf'
  include: 'all',
})

// Share with another provider
await ehr.patient.share({
  recipient: 'another-healthcare-org',
  data: ['medications', 'allergies', 'problems', 'immunizations'],
  duration: '30 days',
  purpose: 'continuity-of-care',
})

// Connect to Apple Health, Google Fit, etc.
await ehr.patient.connect({
  app: 'apple-health',
  dataTypes: ['vitals', 'activity', 'labs'],
  direction: 'bidirectional',
})
```

## Architecture

### HIPAA Architecture

Security is not optional:

```
Patient Data Flow:
                                    Encrypted at Rest
                                          |
Internet --> Cloudflare WAF --> Edge Auth --> Durable Object --> SQLite
                 |                  |              |
            DDoS Protection    Zero Trust    Encryption Key
                              (mTLS, RBAC)   (per-tenant)
```

### Durable Object per Practice

```
PracticeDO (config, users, roles)
  |
  +-- PatientsDO (demographics, identifiers)
  |     |-- SQLite: Patient records (encrypted)
  |     +-- R2: Documents, images (encrypted)
  |
  +-- ClinicalDO (notes, orders, results)
  |     |-- SQLite: Clinical data (encrypted)
  |     +-- R2: Attachments (encrypted)
  |
  +-- SchedulingDO (appointments, resources)
  |     |-- SQLite: Schedule data
  |
  +-- BillingDO (claims, payments)
        |-- SQLite: Financial data (encrypted)
        +-- R2: EOBs, statements
```

### Encryption

```typescript
// Every patient's data has a unique encryption key
await ehr.security.configure({
  encryption: {
    algorithm: 'AES-256-GCM',
    keyManagement: 'per-patient', // Each patient has unique DEK
    keyEncryptionKey: 'cloudflare-kms', // KEK in HSM
    rotation: '90 days',
  },
  accessLogging: {
    every: 'read-and-write',
    retention: '7 years',
    immutable: true,
  },
  audit: {
    phi_access: true,
    user_actions: true,
    system_events: true,
  },
})
```

## Compliance

### HIPAA

epic.do is designed for HIPAA compliance:

```typescript
await ehr.compliance.hipaa({
  // Administrative safeguards
  policies: {
    accessControl: 'role-based',
    workforceTraining: 'required',
    contingencyPlan: 'documented',
  },

  // Physical safeguards
  facility: {
    accessControls: 'cloudflare-managed',
    workstationSecurity: 'policy-enforced',
  },

  // Technical safeguards
  technical: {
    accessControl: {
      uniqueUserId: true,
      emergencyAccess: 'break-glass-procedure',
      automaticLogoff: '15-minutes',
      encryption: 'aes-256',
    },
    auditControls: {
      enabled: true,
      retention: '7-years',
    },
    integrity: {
      authentication: 'verified',
      transmission: 'tls-1.3',
    },
  },

  // Business Associate Agreement
  baa: {
    cloudflare: 'signed',
    // You need BAAs with your vendors too
  },
})

// Generate compliance report
const report = await ehr.compliance.report('hipaa', {
  period: '2024',
  includeEvidence: true,
})
```

### 21st Century Cures Act

Information blocking prevention:

```typescript
// Patients can access all their data
// No information blocking
// FHIR API is open
// Patient apps work via SMART on FHIR

await ehr.compliance.curesAct({
  informationBlocking: 'prohibited',
  patientAccess: {
    electronicFormat: true,
    noFees: true,
    thirdPartyApps: 'allowed',
  },
  fhirApi: {
    published: true,
    openAccess: true,
    smartOnFhir: true,
  },
})
```

### ONC Certification

Note: ONC Health IT Certification is a complex, expensive process. epic.do provides the technical foundation but certification must be obtained separately.

## Deployment Options

### Cloudflare Workers (HIPAA BAA available)

```bash
npx create-dotdo epic
# Requires Cloudflare Enterprise with BAA
```

### Private Cloud

```bash
# Deploy to your HIPAA-compliant infrastructure
docker run -p 8787:8787 dotdo/epic

# Or Kubernetes with encryption
kubectl apply -f epic-do-hipaa.yaml
```

### On-Premises

For organizations that require complete control:

```bash
./epic-do-install.sh --on-premises --hipaa-mode
```

## Why Open Source for Healthcare?

**1. Interoperability Through Openness**

Epic (the company) talks about interoperability while maintaining proprietary data formats. Open source means:
- FHIR-native, not FHIR-bolted-on
- No information blocking incentives
- Community-driven standards adoption

**2. Innovation in the Open**

Healthcare IT moves slowly because vendors have no incentive to innovate. Open source enables:
- Researchers to build on clinical data (with consent)
- Startups to integrate without vendor approval
- Health systems to customize for their needs

**3. Cost Reduction**

$100M-500M implementations are obscene. Open source with cloud deployment means:
- Days to deploy, not years
- No implementation consultants
- No vendor lock-in

**4. AI Enablement**

Closed EHRs control what AI you can use. Open source means:
- Integrate any LLM
- Build custom clinical decision support
- Train models on your data (with governance)

**5. Patient Empowerment**

Patients should own their health data. Open source enables:
- True data portability
- Patient-controlled sharing
- No portal lock-in

## Risk Acknowledgment

Healthcare software is safety-critical. epic.do is:
- **Not a substitute for clinical judgment** - AI assists, humans decide
- **Not FDA-cleared** - Not a medical device
- **Not ONC-certified** - Certification requires separate process
- **Your responsibility** - Deployment, configuration, compliance are on you

Use with appropriate clinical governance, testing, and oversight.

## Roadmap

### Core
- [x] Patient Demographics
- [x] Clinical Documentation
- [x] Orders (Medications, Labs, Imaging)
- [x] Results
- [x] Problem List
- [x] Medications
- [x] Allergies
- [x] Scheduling
- [ ] Immunizations
- [ ] Vital Signs Flowsheets
- [ ] Care Plans

### FHIR
- [x] FHIR R4 Resources
- [x] FHIR Search
- [x] SMART on FHIR
- [x] Bulk FHIR Export
- [ ] Subscriptions
- [ ] CDS Hooks

### AI
- [x] Ambient Documentation
- [x] Clinical Decision Support
- [x] Prior Authorization Automation
- [ ] Predictive Analytics
- [ ] Risk Stratification

### Compliance
- [x] HIPAA Technical Safeguards
- [x] Audit Logging
- [x] Encryption
- [ ] ONC Certification Support
- [ ] HITRUST CSF

## Contributing

epic.do is open source under the MIT license.

We especially welcome contributions from:
- Clinicians
- Health informaticists
- Security experts
- Patient advocates

```bash
git clone https://github.com/dotdo/epic.do
cd epic.do
npm install
npm test
```

## License

MIT License - For the health of everyone.

---

<p align="center">
  <strong>epic.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://epic.do">Website</a> | <a href="https://docs.epic.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
