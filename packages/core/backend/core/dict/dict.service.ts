import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'
import { getOrm, Dict, DictItem } from '../../base'

@Injectable()
export class DictService {
  async findAll(type?: string) {
    const em = getOrm().em.fork()
    const where: any = { deletedAt: null }
    if (type) {
      where.type = type
      where.enabled = true
    }
    const dicts = await em.find(Dict, where, { orderBy: { sort: 'ASC' } })
    return dicts.map(d => this.dictToRow(d))
  }

  async findOne(id: string) {
    const em = getOrm().em.fork()
    const dict = await em.findOne(Dict, { id, deletedAt: null })
    return dict ? this.dictToRow(dict) : null
  }

  async findByCode(code: string) {
    const em = getOrm().em.fork()
    const dict = await em.findOne(Dict, { code, deletedAt: null })
    return dict ? this.dictToRow(dict) : null
  }

  async create(data: {
    name: string
    code: string
    type: string
    value?: string
    items?: DictItem[]
    sort?: number
    description?: string
  }) {
    const em = getOrm().em.fork()
    const now = new Date()
    const dict = em.create(Dict, {
      id: crypto.randomUUID(),
      name: data.name,
      code: data.code,
      type: data.type || 'dict',
      value: data.value ?? null,
      items: data.items ? JSON.stringify(data.items) : null,
      sort: data.sort ?? 0,
      description: data.description ?? null,
      enabled: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1,
    })
    await em.persistAndFlush(dict)
    return this.dictToRow(dict)
  }

  async update(id: string, data: Partial<{
    name: string
    code: string
    type: string
    value: string
    items: DictItem[]
    sort: number
    description: string
    enabled: boolean
  }>) {
    const em = getOrm().em.fork()
    const dict = await em.findOne(Dict, { id })
    if (!dict) return null

    if (data.name !== undefined) dict.name = data.name
    if (data.code !== undefined) dict.code = data.code
    if (data.type !== undefined) dict.type = data.type
    if (data.value !== undefined) dict.value = data.value
    if (data.items !== undefined) dict.items = JSON.stringify(data.items)
    if (data.sort !== undefined) dict.sort = data.sort
    if (data.description !== undefined) dict.description = data.description
    if (data.enabled !== undefined) dict.enabled = data.enabled
    dict.updatedAt = new Date()

    await em.flush()
    return this.dictToRow(dict)
  }

  async delete(id: string) {
    const em = getOrm().em.fork()
    const dict = await em.findOne(Dict, { id })
    if (!dict) return false
    dict.deletedAt = new Date()
    await em.flush()
    return true
  }

  /** 获取字典项列表（用于下拉选择） */
  async getItems(code: string): Promise<DictItem[]> {
    const dict = await this.findByCode(code)
    if (!dict || !dict.items) return []
    return dict.items as DictItem[]
  }

  private dictToRow(dict: Dict) {
    return {
      id: dict.id,
      name: dict.name,
      code: dict.code,
      type: dict.type,
      value: dict.value,
      items: dict.items ? JSON.parse(dict.items) : [],
      sort: dict.sort,
      description: dict.description,
      enabled: Boolean(dict.enabled),
      createdAt: dict.createdAt instanceof Date ? dict.createdAt.toISOString() : String(dict.createdAt),
      updatedAt: dict.updatedAt instanceof Date ? dict.updatedAt.toISOString() : String(dict.updatedAt),
    }
  }
}
