


# 📘 功能分支协作说明文档

为提高团队协作效率、降低代码冲突风险，本项目采用 Git 分支协作开发模型（Git Flow 精简版），配合 Pull Request（PR）+ Code Review 流程。

---

## 🧱 分支模型概览

```text
main        ← 部署主干分支（仅用于发布）
  ↑
dev         ← 集成测试主分支（多人开发后统一合并）
  ↑
feat/...    ← 每人一个功能分支（开发在此进行）
````

---

## 👥 分支命名规范

| 分支名                     | 说明              | 负责人   |
| ----------------------- | --------------- | ----- |
| `dev`                   | 主开发集成分支（禁止直接开发） | 项目维护人 |
| `feat/nlp-extract`      | 实体关系抽取模块开发      | A 同学  |
| `feat/kg-neo4j`         | 图谱构建、Neo4j 入库模块 | B 同学  |
| `feat/kg-visualization` | 前端图谱展示模块        | C 同学  |
| `feat/query`            | 查询接口模块          | D 同学  |
| `feat/export`           | 图谱导出功能          | D 同学  |
| `chore/docker`          | Docker 构建与部署    | E 同学  |
| `docs/readme`           | 项目文档维护分支        | E 同学  |

---

## 🚀 开发流程（每位成员）

### 1️⃣ 切换并拉取最新 `dev` 分支

```bash
git checkout dev
git pull origin dev
```

### 2️⃣ 基于 `dev` 创建自己的功能分支

```bash
git checkout -b feat/模块名
# 示例：
git checkout -b feat/nlp-extract
```

### 3️⃣ 在分支上开发并提交

```bash
# 修改代码后提交
git add .
git commit -m "feat: 实现实体抽取基本逻辑"
```

### 4️⃣ 推送功能分支到远程

```bash
git push origin feat/nlp-extract
```

---

## 🔁 Pull Request（PR）流程

### 1. 登录 GitHub，发起 PR（选择从功能分支 → dev）

### 2. 填写 PR 标题和说明

### 3. 指定其他人 Review，确保：

* 没有明显语法/逻辑错误
* 遵循模块目录和编码规范
* 没有改动他人代码或主干文件

### 4. 合并 PR 后，所有人更新 `dev`

```bash
git checkout dev
git pull origin dev
```

---

## 🔑 代码提交建议

* 每次提交改动要聚焦一个逻辑点
* 提交信息清晰明了，遵循格式：

  ```
  feat: 添加 xxx 功能
  fix: 修复 xxx 问题
  chore: 优化构建或结构
  doc: 补充文档
  ```

---

## 📋 示例开发流程（以 C 同学为例）

```bash
git checkout dev
git pull origin dev
git checkout -b feat/kg-visualization

# 修改 frontend/js/graph.js
# 添加 D3 图谱渲染逻辑

git add frontend/js/graph.js
git commit -m "feat: 添加图谱交互逻辑"

git push origin feat/kg-visualization
```

---

## ✅ 额外建议

* 多人同时开发时，每天 `pull dev` 保持最新状态
* 避免在 `dev` 和 `main` 上直接开发
* 可使用 GitHub Project 看板同步每个任务状态


