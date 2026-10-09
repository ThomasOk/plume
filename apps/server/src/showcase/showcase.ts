import type { Showcase } from '@repo/api/server';

// Who plays which part: the operator writes and features the memos, two readers answer them.
export interface ShowcaseCast {
  author: string;
  firstReader: string;
  secondReader: string;
}

// The texts live as Markdown files beside this one, so they read and review as what they
// are; `read` returns one by its file name.
// In the order Explore shows them, first on top.
export const buildShowcase = (
  { author, firstReader, secondReader }: ShowcaseCast,
  read: (file: string) => string,
): Showcase => ({
  authorId: author,
  memos: [
    {
      content: read('01-welcome.md'),
      reactions: [
        { userId: firstReader, emoji: '🎉' },
        { userId: secondReader, emoji: '👍' },
      ],
    },
    { content: read('02-tour.md') },
    {
      content: read('03-markdown.md'),
      reactions: [{ userId: firstReader, emoji: '💡' }],
    },
    { content: read('04-tags.md') },
    {
      content: read('05-conversation.md'),
      reactions: [
        { userId: firstReader, emoji: '❤️' },
        { userId: secondReader, emoji: '👍' },
      ],
      comments: [
        {
          authorId: firstReader,
          content:
            'A reading log: one memo per book, tagged by genre. And a task list for the to-read pile, which only ever grows.',
          reactions: [
            { userId: secondReader, emoji: '😂' },
            { userId: author, emoji: '❤️' },
          ],
        },
        {
          authorId: secondReader,
          content:
            'Recipes I keep tweaking. Hierarchical tags fit them well: one per cuisine, all under the same parent.',
          reactions: [{ userId: author, emoji: '💡' }],
        },
        {
          authorId: author,
          content:
            'Both good fits! For the recipes, a space would let you write them together with family.',
          reactions: [{ userId: secondReader, emoji: '🙏' }],
        },
      ],
    },
    {
      content: read('06-under-the-hood.md'),
      reactions: [{ userId: secondReader, emoji: '💡' }],
    },
  ],
});
