import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';

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
