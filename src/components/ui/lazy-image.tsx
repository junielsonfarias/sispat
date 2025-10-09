import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  fallback?: string
  skeleton?: boolean
  skeletonClassName?: string
}

/**
 * Componente de imagem com lazy loading e skeleton loader
 */
export function LazyImage({
  src,
  alt,
  fallback = '/placeholder.svg',
  skeleton = true,
  skeletonClassName,
  className,
  ...props
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    setIsLoading(true)
    setHasError(false)
    setImageSrc(null)

    // IntersectionObserver para lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '50px', // Carregar 50px antes de entrar na tela
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [src])

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
    setImageSrc(fallback)
  }

  return (
    <div className="relative">
      {isLoading && skeleton && (
        <Skeleton className={cn('absolute inset-0', skeletonClassName)} />
      )}
      <img
        ref={imgRef}
        src={imageSrc || fallback}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        {...props}
      />
    </div>
  )
}

