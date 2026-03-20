import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { ManualRecord, ManualStrengthPR, ManualWodRecord } from '../types';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-west-1',
  ...(process.env.DYNAMODB_ENDPOINT && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
  }),
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.RECORDS_TABLE || 'ManualRecords';

// Epley formula: 1RM = weight x (1 + reps / 30)
function estimate1RM(kilos: number, reps: number): number {
  if (reps === 1) return kilos;
  return Math.round(kilos * (1 + reps / 30) * 10) / 10;
}

export async function createManualStrengthPR(input: {
  exercise: string;
  reps: number;
  kilos: number;
  date: string;
  notes?: string;
}): Promise<ManualStrengthPR> {
  const now = new Date().toISOString();
  const record: ManualStrengthPR = {
    id: uuidv4(),
    type: 'strength',
    exercise: input.exercise,
    reps: input.reps,
    kilos: input.kilos,
    estimated1RM: estimate1RM(input.kilos, input.reps),
    date: input.date,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({ TableName: TABLE_NAME, Item: record })
  );

  return record;
}

export async function createManualWodRecord(input: {
  name: string;
  description?: string;
  timeSeconds: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  date: string;
  notes?: string;
}): Promise<ManualWodRecord> {
  const now = new Date().toISOString();
  const record: ManualWodRecord = {
    id: uuidv4(),
    type: 'wod',
    name: input.name,
    description: input.description,
    timeSeconds: input.timeSeconds,
    avgHeartRate: input.avgHeartRate,
    maxHeartRate: input.maxHeartRate,
    date: input.date,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({ TableName: TABLE_NAME, Item: record })
  );

  return record;
}

export async function getManualRecord(id: string): Promise<ManualRecord | null> {
  const result = await docClient.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { id } })
  );
  return (result.Item as ManualRecord) || null;
}

export async function deleteManualRecord(id: string): Promise<boolean> {
  const existing = await getManualRecord(id);
  if (!existing) return false;

  await docClient.send(
    new DeleteCommand({ TableName: TABLE_NAME, Key: { id } })
  );
  return true;
}

export async function listManualRecords(type?: 'strength' | 'wod'): Promise<ManualRecord[]> {
  let items: ManualRecord[] = [];
  let lastKey: Record<string, any> | undefined;

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        ExclusiveStartKey: lastKey,
      })
    );
    items = items.concat((result.Items as ManualRecord[]) || []);
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  if (type) {
    items = items.filter((r) => r.type === type);
  }

  // Sort by date descending
  items.sort((a, b) => b.date.localeCompare(a.date));

  return items;
}
