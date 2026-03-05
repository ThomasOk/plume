import { ChevronDownIcon } from '@radix-ui/react-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { IoEarthOutline } from 'react-icons/io5';
import { RiCheckLine, RiLockLine } from 'react-icons/ri';

interface VisibilitySelectorProps {
  value: 'public' | 'private';
  onChange: (value: 'public' | 'private') => void;
}

const options = [
  { value: 'private' as const, label: 'Private', icon: RiLockLine },
  { value: 'public' as const, label: 'Public', icon: IoEarthOutline },
];

export const VisibilitySelector = ({
  value,
  onChange,
}: VisibilitySelectorProps) => {
  const current = options.find((o) => o.value === value)!;
  const Icon = current.icon;

  return (
    <DropdownMenu>
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
        {options.map((option) => {
          const OptionIcon = option.icon;
          return (
            <DropdownMenuItem
              key={option.value}
              className="gap-2 cursor-pointer"
              onClick={() => onChange(option.value)}
            >
              <OptionIcon className="size-4" />
              <span className="flex-1">{option.label}</span>
              {value === option.value && (
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
