import { config } from 'dotenv';
config();

import { CosmosClient, Container } from '@azure/cosmos';

if (!process.env.COSMOS_ENDPOINT || !process.env.COSMOS_KEY) {
  throw new Error(
    'COSMOS_ENDPOINT or COSMOS_KEY is not set in environment variables'
  );
}

const isLocalEmulator = process.env.COSMOS_ENDPOINT.includes('localhost');

if (isLocalEmulator) {
  // Bypass TLS verification hanya untuk lokal
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.log('Running in local emulator mode: TLS verification disabled');
}

// Build Cosmos client options
const clientOptions: any = {
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY,
};

if (isLocalEmulator) {
  clientOptions.connectionPolicy = { enableEndpointDiscovery: false };
}

// Reusable client, database, container
const client = new CosmosClient(clientOptions);
const database = client.database('TaskApp');
const container: Container = database.container('Tasks');
const orgContainer: Container = database.container('Organizations');
const formConfigContainer: Container = database.container('FormConfig');

export { client, database, container, orgContainer, formConfigContainer };
