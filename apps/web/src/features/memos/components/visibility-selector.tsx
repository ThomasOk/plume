import { ChevronDownIcon } from '@radix-ui/react-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { IoEarthOutline } from 'react-icons/io5';
import { RiCheckLine, RiGroupLine, RiLockLine } from 'react-icons/ri';
import type { Memo } from '@/lib/types';
import type { IconType } from 'react-icons';
import { sounds } from '@/lib/sounds';

interface VisibilitySelectorProps {
  value: Memo['visibility'];
  onChange: (value: SelectableVisibility) => void;
}

// A memo in a space is displayed, never chosen here: naming a space is a different
// decision from picking between private and public, and it is not offered yet.
const visibilities = {
  private: { label: 'Private', icon: RiLockLine },
  public: { label: 'Public', icon: IoEarthOutline },
  space: { label: 'Space', icon: RiGroupLine },
} satisfies Record<Memo['visibility'], { label: string; icon: IconType }>;

const selectableVisibilities = ['private', 'public'] as const;

export type SelectableVisibility = (typeof selectableVisibilities)[number];

export const VisibilitySelector = ({
  value,
  onChange,
}: VisibilitySelectorProps) => {
  const current = visibilities[value];
  const Icon = current.icon;

  return (
    <DropdownMenu onOpenChange={(open) => { if (open) sounds.pop(); }}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-2 py-1 text-sm
  text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon className="size-4" />
          <span>{current.label}</span>
          <ChevronDownIcon className="size-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {selectableVisibilities.map((option) => {
          const OptionIcon = visibilities[option].icon;
          return (
            <DropdownMenuItem
              key={option}
              className="gap-2 cursor-pointer"
              onClick={() => { sounds.tick(); onChange(option); }}
            >
              <OptionIcon className="size-4" />
              <span className="flex-1">{visibilities[option].label}</span>
              {value === option && (
                <RiCheckLine
                  className="size-4
  text-primary"
                />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
