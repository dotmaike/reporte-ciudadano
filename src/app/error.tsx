'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <AlertTriangle className="h-16 w-16 text-status-error" />
          </div>
          <CardTitle className="text-2xl">¡Algo salió mal!</CardTitle>
          <CardDescription>
            Ha ocurrido un error inesperado. Por favor, intenta recargar la página.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.message && (
            <div className="rounded-md bg-muted p-3">
              <p className="break-words font-mono text-sm text-muted-foreground">{error.message}</p>
            </div>
          )}
          <Button
            onClick={reset}
            className="w-full bg-municipality-green hover:bg-municipality-green/90"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Intentar nuevamente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
