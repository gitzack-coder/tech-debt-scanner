#!/usr/bin/env node
/**
 * 独立版技术债务扫描器（无外部依赖）
 * 功能：扫描任意项目的模块熵值
 * 
 * 使用方法：
 *   node tech-debt-scanner-standalone.mjs [项目路径]
 */

import { promises as fs } from 'fs';
import { join, resolve } from 'path';

// ========== 项目检测器 ==========
class ProjectDetector {
  async detect(projectRoot) {
    const packageJson = await this.readPackageJson(projectRoot);
    const type = this.detectProjectType(packageJson);
    const modulesPath = await this.detectModulesPath(projectRoot, type);

    return {
      type,
      name: packageJson.name || 'unknown',
      modulesPath,
    };
  }

  async readPackageJson(projectRoot) {
    try {
      const content = await fs.readFile(join(projectRoot, 'package.json'), 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  detectProjectType(packageJson) {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps['@nestjs/core']) return 'nestjs';
    if (deps['next']) return 'nextjs';
    if (deps['react']) return 'react';
    if (packageJson.name?.includes('miniprogram')) return 'wechat-miniprogram';
    
    return 'generic';
  }

  async detectModulesPath(projectRoot, type) {
    const candidates = this.getModulePathCandidates(type);
    
    for (const candidate of candidates) {
      try {
        await fs.access(join(projectRoot, candidate));
        return candidate;
      } catch {
        continue;
      }
    }
    
    return '.';
  }

  getModulePathCandidates(type) {
    switch (type) {
      case 'nestjs':
        return ['apps/core-service/src/modules', 'apps/api/src/modules', 'src/modules', 'modules'];
      case 'wechat-miniprogram':
        return ['miniprogram/modules', 'modules', 'pages', 'utils'];
      case 'react':
      case 'nextjs':
        return ['src/modules', 'src/components', 'modules', 'components'];
      default:
        return ['src', 'lib', 'modules', '.'];
    }
  }
}

// ========== 文件扫描器（无 glob 依赖） ==========
class FileScanner {
  async scanDirectory(dirPath, extensions = ['.ts', '.js', '.tsx', '.jsx']) {
    const results = {
      codeFiles: 0,
      testFiles: 0,
      docFiles: 0,
      codeLines: 0,
      files: [],
    };

    await this.walkDirectory(dirPath, extensions, results);
    return results;
  }

  async walkDirectory(dirPath, extensions, results, depth = 0) {
    // 避免无限递归
    if (depth > 5) return;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        // 跳过不需要扫描的目录
        const skipDirs = ['node_modules', 'dist', '.git', '.next', 'build', 'coverage', '.nuxt', 'vendor'];
        if (skipDirs.includes(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          await this.walkDirectory(fullPath, extensions, results, depth + 1);
        } else if (entry.isFile()) {
          const ext = entry.name.endsWith('.tsx') ? '.tsx' : 
                     entry.name.endsWith('.jsx') ? '.jsx' : 
                     entry.name.substring(entry.name.lastIndexOf('.'));

          // 代码文件
          if (extensions.includes(ext)) {
            results.codeFiles++;
            results.files.push(fullPath);

            // 计算代码行数（只读取前50个文件）
            if (results.files.length <= 50) {
              try {
                const content = await fs.readFile(fullPath, 'utf-8');
                results.codeLines += content.split('\n').length;
              } catch {
                // 忽略读取错误
              }
            }
          }

          // 测试文件
          if (entry.name.includes('.spec.') || entry.name.includes('.test.')) {
            results.testFiles++;
          }

          // 文档文件
          if (entry.name.endsWith('.md') || entry.name.endsWith('.txt')) {
            results.docFiles++;
          }
        }
      }
    } catch (error) {
      // 忽略无法访问的目录
    }
  }
}

// ========== 熵值扫描器 ==========
class EntropyScanner {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.projectInfo = null;
  }

  async initialize() {
    const detector = new ProjectDetector();
    this.projectInfo = await detector.detect(this.projectRoot);
  }

