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

All fields are optional. Use `status: "completed"` to mark a session as done. Returns the updated `Session`.

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

#### WOD Records

```
GET /api/records/wods
```

Returns `WodRecord[]` — best times per named WOD with full attempt history, computed from all completed sessions. Sorted by WOD name.

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

#### Delete Manual Record

```
DELETE /api/manual-records/:id
```

Works for both strength and WOD manual records. Returns `204 No Content`.

---

## Data Types

### Session

```typescript
{
  id: string;
  date: string;              // "YYYY-MM-DD"
  status: "planned" | "completed";
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
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
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
