<template>
  <div class="error-page">
    <el-result
      :icon="iconType"
      :title="title"
      :sub-title="subTitle"
    >
      <template #extra>
        <el-button type="primary" @click="goHome">返回首页</el-button>
        <el-button @click="goBack">返回上一页</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

interface Props {
  type?: '403' | '404' | '500'
  title?: string
  subTitle?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: '404'
})

const router = useRouter()

const iconType = computed(() => {
  switch (props.type) {
    case '403': return 'warning'
    case '404': return 'error'
    case '500': return 'warning'
    default: return 'error'
  }
})

const title = computed(() => props.title || (props.type === '403' ? '403 Forbidden' : props.type === '500' ? '500 Internal Server Error' : '404 Not Found'))
const subTitle = computed(() => props.subTitle || (props.type === '403' ? '您没有权限访问此页面' : props.type === '500' ? '服务异常，请稍后重试' : '页面不存在'))

function goHome() {
  router.push('/dashboard')
}

function goBack() {
  router.back()
}
</script>

<style scoped>
.error-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f5f7fa;
}
</style>
