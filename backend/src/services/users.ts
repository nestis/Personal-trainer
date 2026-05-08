import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { docClient } from './db-client';

const TABLE = process.env.USERS_TABLE || 'Users-prod';
const JWT_SECRET = process.env.JWT_SECRET!;
const INVITE_CODE = process.env.INVITE_CODE || '';
const BCRYPT_ROUNDS = 10;
const JWT_EXPIRY = '30d';
const DUMMY_HASH = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';

if (JWT_SECRET && JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface JwtPayload {
  userId: string;
  username: string;
}

async function findByUsername(username: string): Promise<User | null> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'username-index',
    KeyConditionExpression: 'username = :u',
    ExpressionAttributeValues: { ':u': username },
    Limit: 1,
  }));
  return (result.Items?.[0] as User) ?? null;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function register(username: string, password: string, inviteCode: string): Promise<{ token: string; userId: string }> {
  if (INVITE_CODE && !constantTimeEqual(inviteCode, INVITE_CODE)) {
    throw Object.assign(new Error('Registration failed'), { statusCode: 403 });
  }

  const normalized = username.trim().toLowerCase();
  if (normalized.length < 2 || normalized.length > 30) {
    throw Object.assign(new Error('Username must be 2-30 characters'), { statusCode: 400 });
  }
  if (!/^[a-z0-9_]+$/.test(normalized)) {
    throw Object.assign(new Error('Username can only contain letters, numbers, and underscores'), { statusCode: 400 });
  }

  if (password.length < 6 || password.length > 128) {
    throw Object.assign(new Error('Password must be 6-128 characters'), { statusCode: 400 });
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = new Date().toISOString();

  try {
    await docClient.send(new PutCommand({
      TableName: TABLE,
      Item: { id, username: normalized, passwordHash, createdAt: now },
      ConditionExpression: 'attribute_not_exists(username)',
    }));
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'ConditionalCheckFailedException') {
      throw Object.assign(new Error('Registration failed'), { statusCode: 409 });
    }
    throw err;
  }

  const token = signToken({ userId: id, username: normalized });
  return { token, userId: id };
}

export async function login(username: string, password: string): Promise<{ token: string; userId: string }> {
  const normalized = username.trim().toLowerCase();
  const user = await findByUsername(normalized);

  const hashToCompare = user?.passwordHash || DUMMY_HASH;
  const valid = await bcrypt.compare(password, hashToCompare);

  if (!user || !valid) {
    throw Object.assign(new Error('Invalid username or password'), { statusCode: 401 });
  }

  const token = signToken({ userId: user.id, username: user.username });
  return { token, userId: user.id };
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY, algorithm: 'HS256' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
}
