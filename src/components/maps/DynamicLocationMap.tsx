'use client';

import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const LocationMap = dynamic(() => import('./LocationMap').then((mod) => mod.LocationMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[200px] w-full items-center justify-center rounded-md border bg-muted/50">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface DynamicLocationMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
}

export function DynamicLocationMap(props: DynamicLocationMapProps) {
  return <LocationMap {...props} />;
}
