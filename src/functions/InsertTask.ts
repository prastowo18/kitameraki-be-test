import { v4 as uuidv4 } from 'uuid';

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { InsertTaskSchema, validateSchema } from '../taskValidation';
import { container } from '../cosmosClient';

export async function InsertTask(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);
  try {
    const body = await request.json();

    const taskData = validateSchema(InsertTaskSchema, body);

    const newTask = {
      id: taskData.id || uuidv4(),
      organizationId: taskData.organizationId,
      title: taskData.title,
      description: taskData.description || '',
      dueDate: taskData.dueDate || null,
      priority: taskData.priority || 'medium',
      status: taskData.status || 'todo',
      tags: taskData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { resource: createdTask } = await container.items.create(newTask);

    return {
      status: 201,
      jsonBody: { data: createdTask, message: 'Task created successfully' },
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

app.http('InsertTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: InsertTask,
});
