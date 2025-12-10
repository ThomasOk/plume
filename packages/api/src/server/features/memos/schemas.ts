import { z } from 'zod';

/**
 * Schema pour la création d'un memo
 * Le contenu est requis et doit être une chaîne non vide
 */
export const createMemoSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty').max(10000, 'Content is too long'),
});

/**
 * Schema pour la mise à jour d'un memo
 * Nécessite l'ID du memo et le nouveau contenu
 */
export const updateMemoSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  content: z.string().min(1, 'Content cannot be empty').max(10000, 'Content is too long'),
});

/**
 * Schema pour la suppression d'un memo
 * Nécessite uniquement l'ID du memo
 */
export const deleteMemoSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});
