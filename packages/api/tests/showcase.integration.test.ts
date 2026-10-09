import { type DatabaseInstance, eq, memo, reaction, user } from '@repo/db';
import { seedShowcase, ShowcaseRefusedError, type Showcase } from '../src/server/index';
import { startTestDatabase, stopTestDatabase } from './helpers/db';
import { createTestCaller } from './helpers/trpc';

let db: DatabaseInstance;

beforeAll(async () => {
  db = await startTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase();
});

const userRow = (id: string, name: string, isOperator = false) => ({
  id,
  name,
  email: `${id}@example.com`,
  emailVerified: true,
  image: null,
  isOperator,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Olivia is the operator who writes the showcase; Alice and Bob answer it.
const olivia = userRow('olivia', 'Olivia', true);
const alice = userRow('alice', 'Alice');
const bob = userRow('bob', 'Bob');

beforeEach(async () => {
  await db.delete(memo);
  await db.delete(user);
  await db.insert(user).values([olivia, alice, bob]);
});

const showcase = (): Showcase => ({
  authorId: olivia.id,
  memos: [
    { content: '# Welcome\n\nPlume in a nutshell. #plume' },
    {
      content: '# A conversation\n\nWhat do you think?',
      reactions: [
        { userId: alice.id, emoji: '🎉' },
        { userId: bob.id, emoji: '❤️' },
      ],
      comments: [
        { authorId: alice.id, content: 'Love it.', reactions: [{ userId: olivia.id, emoji: '🙏' }] },
        { authorId: bob.id, content: 'Same here.' },
      ],
    },
    { content: '# Under the hood\n\nThe stack.' },
  ],
});

const explore = () => createTestCaller(db).memos.listPublic({});

describe('seedShowcase', () => {
  it('features the showcase on Explore, in the declared order, for a reader not signed in', async () => {
    await seedShowcase(db, showcase());

    const memos = await explore();
    expect(memos.map((m) => m.content.split('\n')[0])).toEqual(['# Welcome', '# A conversation', '# Under the hood']);
    expect(memos.every((m) => m.featuredAt !== null && m.visibility === 'public')).toBe(true);
  });

  it('goes through the memo services: tags are extracted, comments and reactions are written', async () => {
    const [welcome, conversation] = await seedShowcase(db, showcase());

    const [written] = await db.select().from(memo).where(eq(memo.id, welcome!.id));
    expect(written!.tags).toEqual(['plume']);

    const comments = await createTestCaller(db).memos.listComments({ memoId: conversation!.id });
    expect(comments.map((c) => c.content)).toEqual(['Love it.', 'Same here.']);

    const reactions = await db.select().from(reaction);
    expect(reactions).toHaveLength(3);
  });

  it('creates nothing new when run twice, and keeps the order', async () => {
    await seedShowcase(db, showcase());
    const second = await seedShowcase(db, showcase());

    expect(second.map((m) => m.outcome)).toEqual(['unchanged', 'unchanged', 'unchanged']);
    expect(await db.select().from(memo)).toHaveLength(5);
    expect(await db.select().from(reaction)).toHaveLength(3);
    expect((await explore()).map((m) => m.id)).toEqual(second.map((m) => m.id));
  });

  it('updates a memo whose text changed in place, recognising it by its first line', async () => {
    const [first] = await seedShowcase(db, showcase());

    const edited = showcase();
    edited.memos[0]!.content = '# Welcome\n\nPlume, reworded.';
    const [second] = await seedShowcase(db, edited);

    expect(second).toMatchObject({ id: first!.id, outcome: 'updated' });
    const [written] = await db.select().from(memo).where(eq(memo.id, first!.id));
    expect(written!.content).toBe('# Welcome\n\nPlume, reworded.');
  });

  it('updates a comment whose text changed in place, recognising it by its author and rank', async () => {
    await seedShowcase(db, showcase());

    const edited = showcase();
    edited.memos[1]!.comments![0]!.content = 'Really love it.';
    const [, conversation] = await seedShowcase(db, edited);

    const comments = await createTestCaller(db).memos.listComments({ memoId: conversation!.id });
    expect(comments.map((c) => c.content)).toEqual(['Really love it.', 'Same here.']);
  });

  it('follows a reordering of the showcase on a rerun', async () => {
    await seedShowcase(db, showcase());

    const reordered = showcase();
    reordered.memos.reverse();
    await seedShowcase(db, reordered);

    expect((await explore()).map((m) => m.content.split('\n')[0])).toEqual(['# Under the hood', '# A conversation', '# Welcome']);
  });

  it('refuses an author who is not an operator, before writing anything', async () => {
    await expect(seedShowcase(db, { ...showcase(), authorId: alice.id })).rejects.toThrow(ShowcaseRefusedError);
    expect(await db.select().from(memo)).toHaveLength(0);
  });

  it('refuses an unknown identifier, before writing anything', async () => {
    const withTypo = showcase();
    withTypo.memos[1]!.comments![1]!.authorId = 'bobb';

    await expect(seedShowcase(db, withTypo)).rejects.toThrow('No user has the identifier "bobb"');
    expect(await db.select().from(memo)).toHaveLength(0);
  });
});
