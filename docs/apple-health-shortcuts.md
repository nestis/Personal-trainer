# Apple Health → Personal Trainer (iPhone Shortcuts)

Two Shortcuts send Apple Health data to the app. No Mac, no developer account and no native app are needed: the Shortcuts app reads Health and calls the app's API.

| Shortcut | When | What it fills in |
|---|---|---|
| **Health → Trainer (morning)** | After waking up | That day's HRV entry: min / avg / max and the individual readings, resting heart rate, sleep time and stages |
| **Workout → Trainer** | 3+ minutes after ending the WOD workout on the watch | That day's session WOD: avg and max heart rate, recovery From / To (the drop is computed by the server) |

You need:
- **App address**: the address you open the app with in Safari, e.g. `https://dxxxxxxxx.cloudfront.net`. Below it is written `https://YOUR-APP`.
- **App password**: the one you unlock the app with.

The action names below are the English ones. With the iPhone in Spanish, search for the equivalent (for example *Buscar muestras de salud*, *Repetir con cada*, *Formatear fecha*, *Combinar texto*, *Obtener contenido de URL*). The Shortcuts app asks once for permission to read each Health data type; allow it.

These instructions were written without a device to test them on, so action names and options can differ slightly between iOS versions. If something does not match, tell Claude what you see.

---

## 1. Health → Trainer (morning)

Create a new Shortcut and add these actions in order.

**HRV readings of the night**
1. **Find Health Samples**: *Type* = Heart Rate Variability, filter *Start Date* **is in the last** 12 hours, *Sort by* Start Date, *Order* Oldest First.
2. **Repeat with Each** item in *Health Samples*:
   1. **Format Date**: *Date* = Repeat Item → **Start Date**, *Date Format* = **ISO 8601**, turn on **Include ISO 8601 Time**.
   2. **Text**: `Formatted Date;Repeat Item` (insert the *Formatted Date* variable, type `;`, then insert *Repeat Item* and tap it to choose its **Value**).
3. **Combine Text**: *Repeat Results* with **New Lines**. Rename the result to `HRV`.

**Resting heart rate**
4. **Find Health Samples**: *Type* = Resting Heart Rate, *Start Date* **is in the last** 1 day, *Sort by* Start Date, *Order* Latest First, *Limit* 1.
5. **Get Details of Health Sample**: *Value* of the sample. Rename it to `RHR`.

**Sleep**
6. **Find Health Samples**: *Type* = Sleep Analysis, *Start Date* **is in the last** 16 hours.
7. **Repeat with Each** item:
   1. **Format Date**: Repeat Item → **Start Date**, ISO 8601 with time.
   2. **Format Date**: Repeat Item → **End Date**, ISO 8601 with time.
   3. **Text**: `Start;End;Value` (the two formatted dates and the Repeat Item's **Value**, separated by `;`).
8. **Combine Text**: *Repeat Results* with **New Lines**. Rename it to `Sleep`.

**Send it**
9. **Get Contents of URL**: `https://YOUR-APP/api/health/daily`
   - *Method*: **POST**
   - *Headers*: `Authorization` = `Bearer YOUR-PASSWORD` (the word Bearer, a space, the password)
   - *Request Body*: **JSON** with three **Text** fields: `hrv` = *HRV*, `restingHeartRate` = *RHR*, `sleep` = *Sleep*
10. **Show Notification** (or Show Result) with *Contents of URL*, so you can see what was saved.

**Run it automatically**: Shortcuts → Automation → **New Automation** → *Alarm* "Is Stopped" (or *Sleep* "Waking Up", or a time of day), select the Shortcut and choose **Run Immediately**. iPhone does not allow reading Health data while it is locked, so a trigger that happens when you pick up the phone works best. You can also run it by hand or from a widget.

**What the server does**: it uses the local date of the last HRV reading as the day, computes min / avg / max, sums sleep time (overlapping watch and phone samples are counted once; *In Bed* and *Awake* do not count as sleep) and updates that day's HRV entry. Your notes are kept. If the day has no entry yet it is created. Running it twice is safe: it updates the same entry.

---

## 2. Workout → Trainer

Record the WOD as its own workout on the Apple Watch, so its heart rate is not mixed with the strength part. Create the session in the app before running this Shortcut.

1. **Find Health Samples**: *Type* = **Workouts** (on some iOS versions this is a separate **Find Workouts** action), *Sort by* End Date, *Order* Latest First, *Limit* 1.
2. **Get Details of Health Sample**: **Start Date** → **Format Date** ISO 8601 with time → rename to `Start`.
3. **Get Details of Health Sample**: **End Date** (of the same workout) → **Format Date** ISO 8601 with time → rename to `End`.
4. **Find Health Samples**: *Type* = Heart Rate, filter *Start Date* **is after** the workout's Start Date (the unformatted date from step 2), *Sort by* Start Date, *Order* Oldest First.
5. **Repeat with Each**: **Format Date** (Repeat Item → Start Date, ISO 8601 with time) and **Text** `Formatted Date;Repeat Item` (Repeat Item → **Value**).
6. **Combine Text**: *Repeat Results* with **New Lines** → rename to `HR`.
7. **Get Contents of URL**: `https://YOUR-APP/api/health/workout`, **POST**, header `Authorization` = `Bearer YOUR-PASSWORD`, **JSON** body with three **Text** fields: `workoutStart` = *Start*, `workoutEnd` = *End*, `heartRate` = *HR*.
8. **Show Notification** with *Contents of URL*.

**When to run it**: at least 3 minutes after ending the workout, so the heart rate 2 minutes later has been recorded. As an automation (*Apple Watch Workout* → *Ends*, if your iOS offers it), put a **Wait** 180 seconds action first.

**What the server does**: it finds the session on the workout's day (one with a WOD first), sets the WOD's avg and max heart rate, From = heart rate when the workout ended and To = the reading closest to 2 minutes later, and stores the drop (From − To). RPE, notes and the rest of the WOD are kept. If no reading is found about 2 minutes after the end, it saves avg / max only and says so.

If the session is open in the app while the Shortcut runs, go back and reopen it before editing the WOD, otherwise the app's copy (without the imported values) is saved over them.

---

## Troubleshooting

The notification shows the server's reply:
- `401 Unauthorized`: the password in the Authorization header is wrong (it must be `Bearer ` followed by the password).
- `Nothing to import` / `No heart rate samples found`: the Find Health Samples filters returned nothing (check the time window and the Health permissions).
- `No session found for <date>`: create the session for that day in the app, then run the Shortcut again.
- `skippedLines` greater than 0: some lines could not be read, usually because a date was not formatted as ISO 8601 with time.
