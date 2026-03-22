<template>
  <div class="x-table">
    <!-- 工具栏 -->
    <div class="x-table__toolbar" v-if="$slots.toolbar">
      <slot name="toolbar" />
    </div>

    <!-- 过滤器 -->
    <div class="x-table__filter" v-if="$slots.filter">
      <slot name="filter" />
    </div>

    <!-- 表格或骨架屏 -->
    <div class="x-table__body">
      <template v-if="loading">
        <el-skeleton :rows="skeletonRows" animated />
      </template>

      <template v-else-if="error">
        <div class="x-table__error">
          <el-icon size="40"><CircleCloseFilled /></el-icon>
          <p>加载失败</p>
          <el-button type="primary" size="small" @click="$emit('reload')">重试</el-button>
        </div>
      </template>

      <template v-else-if="empty">
        <div class="x-table__empty">
          <el-empty :description="emptyText" />
        </div>
      </template>

      <template v-else>
        <slot />
      </template>
    </div>

    <!-- 分页 -->
    <div class="x-table__pagination" v-if="showPagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { CircleCloseFilled } from '@element-plus/icons-vue'

interface Props {
  loading?: boolean
  error?: boolean
  empty?: boolean
  emptyText?: string
  total?: number
  currentPage?: number
  pageSize?: number
  showPagination?: boolean
  skeletonRows?: number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: false,
  empty: false,
  emptyText: '暂无数据',
  total: 0,
  currentPage: 1,
  pageSize: 20,
  showPagination: true,
  skeletonRows: 10
})

const emit = defineEmits<{
  (e: 'reload'): void
  (e: 'update:currentPage', val: number): void
  (e: 'update:pageSize', val: number): void
}>()

const currentPage = computed({
  get: () => props.currentPage,
  set: (val) => emit('update:currentPage', val)
})

const pageSize = computed({
  get: () => props.pageSize,
  set: (val) => emit('update:pageSize', val)
})

function handleSizeChange() {
  emit('update:currentPage', 1)
}

function handleCurrentChange() {
  emit('update:currentPage', currentPage.value)
}
</script>

<style scoped>
.x-table {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
}

.x-table__toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.x-table__filter {
  margin-bottom: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
}

.x-table__error,
.x-table__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #909399;
}

.x-table__error p {
  margin: 12px 0;
}

.x-table__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
