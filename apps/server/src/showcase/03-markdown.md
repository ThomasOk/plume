# ✍️ Markdown, as Plume renders it

Plume speaks **GitHub-flavoured Markdown**: tables, highlighted code, task lists and more.

| Visibility | Who reads it         |
| ---------- | -------------------- |
| Private    | You alone            |
| Space      | The space's members  |
| Public     | Everyone, on Explore |

```ts
// Code blocks are highlighted, with their language shown.
const greet = (name: string) => `Hello, ${name}!`;
```

Task lists are interactive. Their author ticks them right from the memo:

- [x] Write a memo
- [x] Make it public
- [ ] Get a reaction

Text can be **bold**, _italic_, ~~struck through~~, or `inline code`, and [a link](https://github.com/ThomasOk/plume) opens in a new tab.
A single line break is kept as is, no trailing spaces needed.

> A quote, for when someone said it better.

- A list
  - nested
- Another item

1. Numbered
2. Lists too

HTML is sanitised: a script slipped into a memo is stripped, never run.

#plume/markdown
