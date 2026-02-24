import { Toaster as Sonner } from 'sonner';
import type { ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  return <Sonner className="toaster group" richColors {...props} />;
};

export { Toaster };
