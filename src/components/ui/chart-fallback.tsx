/* Fallback component for charts when recharts fails to load */
import React from 'react';
import { Alert, AlertDescription } from './alert';
import { AlertTriangle } from 'lucide-react';

interface ChartFallbackProps {
  error?: Error;
  children?: React.ReactNode;
}

export const ChartFallback: React.FC<ChartFallbackProps> = ({
  error,
  children,
}) => {
  return (
    <div className='flex items-center justify-center h-[300px] w-full border border-dashed border-muted-foreground/25 rounded-lg'>
      <Alert className='max-w-md'>
        <AlertTriangle className='h-4 w-4' />
        <AlertDescription>
          {error ? (
            <>
              Erro ao carregar gráfico: {error.message}
              <br />
              <small className='text-muted-foreground'>
                Recarregue a página para tentar novamente.
              </small>
            </>
          ) : (
            <>
              Gráfico temporariamente indisponível.
              <br />
              <small className='text-muted-foreground'>
                Recarregue a página para tentar novamente.
              </small>
            </>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ChartFallback;
