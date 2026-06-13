# 技术债务扫描器（Tech Debt Scanner）

> 独立版技术债务扫描器，无外部依赖，支持任意项目类型

---

## ✨ 特性

- 🚀 **无依赖**：只使用 Node.js 内置模块，无需 `npm install`
- 🔥 **自动检测**：自动识别项目类型（NestJS、微信小程序、React、Next.js 等）
- 📊 **熵值计算**：基于代码复杂度、测试覆盖率、文档完整度计算技术债务熵值
- 📝 **Markdown 报告**：自动生成 `TECHNICAL_DEBT_REPORT.md` 报告
- 🎯 **优先级分级**：自动分级为 P0/P1/P2/P3 优先级
- 🔌 **CI/CD 集成**：提供 GitHub Actions 配置示例

---

## 📦 安装

### 方式 1：直接下载（推荐）

```bash
# 下载独立版扫描器
curl -O https://raw.githubusercontent.com/your-username/tech-debt-scanner/main/tech-debt-scanner-standalone.mjs

# 赋予执行权限
chmod +x tech-debt-scanner-standalone.mjs
```

### 方式 2：克隆仓库

```bash
git clone https://github.com/your-username/tech-debt-scanner.git
cd tech-debt-scanner
```

---

## 🚀 使用方法

### 扫描当前项目

```bash
node tech-debt-scanner-standalone.mjs .
```

### 扫描指定项目

```bash
node tech-debt-scanner-standalone.mjs /path/to/your/project
```

### 示例：扫描 Test 项目

```bash
node tech-debt-scanner-standalone.mjs ../Test
```

**输出示例**：

```
📊 开始扫描项目熵值...

项目根目录：/Users/admin/Test

📂 项目类型：wechat-miniprogram
📂 模块路径：/Users/admin/Test/miniprogram

一、熵值汇总表

| 模块 | 代码文件 | 测试文件 | 文档文件 | 代码行数 | 复杂度 | 测试覆盖率 | 文档完整度 | 熵值 | 等级 | 优先级 |
|------|---------|---------|---------|----------|--------|-----------|-------------|------|------|--------|
| services | 262 | 13 | 0 | 5615 | 10 | 5% | 0% | 8.9 | 🚨 | P0 |
| apps | 246 | 0 | 8 | 5457 | 10 | 0% | 100% | 7.1 | 🟠 | P1 |
| packages | 9 | 0 | 0 | 910 | 1.8 | 0% | 0% | 6.6 | 🟠 | P1 |
| mock | 2 | 0 | 0 | 1194 | 1.4 | 0% | 0% | 6.5 | 🟠 | P1 |
| infra | 10 | 0 | 1 | 1577 | 2.6 | 0% | 100% | 4.9 | 🟡 | P2 |
| test-frontend | 10 | 0 | 2 | 1507 | 2.5 | 0% | 100% | 4.8 | 🟡 | P2 |
| STRATEGY | 0 | 0 | 1 | 0 | 0 | 0% | 100% | 4.1 | 🟡 | P2 |
| docs | 0 | 0 | 47 | 0 | 0 | 0% | 100% | 4.1 | 🟡 | P2 |

二、统计汇总

- 总模块数：8
- 平均熵值：5.9
- 🚨 高风险模块（熵值≥8）：1 个
- 🟠 风险模块（6≤熵值<8）：3 个
- 🟢 低风险模块（熵值<6）：4 个

三、建议

1. 立即处理 1 个高风险模块（P0 优先级）
2. 规划处理 3 个风险模块（P1/P2 优先级）
3. 为 7 个模块添加单元测试

✅ 报告已生成：/Users/admin/Test/TECHNICAL_DEBT_REPORT.md
```

---

## 📊 熵值计算原理

### 熵值公式

```
熵值 = (代码复杂度 × 0.3) + (测试覆盖率缺口 × 0.4) + (文档完整度缺口 × 0.2) + (技术债年龄 × 0.1)
```

### 指标说明

| 指标 | 权重 | 说明 |
|------|------|------|
| 代码复杂度 | 30% | 1-10（基于文件数 + 代码行数） |
| 测试覆盖率缺口 | 40% | 100% - 实际测试覆盖率 |
| 文档完整度缺口 | 20% | 100% - 文档完整度 |
| 技术债年龄 | 10% | 问题存在月数（默认 30 天） |

### 熵值等级

| 熵值范围 | 等级 | 说明 | 处理优先级 |
|----------|------|------|------------|
| 0-4 | 🟢 健康 | 技术债务可控 | P3（可选优化） |
| 4-6 | 🟡 警告 | 存在轻度技术债务 | P2（中期改进） |
| 6-8 | 🟠 风险 | 存在中度技术债务 | P1（优先处理） |
| 8-10 | 🔴 高危 | 存在严重技术债务 | P0（立即处理） |

