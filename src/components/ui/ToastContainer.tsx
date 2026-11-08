import { CheckCircle2, Info } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';

export function ToastContainer() {
  const { toasts } = useLibrary();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="liquid-glass-elevated flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-medium text-white animate-fade-slide"
        >
          {toast.tone === 'warning' ? (
            <Info className="h-4 w-4 text-white/75 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-white/90 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      ))}
    </div>
  );
}