  async scanAllModules() {
    if (!this.projectInfo) {
      await this.initialize();
    }

    const modulesDir = join(this.projectRoot, this.projectInfo.modulesPath);
    
    console.log(`📂 项目类型：${this.projectInfo.type}`);
    console.log(`📂 模块路径：${modulesDir}\n`);

    // 排除列表（这些不是模块）
    const excludeDirs = ['node_modules', '.git', '.next', 'build', 'dist', 'coverage', '.nuxt', 'vendor', '.github', 'monitoring', 'scripts', 'db'];

    try {
      const entries = await fs.readdir(modulesDir, { withFileTypes: true });
      const results = [];

      for (const entry of entries) {
        // 排除非模块目录
        if (excludeDirs.includes(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          const result = await this.scanModule(entry.name);
          if (result) {
            results.push(result);
          }
        }
      }

      results.sort((a, b) => b.entropy - a.entropy);
      return results;
    } catch (error) {
      console.error(`❌ 扫描失败：${error.message}`);
      console.error(`  路径不存在：${modulesDir}`);
      return [];
    }
  }

  async scanModule(moduleName) {
    if (!this.projectInfo) {
      await this.initialize();
    }

    const modulePath = join(this.projectRoot, this.projectInfo.modulesPath, moduleName);

    try {
      await fs.access(modulePath);

      const scanner = new FileScanner();
      const { codeFiles, testFiles, docFiles, codeLines } = await scanner.scanDirectory(modulePath);

      const complexity = this.calculateComplexity(codeFiles, codeLines);
      const testCoverage = this.calculateTestCoverage(codeFiles, testFiles);
      const docCoverage = this.calculateDocCoverage(docFiles);
      const debtAge = 30;

      const entropy = this.calculateEntropy(complexity, testCoverage, docCoverage, debtAge);
      const { grade, priority } = this.gradeEntropy(entropy);

      return {
        name: moduleName,
        codeFiles,
        testFiles,
        docFiles,
        codeLines,
        complexity,
        testCoverage,
        docCoverage,
        debtAge,
        entropy,
        grade,
        priority,
      };
    } catch {
      return null;
    }
  }

  calculateComplexity(codeFiles, codeLines) {
    const fileScore = Math.min(codeFiles / 10, 5);
    const lineScore = Math.min(codeLines / 1000, 5);
    return Math.round((fileScore + lineScore) * 10) / 10;
  }

  calculateTestCoverage(codeFiles, testFiles) {
    if (codeFiles === 0) return 0;
    return Math.round((testFiles / codeFiles) * 100);
  }

  calculateDocCoverage(docFiles) {
    return docFiles > 0 ? 100 : 0;
  }

  calculateEntropy(complexity, testCoverage, docCoverage, debtAge) {
    const alpha = 0.3;
    const beta = 0.4;
    const gamma = 0.2;
    const delta = 0.1;

    const normalizedComplexity = complexity / 10;
    const normalizedTestCoverage = testCoverage / 100;
    const normalizedDocCoverage = docCoverage / 100;
    const normalizedDebtAge = Math.min(debtAge / 365, 1);

    const entropy = alpha * normalizedComplexity + beta * (1 - normalizedTestCoverage) + gamma * (1 - normalizedDocCoverage) + delta * normalizedDebtAge;
    return Math.round(entropy * 10 * 10) / 10;
  }

  gradeEntropy(entropy) {
    if (entropy >= 8) return { grade: '🚨', priority: 'P0' };
    if (entropy >= 6) return { grade: '🟠', priority: 'P1' };
    if (entropy >= 4) return { grade: '🟡', priority: 'P2' };
    return { grade: '🟢', priority: 'P3' };
  }
}

// ========== 主程序 ==========
async function main() {
  const args = process.argv.slice(2);
  const projectRoot = resolve(args[0] || '.');

  console.log('📊 开始扫描项目熵值...\n');
  console.log(`项目根目录：${projectRoot}\n`);

  const scanner = new EntropyScanner(projectRoot);
  const results = await scanner.scanAllModules();

  if (results.length === 0) {
    console.log('⚠️  未找到任何模块');
    console.log('\n提示：请确保项目根目录正确，且包含模块目录');
    return;
  }

  // 生成 Markdown 报告
  const reportPath = join(projectRoot, 'TECHNICAL_DEBT_REPORT.md');
  await generateMarkdownReport(results, projectRoot, reportPath);

  // 输出表格
  console.log('一、熵值汇总表\n');
  console.log('| 模块 | 代码文件 | 测试文件 | 文档文件 | 代码行数 | 复杂度 | 测试覆盖率 | 文档完整度 | 熵值 | 等级 | 优先级 |');
  console.log('|------|---------|---------|---------|----------|--------|-----------|-------------|------|------|--------|');

  for (const result of results) {
    console.log(
      `| ${result.name} | ${result.codeFiles} | ${result.testFiles} | ${result.docFiles} | ${result.codeLines} | ${result.complexity} | ${result.testCoverage}% | ${result.docCoverage}% | ${result.entropy} | ${result.grade} | ${result.priority} |`,
    );
  }

  console.log('\n二、统计汇总\n');
  const totalModules = results.length;
  const avgEntropy = results.reduce((sum, r) => sum + r.entropy, 0) / totalModules;
  const highRisk = results.filter((r) => r.entropy >= 8).length;
  const mediumRisk = results.filter((r) => r.entropy >= 6 && r.entropy < 8).length;
  const lowRisk = results.filter((r) => r.entropy < 6).length;

  console.log(`- 总模块数：${totalModules}`);
  console.log(`- 平均熵值：${Math.round(avgEntropy * 10) / 10}`);
  console.log(`- 🚨 高风险模块（熵值≥8）：${highRisk} 个`);
  console.log(`- 🟠 风险模块（6≤熵值<8）：${mediumRisk} 个`);
  console.log(`- 🟢 低风险模块（熵值<6）：${lowRisk} 个`);

  console.log('\n三、建议\n');
  if (highRisk > 0) {
    console.log(`1. 立即处理 ${highRisk} 个高风险模块（P0 优先级）`);
  }
  if (mediumRisk > 0) {
    console.log(`2. 规划处理 ${mediumRisk} 个风险模块（P1/P2 优先级）`);
  }
  if (results.filter((r) => r.testCoverage === 0).length > 0) {
    console.log(`3. 为 ${results.filter((r) => r.testCoverage === 0).length} 个模块添加单元测试`);
  }

  console.log(`\n✅ 报告已生成：${reportPath}`);
}

// ========== 生成 Markdown 报告 ==========
async function generateMarkdownReport(results, projectRoot, reportPath) {
  const projectName = results[0]?.name || 'Unknown';
  const totalModules = results.length;
  const avgEntropy = results.reduce((sum, r) => sum + r.entropy, 0) / totalModules;
  const highRisk = results.filter((r) => r.entropy >= 8);
  const mediumRisk = results.filter((r) => r.entropy >= 6 && r.entropy < 8);
  const lowRisk = results.filter((r) => r.entropy < 6);

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  let markdown = `# 技术债务扫描报告

**项目**：${projectName}  
**扫描时间**：${dateStr} ${timeStr}  
**项目路径**：${projectRoot}

---

## 一、执行摘要

| 指标 | 数值 | 状态 |
|------|------|------|
| 总模块数 | ${totalModules} | - |
| 平均熵值 | ${Math.round(avgEntropy * 10) / 10} | ${avgEntropy >= 6 ? '🟠 风险' : '🟢 健康'} |
| 🚨 高风险模块（P0） | ${highRisk.length} | ${highRisk.length > 0 ? '⚠️ 需立即处理' : '✅ 无'} |
| 🟠 风险模块（P1/P2） | ${mediumRisk.length} | ${mediumRisk.length > 0 ? '⚠️ 需规划处理' : '✅ 无'} |
| 🟢 低风险模块（P3） | ${lowRisk.length} | - |

---

## 二、熵值汇总表

| 模块 | 代码文件 | 测试文件 | 文档文件 | 代码行数 | 复杂度 | 测试覆盖率 | 文档完整度 | 熵值 | 等级 | 优先级 |
|------|---------|---------|---------|----------|--------|-----------|-------------|------|------|--------|
`;

  for (const result of results) {
    markdown += `| ${result.name} | ${result.codeFiles} | ${result.testFiles} | ${result.docFiles} | ${result.codeLines} | ${result.complexity} | ${result.testCoverage}% | ${result.docCoverage}% | ${result.entropy} | ${result.grade} | ${result.priority} |\n`;
  }

  markdown += `\n---\n\n## 三、高风险模块详情（P0 优先级）\n\n`;

  if (highRisk.length === 0) {
    markdown += `✅ 无高风险模块\n\n`;
  } else {
    for (const module of highRisk) {
      markdown += `### ${module.grade} ${module.name}（熵值：${module.entropy}）\n\n`;
      markdown += `- **优先级**：${module.priority}\n`;
      markdown += `- **代码文件**：${module.codeFiles} 个\n`;
      markdown += `- **测试文件**：${module.testFiles} 个\n`;
      markdown += `- **测试覆盖率**：${module.testCoverage}%\n`;
      markdown += `- **文档完整度**：${module.docCoverage}%\n`;
      markdown += `- **复杂度**：${module.complexity}\n\n`;

      markdown += `**建议**：\n`;
      if (module.testCoverage < 30) {
        markdown += `1. 立即添加单元测试（当前覆盖率仅 ${module.testCoverage}%）\n`;
      }
      if (module.docCoverage === 0) {
        markdown += `2. 添加模块文档（README.md）\n`;
      }
      if (module.complexity >= 8) {
        markdown += `3. 重构简化模块（复杂度 ${module.complexity}/10）\n`;
      }
      markdown += `\n---\n\n`;
    }
  }

  markdown += `## 四、风险模块列表（P1/P2 优先级）\n\n`;

  if (mediumRisk.length === 0) {
    markdown += `✅ 无风险模块\n\n`;
  } else {
    markdown += `| 模块 | 熵值 | 优先级 | 主要问题 |\n`;
    markdown += `|------|------|--------|----------|\n`;

    for (const module of mediumRisk) {
      const problems = [];
      if (module.testCoverage < 50) problems.push(`测试覆盖率低（${module.testCoverage}%）`);
      if (module.docCoverage === 0) problems.push('缺少文档');
      if (module.complexity >= 6) problems.push(`复杂度高（${module.complexity}）`);

      markdown += `| ${module.name} | ${module.entropy} | ${module.priority} | ${problems.join('、')} |\n`;
    }

    markdown += `\n`;
  }

  markdown += `## 五、改进建议\n\n`;

  const suggestions = [];

  if (highRisk.length > 0) {
    suggestions.push(`### P0：立即处理（${highRisk.length} 个模块）\n\n`);
    suggestions.push(`以下模块熵值 ≥ 8，存在严重技术债务，需立即处理：\n\n`);
    for (const module of highRisk) {
      suggestions.push(`- **${module.name}**：熵值 ${module.entropy}，主要问题：${module.testCoverage < 30 ? '测试覆盖率极低' : '复杂度过高'}\n`);
    }
    suggestions.push(`\n**行动计划**：\n`);
    suggestions.push(`1. 为这 ${highRisk.length} 个模块添加单元测试（目标覆盖率 ≥ 30%）\n`);
    suggestions.push(`2. 重构简化复杂度过高的模块\n`);
    suggestions.push(`3. 添加模块文档\n\n`);
  }

  if (mediumRisk.length > 0) {
    suggestions.push(`### P1/P2：规划处理（${mediumRisk.length} 个模块）\n\n`);
    suggestions.push(`以下模块熵值 6-8，存在技术债务，需规划处理：\n\n`);
    suggestions.push(`**行动计划**：\n`);
    suggestions.push(`1. 在下一个迭代中为这些模块添加测试\n`);
    suggestions.push(`2. 逐步重构复杂度高的模块\n`);
    suggestions.push(`3. 补充模块文档\n\n`);
  }

  suggestions.push(`### 长期优化建议\n\n`);
  suggestions.push(`1. **建立技术债务监控**：将扫描器集成到 CI/CD，每次提交自动扫描\n`);
  suggestions.push(`2. **设定熵值阈值**：新模块熵值不得超过 6，现有模块逐步降低熵值\n`);
  suggestions.push(`3. **定期重构**：每个迭代分配 20% 时间处理技术债务\n`);
  suggestions.push(`4. **测试覆盖率目标**：核心模块 ≥ 80%，其他模块 ≥ 60%\n`);

  markdown += suggestions.join('');

  markdown += `\n---\n\n## 六、扫描器信息\n\n`;
  markdown += `- **扫描器版本**：v1.0.0\n`;
  markdown += `- **扫描时间**：${dateStr} ${timeStr}\n`;
  markdown += `- **项目路径**：${projectRoot}\n`;
  markdown += `- **扫描器源码**：[tech-debt-scanner-standalone.mjs](https://github.com/your-repo/tech-debt-scanner)\n\n`;
  markdown += `---\n\n*本报告由技术债务扫描器自动生成*\n`;

  await fs.writeFile(reportPath, markdown, 'utf-8');
}

main().catch((error) => {
  console.error('❌ 扫描失败：', error.message);
  process.exit(1);
});
