import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import type { Element } from 'hast';
import { CodeBlock } from './code-block';
import { MentionToken } from './mention-token';
import { TaskListItem } from './task-list-item';
import { isMentionNode, isTaskListItemNode } from '@/utils/markdown';
import { remarkMention } from '@/utils/remark-mention';

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
    // Allow mention spans produced by remarkMention — dataMention restricted by regex
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      'className',
      ['dataMention', /^[a-z][a-z0-9_]{1,28}[a-z0-9]$/],
    ],
  },
};

export const MarkdownContent = ({ content }: MarkdownContentProps) => {
  return (
    <div className="prose prose-sm max-w-none break-words dark:prose-invert prose-code:before:content-none prose-code:after:content-none prose-pre:bg-transparent prose-pre:text-inherit prose-code:text-inherit">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMention]}
        rehypePlugins={[
          rehypeRaw, // Parse raw HTML
          [rehypeSanitize, sanitizeSchema], // Sanitize for security (blocks XSS)
        ]}
        components={{
          a: ({
            href,
            children,
            ...rest
          }: React.ComponentProps<'a'>) => (
            <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
              {children}
            </a>
          ),
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
          span: (
            props: React.ComponentProps<'span'> & { node?: Element },
          ) => {
            const { node, children, ...rest } = props;

            if (node && isMentionNode(node)) {
              const username = String(node.properties?.dataMention ?? '');
              return <MentionToken username={username} />;
            }

            return <span {...rest}>{children}</span>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
