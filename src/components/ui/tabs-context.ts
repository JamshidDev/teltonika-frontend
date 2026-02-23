import type { InjectionKey, Ref } from 'vue'

export interface TabsContext {
  activeTab: Ref<string>
  setActiveTab: (value: string) => void
}

export const TabsContextKey: InjectionKey<TabsContext> = Symbol('TabsContext')
