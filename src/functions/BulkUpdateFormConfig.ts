import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { formConfigContainer } from '../cosmosClient';

interface BulkUpdateItem {
  id: string;
  [key: string]: any;
}

export async function BulkUpdateFormConfig(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`HTTP POST request for bulk update at URL: "${request.url}"`);

  let updates: BulkUpdateItem[] = [];

  try {
    const body = await request.json();
    updates = body as BulkUpdateItem[];
  } catch (err) {
    return {
      status: 400,
      jsonBody: { data: null, message: 'Invalid JSON body' },
    };
  }

  if (!Array.isArray(updates) || updates.length === 0) {
    return {
      status: 400,
      jsonBody: {
        data: null,
        message: 'Request body must be a non-empty array',
      },
    };
  }

  const allowedFields = [
    'label',
    'type',
    'order',
    'options',
    'required',
    'placeholder',
  ];

  try {
    const results: any[] = [];

    for (const item of updates) {
      if (!item.id) {
        results.push({ id: null, status: 'missing id' });
        continue;
      }

      try {
        const partitionKeyValue = item.name; // ganti sesuai partition key container

        // Ambil item lama
        const { resource: existing } = await formConfigContainer
          .item(item.id, partitionKeyValue)
          .read();

        if (!existing) {
          results.push({ id: item.id, status: 'not found' });
          continue;
        }

        // Filter hanya field yang diizinkan
        const filteredUpdate: any = {};
        for (const key of allowedFields) {
          if (key in item) filteredUpdate[key] = item[key];
        }

        // Merge fields baru
        const updated = { ...existing, ...filteredUpdate };

        // Replace item di Cosmos DB
        const { resource: replaced } = await formConfigContainer
          .item(item.id, partitionKeyValue)
          .replace(updated);

        results.push({ id: item.id, status: 'updated', item: replaced });
      } catch (err) {
        results.push({
          id: item.id,
          status: 'failed',
          error: (err as any).message,
        });
      }
    }

    return {
      status: 200,
      jsonBody: { data: results, message: 'Bulk update completed' },
    };
  } catch (error: any) {
    context.log('Error in BulkUpdateFormConfig:', error);

    return {
      status: 500,
      jsonBody: { data: null, message: 'Internal server error' },
    };
  }
}

app.http('BulkUpdateFormConfig', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: BulkUpdateFormConfig,
});
