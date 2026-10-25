import { z } from 'zod';

export const taskInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give your task a name.')
    .max(300, 'Keep the title under 300 characters.'),
  details: z.string().max(20_000).default(''),
  date: z.iso.date(),
  status: z.enum(['todo', 'in-progress', 'done']).default('todo'),
});

export type TaskInput = z.input<typeof taskInputSchema>;
