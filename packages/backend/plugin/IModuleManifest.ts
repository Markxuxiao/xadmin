// XAdmin 模块清单接口

export interface IModuleManifest {
  name: string              // 模块名，如 'module-order'
  version: string
  entities: Type<any>[]     // 该模块的 MikroORM Entity
  menuItems?: MenuItem[]    // 静态菜单配置（可选）
  seedData?: SeedData[]     // 初始化数据
}

export interface MenuItem {
  path: string
  title: string
  icon?: string
  children?: MenuItem[]
  meta?: { permission?: string }
}

export interface SeedData {
  // TODO: 定义 seed 数据结构
}

export type Type<T = any> = new (...args: any[]) => T
