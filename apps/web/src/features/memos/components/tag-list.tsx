import { buildTagTree } from '../utils';
import { TagTreeItem } from './tag-tree-item';

interface TagListProps {
  tagCounts: Record<string, number>;
  isLoading: boolean;
}

export const TagList = ({ tagCounts, isLoading }: TagListProps) => {
  const tagTree = buildTagTree(tagCounts);

  if (isLoading) return null;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold mb-2">Tags</h3>
      {tagTree.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tags yet</p>
      ) : (
        <ul className="space-y-2">
          {tagTree.map((node) => (
            <TagTreeItem key={node.fullPath} node={node} />
          ))}
        </ul>
      )}
    </div>
  );
};
