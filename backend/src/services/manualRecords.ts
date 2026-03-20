import {
  PutCommand,
  GetCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { ManualRecord, ManualStrengthPR, ManualWodRecord } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { docClient } from './db-client';
import { estimate1RM } from '../utils/formulas';

const TABLE_NAME = process.env.RECORDS_TABLE || 'ManualRecords';

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
    ...(input.notes !== undefined && { notes: input.notes }),
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
  totalReps?: number;
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
    ...(input.description !== undefined && { description: input.description }),
    timeSeconds: input.timeSeconds,
    ...(input.totalReps !== undefined && { totalReps: input.totalReps }),
    ...(input.avgHeartRate !== undefined && { avgHeartRate: input.avgHeartRate }),
    ...(input.maxHeartRate !== undefined && { maxHeartRate: input.maxHeartRate }),
    date: input.date,
    ...(input.notes !== undefined && { notes: input.notes }),
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
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id },
        ConditionExpression: 'attribute_exists(id)',
        ReturnValues: 'ALL_OLD',
      })
    );
    return true;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === 'ConditionalCheckFailedException'
    ) {
      return false;
    }
    throw error;
  }
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
