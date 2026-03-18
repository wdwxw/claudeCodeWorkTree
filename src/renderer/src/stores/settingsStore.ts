import { create } from 'zustand'
import type { ExternalApp } from '../types'

interface SettingsState {
  lastExternalApp: string
  externalApps: ExternalApp[]
  showSettings: boolean

  loadSettings: () => Promise<void>
  setLastExternalApp: (appId: string) => Promise<void>
  setExternalApps: (apps: ExternalApp[]) => Promise<void>
  toggleSettings: () => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  lastExternalApp: 'vscode',
  externalApps: [],
  showSettings: false,

  loadSettings: async () => {
    const lastApp = (await window.api.store.get('lastExternalApp')) as string | undefined
    const apps = (await window.api.store.get('externalApps')) as ExternalApp[] | undefined
    if (lastApp) set({ lastExternalApp: lastApp })
    if (apps && apps.length > 0) {
      set({ externalApps: apps })
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

  toggleSettings: () => {
    const { showSettings } = get()
    set({ showSettings: !showSettings })
  }
}))
