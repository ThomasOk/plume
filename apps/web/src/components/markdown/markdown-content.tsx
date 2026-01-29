import type { Element } from 'hast';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './code-block';
import { TaskListItem } from './task-list-item';
import { isTaskListItemNode } from '@/utils/markdown';

interface MarkdownContentProps {
  content: string;
}

// Secure sanitization schema - allows safe HTML while blocking XSS vectors
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // Allow className for syntax highlighting
    code: [...(defaultSchema.attributes?.code || []), 'className'],
    pre: [...(defaultSchema.attributes?.pre || []), 'className'],
    // Allow checkbox attributes for task lists
    input: [
      ...(defaultSchema.attributes?.input || []),
      ['type', 'checkbox'],
      ['disabled', 'disabled'],
      ['checked', 'checked'],
    ],
  },
};

export const MarkdownContent = ({ content }: MarkdownContentProps) => {
  return (
    <div className="prose prose-sm max-w-none break-words dark:prose-invert prose-code:before:content-none prose-code:after:content-none prose-pre:bg-transparent prose-pre:text-inherit prose-code:text-inherit">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[
          rehypeRaw, // Parse raw HTML
          [rehypeSanitize, sanitizeSchema], // Sanitize for security (blocks XSS)
        ]}
        components={{
          input: (
            props: React.ComponentProps<'input'> & { node?: Element },
          ) => {
            const { node, ...rest } = props;

            if (node && isTaskListItemNode(node)) {
              return <TaskListItem {...rest} />;
            }

            return <input {...rest} />;
          },
          code: (props: React.ComponentProps<'code'> & { node?: Element }) => {
            const { className, children, ...rest } = props;
            const isInline = !className?.startsWith('language-');

            return (
              <CodeBlock className={className} inline={isInline} {...rest}>
                {children}
              </CodeBlock>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
