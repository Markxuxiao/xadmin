import { Injectable } from '@nestjs/common'

interface MenuItem {
  path: string
  title: string
  icon?: string
  children?: MenuItem[]
  meta?: { permission?: string }
}

@Injectable()
export class AppService {
  getMenuTree(): MenuItem[] {
    return [
      {
        path: '/dashboard',
        title: '首页',
        icon: 'HomeFilled',
      },
      {
        path: '/system',
        title: '系统管理',
        icon: 'Setting',
        children: [
          { path: '/system/user', title: '用户管理', icon: 'User', meta: { permission: 'user:list' } },
          { path: '/system/role', title: '角色管理', icon: 'UserFilled', meta: { permission: 'role:list' } },
        ],
      },
      {
        path: '/order',
        title: '订单管理',
        icon: 'Document',
        children: [
          { path: '/order/list', title: '订单列表', meta: { permission: 'order:list' } },
        ],
      },
    ]
  }
}
