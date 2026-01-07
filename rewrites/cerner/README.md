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
import { cerner, ada, ralph, priya } from 'cerner.do'

// Natural language queries
const diabetics = await cerner`patients with diabetes and A1C > 7`
const gaps = await cerner`care gaps for patient ${patientId}`
const overdue = await cerner`patients overdue for colonoscopy screening`

// Promise pipelining (one network round trip)
const outreach = await cerner`find diabetic patients needing A1C check`
  .map(p => ada`identify care gaps for ${p}`)
  .map(gaps => ralph`create intervention plan`)
  .map(plan => cerner`send MyChart message`)

// AI-assisted clinical workflows
const encounter = await cerner`start visit for ${patient}`
  .map(visit => ada`generate SOAP note from ambient recording`)
  .map(note => priya`review for quality measures`)
  .map(note => cerner`finalize and sign`)
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

Complete patient records with FHIR compliance:

```typescript
import { cerner } from 'cerner.do'

// Natural language patient lookup
const maria = await cerner`find patient Maria Rodriguez DOB 1978-09-22`
const diabetics = await cerner`all patients with Type 2 diabetes in Austin TX`

// Or use the structured API for precise FHIR Patient resources
const patient = await cerner.patients.create({
  name: { given: ['Maria', 'Elena'], family: 'Rodriguez' },
  birthDate: '1978-09-22',
  gender: 'female',
  identifiers: [
    { system: 'http://hospital.org/mrn', value: 'MRN-789456' },
    { system: 'http://hl7.org/fhir/sid/us-medicare', value: '1EG4-TE5-MK72' },
  ],
  telecom: [
    { system: 'phone', value: '555-987-6543', use: 'mobile' },
    { system: 'email', value: 'maria.rodriguez@email.com' },
  ],
  address: [{
    line: ['456 Oak Avenue'],
    city: 'Austin',
    state: 'TX',
    postalCode: '78701',
  }],
  communication: [{ language: 'es', preferred: true }],
})
```

### Encounters

Track patient visits across care settings:

```typescript
import { cerner, ada } from 'cerner.do'

// Natural language encounter flow with AI documentation
const visit = await cerner`start wellness visit for ${patient.id} with Dr. Smith`
  .map(enc => ada`generate SOAP note from ambient recording`)
  .map(note => cerner`finalize encounter with discharge to home`)

// Or structured API for precise control
const encounter = await cerner.encounters.create({
  patient: patient.id,
  type: 'outpatient',
  class: 'ambulatory',
  status: 'in-progress',
  serviceProvider: 'Family Medicine Clinic',
  participant: [{ individual: 'DR-001', type: 'primary-performer' }],
  reasonCode: [{ code: 'Z00.00', display: 'General adult medical examination' }],
})

await cerner.encounters.discharge(encounter.id, { dischargeDisposition: 'home' })
```

### Clinical Documentation

SOAP notes, progress notes, procedure notes - all standard formats:

```typescript
import { cerner } from 'cerner.do'

// Clinical note with ambient AI assistance
await cerner.notes.create({
  patient: patient.id,
  encounter: encounter.id,
  type: 'progress-note',
  author: 'DR-001',
  content: {
    subjective: `
      Patient presents for annual wellness visit.
      No acute complaints. Reports mild seasonal allergies.
      Current medications reviewed - compliant with lisinopril.
      Family history updated - mother diagnosed with T2DM.
    `,
    objective: {
      vitals: {
        temperature: { value: 98.4, unit: 'F' },
        bloodPressure: { systolic: 128, diastolic: 82 },
        heartRate: 76,
        respiratoryRate: 14,
        oxygenSaturation: 98,
        weight: { value: 165, unit: 'lbs' },
        height: { value: 64, unit: 'in' },
        bmi: 28.3,
      },
      physical: `
        General: Well-appearing, NAD
        HEENT: PERRLA, TMs clear
        Neck: Supple, no lymphadenopathy
        CV: RRR, no murmurs
        Lungs: CTAB
        Abdomen: Soft, NT, ND
        Extremities: No edema
      `,
    },
    assessment: `
      1. Hypertension - controlled on current regimen
      2. Overweight (BMI 28.3) - counseled on lifestyle
      3. Family history T2DM - screening indicated
    `,
    plan: `
      1. Continue lisinopril 10mg daily
      2. Order HbA1c, lipid panel, CMP
      3. Referral to nutrition counseling
      4. Return in 3 months or PRN
    `,
  },
})
```

