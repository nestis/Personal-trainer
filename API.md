# Workout Tracker API

REST API for tracking CrossFit/functional fitness workouts, strength PRs, and WOD records.

## Base URL

`https://<api-gateway-id>.execute-api.eu-west-1.amazonaws.com/Prod`

## Authentication

All `/api/*` endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <password>
```

## Endpoints

### Sessions

Sessions are the core resource — each represents a single workout day with strength exercises and a WOD.

#### List Sessions

```
GET /api/sessions?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

Both query params are optional. Returns `Session[]` sorted by date descending.

#### Get Session

```
GET /api/sessions/:id
```

Returns a single `Session`.

#### Create Session

```
POST /api/sessions
Content-Type: application/json

{
  "date": "2026-03-22",
  "strength": [
    {
      "id": "unique-id",
      "name": "Back Squat",
      "sets": [
        { "setNumber": 1, "reps": 5, "kilos": 100, "completed": true },
        { "setNumber": 2, "reps": 5, "kilos": 105, "completed": true },
        { "setNumber": 3, "reps": 3, "kilos": 110, "completed": true }
      ]
    }
  ],
  "wod": {
    "name": "Fran",
    "description": "21-15-9 Thrusters (42.5kg) & Pull-ups",
    "timeSeconds": 245,
    "totalReps": 90,
    "avgHeartRate": 175,
    "maxHeartRate": 192
  },
  "notes": "Felt strong today, grip was limiting factor on pull-ups"
}
```

New sessions are created with `status: "planned"`. Returns the created `Session`.

#### Update Session

```
PUT /api/sessions/:id
Content-Type: application/json

{
  "status": "completed",
  "strength": [...],
  "wod": {...},
  "notes": "..."
}
```

All fields are optional. `status` is `"planned"` (still to do), `"completed"` (done) or `"not_completed"` (planned but not done). Returns the updated `Session`.

#### Delete Session

```
DELETE /api/sessions/:id
```

Returns `204 No Content`.

---

### Records (Read-Only, Computed from Sessions)

These are derived automatically from completed sessions. Not writable.

#### Strength PRs

```
GET /api/records/strength
```

Returns `StrengthPR[]` — best lifts per exercise per rep count, computed from all completed sessions. Sorted by exercise name then reps.

#### Aggregated Strength (used by the Records screen)

```
GET /api/records/strength/aggregated
```

Returns `AggregatedExercise[]`, one per exercise (sessions and manual records combined, one best set per exercise per day), sorted by name. `estimated1RM` and `bestSet` are the **current max**: the best entry of the last 6 weeks, or, if there is none that recent, the latest reading (`basis` is `"last6weeks"` or `"latest"`). `allTimeBest` is the best entry ever, and `history` has every entry, oldest first.

```json
{
  "exercise": "Back Squat",
  "estimated1RM": 105,
  "bestSet": { "reps": 5, "kilos": 90, "date": "2026-09-24" },
  "basis": "last6weeks",
  "allTimeBest": { "estimated1RM": 200, "reps": 1, "kilos": 200, "date": "2026-04-07" },
  "history": [{ "date": "2026-04-07", "estimated1RM": 200, "reps": 1, "kilos": 200 }]
}
```

#### WOD Records

```
GET /api/records/wods
```

Returns `WodRecord[]` — best times per named WOD with full attempt history, computed from all completed sessions. Sorted by WOD name.

#### WOD Recovery

```
GET /api/records/wod-recovery
```

Returns `WodRecoveryPoint[]`, oldest first: every WOD with a stored recovery, from sessions (any status) and manual WOD records. `drop` is the stored `recoveryHeartRate2min`, i.e. `recoveryFromHeartRate - recoveryToHeartRate` (bigger is better).

```json
[
  {
    "date": "2026-10-20",
    "source": "session",
    "name": "Fran",
    "sessionId": "…",
    "timeSeconds": 245,
    "rpe": 9,
    "fromHeartRate": 176,
    "toHeartRate": 142,
    "drop": 34
  }
]
```

---

### Manual Records

User-entered records that exist independently of sessions. Useful for logging PRs or WOD results from external events, competitions, or workouts done outside the app.

#### List Manual Records

```
GET /api/manual-records?type=strength|wod
```

`type` filter is optional. Returns `ManualRecord[]` sorted by date descending.

#### Create Manual Strength PR

```
POST /api/manual-records/strength
Content-Type: application/json

{
  "exercise": "Deadlift",
  "reps": 1,
  "kilos": 200,
  "date": "2026-03-20",
  "notes": "Competition PR"
}
```