---

## 🔧 支持的项目类型

扫描器会自动检测以下项目类型：

| 项目类型 | 识别特征 | 默认模块路径 |
|----------|----------|--------------|
| **NestJS** | 依赖包含 `@nestjs/core` | `apps/core-service/src/modules`, `src/modules` |
| **微信小程序** | `package.json` 名称包含 `miniprogram` | `miniprogram/modules`, `pages`, `utils` |
| **React** | 依赖包含 `react` | `src/modules`, `src/components`, `modules` |
| **Next.js** | 依赖包含 `next` | `src/modules`, `src/components`, `modules` |
| **通用项目** | 无法识别上述类型 | `src`, `lib`, `modules`, `.` |

---

## 📝 报告格式

扫描完成后，会自动生成 `TECHNICAL_DEBT_REPORT.md` 报告，包含：

1. **执行摘要**：总模块数、平均熵值、高风险模块数
2. **熵值汇总表**：所有模块的详细指标
3. **高风险模块详情**：P0 优先级模块的详细信息和改进建议
4. **风险模块列表**：P1/P2 优先级模块的主要问题
5. **改进建议**：分优先级的行动计划

示例报告：[TECHNICAL_DEBT_REPORT.md 示例](./examples/TECHNICAL_DEBT_REPORT.md)

---

## 🔌 CI/CD 集成

### GitHub Actions

参考 [.github/workflows/tech-debt-scan.yml](./.github/workflows/tech-debt-scan.yml) 配置文件。

**功能**：

- ✅ 每次 push/PR 自动运行扫描
- ✅ 每周一早上 9 点定时运行
- ✅ 发现 P0 高风险模块时自动创建 Issue
- ✅ 上传扫描报告作为 Artifact
- ✅ 自动提交报告到仓库

### 使用示例

```yaml
name: 技术债务扫描

on:
  push:
    branches: [main, master, develop]
  pull_request:
    branches: [main, master, develop]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: 下载并运行扫描器
        run: |
          curl -O https://raw.githubusercontent.com/your-username/tech-debt-scanner/main/tech-debt-scanner-standalone.mjs
          node tech-debt-scanner-standalone.mjs .
      - name: 上传报告
        uses: actions/upload-artifact@v4
        with:
          name: 技术债务扫描报告
          path: TECHNICAL_DEBT_REPORT.md
```

---

## 📖 API 文档

### 命令行参数

```bash
node tech-debt-scanner-standalone.mjs [项目路径] [选项]
```

| 参数 | 说明 | 默认值 |
|------|------|---------|
| `[项目路径]` | 要扫描的项目根目录 | `.` (当前目录) |

### 输出文件

| 文件 | 说明 |
|------|------|
| `TECHNICAL_DEBT_REPORT.md` | Markdown 格式的技术债务报告 |
| 控制台输出 | 熵值汇总表和建议 |

---

## 🧩 扩展开发

### 添加自定义项目类型

编辑 `tech-debt-scanner-standalone.mjs` 中的 `detectProjectType()` 方法：

```javascript
detectProjectType(packageJson) {
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  // 添加自定义项目类型检测
  if (deps['your-framework']) return 'your-framework';
  
  // 默认检测逻辑
  if (deps['@nestjs/core']) return 'nestjs';
  if (deps['next']) return 'nextjs';
  // ...
  
  return 'generic';
}
```

### 自定义模块路径

编辑 `getModulePathCandidates()` 方法：

```javascript
getModulePathCandidates(type) {
  switch (type) {
    case 'your-framework':
      return ['custom/modules/path', 'modules'];
    // ...
  }
}
```

---

## 🐛 故障排查

### 问题 1：未找到任何模块

**原因**：项目类型检测失败，或模块路径不正确

**解决方案**：

```bash
# 检查项目类型检测是否正确
node -e "console.log(require('./package.json'))"

# 手动指定模块路径（需要修改源码）
# 在 ProjectDetector.detectModulesPath() 中添加自定义路径
```

### 问题 2：扫描了 `node_modules` 目录

**原因**：排除列表不完整

**解决方案**：确认 `walkDirectory()` 方法中的 `skipDirs` 列表包含 `node_modules`：

```javascript
const skipDirs = ['node_modules', 'dist', '.git', '.next', 'build', 'coverage', '.nuxt', 'vendor'];
```

---

## 📄 许可证

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📮 联系方式

- 作者：Celestial Team
- 项目主页：https://github.com/gitzack-coder/tech-debt-scanner
- 问题反馈：https://github.com/gitzack-coder/tech-debt-scanner/issues
- 联系邮箱：920097069@qq.com

---

**⭐ 如果这个项目对你有帮助，请给我们一个 Star！**
