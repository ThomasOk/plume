interface MentionTokenProps {
  username: string;
}

export const MentionToken = ({ username }: MentionTokenProps) => (
  <span className="text-primary font-medium cursor-default">@{username}</span>
);
