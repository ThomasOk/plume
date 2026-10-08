import { Textarea } from '@repo/ui/components/textarea';
import type { RefObject } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import type { MemoViewScope } from '../types';
import { TagSuggestions } from './tag-suggestions';
import { sounds } from '@/lib/sounds';

interface MemoTextareaProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  registerRef: (el: HTMLTextAreaElement | null) => void;
  fieldProps: Omit<UseFormRegisterReturn, 'ref'>;
  isPending: boolean;
  onSubmit: () => void;
  onInsert: (text: string, startIndex: number, length: number) => void;
  autoFocus?: boolean;
  placeholder?: string;
  errorMessage?: string;
  /** Whose tags to suggest; the scope on screen unless the memo lives elsewhere. */
  scope?: MemoViewScope;
}

export const MemoTextarea = ({
  textareaRef,
  registerRef,
  fieldProps,
  isPending,
  onSubmit,
  onInsert,
  autoFocus = false,
  placeholder,
  errorMessage,
  scope,
}: MemoTextareaProps) => {
  return (
    <div className="relative">
      <Textarea
        className="resize-none border-0 focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none p-0 shadow-none h-full"
        placeholder={placeholder}
        autoFocus={autoFocus}
        ref={(el) => {
          registerRef(el);
          textareaRef.current = el;
        }}
        {...fieldProps}
        disabled={isPending}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            sounds.click();
            onSubmit();
          }
        }}
      />
      <TagSuggestions editorRef={textareaRef} onInsert={onInsert} scope={scope} />
      {errorMessage && (
        <p className="text-sm text-destructive mt-1">{errorMessage}</p>
      )}
    </div>
  );
};
