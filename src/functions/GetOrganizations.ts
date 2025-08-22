import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { orgContainer } from '../cosmosClient';

export async function GetOrganizations(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`HTTP GET request processed for URL: "${request.url}"`);

  try {
    const querySpec = {
      query: 'SELECT * FROM c',
    };

    const iterator = orgContainer.items.query(querySpec);

    const { resources: organizations } = await iterator.fetchAll();

    return {
      status: 200,
      jsonBody: { data: organizations },
    };
  } catch (error: any) {
    context.log('Error in GetOrganizations:', error);

    if (error.code === 404) {
      return {
        status: 404,
        jsonBody: {
          data: null,
          message: 'Organizations not found',
        },
      };
    }

    return {
      status: 500,
      jsonBody: {
        data: null,
        message: 'Internal server error',
      },
    };
  }
}

app.http('GetOrganizations', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: GetOrganizations,
});
