import {
  PutCommand,
  GetCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { Session, CreateSessionInput, UpdateSessionInput } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { docClient } from './db-client';

const TABLE_NAME = process.env.SESSIONS_TABLE || 'WorkoutSessions';

export async function createSession(input: CreateSessionInput): Promise<Session> {
  const now = new Date().toISOString();
  const session: Session = {
    id: uuidv4(),
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

export async function getSession(id: string): Promise<Session | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { id },
    })
  );

  return (result.Item as Session) || null;
}

export async function updateSession(
  id: string,
  input: UpdateSessionInput
): Promise<Session | null> {
  const existing = await getSession(id);
  if (!existing) return null;

  const updatedFields: Partial<Session> = {};

  if (input.date !== undefined) updatedFields.date = input.date;
  if (input.status !== undefined) updatedFields.status = input.status;
  if (input.strength !== undefined) updatedFields.strength = input.strength;
  if (input.wod !== undefined) updatedFields.wod = input.wod;
  if (input.notes !== undefined) updatedFields.notes = input.notes;

  const updated: Session = {
    ...existing,
    ...updatedFields,
    id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: updated,
      ConditionExpression: 'attribute_exists(id)',
    })
  );

  return updated;
}

export async function deleteSession(id: string): Promise<boolean> {
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

export async function listSessions(
  startDate?: string,
  endDate?: string
): Promise<Session[]> {
  let items: Session[] = [];
  let lastKey: Record<string, any> | undefined;

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        ExclusiveStartKey: lastKey,
      })
    );

    items = items.concat((result.Items as Session[]) || []);
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  // Filter by date range in memory (fine for single-user volume)
  if (startDate) {
    items = items.filter((s) => s.date >= startDate);
  }
  if (endDate) {
    items = items.filter((s) => s.date <= endDate);
  }

  // Sort by date descending
  items.sort((a, b) => b.date.localeCompare(a.date));

  return items;
}
