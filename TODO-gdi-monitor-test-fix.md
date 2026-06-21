# TODO: 修复 gdi-monitor.spec.ts 测试失败

## 问题
- 测试文件中的 Mock 值仍然基于旧的 `breakdown` 范围（0.15-0.35）
- 但实现已经修复了（0.1-1.0）
- 导致 1个测试失败：`should set alertLevel to warning when GDI >= 0.3 and < 0.5`

## 解决方案
1. 更新测试中的 Mock 值，使用 `jest.spyOn(Math, 'random').mockReturnValueOnce(...)` 来精确控制
2. 或者，直接 Mock `calculateGDI` 方法（使用 `jest.spyOn(monitor, 'calculateGDI').mockResolvedValue(...)`）

## 优先级
- P2（不影响整体进度，但建议修复以提高覆盖率）

## 详细信息
- 文件：`apps/core-service/src/modules/agent-monitor/metrics/gdi-monitor.spec.ts`
- 失败测试：第151-191行 `should set alertLevel to warning when GDI >= 0.3 and < 0.5`
- 原因：Mock 值基于旧范围（0.15-0.35），新范围是 0.1-1.0
- 修复方法：使用正确的 Mock 值（基于新范围 0.1-1.0）

## 进度
- [x] 修复 `anomaly-detector.ts` 覆盖率（66.66% → 96.96%）
- [x] 修复 `level-constraints-checker.ts` 覆盖率（66.66% → 100%）
- [ ] 修复 `gdi-monitor.ts` 测试失败（1个测试失败）
