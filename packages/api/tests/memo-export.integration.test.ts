import { type DatabaseInstance, attachment, memo, space, user } from '@repo/db';
import { strFromU8, unzipSync } from 'fflate';
import { parse } from 'yaml';
import { buildMemoArchive } from '../src/server/index';
import { startTestDatabase, stopTestDatabase } from './helpers/db';

// The export as the user receives it: the archive's bytes, unzipped. A user's archive holds
// every memo they are the author of, personal or in a space, and nothing else.

let db: DatabaseInstance;

beforeAll(async () => {
  db = await startTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase();
});

const userRow = (id: string) => ({
  id,
  name: id,
  email: `${id}@example.com`,
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const alice = userRow('alice');
const bob = userRow('bob');

const spaceRow = (id: string, title: string, createdAt = new Date('2026-01-01T00:00:00Z')) => ({
  id,
  title,
  createdAt,
  updatedAt: createdAt,
});

const day = (iso: string) => new Date(`${iso}T12:00:00Z`);

const memoRow = (id: string, overrides: Partial<typeof memo.$inferInsert> = {}) => ({
  id,
  userId: alice.id,
  content: id,
  createdAt: day('2026-03-14'),
  updatedAt: day('2026-03-14'),
  ...overrides,
});

const inSpace = (spaceId: string) => ({ spaceId, visibility: 'space' as const });

const attachmentOn = (
  memoId: string,
  filename: string,
  { status = 'active', createdAt = new Date() }: { status?: 'active' | 'pending'; createdAt?: Date } = {},
) => ({
  id: `attachment-${memoId}-${filename}`,
  userId: alice.id,
  memoId,
  status,
  filename,
  storageKey: `uploads/alice/${memoId}/${filename}`,
  mimeType: 'image/png',
  size: 1024,
  createdAt,
  updatedAt: createdAt,
});

const exportOf = async (userId: string) => {
  const entries = unzipSync(await buildMemoArchive(db, userId));
  return Object.fromEntries(
    Object.entries(entries).map(([path, bytes]) => [path, strFromU8(bytes)]),
  );
};

// A file is YAML frontmatter between `---` fences, then the memo's content as written.
const readMemoFile = (file: string) => {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(file);
  if (!match) throw new Error(`not a frontmatter file:\n${file}`);
  return { frontmatter: parse(match[1]!) as Record<string, unknown>, content: match[2]! };
};

beforeEach(async () => {
  await db.delete(attachment);
  await db.delete(memo);
  await db.delete(space);
  await db.delete(user);
  await db.insert(user).values([alice, bob]);
});

describe('exporting a user\'s memos', () => {
  it('puts personal memos in personal/ and space memos in one folder per space', async () => {
    await db.insert(space).values(spaceRow('club', 'Book Club'));
    await db.insert(memo).values([
      memoRow('private-memo', { content: 'Groceries', visibility: 'private' }),
      memoRow('public-memo', { content: 'Hello world', visibility: 'public' }),
      memoRow('club-memo', { content: 'Next read', ...inSpace('club') }),
    ]);

    expect(Object.keys(await exportOf(alice.id)).sort()).toEqual([
      'personal/2026-03-14-groceries.md',
      'personal/2026-03-14-hello-world.md',
      'spaces/book-club/2026-03-14-next-read.md',
    ]);
  });

  it('tells apart two spaces whose names give the same folder', async () => {
    await db.insert(space).values([
      spaceRow('first', 'Café', new Date('2026-01-01T00:00:00Z')),
      spaceRow('second', 'cafe', new Date('2026-02-01T00:00:00Z')),
    ]);
    await db.insert(memo).values([
      memoRow('in-first', { content: 'Espresso', ...inSpace('first') }),
      memoRow('in-second', { content: 'Latte', ...inSpace('second') }),
    ]);

    expect(Object.keys(await exportOf(alice.id)).sort()).toEqual([
      'spaces/cafe-2/2026-03-14-latte.md',
      'spaces/cafe/2026-03-14-espresso.md',
    ]);
  });

  it('names each file by its creation date and a slug of its first line', async () => {
    await db.insert(memo).values([
      memoRow('heading', { content: '\n  \n## Crème **brûlée** recipe\nThe rest', createdAt: day('2026-01-02') }),
      memoRow('link', { content: '> See [the _docs_](https://example.com) and `code`', createdAt: day('2026-01-03') }),
      memoRow('list', { content: '- [ ] Ça va? Oui!', createdAt: day('2026-01-04') }),
      memoRow('hashtag', { content: '#cooking/italian tonight', createdAt: day('2026-01-05') }),
      memoRow('image', { content: '![Holiday photo](https://example.com/a.png)', createdAt: day('2026-01-06') }),
      memoRow('long', { content: 'a'.repeat(30) + ' ' + 'b'.repeat(30), createdAt: day('2026-01-07') }),
      memoRow('nothing-left', { content: '***\n\nreal text below a rule', createdAt: day('2026-01-08') }),
      memoRow('emoji', { content: '🎉🎉', createdAt: day('2026-01-09') }),
      // Letters that do not decompose into a base letter and an accent.
      memoRow('ligatures', { content: 'Straße, Œuvre, Ærø, Łódź', createdAt: day('2026-01-10') }),
    ]);

    expect(Object.keys(await exportOf(alice.id)).sort()).toEqual([
      'personal/2026-01-02-creme-brulee-recipe.md',
      'personal/2026-01-03-see-the-docs-and-code.md',
      'personal/2026-01-04-ca-va-oui.md',
      'personal/2026-01-05-cooking-italian-tonight.md',
      'personal/2026-01-06-holiday-photo.md',
      `personal/2026-01-07-${'a'.repeat(30)}-${'b'.repeat(19)}.md`,
      'personal/2026-01-08-memo.md',
      'personal/2026-01-09-memo.md',
      'personal/2026-01-10-strasse-oeuvre-aero-lodz.md',
    ]);
  });

  it('dates a file by its creation day in UTC', async () => {
    await db.insert(memo).values(
      memoRow('late', { content: 'Late night', createdAt: new Date('2026-03-14T23:30:00-05:00') }),
    );

    expect(Object.keys(await exportOf(alice.id))).toEqual(['personal/2026-03-15-late-night.md']);
  });

  it('suffixes memos that would share a file name in the same folder', async () => {
    await db.insert(space).values(spaceRow('club', 'Book Club'));
    await db.insert(memo).values([
      memoRow('first', { content: 'Todo', createdAt: new Date('2026-03-14T08:00:00Z') }),
      memoRow('second', { content: 'Todo\nmore', createdAt: new Date('2026-03-14T09:00:00Z') }),
      memoRow('third', { content: 'todo', createdAt: new Date('2026-03-14T10:00:00Z') }),
      memoRow('in-club', { content: 'Todo', ...inSpace('club') }),
    ]);

    const files = await exportOf(alice.id);

    expect(Object.keys(files).sort()).toEqual([
      'personal/2026-03-14-todo-2.md',
      'personal/2026-03-14-todo-3.md',
      'personal/2026-03-14-todo.md',
      'spaces/book-club/2026-03-14-todo.md',
    ]);
    // The oldest keeps the plain name.
    expect(readMemoFile(files['personal/2026-03-14-todo.md']!).content).toBe('Todo');
    expect(readMemoFile(files['personal/2026-03-14-todo-3.md']!).content).toBe('todo');
  });

  it('names the folder of a space whose name leaves no slug', async () => {
    await db.insert(space).values(spaceRow('tokyo', '東京'));
    await db.insert(memo).values(memoRow('in-tokyo', { content: 'Ramen', ...inSpace('tokyo') }));

    expect(Object.keys(await exportOf(alice.id))).toEqual(['spaces/space/2026-03-14-ramen.md']);
  });

  it('starts a personal memo\'s file with its dates, visibility and tags', async () => {
    await db.insert(memo).values(
      memoRow('tagged', {
        content: 'Dinner #cooking/italian #true #null',
        tags: ['cooking/italian', 'true', 'null'],
        visibility: 'public',
        createdAt: new Date('2026-03-14T08:30:00.250Z'),
        updatedAt: new Date('2026-03-15T09:45:00Z'),
      }),
    );

    const files = await exportOf(alice.id);

    expect(readMemoFile(files['personal/2026-03-14-dinner-cooking-italian-true-null.md']!).frontmatter).toEqual({
      created: '2026-03-14T08:30:00.250Z',
      updated: '2026-03-15T09:45:00.000Z',
      visibility: 'public',
      // Unquoted, `true` and `null` would read back as a boolean and a null.
      tags: ['cooking/italian', 'true', 'null'],
    });
  });

  it('names the space, quoted when it needs to be, in a space memo\'s file', async () => {
    await db.insert(space).values(spaceRow('club', 'Club: "Books" & #more'));
    await db.insert(memo).values(memoRow('in-club', { content: 'Next read', ...inSpace('club') }));

    const files = await exportOf(alice.id);

    expect(readMemoFile(files['spaces/club-books-more/2026-03-14-next-read.md']!).frontmatter).toEqual({
      created: '2026-03-14T12:00:00.000Z',
      updated: '2026-03-14T12:00:00.000Z',
      visibility: 'space',
      tags: [],
      space: 'Club: "Books" & #more',
    });
  });

  it('lists the file names of a memo\'s attachments', async () => {
    await db.insert(memo).values([memoRow('with-files', { content: 'Trip' }), memoRow('bare', { content: 'Bare' })]);
    await db.insert(attachment).values([
      attachmentOn('with-files', 'photo.png', { createdAt: new Date('2026-03-14T10:00:00Z') }),
      attachmentOn('with-files', 'notes: day 1.pdf', { createdAt: new Date('2026-03-14T11:00:00Z') }),
      attachmentOn('with-files', 'still-uploading.png', { status: 'pending' }),
    ]);

    const files = await exportOf(alice.id);

    expect(readMemoFile(files['personal/2026-03-14-trip.md']!).frontmatter.attachments).toEqual([
      'photo.png',
      'notes: day 1.pdf',
    ]);
    expect(readMemoFile(files['personal/2026-03-14-bare.md']!).frontmatter).not.toHaveProperty('attachments');
  });

  it('keeps the memo\'s content exactly as written', async () => {
    const content = '# Title  \r\n\n---\nnot frontmatter\n---\n\n  indented 🎉 é\ttab\n\n';
    await db.insert(memo).values(memoRow('exact', { content }));

    const files = await exportOf(alice.id);

    expect(readMemoFile(files['personal/2026-03-14-title.md']!).content).toBe(content);
  });

  it('holds only memos the user is the author of, never comments', async () => {
    await db.insert(space).values(spaceRow('club', 'Book Club'));
    await db.insert(memo).values([
      memoRow('alice-memo', { content: 'Mine', visibility: 'public' }),
      memoRow('bob-public', { userId: bob.id, content: 'Bob public', visibility: 'public' }),
      memoRow('bob-in-club', { userId: bob.id, content: 'Bob in club', ...inSpace('club') }),
    ]);
    await db.insert(memo).values([
      // Alice's comment under Bob's memo, and Bob's under hers.
      memoRow('alice-comment', { content: 'My comment', parentId: 'bob-public', visibility: 'public' }),
      memoRow('bob-comment', { userId: bob.id, content: 'Bob comment', parentId: 'alice-memo', visibility: 'public' }),
    ]);

    expect(Object.keys(await exportOf(alice.id))).toEqual(['personal/2026-03-14-mine.md']);
  });

  it('is a valid, empty archive for a user with no memos', async () => {
    await db.insert(memo).values(memoRow('bob-memo', { userId: bob.id, content: 'Bob' }));

    expect(await exportOf(alice.id)).toEqual({});
  });
});

