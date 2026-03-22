import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "./api-client";

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] };
}

function fail(err: unknown): ToolResult {
  const msg = err instanceof Error ? err.message : "Unknown error";
  return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
}

export function registerTools(server: McpServer, api: ApiClient) {
  server.tool(
    "get_sessions",
    "List workout sessions with optional date range filter",
    {
      startDate: z.string().optional().describe("Start date (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("End date (YYYY-MM-DD)"),
    },
    async ({ startDate, endDate }) => {
      try { return ok(await api.listSessions(startDate, endDate)); }
      catch (e) { return fail(e); }
    },
  );

  server.tool(
    "get_session",
    "Get a single workout session by ID",
    { id: z.string().describe("Session ID") },
    async ({ id }) => {
      try { return ok(await api.getSession(id)); }
      catch (e) { return fail(e); }
    },
  );

  server.tool(
    "create_session",
    "Create a new planned workout session",
    {
      date: z.string().describe("Date (YYYY-MM-DD)"),
      strength: z.array(z.object({
        id: z.string(),
        name: z.string(),
        sets: z.array(z.object({
          setNumber: z.number(),
          reps: z.number(),
          kilos: z.number(),
          completed: z.boolean(),
        })),
      })).describe("Strength exercises with sets"),
      wod: z.object({
        name: z.string().optional(),
        description: z.string(),
        timeSeconds: z.number().optional(),
        totalReps: z.number().optional(),
        avgHeartRate: z.number().optional(),
        maxHeartRate: z.number().optional(),
      }).describe("Workout of the Day"),
      notes: z.string().optional(),
    },
    async ({ date, strength, wod, notes }) => {
      try { return ok(await api.createSession({ date, strength, wod, notes })); }
      catch (e) { return fail(e); }
    },
  );

  server.tool(
    "update_session",
    "Update a workout session (mark complete, edit exercises, etc.)",
    {
      id: z.string().describe("Session ID"),
      date: z.string().optional(),
      status: z.enum(["planned", "completed"]).optional(),
      strength: z.array(z.object({
        id: z.string(),
        name: z.string(),
        sets: z.array(z.object({
          setNumber: z.number(),
          reps: z.number(),
          kilos: z.number(),
          completed: z.boolean(),
        })),
      })).optional(),
      wod: z.object({
        name: z.string().optional(),
        description: z.string(),
        timeSeconds: z.number().optional(),
        totalReps: z.number().optional(),
        avgHeartRate: z.number().optional(),
        maxHeartRate: z.number().optional(),
      }).optional(),
      notes: z.string().optional(),
    },
    async ({ id, ...data }) => {
      try { return ok(await api.updateSession(id, data)); }
      catch (e) { return fail(e); }
    },
  );

  server.tool(
    "get_strength_prs",
    "Get all strength personal records computed from sessions",
    {},
    async () => {
      try { return ok(await api.getStrengthPRs()); }
      catch (e) { return fail(e); }
    },
  );

  server.tool(
    "get_wod_records",
    "Get all WOD (Workout of the Day) records with history",
    {},
    async () => {
      try { return ok(await api.getWodRecords()); }
      catch (e) { return fail(e); }
    },
  );

  server.tool(
    "get_manual_records",
    "Get manual records (user-entered, not derived from sessions)",
    {
      type: z.enum(["strength", "wod"]).optional().describe("Filter by record type"),
    },
    async ({ type }) => {
      try { return ok(await api.getManualRecords(type)); }
      catch (e) { return fail(e); }
    },
  );

  server.tool(
    "create_strength_pr",
    "Log a manual strength PR",
    {
      exercise: z.string().describe("Exercise name"),
      reps: z.number().describe("Number of reps"),
      kilos: z.number().describe("Weight in kg"),
      date: z.string().describe("Date (YYYY-MM-DD)"),
      notes: z.string().optional(),
    },
    async (data) => {
      try { return ok(await api.createManualStrengthPR(data)); }
      catch (e) { return fail(e); }
    },
  );

  server.tool(
    "create_wod_record",
    "Log a manual WOD record",
    {
      name: z.string().describe("WOD name"),
      description: z.string().optional(),
      timeSeconds: z.number().optional().describe("Completion time in seconds"),
      totalReps: z.number().optional().describe("Total reps (for AMRAP)"),
      avgHeartRate: z.number().optional(),
      maxHeartRate: z.number().optional(),
      date: z.string().describe("Date (YYYY-MM-DD)"),
      notes: z.string().optional(),
    },
    async (data) => {
      try { return ok(await api.createManualWodRecord(data)); }
      catch (e) { return fail(e); }
    },
  );

  server.tool(
    "get_training_summary",
    "Get an aggregated training summary for coaching analysis — sessions per week, volume by exercise, PRs, WOD records, and recovery patterns",
    {
      weeks: z.number().default(6).describe("Number of weeks to analyze (default: 6)"),
    },
    async ({ weeks }) => {
      try { return ok(await api.getTrainingSummary(weeks)); }
      catch (e) { return fail(e); }
    },
  );
}
