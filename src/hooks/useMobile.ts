/**
 * Hook para detectar dispositivos móveis e otimizações
 * 
 * Este hook fornece funcionalidades para detectar dispositivos móveis
 * e aplicar otimizações específicas para mobile
 */

import { useState, useEffect } from 'react'

interface MobileInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  screenWidth: number
  screenHeight: number
  orientation: 'portrait' | 'landscape'
  touchDevice: boolean
  userAgent: string
}

export const useMobile = (): MobileInfo => {
  const [mobileInfo, setMobileInfo] = useState<MobileInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: 0,
    screenHeight: 0,
    orientation: 'landscape',
    touchDevice: false,
    userAgent: ''
  })

  useEffect(() => {
    const updateMobileInfo = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const userAgent = navigator.userAgent

      // Detectar dispositivo móvel
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || width < 768
      const isTablet = /iPad|Android/i.test(userAgent) && width >= 768 && width < 1024
      const isDesktop = !isMobile && !isTablet

      // Detectar orientação
      const orientation = height > width ? 'portrait' : 'landscape'

      // Detectar dispositivo touch
      const touchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

      setMobileInfo({
        isMobile,
        isTablet,
        isDesktop,
        screenWidth: width,
        screenHeight: height,
        orientation,
        touchDevice,
        userAgent
      })
    }

    // Atualizar na montagem
    updateMobileInfo()

    // Atualizar no resize
    window.addEventListener('resize', updateMobileInfo)
    window.addEventListener('orientationchange', updateMobileInfo)

    return () => {
      window.removeEventListener('resize', updateMobileInfo)
      window.removeEventListener('orientationchange', updateMobileInfo)
    }
  }, [])

  return mobileInfo
}

export default useMobile
