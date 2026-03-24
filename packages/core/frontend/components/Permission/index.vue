<template>
  <slot v-if="hasPermission" />
  <slot v-else name="fallback">
    <template v-if="showNoPermission">
      <el-tag type="info" size="small">无权限</el-tag>
    </template>
  </slot>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '../../runtime/stores/user'

interface Props {
  /** Required permission(s). Supports string or array of strings. */
  permission: string | string[]
  /** Show a 'no permission' indicator when user lacks permission. */
  showNoPermission?: boolean
  /** Logical operator: 'any' (OR) or 'all' (AND). Default: 'any' */
  mode?: 'any' | 'all'
}

const props = withDefaults(defineProps<Props>(), {
  showNoPermission: false,
  mode: 'any',
})

const userStore = useUserStore()

const hasPermission = computed(() => {
  if (!props.permission || (Array.isArray(props.permission) && props.permission.length === 0)) {
    return true
  }

  const permissions = Array.isArray(props.permission) ? props.permission : [props.permission]

  if (props.mode === 'all') {
    return permissions.every(p => userStore.hasPermission(p))
  }
  return permissions.some(p => userStore.hasPermission(p))
})
</script>
