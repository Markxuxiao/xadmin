import type { Directive, DirectiveBinding } from 'vue'
import { useUserStore } from '../stores/user'

/**
 * v-permission directive
 *
 * Usage:
 *   <button v-permission="'user:create'">Create User</button>
 *   <div v-permission="['user:edit', 'user:delete']">Edit/Delete actions</div>
 *
 * The element is hidden if the user does not have ANY of the specified permissions.
 */
export const vPermission: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    const userStore = useUserStore()
    const requiredPermissions = binding.value

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return
    }

    const checkPermission = () => {
      const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions]
      const hasPermission = permissions.some(p => userStore.hasPermission(p))

      if (!hasPermission) {
        el.style.display = 'none'
      } else {
        el.style.display = ''
      }
    }

    // Initial check
    checkPermission()

    // Watch for user info changes (e.g., after login/logout)
    // The directive will be re-evaluated when userInfo changes
    // We rely on the store's reactivity for updates
  },

  updated(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    const userStore = useUserStore()
    const requiredPermissions = binding.value

    if (!requiredPermissions || requiredPermissions.length === 0) {
      el.style.display = ''
      return
    }

    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions]
    const hasPermission = permissions.some(p => userStore.hasPermission(p))

    if (!hasPermission) {
      el.style.display = 'none'
    } else {
      el.style.display = ''
    }
  },
}

/**
 * v-permission-else directive (show alternative when no permission)
 *
 * Usage:
 *   <button v-permission-else="'user:create'" @click="showNoPermissionMessage">
 *     No Permission
 *   </button>
 */
export const vPermissionElse: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    const userStore = useUserStore()
    const requiredPermissions = binding.value

    if (!requiredPermissions || requiredPermissions.length === 0) {
      el.style.display = 'none'
      return
    }

    const checkPermission = () => {
      const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions]
      const hasPermission = permissions.some(p => userStore.hasPermission(p))

      // Show the element only when user DOES NOT have permission
      el.style.display = hasPermission ? 'none' : ''
    }

    checkPermission()
  },

  updated(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    const userStore = useUserStore()
    const requiredPermissions = binding.value

    if (!requiredPermissions || requiredPermissions.length === 0) {
      el.style.display = 'none'
      return
    }

    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions]
    const hasPermission = permissions.some(p => userStore.hasPermission(p))
    el.style.display = hasPermission ? 'none' : ''
  },
}
