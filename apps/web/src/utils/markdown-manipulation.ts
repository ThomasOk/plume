import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { SKIP, visit } from 'unist-util-visit';

interface TaskInfo {
  line: number;
  checked: boolean;
}

export function extractTasksFromAst(markdown: string): TaskInfo[] {
  const tasks: TaskInfo[] = [];
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);

  visit(tree, 'listItem', (node: any) => {
    if (typeof node.checked === 'boolean') {
      tasks.push({
        line: node.position.start.line - 1,
        checked: node.checked,
      });
    }
  });

  return tasks;
}

// The words of a run of inline content, as they read: emphasis, links and code give up their
// text, an image gives up nothing, a line break becomes a space.
function inlineText(node: any): string {
  if (node.type === 'image' || node.type === 'imageReference') return '';
  if (node.type === 'break') return ' ';
  if (typeof node.value === 'string') return node.value;
  return (node.children ?? []).map(inlineText).join('');
}

/**
 * The words of a Markdown text on one line, without the Markdown: each block (paragraph,
 * heading, list item, quote, code block, table cell) gives its text, and the blocks are
 * joined by a space. Hashtags stay: they are words of the text.
 */
export function toPlainText(markdown: string): string {
  const blocks: string[] = [];
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);

  visit(tree, (node: any) => {
    if (node.type === 'code') {
      blocks.push(node.value);
      return SKIP;
    }
    if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'tableCell') {
      blocks.push(inlineText(node));
      return SKIP;
    }
  });

  return blocks.join(' ').replace(/\s+/g, ' ').trim();
}

export function toggleTaskAtLine(
  markdown: string,
  lineNumber: number,
  checked: boolean,
): string {
  const lines = markdown.split('\n');
  if (lineNumber < 0 || lineNumber >= lines.length) {
    return markdown;
  }

  const line = lines[lineNumber];
  if (!line) {
    return markdown;
  }

  const taskRegex = /^(\s*[-*+]\s+)\[( |x|X)\](.*)$/;

  if (taskRegex.test(line)) {
    lines[lineNumber] = line.replace(
      taskRegex,
      (_match, prefix, _currentCheckbox, suffix) => {
        const newCheckbox = checked ? 'x' : ' ';
        return `${prefix}[${newCheckbox}]${suffix}`;
      },
    );
  }
  return lines.join('\n');
}

export function toggleTaskAtIndex(
  markdown: string,
  taskIndex: number,
  checked: boolean,
): string {
  const tasks = extractTasksFromAst(markdown);
  if (taskIndex < 0 || taskIndex >= tasks.length) {
    return markdown;
  }

  const targetTask = tasks[taskIndex];
  if (!targetTask) {
    return markdown;
  }

  const lineNumber = targetTask.line;

  return toggleTaskAtLine(markdown, lineNumber, checked);
}
