import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';
import React, { useState } from 'react';

interface OptimizedImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  size?: 'small' | 'medium' | 'large' | 'print' | 'label';
  aspectRatio?: 'video' | 'square' | 'portrait' | 'auto';
  showFallback?: boolean;
}

const sizeClasses = {
  small: 'max-w-24 max-h-24',
  medium: 'max-w-48 max-h-48',
  large: 'max-w-96 max-h-96',
  print: 'max-w-full max-h-40', // Para fichas impressas
  label: 'max-w-16 max-h-16', // Para etiquetas
};

const aspectRatioClasses = {
  video: 'aspect-video',
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  auto: '',
};

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  fallbackSrc = 'https://img.usecurling.com/p/400/300?q=image%20not%20found',
  size = 'medium',
  aspectRatio = 'auto',
  showFallback = true,
  className,
  onError,
  ...props
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImageError(true);
    setIsLoading(false);
    if (onError) {
      onError(e);
    } else if (fallbackSrc && !imageError) {
      e.currentTarget.src = fallbackSrc;
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    setImageError(false);
  };

  if (imageError && showFallback) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted rounded-lg',
          sizeClasses[size],
          aspectRatioClasses[aspectRatio],
          className
        )}
      >
        <div className='text-center text-muted-foreground'>
          <ImageIcon className='mx-auto h-8 w-8 mb-2' />
          <p className='text-xs'>Imagem não disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg',
        aspectRatioClasses[aspectRatio],
        className
      )}
    >
      {isLoading && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-muted animate-pulse',
            sizeClasses[size]
          )}
        >
          <div className='text-center text-muted-foreground'>
            <div className='h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-1' />
            <p className='text-xs'>Carregando...</p>
          </div>
        </div>
      )}

      <img
        src={src}
        alt={alt}
        onError={handleError}
        onLoad={handleLoad}
        className={cn(
          'object-contain w-full h-full transition-opacity duration-200',
          sizeClasses[size],
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        {...props}
      />
    </div>
  );
};

// Componente específico para imagens em impressão
export const PrintImage: React.FC<OptimizedImageProps> = props => (
  <OptimizedImage
    {...props}
    size='print'
    aspectRatio='auto'
    className={cn('border bg-gray-100', props.className)}
  />
);

// Componente específico para imagens em etiquetas
export const LabelImage: React.FC<OptimizedImageProps> = props => (
  <OptimizedImage
    {...props}
    size='label'
    aspectRatio='square'
    className={cn('border-2 border-gray-300', props.className)}
  />
);
