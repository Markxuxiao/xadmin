// apps/project-alpha 主入口
import { createXAdmin, registerModules } from '@xadmin/core'
import { manifest as userManifest } from '@xadmin/module-user'
import { manifest as orderManifest } from '@xadmin/module-order'

// 创建 XAdmin 实例
const xadmin = createXAdmin({
  modules: [userManifest, orderManifest],
  frontend: {
    moduleGlob: '/packages/module-*/views/**/*.vue'
  }
})

// 注册模块（后端）
registerModules(xadmin.modules)

console.log('[XAdmin] project-alpha initialized')

export { xadmin }