### Orders

Medications, labs, imaging, procedures, referrals:

```typescript
import { cerner, ada, ralph } from 'cerner.do'

// Natural language ordering with AI assistance
await cerner`order lisinopril 10mg daily for ${patient.id} for hypertension`
await cerner`order A1c and lipid panel for ${patient.id}, fasting required`
await cerner`refer ${patient.id} to endocrinology for diabetes management`

// AI-driven order recommendations with pipelining
const orders = await ada`review ${patient.id} chart and recommend preventive care orders`
  .map(recs => ralph`generate FHIR order resources`)
  .map(orders => cerner`submit orders pending clinician approval`)

// Structured API for precise order entry
await cerner.orders.create({
  patient: patient.id,
  type: 'medication',
  orderer: 'DR-001',
  medication: { code: '314076', system: 'RxNorm', display: 'Lisinopril 10 MG Oral Tablet' },
  dosage: { route: 'oral', frequency: 'daily', duration: { value: 90, unit: 'days' }, refills: 3 },
  indication: 'Essential hypertension',
})

await cerner.orders.create({
  patient: patient.id,
  type: 'lab',
  orderer: 'DR-001',
  tests: [
    { code: '4548-4', display: 'Hemoglobin A1c' },
    { code: '2093-3', display: 'Total Cholesterol' },
    { code: '2089-1', display: 'LDL Cholesterol' },
  ],
  priority: 'routine',
  fasting: true,
})
```

### Results

Lab values, imaging reports, pathology - with critical value alerts:

```typescript
// Lab result
await cerner.results.create({
  order: 'ORD-001',
  patient: patient.id,
  type: 'lab',
  status: 'final',
  observations: [
    {
      code: '4548-4',
      display: 'Hemoglobin A1c',
      value: 6.2,
      unit: '%',
      referenceRange: { low: 4.0, high: 5.6 },
      interpretation: 'high',
      flag: 'prediabetes',
    },
    {
      code: '2093-3',
      display: 'Total Cholesterol',
      value: 198,
      unit: 'mg/dL',
      referenceRange: { low: 0, high: 200 },
      interpretation: 'normal',
    },
    {
      code: '2085-9',
      display: 'HDL Cholesterol',
      value: 52,
      unit: 'mg/dL',
      referenceRange: { low: 40, high: 999 },
      interpretation: 'normal',
    },
    {
      code: '2089-1',
      display: 'LDL Cholesterol',
      value: 128,
      unit: 'mg/dL',
      referenceRange: { low: 0, high: 100 },
      interpretation: 'high',
    },
  ],
  performedAt: new Date(),
  reportedAt: new Date(),
  reviewedBy: 'DR-001',
})
```

### Problem List

Active diagnoses using ICD-10 and SNOMED:

```typescript
// Add to problem list
await cerner.problems.create({
  patient: patient.id,
  condition: {
    code: 'E11.9',
    system: 'ICD-10',
    display: 'Type 2 diabetes mellitus without complications',
  },
  snomedCode: '44054006',
  clinicalStatus: 'active',
  verificationStatus: 'confirmed',
  severity: 'moderate',
  onsetDate: '2025-01-15',
  recordedBy: 'DR-001',
  encounter: encounter.id,
  notes: 'Newly diagnosed based on A1c 6.2%. Starting lifestyle modifications.',
})
```

### Allergies

Drug allergies, food allergies, environmental - with severity tracking:

```typescript
await cerner.allergies.create({
  patient: patient.id,
  type: 'allergy',
  category: 'medication',
  substance: {
    code: '7980',
    system: 'RxNorm',
    display: 'Sulfonamide',
  },
  reaction: [{
    manifestation: 'Generalized rash, facial swelling',
    severity: 'severe',
    onset: 'delayed',
  }],
  criticality: 'high',
  clinicalStatus: 'active',
  verificationStatus: 'confirmed',
  recordedDate: '2010-05-15',
  recorder: 'DR-001',
  note: 'Documented reaction to Bactrim in 2010. Avoid all sulfa drugs.',
})
```

