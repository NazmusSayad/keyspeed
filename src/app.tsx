import { createBrowserRouter, Navigate, Outlet } from 'react-router'
import { AppSidebar } from './components/app-sidebar'
import {
  BetterScrollAreaContent,
  BetterScrollAreaProvider,
} from './components/ui/better-scroll-area'
import { Button } from './components/ui/button'
import { HistoryPage } from './features/history/history-page'
import { LargeLanguageModelsProvider } from './features/models/contexts/large-language-models-context'
import { WhisperModelsProvider } from './features/models/contexts/whisper-models-context'
import { ModelsPage } from './features/models/models-page'
import { NoProfilePage } from './features/profile/no-profile-page'
import { ProfileView } from './features/profile/profile-page'
import { SettingsPage } from './features/settings/settings-page'
import { TestPage } from './features/tests/test-page'
import { useConfigStore } from './store/config-store'

const firstProfileId = useConfigStore.getState().profiles[0]?.id

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
      <div className="grid size-full grid-cols-[auto_1fr] overflow-hidden">
        <AppSidebar />

        <BetterScrollAreaProvider>
          <BetterScrollAreaContent>
            <LargeLanguageModelsProvider>
              <WhisperModelsProvider>
                <div className="p-6 pt-4 pb-8">
                  <Outlet />
                </div>
              </WhisperModelsProvider>
            </LargeLanguageModelsProvider>
          </BetterScrollAreaContent>
        </BetterScrollAreaProvider>
      </div>
    ),

    children: [
      {
        index: true,
        element: (
          <Navigate
            replace
            to={firstProfileId ? `/profile/${firstProfileId}` : '/profile/none'}
          />
        ),
      },

      {
        path: 'profile/none',
        element: <NoProfilePage />,
      },

      {
        path: 'profile/:profileId',
        element: <ProfileView />,
      },

      {
        path: 'tests',
        element: <TestPage />,
      },

      {
        path: 'models',
        element: <ModelsPage />,
      },

      {
        path: 'history',
        element: <HistoryPage />,
      },

      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
])
