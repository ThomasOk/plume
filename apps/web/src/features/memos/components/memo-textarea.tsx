import { Textarea } from '@repo/ui/components/textarea';
import type { RefObject } from 'react';
import { sounds } from '@/lib/sounds';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { TagSuggestions } from './tag-suggestions';

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
      <TagSuggestions editorRef={textareaRef} onInsert={onInsert} />
      {errorMessage && (
        <p className="text-sm text-destructive mt-1">{errorMessage}</p>
      )}
    </div>
  );
};
