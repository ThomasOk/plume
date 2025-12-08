import { publicProcedure, router } from '../../server/trpc';
import { listTasks } from './tasks-handlers';

export const tasksRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return listTasks();
  }),
});
