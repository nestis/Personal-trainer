import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "./api-client";

export function registerTools(server: McpServer, api: ApiClient) {
  server.tool(
    "get_sessions",
    "List workout sessions with optional date range filter",
    {
      startDate: z.string().optional().describe("Start date (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("End date (YYYY-MM-DD)"),
    },
    async ({ startDate, endDate }) => {
      const sessions = await api.listSessions(startDate, endDate);
      return {
        content: [{ type: "text", text: JSON.stringify(sessions, null, 2) }],
      };
    },
  );

  server.tool(
    "get_session",
    "Get a single workout session by ID",
    { id: z.string().describe("Session ID") },
    async ({ id }) => {
      const session = await api.getSession(id);
      return {
        content: [{ type: "text", text: JSON.stringify(session, null, 2) }],
      };
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
      const session = await api.createSession({ date, strength, wod, notes });
      return {
        content: [{ type: "text", text: JSON.stringify(session, null, 2) }],
      };
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
      const session = await api.updateSession(id, data);
      return {
        content: [{ type: "text", text: JSON.stringify(session, null, 2) }],
      };
    },
  );

  server.tool(
    "get_strength_prs",
    "Get all strength personal records computed from sessions",
    {},
    async () => {
      const prs = await api.getStrengthPRs();
      return {
        content: [{ type: "text", text: JSON.stringify(prs, null, 2) }],
      };
    },
  );

  server.tool(
    "get_wod_records",
    "Get all WOD (Workout of the Day) records with history",
    {},
    async () => {
      const records = await api.getWodRecords();
      return {
        content: [{ type: "text", text: JSON.stringify(records, null, 2) }],
      };
    },
  );

  server.tool(
    "get_manual_records",
    "Get manual records (user-entered, not derived from sessions)",
    {
      type: z.enum(["strength", "wod"]).optional().describe("Filter by record type"),
    },
    async ({ type }) => {
      const records = await api.getManualRecords(type);
      return {
        content: [{ type: "text", text: JSON.stringify(records, null, 2) }],
      };
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
      const record = await api.createManualStrengthPR(data);
      return {
        content: [{ type: "text", text: JSON.stringify(record, null, 2) }],
      };
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
      const record = await api.createManualWodRecord(data);
      return {
        content: [{ type: "text", text: JSON.stringify(record, null, 2) }],
      };
    },
  );

  server.tool(
    "get_training_summary",
    "Get an aggregated training summary for coaching analysis — sessions per week, volume by exercise, PRs, WOD records, and recovery patterns",
    {
      weeks: z.number().default(6).describe("Number of weeks to analyze (default: 6)"),
    },
    async ({ weeks }) => {
      const summary = await api.getTrainingSummary(weeks);
      return {
        content: [{ type: "text", text: summary }],
      };
    },
  );
}
