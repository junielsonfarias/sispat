import { useEffect, useRef, useCallback } from 'react'

const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']

/**
 * Custom hook to handle user inactivity timeout.
 * @param onTimeout - Callback function to execute when the user is inactive for the specified duration.
 * @param timeout - The inactivity timeout duration in milliseconds. Defaults to 30 minutes (1800000 ms).
 */
export const useInactivityTimeout = (
  onTimeout: () => void,
  timeout: number = 1800000,
) => {
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null)

  const resetTimer = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current)
    }
    timeoutIdRef.current = setTimeout(onTimeout, timeout)
  }, [onTimeout, timeout])

  const handleActivity = useCallback(() => {
    resetTimer()
  }, [resetTimer])

  useEffect(() => {
    events.forEach((event) => {
      window.addEventListener(event, handleActivity)
    })

    resetTimer()

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [resetTimer, handleActivity])
}
