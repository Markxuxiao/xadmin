import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { DictService } from '../core/dict/dict.service'
import { DictItem } from '../base/entities/dict.entity'
import { createTestOrm, closeTestOrm } from './helpers/test-db'

describe('DictService — CRUD', () => {
  let dictService: DictService

  beforeAll(async () => {
    await createTestOrm()
  })

  beforeEach(async () => {
    dictService = new DictService()
  })

  afterAll(async () => {
    await closeTestOrm()
  })

  // ============================================================================
  // findAll
  // ============================================================================

  it('should find all dicts', async () => {
    // Create test data
    await dictService.create({
      name: 'SystemName',
      code: 'system_name',
      type: 'system',
      value: 'My System',
      sort: 1,
    })
    await dictService.create({
      name: 'Status',
      code: 'status',
      type: 'dict',
      items: [
        { label: '启用', value: '1', sort: 1, enabled: true },
        { label: '禁用', value: '0', sort: 2, enabled: true },
      ],
      sort: 2,
    })

    const dicts = await dictService.findAll()
    expect(dicts.length).toBeGreaterThanOrEqual(2)
  })

  it('should filter dicts by type', async () => {
    const systemDicts = await dictService.findAll('system')
    for (const dict of systemDicts) {
      expect(dict.type).toBe('system')
    }
  })

  // ============================================================================
  // findOne / findByCode
  // ============================================================================

  it('should find dict by id', async () => {
    const created = await dictService.create({
      name: 'FindById',
      code: 'find_by_id',
      type: 'system',
      value: 'test',
    })

    const found = await dictService.findOne(created.id)
    expect(found).not.toBeNull()
    expect(found!.code).toBe('find_by_id')
  })

  it('should return null for non-existent id', async () => {
    const found = await dictService.findOne('00000000-0000-0000-0000-000000000999')
    expect(found).toBeNull()
  })

  it('should find dict by code', async () => {
    const created = await dictService.create({
      name: 'FindByCode',
      code: 'find_by_code_test',
      type: 'system',
      value: 'test value',
    })

    const found = await dictService.findByCode('find_by_code_test')
    expect(found).not.toBeNull()
    expect(found!.name).toBe('FindByCode')
    expect(found!.value).toBe('test value')
  })

  it('should return null for non-existent code', async () => {
    const found = await dictService.findByCode('nonexistent_dict_code')
    expect(found).toBeNull()
  })

  // ============================================================================
  // create
  // ============================================================================

  it('should create a system type dict with value field', async () => {
    const dict = await dictService.create({
      name: 'System Logo',
      code: 'system_logo',
      type: 'system',
      value: '/images/logo.png',
      sort: 10,
      description: 'System logo URL',
    })

    expect(dict).not.toBeNull()
    expect(dict.name).toBe('System Logo')
    expect(dict.code).toBe('system_logo')
    expect(dict.type).toBe('system')
    expect(dict.value).toBe('/images/logo.png')
    expect(dict.description).toBe('System logo URL')
    expect(dict.enabled).toBe(true)
    expect(dict.items).toEqual([])
  })

  it('should create a dict type dict with items field', async () => {
    const items: DictItem[] = [
      { label: '男', value: 'male', sort: 1, enabled: true },
      { label: '女', value: 'female', sort: 2, enabled: true },
      { label: '未知', value: 'unknown', sort: 3, enabled: false },
    ]

    const dict = await dictService.create({
      name: 'Gender',
      code: 'gender',
      type: 'dict',
      items,
      sort: 5,
      description: 'Gender options',
    })

    expect(dict).not.toBeNull()
    expect(dict.type).toBe('dict')
    expect(dict.items).toEqual(items)
    expect(dict.items.length).toBe(3)
  })

  it('should create dict with default values', async () => {
    const dict = await dictService.create({
      name: 'MinimalDict',
      code: 'minimal_dict',
      type: 'dict',
    })

    expect(dict).not.toBeNull()
    expect(dict.sort).toBe(0)
    expect(dict.description).toBeNull()
    expect(dict.enabled).toBe(true)
  })

  // ============================================================================
  // update
  // ============================================================================

  it('should update dict fields', async () => {
    const created = await dictService.create({
      name: 'ToUpdate',
      code: 'to_update',
      type: 'system',
      value: 'original',
      description: 'original description',
    })

    const updated = await dictService.update(created.id, {
      name: 'UpdatedName',
      value: 'new value',
      description: 'new description',
      sort: 100,
    })

    expect(updated).not.toBeNull()
    expect(updated!.name).toBe('UpdatedName')
    expect(updated!.value).toBe('new value')
    expect(updated!.description).toBe('new description')
    expect(updated!.sort).toBe(100)
  })

  it('should update items for dict type', async () => {
    const created = await dictService.create({
      name: 'Status',
      code: 'status_dict',
      type: 'dict',
      items: [{ label: '待处理', value: 'pending', sort: 1, enabled: true }],
    })

    const newItems: DictItem[] = [
      { label: '处理中', value: 'processing', sort: 1, enabled: true },
      { label: '已完成', value: 'completed', sort: 2, enabled: true },
      { label: '已取消', value: 'cancelled', sort: 3, enabled: false },
    ]

    const updated = await dictService.update(created.id, { items: newItems })

    expect(updated).not.toBeNull()
    expect(updated!.items.length).toBe(3)
    expect(updated!.items[0].label).toBe('处理中')
    expect(updated!.items[1].value).toBe('completed')
  })

  it('should return null when updating non-existent dict', async () => {
    const result = await dictService.update('00000000-0000-0000-0000-000000000999', { name: 'Test' })
    expect(result).toBeNull()
  })

  it('should update only specified fields', async () => {
    const created = await dictService.create({
      name: 'PartialUpdate',
      code: 'partial_update',
      type: 'system',
      value: 'original value',
      description: 'original',
      sort: 1,
    })

    const updated = await dictService.update(created.id, { name: 'NewName' })

    expect(updated!.name).toBe('NewName')
    expect(updated!.value).toBe('original value')
    expect(updated!.description).toBe('original')
    expect(updated!.sort).toBe(1)
  })

  it('should toggle enabled status', async () => {
    const created = await dictService.create({
      name: 'ToggleEnabled',
      code: 'toggle_enabled',
      type: 'system',
      value: 'test',
    })

    expect(created.enabled).toBe(true)

    const disabled = await dictService.update(created.id, { enabled: false })
    expect(disabled!.enabled).toBe(false)

    const reEnabled = await dictService.update(created.id, { enabled: true })
    expect(reEnabled!.enabled).toBe(true)
  })

  // ============================================================================
  // delete (soft delete)
  // ============================================================================

  it('should soft-delete dict', async () => {
    const created = await dictService.create({
      name: 'ToDelete',
      code: 'to_delete',
      type: 'system',
      value: 'test',
    })

    const result = await dictService.delete(created.id)
    expect(result).toBe(true)

    const found = await dictService.findOne(created.id)
    expect(found).toBeNull()
  })

  it('should return false when deleting non-existent dict', async () => {
    const result = await dictService.delete('00000000-0000-0000-0000-000000000999')
    expect(result).toBe(false)
  })

  it('should not appear in findAll after deletion', async () => {
    const created = await dictService.create({
      name: 'ShouldNotAppear',
      code: 'should_not_appear',
      type: 'system',
      value: 'test',
    })

    await dictService.delete(created.id)

    const allDicts = await dictService.findAll()
    const found = allDicts.find(d => d.id === created.id)
    expect(found).toBeUndefined()
  })

  // ============================================================================
  // getItems
  // ============================================================================

  it('should get dict items by code', async () => {
    const items: DictItem[] = [
      { label: '华东', value: 'east_china', sort: 1, enabled: true },
      { label: '华南', value: 'south_china', sort: 2, enabled: true },
      { label: '华北', value: 'north_china', sort: 3, enabled: true },
    ]

    await dictService.create({
      name: 'Region',
      code: 'region',
      type: 'dict',
      items,
    })

    const result = await dictService.getItems('region')
    expect(result.length).toBe(3)
    expect(result[0].label).toBe('华东')
    expect(result[1].value).toBe('south_china')
  })

  it('should return empty array for non-existent code', async () => {
    const result = await dictService.getItems('non_existent_dict')
    expect(result).toEqual([])
  })

  it('should return empty array for system type dict (no items)', async () => {
    await dictService.create({
      name: 'SystemOnly',
      code: 'system_only',
      type: 'system',
      value: 'some value',
    })

    const result = await dictService.getItems('system_only')
    expect(result).toEqual([])
  })

  it('should return empty array when dict has null items', async () => {
    // Create a dict without items field
    const dict = await dictService.create({
      name: 'NullItems',
      code: 'null_items',
      type: 'dict',
    })

    const result = await dictService.getItems('null_items')
    expect(result).toEqual([])
  })
})