`exercise`, `reps` (positive number), `kilos` (positive number), and `date` are required. The server computes `estimated1RM` automatically. Returns `ManualStrengthPR`.

#### Create Manual WOD Record

```
POST /api/manual-records/wod
Content-Type: application/json

{
  "name": "Murph",
  "description": "1 mile run, 100 pull-ups, 200 push-ups, 300 squats, 1 mile run",
  "timeSeconds": 2400,
  "date": "2026-03-15",
  "notes": "With weight vest"
}
```

`name` and `date` are required. At least one of `timeSeconds` or `totalReps` must be provided. Use `totalReps` alone for AMRAP-style WODs where the result is rounds completed. Returns `ManualWodRecord`.

AMRAP example (rounds only, no time):

```json
{
  "name": "Cindy",
  "description": "AMRAP 20: 5 pull-ups, 10 push-ups, 15 squats",
  "totalReps": 18,
  "date": "2026-03-18"
}
```

#### Update Manual WOD Record

```
PUT /api/manual-records/wod/:id
Content-Type: application/json

{
  "timeSeconds": 2350,
  "notes": "Updated time after reviewing video"
}
```

All fields are optional — only provided fields are updated. Returns the updated `ManualWodRecord`.

`rpe` (1–10, steps of 0.5), `recoveryFromHeartRate` and `recoveryToHeartRate` (whole bpm, 30–250) are optional on create and update, and also inside a session's `wod` object. When both heart rates are present the server computes and stores the drop as `recoveryHeartRate2min = recoveryFromHeartRate - recoveryToHeartRate`, overriding any value sent. Sending only the drop (an older client) is still accepted.

#### Delete Manual Record

```
DELETE /api/manual-records/:id
```

Works for both strength and WOD manual records. Returns `204 No Content`.

---

### HRV (Heart Rate Variability)

Daily HRV measurements tracking min, max, and average values in milliseconds.

#### List HRV Records

```
GET /api/hrv?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

Both query params are optional. Returns `HrvRecord[]` sorted by date descending.

#### Create HRV Record

```
POST /api/hrv
Content-Type: application/json

{
  "date": "2026-03-23",
  "min": 35,
  "max": 120,
  "avg": 65,
  "notes": "Slept 8 hours, feeling rested"
}
```

`date` (YYYY-MM-DD), `min`, `max`, and `avg` are required. All values must be non-negative numbers. `min` cannot exceed `max`. Returns `HrvRecord`.

#### Update HRV Record

```
PUT /api/hrv/:id
Content-Type: application/json

{
  "avg": 68,
  "notes": "Corrected value"
}
```

All fields are optional — only provided fields are updated. Returns the updated `HrvRecord`.

#### Delete HRV Record

```
DELETE /api/hrv/:id
```

Returns `204 No Content`.

---

### Apple Health imports

Called by iPhone Shortcuts (step-by-step setup: [docs/apple-health-shortcuts.md](docs/apple-health-shortcuts.md)). Samples are sent as text, one per line, fields separated by `;`, dates in ISO 8601 with their UTC offset. Arrays of objects are also accepted. These routes accept bodies up to 512 KB.

#### Daily (HRV, resting heart rate, sleep)

```
POST /api/health/daily
Content-Type: application/json

{
  "hrv": "2026-10-23T22:41:00+02:00;51\n2026-10-24T02:05:00+02:00;83",
  "restingHeartRate": "52",
  "sleep": "2026-10-23T23:00:00+02:00;2026-10-24T01:00:00+02:00;Core\n...",
  "date": "2026-10-24"
}
```

All fields are optional, but at least one must contain data. `date` defaults to the local date of the last HRV reading (or of the end of sleep). Updates that day's `HrvRecord` (keeping `notes`) or creates it; without HRV readings it can only add to an existing entry. Sleep stages are read from the Health value (English or Spanish); *In Bed* and *Awake* do not count as sleep and overlapping samples are counted once. Returns `{ action, date, hrv, restingHeartRate, sleep, skippedLines, record }`.

#### Workout (WOD heart rate and recovery)

```
POST /api/health/workout
Content-Type: application/json

