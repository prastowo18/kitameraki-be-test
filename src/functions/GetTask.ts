import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { container } from '../cosmosClient';

export async function GetTask(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  try {
    const id = request.params.id;
    const organizationId = request.query.get('organizationId');

    if (!id || !organizationId) {
      return {
        status: 400,
        jsonBody: {
          data: null,
          message:
            'Task ID parameter and organizationId query parameter are required',
        },
      };
    }

    const { resource: task } = await container.item(id, organizationId).read();

    if (!task) {
      return {
        status: 404,
        jsonBody: {
          data: null,
          message: 'Task not found',
        },
      };
    }
    return {
      status: 200,
      jsonBody: {
        data: task,
      },
    };
  } catch (error: any) {
    context.log('Error in GetTask:', error);

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

app.http('GetTask', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tasks/{id}',
  handler: GetTask,
});
