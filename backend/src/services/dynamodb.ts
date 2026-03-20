import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { Session, CreateSessionInput, UpdateSessionInput } from '../types';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-west-1',
  ...(process.env.DYNAMODB_ENDPOINT && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
  }),
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.SESSIONS_TABLE || 'WorkoutSessions';

export async function createSession(input: CreateSessionInput): Promise<Session> {
  const now = new Date().toISOString();
  const session: Session = {
    id: uuidv4(),
    date: input.date,
    status: 'planned',
    strength: input.strength,
    wod: input.wod,
    notes: input.notes,
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

  const updated: Session = {
    ...existing,
    ...input,
    id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: updated,
    })
  );

  return updated;
}

export async function deleteSession(id: string): Promise<boolean> {
  const existing = await getSession(id);
  if (!existing) return false;

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { id },
    })
  );

  return true;
}

export async function listSessions(
  startDate?: string,
  endDate?: string
): Promise<Session[]> {
  // Use scan for single-user app; sufficient for personal use
  const { DynamoDBClient: _c, ...rest } = await import('@aws-sdk/client-dynamodb');
  const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');

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
