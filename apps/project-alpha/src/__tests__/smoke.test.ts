import { describe, it, expect } from 'vitest'

describe('smoke test', () => {
  it('should run tests', () => {
    expect(true).toBe(true)
  })

  it('should import vue', async () => {
    const { ref } = await import('vue')
    const count = ref(0)
    expect(count.value).toBe(0)
    count.value++
    expect(count.value).toBe(1)
  })
})
