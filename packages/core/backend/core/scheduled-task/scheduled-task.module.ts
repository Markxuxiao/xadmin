import { Module, OnModuleInit } from '@nestjs/common'
import { ScheduledTaskController } from './scheduled-task.controller'
import { ScheduledTaskService } from './scheduled-task.service'
import { TaskExecutor } from './task-executor'
import { registerBuiltinTaskHandlers } from './built-in-tasks'

@Module({
  controllers: [ScheduledTaskController],
  providers: [ScheduledTaskService, TaskExecutor],
  exports: [ScheduledTaskService, TaskExecutor],
})
export class ScheduledTaskModule implements OnModuleInit {
  onModuleInit() {
    // 注册内置任务处理器
    registerBuiltinTaskHandlers()
  }
}