{
  "workoutStart": "2026-10-24T10:00:00+02:00",
  "workoutEnd": "2026-10-24T10:40:00+02:00",
  "heartRate": "2026-10-24T10:00:05+02:00;98\n...",
  "sessionId": "optional",
  "date": "optional YYYY-MM-DD"
}
```

`heartRate` should run from the workout start until at least 2.5 minutes after it ended. The server sets the WOD's `avgHeartRate` and `maxHeartRate` (samples during the workout), `recoveryFromHeartRate` (reading at the end), `recoveryToHeartRate` (reading closest to 2 minutes later, within 45 s) and `recoveryHeartRate2min` (the drop), keeping the rest of the WOD. The session is `sessionId`, else the session on the workout's local date (one with a WOD first). Returns the computed values and `warnings`; `404` (with the computed values in `details`) when there is no session that day.

---

## Data Types

### Session

```typescript
{
  id: string;
  date: string;              // "YYYY-MM-DD"
  status: "planned" | "completed" | "not_completed";
  strength: Exercise[];
  wod: WOD;
  notes?: string;
  createdAt: string;         // ISO datetime
  updatedAt: string;         // ISO datetime
}
```

### Exercise

```typescript
{
  id: string;
  name: string;              // e.g., "Back Squat", "Bench Press"
  sets: ExerciseSet[];
}
```

### ExerciseSet

```typescript
{
  setNumber: number;
  reps: number;
  kilos: number;
  completed: boolean;
}
```

### WOD

```typescript
{
  name?: string;             // Named WOD for tracking (e.g., "Fran", "Murph")
  description: string;       // Workout description
  timeSeconds?: number;      // Completion time in seconds
  totalReps?: number;        // Total reps or rounds (for AMRAP)
  avgHeartRate?: number;
  maxHeartRate?: number;
  rpe?: number;              // Perceived exertion, 1-10 in steps of 0.5
  recoveryFromHeartRate?: number; // Heart rate (bpm) at the end of the WOD (30-250)
  recoveryToHeartRate?: number;   // Heart rate (bpm) 2 minutes later (30-250)
  recoveryHeartRate2min?: number; // The drop (From - To). Computed by the server when both are set
}
```

### StrengthPR (computed, read-only)

```typescript
{
  exercise: string;
  reps: number;
  kilos: number;
  estimated1RM: number;      // Epley formula
  date: string;
  sessionId: string;
}
```

### WodRecord (computed, read-only)

```typescript
{
  name: string;
  bestTimeSeconds: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  date: string;              // Date of best attempt
  sessionId: string;
  history: {
    timeSeconds: number;
    date: string;
    sessionId: string;
  }[];
}
```

### ManualStrengthPR

```typescript
{
  id: string;
  type: "strength";
  exercise: string;
  reps: number;
  kilos: number;
  estimated1RM: number;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### ManualWodRecord

```typescript
{
  id: string;
  type: "wod";
  name: string;
  description?: string;
  timeSeconds?: number;      // Present for time-based WODs
  totalReps?: number;        // Present for AMRAP (rounds)
  avgHeartRate?: number;
  maxHeartRate?: number;
  rpe?: number;
  recoveryFromHeartRate?: number;
  recoveryToHeartRate?: number;
  recoveryHeartRate2min?: number;  // the drop (From - To), computed by the server
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### WodRecoveryPoint (computed, read-only)

```typescript
{
  date: string;
  source: 'session' | 'manual';
  name: string;              // WOD name, or "WOD"
  sessionId?: string;        // when source is 'session'
  recordId?: string;         // when source is 'manual'
  timeSeconds?: number;
  rpe?: number;
  fromHeartRate?: number;    // heart rate at the end of the WOD
  toHeartRate?: number;      // heart rate 2 minutes later
  drop: number;              // From - To (bigger is better)
}
```

### HrvRecord

```typescript
{
  id: string;
  date: string;              // "YYYY-MM-DD"
  min: number;               // Minimum HRV in ms
  max: number;               // Maximum HRV in ms
  avg: number;               // Average HRV in ms
  notes?: string;
  readings?: { time: string; value: number }[];  // Apple Health import: the night's readings (local HH:MM)
  restingHeartRate?: number;                      // bpm
  sleepMinutes?: number;                          // time asleep
  sleepStages?: { deep: number; rem: number; core: number; awake: number }; // minutes
  source?: "apple-health";
  healthImportedAt?: string;
  createdAt: string;         // ISO datetime
  updatedAt: string;         // ISO datetime
}
```

---

## Workflow for Creating a Training Session

To review past work and plan a new session:

1. **Fetch recent sessions** to see training history and patterns:
   ```
   GET /api/sessions?startDate=2026-03-01&endDate=2026-03-22
   ```

2. **Fetch strength PRs** to know current bests and progression:
   ```
   GET /api/records/strength
   ```

3. **Fetch WOD records** to see WOD performance history:
   ```
   GET /api/records/wods
   ```

4. **Create the new session** with planned exercises and WOD:
   ```
   POST /api/sessions
   ```

The session is created as `"planned"`. The user marks it `"completed"` (with actual results filled in) after the workout via `PUT /api/sessions/:id`.