### Immunizations

Full immunization records with forecasting:

```typescript
// Record immunization
await cerner.immunizations.create({
  patient: patient.id,
  vaccine: {
    code: '141',
    system: 'CVX',
    display: 'Influenza, seasonal, injectable, preservative free',
  },
  status: 'completed',
  occurrenceDateTime: new Date(),
  site: 'left deltoid',
  route: 'intramuscular',
  performer: 'RN-001',
  lotNumber: 'ABC123',
  expirationDate: '2025-06-01',
})

// Get immunization forecast
const forecast = await cerner.immunizations.forecast(patient.id)
// Returns due/overdue vaccines based on CDC schedule
```

### Scheduling

Appointments, resources, waitlists:

```typescript
import { cerner } from 'cerner.do'

// Natural language scheduling
await cerner`schedule ${patient.id} for diabetes follow-up with Dr. Smith next week`
await cerner`find next available afternoon slot for ${patient.id} with endocrinology`
const slots = await cerner`available 20-minute slots for Dr. Smith in April`

// Structured API for precise booking
await cerner.scheduling.book({
  patient: patient.id,
  provider: 'DR-001',
  type: 'follow-up',
  specialty: 'Internal Medicine',
  duration: 20,
  slot: '2025-04-15T14:00:00',
  reason: 'Diabetes follow-up, review A1c',
  reminders: ['email', 'sms'],
})
```

## FHIR R4 Native

Built on open standards from the ground up:

```typescript
import { cerner } from 'cerner.do/fhir'  // FHIR-only import

// Natural language FHIR queries
const conditions = await cerner`active problem list for ${patientId}`
const meds = await cerner`current medications for ${patientId}`

// Structured FHIR API
const patient = await cerner.fhir.read('Patient', 'patient-123')
const everything = await cerner.fhir.patientEverything('patient-123', {
  start: '2024-01-01',
  end: '2025-12-31',
  _type: 'Condition,MedicationRequest,Observation',
})

// Bulk FHIR export (for population health, analytics)
const exportJob = await cerner.fhir.bulkExport({
  type: 'group',
  groupId: 'diabetic-patients',
  since: '2024-01-01',
  types: ['Patient', 'Condition', 'Observation', 'MedicationRequest'],
  format: 'ndjson',
})
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

Third-party apps integrate seamlessly:

```typescript
// Register SMART app
await cerner.smartApps.register({
  name: 'Diabetes Management App',
  launchUrl: 'https://diabetes-app.com/launch',
  redirectUri: 'https://diabetes-app.com/callback',
  scopes: [
    'patient/*.read',
    'patient/Observation.write',
    'launch',
    'offline_access',
  ],
  logoUri: 'https://diabetes-app.com/logo.png',
})

// Launch context provided automatically
// Patient apps, clinician apps, standalone apps all supported
```

### CDS Hooks

Clinical decision support at the point of care:

```typescript
// Register CDS service
await cerner.cds.register({
  id: 'drug-interaction-check',
  hook: 'medication-prescribe',
  title: 'Drug-Drug Interaction Check',
  description: 'Checks for dangerous drug interactions',
  prefetch: {
    patient: 'Patient/{{context.patientId}}',
    medications: 'MedicationRequest?patient={{context.patientId}}&status=active',
  },
})

// Hook fires automatically when provider prescribes
// Returns cards with warnings, suggestions, info
```

## AI-Native Healthcare

This is where cerner.do transforms clinical workflows.

### Ambient Clinical Documentation

No more typing during patient visits:

```typescript
import { scribe } from 'cerner.do/agents'

// Configure ambient documentation
await cerner.ambient.configure({
  consent: 'required', // Patient must consent each visit
  recording: {
    audio: true,
    transcription: 'real-time',
    storage: 'encrypted-ephemeral', // Deleted after note generation
  },
  output: {
    format: 'soap',
    requireReview: true, // Clinician must approve
    attestation: true,
  },
})

// During visit, conversation is transcribed
// AI generates structured clinical note

// Clinician reviews and signs
await cerner.notes.review({
  draftId: 'DRAFT-001',
  action: 'approve', // or 'edit', 'reject'
  clinician: 'DR-001',
  attestation: 'I have reviewed this AI-generated note and confirm its accuracy.',
})
```

### Clinical Decision Support

AI that helps clinicians catch things:

```typescript
import { ada } from 'cerner.do/agents'

