import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { container } from '../cosmosClient';

export async function GetTasks(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const organizationId = request.query.get('organizationId');
  if (!organizationId) {
    return {
      status: 400,
      jsonBody: { error: 'Missing organizationId query parameter' },
    };
  }

  const search = (request.query.get('search') || '').toLowerCase();
  const page = parseInt(request.query.get('page') || '1', 10);
  const pageSize = parseInt(request.query.get('pageSize') || '10', 10);

  try {
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.organizationId = @orgId',
      parameters: [{ name: '@orgId', value: organizationId }],
    };

    const iterator = container.items.query(querySpec, {
      maxItemCount: page * pageSize,
    });

    const { resources: fetchedItems } = await iterator.fetchAll();

    const filteredItems = fetchedItems.filter(
      (item) =>
        item.title?.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search)
    );

    const offset = (page - 1) * pageSize;
    const pagedResults = filteredItems.slice(offset, offset + pageSize);

    return {
      status: 200,
      jsonBody: {
        meta: {
          pagination: {
            page,
            pageSize,
            total: filteredItems.length,
          },
        },
        data: pagedResults,
      },
    };
  } catch (error) {
    context.log('Error in GetTasks:', error);

    if (error.code === 404) {
      return {
        status: 404,
        jsonBody: {
          data: null,
          message: 'Task not found',
        },
      };
    }

    return {
      status: 500,
      jsonBody: { data: null, message: 'Internal server error' },
    };
  }
}

app.http('GetTasks', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: GetTasks,
});
