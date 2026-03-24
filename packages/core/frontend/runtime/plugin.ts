// XAdmin Vue 插件入口
import type { App, InjectionKey } from 'vue'
import { vPermission, vPermissionElse } from './directives/permission'

export interface XAdminPluginOptions {
  modules?: any[]
  frontend?: {
    moduleGlob?: string
  }
}

export const viewsMapKey: InjectionKey<Record<string, () => Promise<any>>> = Symbol('viewsMap')
export const activeModulesKey: InjectionKey<any[]> = Symbol('activeModules')

export function createXAdmin(options: XAdminPluginOptions = {}) {
  const views = import.meta.glob(options.frontend?.moduleGlob ?? '/packages/module-*/views/**/*.vue')

  return {
    modules: options.modules ?? [],
    install(app: App) {
      app.provide(viewsMapKey, views)
      app.provide(activeModulesKey, options.modules ?? [])

      // Register global directives
      app.directive('permission', vPermission)
      app.directive('permission-else', vPermissionElse)
    }
  }
}

export default createXAdmin()
