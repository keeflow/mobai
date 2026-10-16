import { describe, expect, it } from 'vitest'
import { roundTripMarkdown } from '../src/shared/editor'

describe('math and diagrams', () => {
  it('keeps dollar math and mermaid fences after a second save', () => {
    const source = [
      '能量 $E=mc^2$ 在正文里。',
      '',
      '$$',
      'x^2+y^2',
      '$$',
      '',
      '```mermaid',
      'graph TD',
      '  A[开始] --> B[结束]',
      '```',
      '',
      '```ts',
      'const value = 1',
      '```'
    ].join('\n')
    const once = roundTripMarkdown(source)
    const twice = roundTripMarkdown(once)
    expect(twice).toBe(once)
    expect(once).toContain('$E=mc^2$')
    expect(once).toContain('x^2+y^2')
    expect(once).toContain('```mermaid')
    expect(once).toContain('A[开始] --> B[结束]')
    expect(once).toContain('```ts')
    expect(once).toContain('const value = 1')
  })

  it('keeps footnote references and definitions', () => {
    const source = ['正文见[^注]。', '', '[^注]: 这是说明', '  续行'].join('\n')
    const once = roundTripMarkdown(source)
    const twice = roundTripMarkdown(once)
    expect(twice).toBe(once)
    expect(once).toContain('[^注]')
    expect(once).toContain('这是说明')
    expect(once).toContain('续行')
  })
})