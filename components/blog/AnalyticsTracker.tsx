'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function AnalyticsTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const track = async () => {
      try {
        await fetch('/api/track', {
          method: 'POST',
          // keepalive: o request sobrevive ao fechamento da aba / navegação
          // completa — sem isso, bounces rápidos eram sistematicamente perdidos
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: pathname,
            referrer: document.referrer || null,
          }),
        })
      } catch {}
    }

    const timeout = setTimeout(track, 300)
    return () => clearTimeout(timeout)
  }, [pathname])

  return null
}
