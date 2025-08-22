import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { container } from '../cosmosClient';

export async function BulkDeleteTasks(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  try {
    const body = (await request.json()) as { ids: string[] };
    const organizationId = request.query.get('organizationId');

    if (!body?.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return {
        status: 400,
        jsonBody: {
          data: null,
          message: 'Request body must contain an array of task IDs',
        },
      };
    }

    if (!organizationId) {
      return {
        status: 400,
        jsonBody: {
          data: null,
          message: 'organizationId query parameter is required',
        },
      };
    }

    const BATCH_SIZE = 50;
    const allIds = body.ids;
    const deleted: string[] = [];
    const notFound: string[] = [];
    const errors: { id: string; error: string }[] = [];

    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
      const batchIds = allIds.slice(i, i + BATCH_SIZE);

      const deleteResults = await Promise.allSettled(
        batchIds.map(async (id) => {
          try {
            const { resource: task } = await container
              .item(id, organizationId)
              .read();

            if (!task) {
              return { id, status: 'notFound' };
            }

            await container.item(id, organizationId).delete();
            return { id, status: 'deleted' };
          } catch (err: any) {
            if (err.code === 404) {
              return { id, status: 'notFound' };
            }
            return {
              id,
              status: 'error',
              error: err.message || 'Unknown error',
            };
          }
        })
      );

      deleteResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const value = result.value;
          if (value.status === 'deleted') deleted.push(value.id);
          else if (value.status === 'notFound') notFound.push(value.id);
          else if (value.status === 'error')
            errors.push({ id: value.id, error: value.error });
        } else {
          errors.push({ id: 'unknown', error: result.reason });
        }
      });
    }

    return {
      status: 200,
      jsonBody: {
        deleted,
        notFound,
        errors,
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

app.http('BulkDeleteTasks', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  handler: BulkDeleteTasks,
});
