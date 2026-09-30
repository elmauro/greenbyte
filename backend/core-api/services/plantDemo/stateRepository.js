import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { createBaselineState } from './logic.js';

const client = new DynamoDBClient({});

function tableName() {
  const name = process.env.DEMO_PLANT_TABLE_NAME;
  if (!name) {
    throw new Error('DEMO_PLANT_TABLE_NAME is not configured');
  }
  return name;
}

function pkForLine(lineId) {
  return `LINE#${lineId}`;
}

export async function loadState(lineId) {
  const result = await client.send(
    new GetItemCommand({
      TableName: tableName(),
      Key: marshall({ pk: pkForLine(lineId) }),
    }),
  );

  if (!result.Item) {
    const baseline = createBaselineState();
    await saveState(lineId, baseline);
    return baseline;
  }

  const item = unmarshall(result.Item);
  return {
    lineId: item.lineId,
    queue: item.queue,
    planVersion: item.planVersion,
    lastEvent: item.lastEvent ?? null,
    acceptedPlanVersion: item.acceptedPlanVersion ?? null,
  };
}

export async function saveState(lineId, state) {
  const now = new Date().toISOString();
  await client.send(
    new PutItemCommand({
      TableName: tableName(),
      Item: marshall({
        pk: pkForLine(lineId),
        lineId: state.lineId ?? lineId,
        queue: state.queue,
        planVersion: state.planVersion,
        lastEvent: state.lastEvent ?? null,
        acceptedPlanVersion: state.acceptedPlanVersion ?? null,
        updatedAt: now,
      }),
    }),
  );
}
