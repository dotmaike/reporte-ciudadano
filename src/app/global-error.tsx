'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h1 style={{ color: '#1B4332' }}>¡Algo salió mal!</h1>
          <p>Ha ocurrido un error crítico en la aplicación.</p>
          <button
            onClick={reset}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#1B4332',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            Intentar nuevamente
          </button>
        </div>
      </body>
    </html>
  );
}
