# epic.do

> Talk to the chart. AI listens.

```typescript
import { epic } from 'epic.do'

await epic`what's wrong with this patient?`
await epic`start metformin 500 twice daily`
await epic`CBC and lipid panel`
await epic`follow up in 3 months`
```

That's the entire API.

**The test:** Could a clinician dictate this walking between rooms? If not, it's too complex.

## How It Works

You speak clinician. The AI infers context, intent, and FHIR resources.

No resource types. No search parameters. No API docs to memorize.

## More Examples

### Patients

```typescript
// Register
await epic`new patient Sarah Johnson, DOB 3/15/1985, female`

// Find
await epic`find patient Johnson, MRN 001234`
await epic`my diabetic patients`
await epic`patients I saw today`
```

### Documentation

```typescript
// Just talk
await epic`subjective: cough for 2 weeks, dry, worse at night, no fever`
await epic`objective: lungs clear, no wheezes, O2 sat 99`
await epic`assessment: post-viral cough`
await epic`plan: supportive care, return if worse`

// Or all at once
await epic`progress note: 2 week cough, improving, lungs clear, continue OTC treatment`

// AI-assisted - just start talking
await epic`start ambient documentation`
// ... see the patient ...
await epic`end visit and generate note`
```

### Orders

```typescript
// Medications - just say it
await epic`amoxicillin 500 TID x 10 days for sinusitis`
await epic`start lisinopril 10 daily for HTN`
await epic`increase metformin to 1000 BID`
await epic`stop the warfarin`

// Labs
await epic`CBC, BMP, TSH`
await epic`lipid panel fasting`
await epic`A1C and urine microalbumin`

// Imaging
await epic`chest x-ray, r/o pneumonia`
await epic`CT abdomen with contrast, RLQ pain`
await epic`MRI knee without contrast`

// Referrals
await epic`refer to cardiology for palpitations`
await epic`urgent GI consult for GI bleed`
```

### Results

```typescript
// Check results
await epic`any new labs?`
await epic`show me the TSH`
await epic`what was her last A1C?`

// Abnormals
await epic`any critical values?`
await epic`abnormal results this week`

// Imaging
await epic`chest x-ray back yet?`
await epic`show the CT report`
```

### Problems

```typescript
// Query
await epic`active problems`
await epic`what are her diagnoses?`

// Add
await epic`add diabetes type 2 to problem list`
await epic`add hypertension, diagnosed today`

// Update
await epic`mark the diabetes as resolved`
await epic`update: diabetes well controlled on current regimen`
```

### Medications

```typescript
// Query
await epic`current meds`
await epic`what's she taking for blood pressure?`
await epic`any blood thinners?`

// Med rec
await epic`reconcile meds - patient reports taking vitamin D and fish oil`
await epic`patient stopped the lisinopril due to cough`
```

### Allergies

```typescript
// Query
await epic`any allergies?`
await epic`allergic to penicillin?`

// Add
await epic`allergy: penicillin, causes hives and throat swelling`
await epic`intolerance: metformin causes GI upset`
await epic`NKDA`
```

### Scheduling

```typescript
// Book
await epic`follow up in 3 months`
await epic`schedule diabetes check in 2 weeks`
await epic`see her back tomorrow if not better`

// Query
await epic`when's her next appointment?`
await epic`my schedule tomorrow`
await epic`who do I have at 2pm?`
```

## AI Assistance

```typescript
// Safety checks happen automatically
await epic`start warfarin`
// AI: "Alert: Patient on aspirin. Bleeding risk elevated. Continue?"

// Differential diagnosis
await epic`what could cause these symptoms?`

// Prior auth - just order, AI handles the rest
await epic`Ozempic for weight loss`
// AI: "Prior auth required. I'll submit with clinical evidence. Tracking PA-2847."

// Patient communication
await epic`explain these lab results to the patient`
await epic`remind my diabetics about A1C checks`

// Decision support
await epic`is this dose appropriate for her kidney function?`
await epic`any drug interactions I should know about?`
```

## Patient Access

Patients talk to their chart too:

```typescript
// Patients ask naturally
await epic`what medications am I on?`
await epic`show me my lab results`
await epic`when's my next appointment?`

// Share with providers
await epic`share my records with Dr. Smith at Stanford`
await epic`send immunizations to my kid's school`

// Export
await epic`download all my health records`
```

## Under the Hood

FHIR R4 resources. HIPAA-compliant encryption. Audit logging. SMART on FHIR.

You don't need to think about any of it. The AI handles the translation.

## Safety

- AI assists, clinicians decide
- All orders require human approval
- Drug interactions checked automatically
- Every access logged

## Open Source

MIT licensed. No $500M implementations. No vendor lock-in.

Patients own their data. Clinicians own their time.

---

<p align="center">
  <strong>epic.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://epic.do">Website</a> | <a href="https://docs.epic.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
