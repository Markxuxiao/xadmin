// XAdmin 后端插件注册入口
import type { IModuleManifest } from './IModuleManifest'

export function registerModules(modules: IModuleManifest[]) {
  // TODO: 注册 entities 到 MikroORM
  // TODO: 注册菜单到全局 store
  console.log('[XAdmin] Registered modules:', modules.map(m => m.name))
}

export type { IModuleManifest } from './IModuleManifest'
