import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { UpdateTaskSchema, validateSchema } from '../taskValidation';
import { container } from '../cosmosClient';

export async function UpdateTask(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  try {
    const body = await request.json();

    const taskData = validateSchema(UpdateTaskSchema, body);

    const { id, ...updateData } = taskData;

    const { resource: existingTask } = await container
      .item(id, updateData.organizationId)
      .read();
    if (!existingTask) {
      return {
        status: 404,
        jsonBody: { data: id, message: 'Task not found' },
      };
    }

    const updatedTask = {
      ...existingTask,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
    const { resource: savedTask } = await container
      .item(id, updateData.organizationId)
      .replace(updatedTask);

    return {
      status: 200,
      jsonBody: { data: savedTask, message: 'Task updated successfully' },
    };
  } catch (error) {
    context.log('Validation or server error:', error.message);
    return {
      status: 400,
      jsonBody: {
        data: null,
        message: error.message,
      },
    };
  }
}

app.http('UpdateTask', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  handler: UpdateTask,
});
