import { CosmosClient } from "@azure/cosmos";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function InsertTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const body = await request.json();

    const client = new CosmosClient("this is a connection string");
    const createdTask = await client.database("TaskApp")
        .container("Tasks")
        .items.create(body);

    return { jsonBody: createdTask.resource, status: 200 };
};

app.http('InsertTask', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: InsertTask
});
