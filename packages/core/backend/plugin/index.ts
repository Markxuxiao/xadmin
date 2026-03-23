// XAdmin 后端插件注册入口
import type { IModuleManifest, MenuItem, Type } from './IModuleManifest'

// Global registry for module data
const _registeredEntities: Map<string, Type<any>> = new Map()
const _registeredMenus: Map<string, MenuItem[]> = new Map()

export function registerModules(modules: IModuleManifest[]) {
  for (const mod of modules) {
    // Register entities (future: MikroORM integration)
    for (const entity of mod.entities) {
      _registeredEntities.set(`${mod.name}:${entity.name}`, entity)
    }
    // Register menu items
    if (mod.menuItems?.length) {
      _registeredMenus.set(mod.name, mod.menuItems)
    }
    console.log(`[XAdmin] Registered module: ${mod.name} (${mod.version})`)
  }
}

// Accessors for app layer to consume registered data
export function getRegisteredEntities(): Map<string, Type<any>> {
  return _registeredEntities
}

export function getRegisteredMenus(): Map<string, MenuItem[]> {
  return _registeredMenus
}

export type { IModuleManifest } from './IModuleManifest'
export type { MenuItem } from './IModuleManifest'
