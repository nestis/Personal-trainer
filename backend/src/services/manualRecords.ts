import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { ManualRecord, ManualStrengthPR, ManualWodRecord } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { docClient } from './db-client';
import { estimate1RM } from '../utils/formulas';

const TABLE_NAME = process.env.RECORDS_TABLE || 'ManualRecords';

export async function createManualStrengthPR(userId: string, input: {
  exercise: string;
  reps: number;
  kilos: number;
  date: string;
  notes?: string;
}): Promise<ManualStrengthPR> {
  const now = new Date().toISOString();
  const record: ManualStrengthPR & { userId: string } = {
    id: uuidv4(),
    userId,
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

export async function createManualWodRecord(userId: string, input: {
  name: string;
  description?: string;
  timeSeconds?: number;
  totalReps?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  date: string;
  notes?: string;
}): Promise<ManualWodRecord> {
  const now = new Date().toISOString();
  const record: ManualWodRecord & { userId: string } = {
    id: uuidv4(),
    userId,
    type: 'wod',
    name: input.name,
    ...(input.description !== undefined && { description: input.description }),
    ...(input.timeSeconds !== undefined && { timeSeconds: input.timeSeconds }),
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

export async function updateManualWodRecord(userId: string, id: string, input: {
  name?: string;
  description?: string;
  timeSeconds?: number;
  totalReps?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  date?: string;
  notes?: string;
}): Promise<ManualWodRecord | null> {
  const existing = await getManualRecord(userId, id);
  if (!existing || existing.type !== 'wod') return null;

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updatedAt: now };

  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.date !== undefined) updates.date = input.date;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.timeSeconds !== undefined) updates.timeSeconds = input.timeSeconds;
  if (input.totalReps !== undefined) updates.totalReps = input.totalReps;
  if (input.avgHeartRate !== undefined) updates.avgHeartRate = input.avgHeartRate;
  if (input.maxHeartRate !== undefined) updates.maxHeartRate = input.maxHeartRate;

  const setParts: string[] = [];
  const removeParts: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(updates)) {
    const attrName = `#${key}`;
    names[attrName] = key;
    if (val === null || val === '') {
      removeParts.push(attrName);
    } else {
      const attrVal = `:${key}`;
      setParts.push(`${attrName} = ${attrVal}`);
      values[attrVal] = val;
    }
  }

  let updateExpr = '';
  if (setParts.length > 0) updateExpr += `SET ${setParts.join(', ')}`;
  if (removeParts.length > 0) updateExpr += ` REMOVE ${removeParts.join(', ')}`;

  names['#userId'] = 'userId';
  values[':uid'] = userId;

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: updateExpr,
      ConditionExpression: '#userId = :uid',
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes as ManualWodRecord;
}

export async function getManualRecord(userId: string, id: string): Promise<ManualRecord | null> {
  const result = await docClient.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { id } })
  );
  const item = result.Item as (ManualRecord & { userId?: string }) | undefined;
  if (!item || item.userId !== userId) return null;
  return item;
}

export async function deleteManualRecord(userId: string, id: string): Promise<boolean> {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id },
        ConditionExpression: 'attribute_exists(id) AND userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
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

export async function listManualRecords(userId: string, type?: 'strength' | 'wod'): Promise<ManualRecord[]> {
  let items: ManualRecord[] = [];
  let lastKey: Record<string, any> | undefined;

  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'userId-date-index',
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
        ScanIndexForward: false,
        ExclusiveStartKey: lastKey,
      })
    );
    items = items.concat((result.Items as ManualRecord[]) || []);
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  if (type) {
    items = items.filter((r) => r.type === type);
  }

  return items;
}
