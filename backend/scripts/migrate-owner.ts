/**
 * One-time migration: reassign all records from userId="owner" to a new user ID.
 *
 * Usage:
 *   npx ts-node scripts/migrate-owner.ts <new-user-id>
 *
 * Environment variables (same as backend):
 *   AWS_REGION, SESSIONS_TABLE, RECORDS_TABLE, HRV_TABLE
 *   DYNAMODB_ENDPOINT (optional, for local DynamoDB)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const newUserId = process.argv[2];
if (!newUserId) {
  console.error('Usage: npx ts-node scripts/migrate-owner.ts <new-user-id>');
  process.exit(1);
}

const region = process.env.AWS_REGION || 'eu-west-1';
const endpoint = process.env.DYNAMODB_ENDPOINT;

const client = new DynamoDBClient({
  region,
  ...(endpoint && { endpoint }),
});
const docClient = DynamoDBDocumentClient.from(client);

const tables = [
  process.env.SESSIONS_TABLE || 'WorkoutSessions-prod',
  process.env.RECORDS_TABLE || 'ManualRecords-prod',
  process.env.HRV_TABLE || 'HrvRecords-prod',
];

async function migrateTable(tableName: string): Promise<number> {
  let count = 0;
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(new QueryCommand({
      TableName: tableName,
      IndexName: 'userId-date-index',
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': 'owner' },
      ProjectionExpression: 'id',
      ExclusiveStartKey: lastKey,
    }));

    for (const item of result.Items || []) {
      await docClient.send(new UpdateCommand({
        TableName: tableName,
        Key: { id: item.id },
        UpdateExpression: 'SET userId = :newUid',
        ConditionExpression: 'userId = :oldUid',
        ExpressionAttributeValues: {
          ':newUid': newUserId,
          ':oldUid': 'owner',
        },
      }));
      count++;
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return count;
}

async function main() {
  console.log(`Migrating records from userId="owner" to userId="${newUserId}"\n`);

  for (const table of tables) {
    const count = await migrateTable(table);
    console.log(`  ${table}: ${count} records migrated`);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
