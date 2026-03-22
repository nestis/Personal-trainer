import {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { Session, CreateSessionInput, UpdateSessionInput } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { docClient } from './db-client';

const TABLE_NAME = process.env.SESSIONS_TABLE || 'WorkoutSessions';

export async function createSession(userId: string, input: CreateSessionInput): Promise<Session> {
  const now = new Date().toISOString();
  const session: Session & { userId: string } = {
    id: uuidv4(),
    userId,
    date: input.date,
    status: 'planned',
    strength: input.strength,
    wod: input.wod,
    ...(input.notes !== undefined && { notes: input.notes }),
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: session,
    })
  );

  return session;
}

export async function getSession(userId: string, id: string): Promise<Session | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { id },
    })
  );

  const item = result.Item as (Session & { userId?: string }) | undefined;
  if (!item || item.userId !== userId) return null;

  return item;
}

export async function updateSession(
  userId: string,
  id: string,
  input: UpdateSessionInput
): Promise<Session | null> {
  const existing = await getSession(userId, id);
  if (!existing) return null;

  const updatedFields: Partial<Session> = {};

  if (input.date !== undefined) updatedFields.date = input.date;
  if (input.status !== undefined) updatedFields.status = input.status;
  if (input.strength !== undefined) updatedFields.strength = input.strength;
  if (input.wod !== undefined) updatedFields.wod = input.wod;
  if (input.notes !== undefined) updatedFields.notes = input.notes;

  const updated: Session & { userId: string } = {
    ...existing,
    ...updatedFields,
    id,
    userId,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
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

export async function deleteSession(userId: string, id: string): Promise<boolean> {
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

export async function listSessions(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<Session[]> {
  let items: Session[] = [];
  let lastKey: Record<string, any> | undefined;

  // Build key condition and filter expressions
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
        ScanIndexForward: false, // descending by date
        ExclusiveStartKey: lastKey,
      })
    );

    items = items.concat((result.Items as Session[]) || []);
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
}
