'use client';

import { useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LoadingImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'alt'> {
  alt: string;
  fallback?: React.ReactNode;
}

export function LoadingImage({ className, alt, fallback, ...props }: LoadingImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  if (status === 'error' && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="relative">
      {status === 'loading' && <Skeleton className={cn('absolute inset-0', className)} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={cn(
          'transition-opacity duration-300',
          status === 'loading' ? 'opacity-0' : 'opacity-100',
          className,
        )}
        alt={alt}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        {...props}
      />
    </div>
  );
}
