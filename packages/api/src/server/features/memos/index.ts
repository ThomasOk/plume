import { router } from '../../trpc';
import { list, create, update, deleteMemo } from './procedures';

/**
 * Router pour la feature "memos"
 * Expose 4 endpoints :
 * - list : récupérer tous les memos
 * - create : créer un nouveau memo
 * - update : modifier un memo existant
 * - delete : supprimer un memo
 */
export const memosRouter = router({
  list,
  create,
  update,
  delete: deleteMemo, // Renommé car "delete" est un mot réservé
});
