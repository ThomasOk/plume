import { ChevronDownIcon } from '@radix-ui/react-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { IoEarthOutline } from 'react-icons/io5';
import { RiCheckLine, RiGroupLine, RiLockLine } from 'react-icons/ri';
import type { IconType } from 'react-icons';
import { sounds } from '@/lib/sounds';

/**
 * Who reads a memo, as one value: private, public, or one of the user's spaces. Visibility
 * and placement are one decision (ADR 0003), so there is no second picker to reconcile and
 * no combination to hide. A memo gets it from the scope it is written in; a move changes it.
 */
export type Audience =
  | { kind: 'private' }
  | { kind: 'public' }
  | { kind: 'space'; spaceId: string };

/** The audiences a personal memo chooses between: a space is reached by writing in it. */
export type PersonalAudience = Exclude<Audience, { kind: 'space' }>;

interface AudienceOption {
  audience: PersonalAudience;
  label: string;
  icon: IconType;
}

const personalOptions: Record<PersonalAudience['kind'], AudienceOption> = {
  private: { audience: { kind: 'private' }, label: 'Private', icon: RiLockLine },
  public: { audience: { kind: 'public' }, label: 'Public', icon: IoEarthOutline },
};

const triggerClassName =
  'inline-flex items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground min-w-0';

interface AudienceSelectorProps {
  value: PersonalAudience;
  onChange: (value: PersonalAudience) => void;
}

/** The audience of a personal memo: private or public. */
export const AudienceSelector = ({ value, onChange }: AudienceSelectorProps) => {
  const current = personalOptions[value.kind];
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
        {Object.values(personalOptions).map((option) => {
          const OptionIcon = option.icon;
          return (
            <DropdownMenuItem
              key={option.audience.kind}
              className="gap-2 cursor-pointer"
              onClick={() => { sounds.tick(); onChange(option.audience); }}
            >
              <OptionIcon className="size-4" />
              <span className="flex-1">{option.label}</span>
              {option.audience.kind === value.kind && <RiCheckLine className="size-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface SpaceAudienceProps {
  /** The space's title; until it has loaded, the label reads "Space". */
  title?: string;
}

/**
 * The audience of a memo in a space, shown rather than chosen: writing in a space writes
 * into it, an edit leaves a memo where it is, and leaving the space is a move.
 */
export const SpaceAudience = ({ title }: SpaceAudienceProps) => (
  <span className={triggerClassName}>
    <RiGroupLine className="size-4 shrink-0" />
    <span className="truncate max-w-40">{title ?? 'Space'}</span>
  </span>
);
