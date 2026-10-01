import { ChevronDownIcon } from '@radix-ui/react-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Fragment } from 'react';
import { IoEarthOutline } from 'react-icons/io5';
import { RiCheckLine, RiGroupLine, RiLockLine } from 'react-icons/ri';
import type { Space } from '@/lib/types';
import type { IconType } from 'react-icons';
import { sounds } from '@/lib/sounds';

/**
 * Who a memo is written for, as one choice: private, public, or one of the user's spaces.
 * Visibility and placement are one decision (ADR 0003), so there is no second picker to
 * reconcile and no combination to hide.
 */
export type Audience =
  | { kind: 'private' }
  | { kind: 'public' }
  | { kind: 'space'; spaceId: string };

interface AudienceOption {
  audience: Audience;
  label: string;
  icon: IconType;
}

const personalOptions: AudienceOption[] = [
  { audience: { kind: 'private' }, label: 'Private', icon: RiLockLine },
  { audience: { kind: 'public' }, label: 'Public', icon: IoEarthOutline },
];

const isSame = (a: Audience, b: Audience) =>
  a.kind === b.kind && (a.kind !== 'space' || (b.kind === 'space' && a.spaceId === b.spaceId));

const triggerClassName =
  'inline-flex items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground min-w-0';

interface AudienceSelectorProps {
  value: Audience;
  onChange: (value: Audience) => void;
  /** The spaces offered after private and public: only those the user is a member of. */
  spaces?: Pick<Space, 'id' | 'title'>[];
}

export const AudienceSelector = ({ value, onChange, spaces = [] }: AudienceSelectorProps) => {
  const options: AudienceOption[] = [
    ...personalOptions,
    ...spaces.map((space) => ({
      audience: { kind: 'space' as const, spaceId: space.id },
      label: space.title,
      icon: RiGroupLine,
    })),
  ];
  // Before the spaces have loaded, a space audience has no title to show yet.
  const current = options.find((option) => isSame(option.audience, value)) ?? {
    audience: value,
    label: 'Space',
    icon: RiGroupLine,
  };
  const Icon = current.icon;

  return (
    <DropdownMenu onOpenChange={(open) => { if (open) sounds.pop(); }}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Audience: ${current.label}`}
          className={`${triggerClassName} hover:text-foreground transition-colors`}
        >
          <Icon className="size-4 shrink-0" />
          <span className="truncate max-w-40">{current.label}</span>
          <ChevronDownIcon className="size-3 opacity-60 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((option, index) => {
          const OptionIcon = option.icon;
          const key = option.audience.kind === 'space' ? option.audience.spaceId : option.audience.kind;
          return (
            <Fragment key={key}>
              {index === personalOptions.length && <DropdownMenuSeparator />}
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => { sounds.tick(); onChange(option.audience); }}
              >
                <OptionIcon className="size-4" />
                <span className="flex-1 truncate max-w-56">{option.label}</span>
                {isSame(option.audience, value) && <RiCheckLine className="size-4 text-primary" />}
              </DropdownMenuItem>
            </Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * The audience of a memo that is in a space, shown rather than chosen: an edit leaves a
 * memo where it is, and moving it out of its space is a separate operation.
 */
export const SpaceAudience = () => (
  <span className={triggerClassName}>
    <RiGroupLine className="size-4 shrink-0" />
    <span>Space</span>
  </span>
);
