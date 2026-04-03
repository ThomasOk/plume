import { z } from 'zod';

export const archiveNotificationSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export const deleteNotificationSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});