// Drug-allergy interaction check
await ada`
  Patient has documented sulfa allergy.
  Provider is ordering Bactrim DS.
  What should I alert about?
`
// Ada: "CRITICAL ALERT: Bactrim DS (sulfamethoxazole/trimethoprim)
//       contains a sulfonamide antibiotic.
//       Patient has documented severe sulfa allergy with facial swelling.
//       DO NOT ADMINISTER. Suggest alternative antibiotics."

// Diagnostic reasoning assistance
await ada`
  55yo female with:
  - 3 months progressive fatigue
  - Unintentional 15lb weight loss
  - Night sweats
  - LDH elevated, normal CBC

  What workup should I consider?
`
```

### Prior Authorization Automation

End the fax-and-wait nightmare:

```typescript
import { cerner, ralph, ada } from 'cerner.do'

// Full prior auth workflow with pipelining (one network round trip)
const approval = await cerner`get ${patient.id} chart for Ozempic prior auth`
  .map(chart => ada`extract clinical justification for GLP-1 therapy`)
  .map(justification => ralph`generate prior auth submission for UHC`)
  .map(submission => cerner`submit electronically and track status`)

// Natural language prior auth
await cerner`submit prior auth for Ozempic for ${patient.id} to United Healthcare`

// Structured API for precise control
await cerner.priorAuth.submit({
  request: 'PA-001',
  payer: 'uhc',
  method: 'electronic',
  urgency: 'routine',
  attachments: ['clinical-notes', 'lab-results'],
})

const status = await cerner.priorAuth.status('PA-001')
```

### Patient Communication

AI-powered, clinician-supervised:

```typescript
import { cerner, mark, priya } from 'cerner.do'

// Full communication workflow with pipelining
const sent = await cerner`get A1c result for ${patient.id}`
  .map(result => mark`explain ${result} in Spanish at 6th grade reading level`)
  .map(message => priya`review for clinical accuracy`)
  .map(reviewed => cerner`send via MyChart pending clinician approval`)

// Natural language patient messaging
await cerner`send ${patient.id} their lab results with lifestyle recommendations`
await cerner`remind ${patient.id} about upcoming A1c screening in Spanish`

// Structured API for precise control
await cerner.messages.sendWithReview({
  patient: patient.id,
  draft: 'Generated message...',
  reviewer: 'DR-001',
  type: 'lab-result',
  requiresAcknowledgment: true,
})
```

### Population Health Analytics

Identify gaps in care at scale:

```typescript
import { cerner, ada, ralph, priya, mark } from 'cerner.do'

// Care gap analysis with full pipelining (one network round trip)
const campaign = await cerner`diabetic patients with care gaps`
  .map(patients => ada`identify specific gaps for each patient`)
  .map(gaps => priya`prioritize by risk and urgency`)
  .map(prioritized => ralph`generate personalized order sets`)
  .map(orders => mark`draft patient outreach messages`)
  .map(outreach => cerner`schedule campaign execution`)

// Natural language population queries
const atRisk = await cerner`patients with A1c > 9 and no visit in 6 months`
const overdue = await cerner`patients overdue for colonoscopy by HEDIS criteria`
const uncontrolled = await cerner`hypertensive patients with BP > 140/90 on last 3 visits`

// Structured campaign API
await cerner.outreach.campaign({
  name: 'Diabetic Care Gaps Q1',
  cohort: 'diabetic-registry',
  gaps: ['a1c', 'eye-exam', 'foot-exam'],
  channels: ['patient-portal', 'sms'],
  scheduling: { enabled: true, appointmentType: 'chronic-care-visit' },
  tracking: { measures: ['HEDIS', 'MIPS'] },
})
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

```typescript
// Per-patient encryption with HSM-backed key management
await cerner.security.configure({
  encryption: {
    algorithm: 'AES-256-GCM',
    keyManagement: 'per-patient', // Each patient has unique DEK
    keyEncryptionKey: 'cloudflare-kms', // KEK in HSM
    rotation: '90 days',
  },
  accessLogging: {
    every: 'read-and-write',
    retention: '7 years', // HIPAA minimum
    immutable: true,
    tamperEvident: true,
  },
  audit: {
    phi_access: true,
    user_actions: true,
    system_events: true,
    export_requests: true,
  },
})
```

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

