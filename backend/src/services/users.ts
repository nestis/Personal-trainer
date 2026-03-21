import {
  PutCommand,
  GetCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { User } from '../types';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { docClient } from './db-client';

const TABLE_NAME = process.env.USERS_TABLE || 'Users';

export async function createUser(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<User> {
  const existing = await getUserByEmail(input.email);
  if (existing) {
    throw new Error('EMAIL_EXISTS');
  }

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(input.password, 10);

  const user: User = {
    id: uuidv4(),
    email: input.email.toLowerCase().trim(),
    passwordHash,
    displayName: input.displayName.trim(),
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({ TableName: TABLE_NAME, Item: user })
  );

  return user;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email.toLowerCase().trim() },
      Limit: 1,
    })
  );

  return (result.Items?.[0] as User) || null;
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await docClient.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { id } })
  );
  return (result.Item as User) || null;
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
