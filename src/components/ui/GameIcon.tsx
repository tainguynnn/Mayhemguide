import { useEffect, useState } from 'react';
import { cn } from '../../utils/formatters';

interface GameIconProps {
  src?: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  monogram?: string;
  loading?: 'lazy' | 'eager';
}

export function GameIcon({
  src,
  fallbackSrc,
  alt,
  className,
  imgClassName,
  monogram,
  loading = 'eager',
}: GameIconProps) {
  const [phase, setPhase] = useState<'primary' | 'fallback' | 'broken'>(
    src ? 'primary' : fallbackSrc ? 'fallback' : 'broken'
  );

  useEffect(() => {
    setPhase(src ? 'primary' : fallbackSrc ? 'fallback' : 'broken');
  }, [src, fallbackSrc]);

  const currentSrc = phase === 'primary' ? src : phase === 'fallback' ? fallbackSrc : undefined;
  const initials = (monogram || alt || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  if (!currentSrc || phase === 'broken') {
    return (
      <div
        title={alt}
        className={cn(
          'flex items-center justify-center bg-white/[0.06] text-white/65 border border-white/10 font-mono-num text-[11px] font-semibold select-none shrink-0',
          className
        )}
      >
        {initials || '?'}
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden bg-white/[0.04] shrink-0', className)}>
      <img
        src={currentSrc}
        alt={alt}
        loading={loading}
        decoding="async"
        onError={() => {
          if (phase === 'primary' && fallbackSrc && fallbackSrc !== src) {
            setPhase('fallback');
          } else {
            setPhase('broken');
          }
        }}
        className={cn('h-full w-full object-cover', imgClassName)}
      />
    </div>
  );
}
