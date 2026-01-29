import { useMemo, useState } from 'react';
import hljs from 'highlight.js';
import { CheckIcon, CopyIcon } from '@radix-ui/react-icons';
import './code-block.css';
import './highlight-themes.css';

interface CodeBlockProps {
  children?: React.ReactNode;
  className?: string;
  inline?: boolean;
}

export const CodeBlock = ({ children, className, inline }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  // Inline code doesn't need syntax highlighting
  if (inline) {
    return <code className={className}>{children}</code>;
  }

  // Extract language from className (format: "language-javascript")
  const languageMatch = className?.match(/language-(\w+)/);
  const language = languageMatch ? languageMatch[1] : '';
  const languageDisplay = language ? language.toUpperCase() : '';

  // Get code content as string
  const codeContent = String(children).replace(/\n$/, '');

  // Copy code to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeContent);
      setCopied(true);
      // Reset after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  // Apply syntax highlighting with highlight.js
  const highlightedCode = useMemo(() => {
    if (!language) {
      // No language specified - just escape HTML entities
      return Object.assign(document.createElement('span'), {
        textContent: codeContent,
      }).innerHTML;
    }

    try {
      // Check if language is supported
      const lang = hljs.getLanguage(language);
      if (lang) {
        // Highlight with the specified language
        return hljs.highlight(codeContent, { language }).value;
      }
    } catch (error) {
      // If highlighting fails, fall through to default
      console.warn(`Failed to highlight language: ${language}`, error);
    }

    // Fallback: escape HTML entities
    return Object.assign(document.createElement('span'), {
      textContent: codeContent,
    }).innerHTML;
  }, [language, codeContent]);

  // Code block with syntax highlighting
  return (
    <div className="not-prose markdown-code-block">
      <div className="code-language-badge">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {languageDisplay || 'TEXT'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="copy-button"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <CheckIcon className="h-4 w-4" />
              <span className="text-xs">Copied</span>
            </>
          ) : (
            <>
              <CopyIcon className="h-4 w-4" />
              <span className="text-xs">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre>
        <code
          className={`hljs language-${language}`}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </pre>
    </div>
  );
};
