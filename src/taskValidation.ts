import { z } from 'zod';

// Base schema untuk task
export const BaseTaskSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string(),
  title: z.string().max(100),
  description: z.string().max(1000).optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['todo', 'in-progress', 'completed']).optional(),
  tags: z.array(z.string().max(50)).optional(),
});

// Schema untuk insert
export const InsertTaskSchema = BaseTaskSchema.extend({});

// Schema untuk update (semua optional, id wajib)
export const UpdateTaskSchema = BaseTaskSchema.partial().extend({
  id: z.string(),
});

// Helper function untuk parsing dan error handling
export function validateSchema<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    // Menggabungkan semua error menjadi string
    const errors = result.error.issues
      .map((err) => `${err.path.join('.')} - ${err.message}`)
      .join('; ');
    throw new Error(`Validation error: ${errors}`);
  }
  return result.data;
}
