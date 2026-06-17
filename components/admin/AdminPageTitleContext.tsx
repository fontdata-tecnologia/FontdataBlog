'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

type PageTitleState = {
  title: string
  subtitle?: ReactNode
}

type AdminPageTitleContextValue = {
  state: PageTitleState
  setTitle: (title: string, subtitle?: ReactNode) => void
  resetTitle: () => void
}

const AdminPageTitleContext = createContext<AdminPageTitleContextValue | null>(null)

export function AdminPageTitleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PageTitleState>({ title: '' })

  const setTitle = useCallback((title: string, subtitle?: ReactNode) => {
    setState({ title, subtitle })
  }, [])

  const resetTitle = useCallback(() => {
    setState({ title: '' })
  }, [])

  return (
    <AdminPageTitleContext.Provider value={{ state, setTitle, resetTitle }}>
      {children}
    </AdminPageTitleContext.Provider>
  )
}

/** Consumes the current page title state — used by AdminTopBar */
export function usePageTitleValue() {
  const ctx = useContext(AdminPageTitleContext)
  if (!ctx) throw new Error('usePageTitleValue must be used inside AdminPageTitleProvider')
  return ctx.state
}

/**
 * Sets the page title (and optional subtitle) from a Client page component.
 * Subtitle can be a string or ReactNode — when it is a primitive string it
 * updates whenever its value changes. Cleans up (resets) on unmount.
 */
export function usePageTitle(title: string, subtitle?: ReactNode) {
  const ctx = useContext(AdminPageTitleContext)
  if (!ctx) throw new Error('usePageTitle must be used inside AdminPageTitleProvider')
  const { setTitle, resetTitle } = ctx

  // Serialise subtitle to a stable dep when it is a plain string; for ReactNode
  // we skip it in deps to avoid React warnings about non-serialisable values.
  const subtitleDep = typeof subtitle === 'string' ? subtitle : undefined

  useEffect(() => {
    setTitle(title, subtitle)
    return () => {
      resetTitle()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, subtitleDep])
}
