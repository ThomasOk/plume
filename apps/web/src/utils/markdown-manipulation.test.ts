import { describe, expect, it } from 'vitest';
import { toPlainText } from './markdown-manipulation';

// What a reader sees of a comment on one line, under a card in the list: its words, none of
// the Markdown that shapes them.
describe('toPlainText', () => {
  it.each([
    ['emphasis', 'I bring **the wine** and _the cheese_', 'I bring the wine and the cheese'],
    ['emphasis inside a word', 'pre**fix**ed', 'prefixed'],
    ['a link, kept by its text', 'See [the menu](https://example.com)', 'See the menu'],
    ['inline code', 'Run `pnpm dev` first', 'Run pnpm dev first'],
    ['a heading', '## Plan', 'Plan'],
    ['a list', '- bread\n- wine', 'bread wine'],
    ['a task list', '- [x] bread\n- [ ] wine', 'bread wine'],
    ['a quote', '> Well said\n\nAgreed', 'Well said Agreed'],
    ['a code block, kept by its code', '```ts\nconst a = 1;\n```', 'const a = 1;'],
    ['an image, left out', '![a photo](https://example.com/a.png) Look', 'Look'],
    ['strikethrough', '~~Tuesday~~ Wednesday', 'Tuesday Wednesday'],
    ['line breaks', 'One\ntwo\n\nthree', 'One two three'],
  ])('leaves out %s', (_, markdown, text) => {
    expect(toPlainText(markdown)).toBe(text);
  });

  it('keeps hashtags, which are words of the comment', () => {
    expect(toPlainText('Lovely #cooking/italian')).toBe('Lovely #cooking/italian');
  });
});
