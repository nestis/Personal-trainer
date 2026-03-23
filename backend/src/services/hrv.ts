import {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { HrvRecord } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { docClient } from './db-client';

const TABLE_NAME = process.env.HRV_TABLE || 'HrvRecords';

export async function createHrvRecord(userId: string, input: {
  date: string;
  min: number;
  max: number;
  avg: number;
  notes?: string;
}): Promise<HrvRecord> {
  const now = new Date().toISOString();
  const record: HrvRecord & { userId: string } = {
    id: uuidv4(),
    userId,
    date: input.date,
    min: input.min,
    max: input.max,
    avg: input.avg,
    ...(input.notes !== undefined && { notes: input.notes }),
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({ TableName: TABLE_NAME, Item: record })
  );

  return record;
}

export async function updateHrvRecord(userId: string, id: string, input: {
  date?: string;
  min?: number;
  max?: number;
  avg?: number;
  notes?: string;
}): Promise<HrvRecord | null> {
  const existing = await getHrvRecord(userId, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated: HrvRecord & { userId: string } = {
    ...existing,
    userId,
    ...(input.date !== undefined && { date: input.date }),
    ...(input.min !== undefined && { min: input.min }),
    ...(input.max !== undefined && { max: input.max }),
    ...(input.avg !== undefined && { avg: input.avg }),
    ...(input.notes !== undefined && { notes: input.notes }),
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: updated,
      ConditionExpression: 'attribute_exists(id) AND userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
    })
  );

  return updated;
}

export async function getHrvRecord(userId: string, id: string): Promise<HrvRecord | null> {
  const result = await docClient.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { id } })
  );
  const item = result.Item as (HrvRecord & { userId?: string }) | undefined;
  if (!item || item.userId !== userId) return null;
  return item;
}

export async function deleteHrvRecord(userId: string, id: string): Promise<boolean> {
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
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      return false;
    }
    throw error;
  }
}

export async function listHrvRecords(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<HrvRecord[]> {
  let items: HrvRecord[] = [];
  let lastKey: Record<string, any> | undefined;

  let keyCondition = 'userId = :uid';
  const exprValues: Record<string, any> = { ':uid': userId };

  if (startDate && endDate) {
    keyCondition += ' AND #d BETWEEN :start AND :end';
    exprValues[':start'] = startDate;
    exprValues[':end'] = endDate;
  } else if (startDate) {
    keyCondition += ' AND #d >= :start';
    exprValues[':start'] = startDate;
  } else if (endDate) {
    keyCondition += ' AND #d <= :end';
    exprValues[':end'] = endDate;
  }

  const usesDates = startDate || endDate;

  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'userId-date-index',
        KeyConditionExpression: keyCondition,
        ExpressionAttributeValues: exprValues,
        ...(usesDates && { ExpressionAttributeNames: { '#d': 'date' } }),
        ScanIndexForward: false,
        ExclusiveStartKey: lastKey,
      })
    );
    items = items.concat((result.Items as HrvRecord[]) || []);
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
}
