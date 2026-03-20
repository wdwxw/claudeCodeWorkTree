import { create } from 'zustand'
import type { ExternalApp, QuickButton } from '../types'

type Theme = 'dazi' | 'brown'

interface SettingsState {
  lastExternalApp: string
  externalApps: ExternalApp[]
  quickButtons: QuickButton[]
  showSettings: boolean
  theme: Theme

  loadSettings: () => Promise<void>
  setLastExternalApp: (appId: string) => Promise<void>
  setExternalApps: (apps: ExternalApp[]) => Promise<void>
  setQuickButtons: (buttons: QuickButton[]) => Promise<void>
  setTheme: (theme: Theme) => Promise<void>
  toggleSettings: () => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  lastExternalApp: 'vscode',
  externalApps: [],
  quickButtons: [],
  showSettings: false,
  theme: 'dazi',

  loadSettings: async () => {
    const lastApp = (await window.api.store.get('lastExternalApp')) as string | undefined
    const apps = (await window.api.store.get('externalApps')) as ExternalApp[] | undefined
    const buttons = (await window.api.store.get('quickButtons')) as QuickButton[] | undefined
    const theme = (await window.api.store.get('theme')) as Theme | undefined
    if (lastApp) set({ lastExternalApp: lastApp })
    if (apps && apps.length > 0) {
      set({ externalApps: apps })
    }
    if (buttons) {
      set({ quickButtons: buttons })
    }
    if (theme) {
      set({ theme })
    }
  },

  setLastExternalApp: async (appId) => {
    set({ lastExternalApp: appId })
    await window.api.store.set('lastExternalApp', appId)
  },

  setExternalApps: async (apps) => {
    set({ externalApps: apps })
    await window.api.store.set('externalApps', apps)
  },

  setQuickButtons: async (buttons) => {
    set({ quickButtons: buttons })
    await window.api.store.set('quickButtons', buttons)
  },

  setTheme: async (theme) => {
    set({ theme })
    await window.api.store.set('theme', theme)
  },

  toggleSettings: () => {
    const { showSettings } = get()
    set({ showSettings: !showSettings })
  }
}))
