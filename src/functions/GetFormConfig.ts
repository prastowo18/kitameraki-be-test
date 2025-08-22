import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { formConfigContainer } from '../cosmosClient';

export async function GetFormConfig(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`HTTP GET request processed for URL: "${request.url}"`);

  try {
    const querySpec = {
      query: 'SELECT * FROM c ORDER BY c["order"] ASC',
    };

    const iterator = formConfigContainer.items.query(querySpec);

    const { resources: formConfig } = await iterator.fetchAll();

    return {
      status: 200,
      jsonBody: { data: formConfig },
    };
  } catch (error: any) {
    context.log('Error in GetFormConfig:', error);

    if (error.code === 404) {
      return {
        status: 404,
        jsonBody: {
          data: null,
          message: 'FormConfig not found',
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

app.http('GetFormConfig', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: GetFormConfig,
});
