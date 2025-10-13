import React, { useState, useEffect, useRef } from 'react'
import { Skeleton } from './skeleton'
import { cn } from '@/lib/utils'

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  fallback?: string
  aspectRatio?: number
  containerClassName?: string
  skeletonClassName?: string
  onLoad?: () => void
  onError?: () => void
}

/**
 * Componente de imagem com lazy loading
 * 
 * Features:
 * - Intersection Observer para carregar apenas quando visível
 * - Placeholder com skeleton
 * - Fallback para imagens quebradas
 * - Blur-up effect
 * - Aspect ratio preservado
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  fallback = '/placeholder-image.png',
  aspectRatio,
  className,
  containerClassName,
  skeletonClassName,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Intersection Observer para lazy loading
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '50px', // Começar a carregar 50px antes de entrar na tela
        threshold: 0.01,
      }
    )

    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [])

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    setIsLoading(false)
    onError?.()
  }

  const aspectRatioStyle = aspectRatio
    ? { paddingBottom: `${(1 / aspectRatio) * 100}%` }
    : {}

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden bg-muted', containerClassName)}
      style={aspectRatioStyle}
    >
      {/* Skeleton enquanto carrega */}
      {isLoading && (
        <Skeleton
          className={cn(
            'absolute inset-0 w-full h-full',
            skeletonClassName
          )}
        />
      )}

      {/* Imagem */}
      {isInView && (
        <img
          ref={imgRef}
          src={hasError ? fallback : src}
          alt={alt}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            aspectRatio ? 'absolute inset-0 w-full h-full object-cover' : '',
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy" // Native lazy loading como fallback
          {...props}
        />
      )}
    </div>
  )
}

/**
 * Componente de imagem de fundo com lazy loading
 */
interface LazyBackgroundImageProps {
  src: string
  fallback?: string
  className?: string
  children?: React.ReactNode
}

export const LazyBackgroundImage: React.FC<LazyBackgroundImageProps> = ({
  src,
  fallback = '/placeholder-image.png',
  className,
  children,
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [imageSrc, setImageSrc] = useState<string>('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Intersection Observer
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '50px',
        threshold: 0.01,
      }
    )

    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [])

  // Carregar imagem
  useEffect(() => {
    if (!isInView) return

    const img = new Image()
    img.src = src
    img.onload = () => {
      setImageSrc(src)
      setIsLoading(false)
    }
    img.onerror = () => {
      setImageSrc(fallback)
      setHasError(true)
      setIsLoading(false)
    }
  }, [isInView, src, fallback])

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative bg-muted transition-all duration-300',
        className
      )}
      style={{
        backgroundImage: imageSrc ? `url(${imageSrc})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {isLoading && (
        <div className="absolute inset-0">
          <Skeleton className="w-full h-full" />
        </div>
      )}
      {children}
    </div>
  )
}

/**
 * Hook para pré-carregar imagens
 */
export function usePreloadImages(urls: string[]): boolean {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let loadedCount = 0

    urls.forEach((url) => {
      const img = new Image()
      img.src = url
      img.onload = () => {
        loadedCount++
        if (loadedCount === urls.length) {
          setIsLoaded(true)
        }
      }
      img.onerror = () => {
        loadedCount++
        if (loadedCount === urls.length) {
          setIsLoaded(true)
        }
      }
    })
  }, [urls])

  return isLoaded
}

/**
 * Componente de galeria com lazy loading
 */
interface LazyImageGalleryProps {
  images: Array<{ src: string; alt: string; id: string }>
  columns?: number
  gap?: number
  aspectRatio?: number
  onImageClick?: (image: { src: string; alt: string; id: string }) => void
}

export const LazyImageGallery: React.FC<LazyImageGalleryProps> = ({
  images,
  columns = 3,
  gap = 4,
  aspectRatio = 1,
  onImageClick,
}) => {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap * 0.25}rem`,
      }}
    >
      {images.map((image) => (
        <div
          key={image.id}
          onClick={() => onImageClick?.(image)}
          className={cn(
            'cursor-pointer transition-transform hover:scale-105',
            onImageClick && 'cursor-pointer'
          )}
        >
          <LazyImage
            src={image.src}
            alt={image.alt}
            aspectRatio={aspectRatio}
            className="rounded-lg"
          />
        </div>
      ))}
    </div>
  )
}

/**
 * Exemplo de uso:
 * 
 * // Imagem simples
 * <LazyImage 
 *   src="/uploads/patrimonio/foto1.jpg"
 *   alt="Patrimônio 001"
 *   aspectRatio={16/9}
 *   className="rounded-lg"
 * />
 * 
 * // Background
 * <LazyBackgroundImage 
 *   src="/uploads/bg.jpg"
 *   className="h-64 rounded-lg"
 * >
 *   <div className="p-6">Conteúdo</div>
 * </LazyBackgroundImage>
 * 
 * // Galeria
 * <LazyImageGallery
 *   images={fotos}
 *   columns={3}
 *   aspectRatio={1}
 *   onImageClick={(img) => openLightbox(img)}
 * />
 */
