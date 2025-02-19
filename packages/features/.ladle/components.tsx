import '@palladxyz/ui/dist/index.css'
import { useEffect } from 'react'
import {
  ActionType,
  GlobalProvider,
  ThemeState,
  useLadleContext
} from '@ladle/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@palladxyz/ui'

export const Provider: GlobalProvider = ({ children }) => {
  const { dispatch } = useLadleContext()
  useEffect(() => {
    dispatch({ type: ActionType.UpdateTheme, value: ThemeState.Dark })
  }, [])
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <MemoryRouter>
          <div
            style={{
              maxWidth: 400,
              width: '100%',
              maxHeight: 600,
              height: '100%',
              display: 'flex',
              overflowX: 'hidden',
              overflowY: 'scroll'
            }}
          >
            {children}
          </div>
        </MemoryRouter>
      </TooltipProvider>
    </ThemeProvider>
  )
}
