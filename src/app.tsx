import { createBrowserRouter, Outlet } from 'react-router'
import { AppSidebar } from './components/app-sidebar'
import {
  BetterScrollAreaContent,
  BetterScrollAreaProvider,
} from './components/ui/better-scroll-area'
import { Button } from './components/ui/button'
import { HomePage } from './features/home-page'

export const appRouter = createBrowserRouter([
  {
    path: '/',
    errorElement: (
      <div className="flex size-full flex-col items-center justify-center gap-4">
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold">Error</h1>
          <p className="text-muted-foreground text-sm">
            An error occurred while loading the page.
          </p>
        </div>

        <Button onClick={() => window.location.assign('/')}>
          Restart Application
        </Button>
      </div>
    ),
    element: (
      <div className="grid h-screen w-screen grid-cols-[auto_1fr] overflow-hidden">
        <AppSidebar />

        <BetterScrollAreaProvider>
          <BetterScrollAreaContent>
            <div className="p-6 pt-4 pb-8">
              <Outlet />
            </div>
          </BetterScrollAreaContent>
        </BetterScrollAreaProvider>
      </div>
    ),

    children: [
      {
        index: true,
        element: <HomePage />,
      },
    ],
  },
])