```typescript
// Patient-facing portal with full data access
import { PatientPortal } from 'cerner.do/portal'

export default PatientPortal({
  features: {
    records: true,           // View all medical records
    appointments: true,      // Schedule and manage visits
    messaging: true,         // Secure messaging with care team
    medications: true,       // View and request refills
    bills: true,             // View and pay bills
    sharing: true,           // Share records with other providers
    export: true,            // Download complete health record
  },
  fhir: {
    patientAccess: true,     // FHIR Patient Access API
    thirdPartyApps: true,    // SMART on FHIR app launch
  },
})
```

### Clinical Integrations

```typescript
// Connect to labs, imaging, pharmacies
await cerner.integrations.configure({
  lab: {
    vendor: 'quest-diagnostics',
    interface: 'hl7v2', // or 'fhir'
    orders: true,
    results: true,
  },
  pharmacy: {
    network: 'surescripts',
    eprescribe: true,
    eligibility: true,
    pdmp: true, // Prescription Drug Monitoring
  },
  imaging: {
    vendor: 'radiology-partners',
    pacs: true,
    viewer: 'cloud-native',
  },
  hie: {
    network: 'commonwell',
    queryBased: true,
    documents: true,
  },
})
```

### Analytics and Research

```typescript
// De-identified data for research
await cerner.analytics.export({
  cohort: 'diabetes-study',
  deidentification: 'safe-harbor', // or 'expert-determination'
  format: 'parquet',
  destination: 'research-bucket',
  irb: 'IRB-2025-001',
})

// Real-time quality measures
const hedis = await cerner.quality.measures({
  measureSet: 'HEDIS-2025',
  measures: ['CDC', 'BCS', 'COL'], // Diabetes, Breast Cancer, Colorectal
  population: 'all-attributed',
})
```

### Multi-Facility Health Systems

```typescript
// Federated deployment across facilities
import { Cerner } from 'cerner.do'

export default Cerner({
  name: 'valley-health-system',
  facilities: [
    { name: 'Valley Medical Center', type: 'hospital', beds: 350 },
    { name: 'Valley Urgent Care - North', type: 'urgent-care' },
    { name: 'Valley Urgent Care - South', type: 'urgent-care' },
    { name: 'Valley Primary Care', type: 'clinic' },
  ],
  sharedServices: {
    masterPatientIndex: true,
    enterpriseScheduling: true,
    unifiedBilling: true,
  },
})
```

## Compliance

### HIPAA

cerner.do is designed for HIPAA compliance:

```typescript
await cerner.compliance.hipaa({
  // Administrative safeguards
  policies: {
    accessControl: 'role-based',
    workforceTraining: 'required',
    contingencyPlan: 'documented',
    incidentResponse: 'automated',
  },

  // Physical safeguards (Cloudflare-managed)
  facility: {
    accessControls: 'cloudflare-managed',
    dataCenter: 'soc2-certified',
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
      immutable: true,
    },
    integrity: {
      authentication: 'verified',
      transmission: 'tls-1.3',
    },
  },

  // Business Associate Agreement
  baa: {
    cloudflare: 'signed', // Cloudflare provides BAA
  },
})
```

### 21st Century Cures Act

Information blocking prevention built in:

```typescript
await cerner.compliance.curesAct({
  informationBlocking: 'prohibited',
  patientAccess: {
    electronicFormat: true,      // EHI available electronically
    noFees: true,                // No charge for data access
    thirdPartyApps: 'allowed',   // SMART on FHIR apps
    exportFormats: ['fhir', 'c-cda', 'pdf'],
  },
  fhirApi: {
    patientAccess: true,         // Patient Access API
    providerDirectory: true,     // Provider Directory API
    payerExchange: true,         // Payer-to-Payer exchange ready
  },
  uscdi: {
    version: 'v3',               // USCDI v3 data classes
    complete: true,
  },
})
```

### ONC Certification

Note: ONC Health IT Certification (2015 Edition Cures Update) is a complex, expensive process. cerner.do provides the technical foundation but certification must be obtained separately.

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
