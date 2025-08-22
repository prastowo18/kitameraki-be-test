import { config } from 'dotenv';
config();

import {
  CosmosClient,
  PartitionKeyKind,
  CosmosClientOptions,
} from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';

import { formConfigSeed } from '../constants/data';

function pickRandom<T>(arr: T[], n: number) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

export async function initDb() {
  const databaseId = 'TaskApp';
  const tasksContainerId = 'Tasks';
  const orgContainerId = 'Organizations';
  const formConfigContainerId = 'FormConfig';

  const tasksPartitionKey = {
    kind: PartitionKeyKind.Hash,
    paths: ['/organizationId'],
  };
  const orgPartitionKey = { kind: PartitionKeyKind.Hash, paths: ['/id'] };
  const formConfigPartitionKey = {
    kind: PartitionKeyKind.Hash,
    paths: ['/name'],
  };

  const endpoint = process.env.COSMOS_ENDPOINT!;
  const key = process.env.COSMOS_KEY!;
  const throughput = Number(process.env.COSMOS_THROUGHPUT) || 400;

  if (!endpoint || !key) {
    throw new Error(
      'Missing COSMOS_ENDPOINT or COSMOS_KEY in environment variables'
    );
  }

  const clientOptions: CosmosClientOptions = { endpoint, key };
  if (endpoint.includes('localhost')) {
    clientOptions.connectionPolicy = { enableEndpointDiscovery: false };
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log('⚠️ Running in local emulator mode: TLS verification disabled');
  }

  const client = new CosmosClient(clientOptions);

  console.log('Connecting to Cosmos DB...');
  const { database } = await client.databases.createIfNotExists({
    id: databaseId,
  });
  console.log(`Database "${databaseId}" ready`);

  // --- Organizations container ---
  const { container: orgContainer } =
    await database.containers.createIfNotExists({
      id: orgContainerId,
      partitionKey: orgPartitionKey,
      throughput,
    });
  console.log(`Container "${orgContainerId}" ready`);

  // generate 3 organizations
  const orgs = [
    { id: uuidv4(), name: 'Organization A' },
    { id: uuidv4(), name: 'Organization B' },
    { id: uuidv4(), name: 'Organization C' },
  ];
  const orgIds = orgs.map((org) => org.id);

  // Bulk insert organizations
  await orgContainer.items.bulk(
    orgs.map((org) => ({ operationType: 'Create', resourceBody: org }))
  );
  console.log(`Inserted ${orgs.length} organizations`);

  // --- Tasks container ---
  const { container: tasksContainer } =
    await database.containers.createIfNotExists({
      id: tasksContainerId,
      partitionKey: tasksPartitionKey,
      throughput,
    });
  console.log(`Container "${tasksContainerId}" ready`);

  const statuses = ['todo', 'in-progress', 'done'];
  const priorities = ['low', 'medium', 'high'];
  const sampleTags = ['frontend', 'backend', 'bug', 'feature', 'urgent'];

  const tasks: any[] = [];

  // generate 20 tasks per organization
  for (const orgId of orgIds) {
    for (let i = 1; i <= 20; i++) {
      const randomStatus =
        statuses[Math.floor(Math.random() * statuses.length)];
      const randomPriority =
        priorities[Math.floor(Math.random() * priorities.length)];
      const randomTags = pickRandom(sampleTags, 2);

      const randomDueDate = new Date();
      randomDueDate.setDate(
        randomDueDate.getDate() + Math.floor(Math.random() * 60) - 30
      );

      const task = {
        id: uuidv4(),
        title: `Task ${i} for org ${orgId}`,
        description: `Description for task ${i} of org ${orgId}`,
        status: randomStatus,
        priority: randomPriority,
        organizationId: orgId,
        tags: randomTags,
        dueDate: randomDueDate.toISOString(),
      };

      tasks.push({ operationType: 'Create', resourceBody: task });
    }
  }

  // Bulk insert tasks
  await tasksContainer.items.bulk(tasks);
  console.log(`Inserted ${tasks.length} tasks`);

  // --- FormConfig container ---
  const { container: formConfigContainer } =
    await database.containers.createIfNotExists({
      id: formConfigContainerId,
      partitionKey: formConfigPartitionKey,
      throughput,
    });
  console.log(`Container "${formConfigContainerId}" ready`);

  // Bulk insert form config
  await formConfigContainer.items.bulk(
    formConfigSeed.map((item) => ({
      operationType: 'Create',
      resourceBody: item,
    }))
  );
  console.log(`Inserted ${formConfigSeed.length} form configuration items`);

  console.log('✅ Database seeding complete');

  return {
    client,
    database,
    orgContainer,
    tasksContainer,
    formConfigContainer,
  };
}

// Run initDb if called directly
if (require.main === module) {
  initDb().catch((err) => {
    console.error('Failed to initialize DB:', err);
    process.exit(1);
  });
}
