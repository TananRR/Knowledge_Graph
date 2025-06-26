# 用户认证与管理接口文档

---

## 1. 用户登录

- **接口地址**：`/kgapi/login/`
- **请求方法**：POST
- **请求类型**：`application/json` 或 `application/x-www-form-urlencoded`
- **请求参数**：

| 参数名    | 类型   | 是否必填 | 说明     |
|-----------|--------|----------|----------|
| user_id   | string | 是       | 用户名   |
| password  | string | 是       | 密码     |

- **请求示例（JSON）**：

{
  "user_id": "testuser",
  "password": "123456"
}

- **响应示例（成功）**：

```json
{
  "message": "登录成功",
  "user_id": "testuser"
}
```

- **响应示例（失败）**：

```json
{
  "error": "用户名或密码错误"
}
```

---

## 2. 用户注册

- **接口地址**：`/kgapi/register/`
- **请求方法**：POST
- **请求类型**：`application/json` 或 `application/x-www-form-urlencoded`
- **请求参数**：

| 参数名    | 类型   | 是否必填 | 说明     |
|-----------|--------|----------|----------|
| user_id   | string | 是       | 用户名   |
| password  | string | 是       | 密码     |

- **请求示例（JSON）**：

```json
{
  "user_id": "newuser",
  "password": "123456"
}
```

- **响应示例（成功）**：

```json
{
  "message": "注册成功",
  "user_id": "newuser"
}
```

- **响应示例（用户已存在）**：

```json
{
  "error": "用户已存在"
}
```

---

## 3. 删除用户

- **接口地址**：`/kgapi/delete_user/`
- **请求方法**：POST
- **请求类型**：`application/json` 或 `application/x-www-form-urlencoded`
- **请求参数**：

| 参数名    | 类型   | 是否必填 | 说明     |
|-----------|--------|----------|----------|
| user_id   | string | 是       | 用户名   |
| password  | string | 是       | 密码     |

- **请求示例（JSON）**：

```json
{
  "user_id": "testuser",
  "password": "123456"
}
```

- **响应示例（成功）**：

```json
{
  "message": "用户已删除",
  "user_id": "testuser"
}
```

- **响应示例（失败）**：

```json
{
  "error": "用户名或密码错误"
}
```

---

## 4. 修改密码

- **接口地址**：`/kgapi/change_password/`
- **请求方法**：POST
- **请求类型**：`application/json` 或 `application/x-www-form-urlencoded`
- **请求参数**：

| 参数名       | 类型   | 是否必填 | 说明     |
|--------------|--------|----------|----------|
| user_id      | string | 是       | 用户名   |
| old_password | string | 是       | 原密码   |
| new_password | string | 是       | 新密码   |

- **请求示例（JSON）**：

```json
{
  "user_id": "testuser",
  "old_password": "123456",
  "new_password": "654321"
}
```

- **响应示例（成功）**：

```json
{
  "message": "密码修改成功",
  "user_id": "testuser"
}
```

- **响应示例（失败）**：

```json
{
  "error": "用户名或原密码错误"
}
```

---

## 图谱删除相关接口

### 1. 删除所有图谱

- **接口地址**：`/api/delete/all/`
- **请求方法**：DELETE
- **请求类型**：无特殊要求
- **请求参数**：无

- **响应示例（成功）**：

```json
{
  "message": "所有图谱已成功删除。"
}
```

- **响应示例（失败）**：

```json
{
  "error": "错误信息"
}
```

---

### 2. 按图谱ID删除单个图谱

- **接口地址**：`/api/delete/graph/`
- **请求方法**：DELETE
- **请求类型**：无特殊要求
- **请求参数**：

| 参数名    | 类型   | 是否必填 | 说明     |
|-----------|--------|----------|----------|
| graph_id  | string | 是       | 图谱ID   |

- **请求示例**：

```
DELETE /api/delete/graph/?graph_id=graph_20240601123456
```

- **响应示例（成功）**：

```json
{
  "message": "图谱 graph_id=graph_20240601123456 已成功删除。"
}
```

- **响应示例（失败）**：

```json
{
  "error": "graph_id 参数缺失"
}
```

---

### 3. 按用户ID删除该用户的所有图谱

- **接口地址**：`/api/delete/user/`
- **请求方法**：DELETE
- **请求类型**：无特殊要求
- **请求参数**：

| 参数名    | 类型   | 是否必填 | 说明     |
|-----------|--------|----------|----------|
| user_id   | string | 是       | 用户ID   |

- **请求示例**：

```
DELETE /api/delete/user/?user_id=testuser
```

- **响应示例（成功）**：

```json
{
  "message": "用户 user_id=testuser 的所有图谱已成功删除。"
}
```

- **响应示例（失败）**：

```json
{
  "error": "user_id 参数缺失"
}
```

---

## 文件抽取与图谱构建接口

### 1. 上传文件并抽取知识、构建图谱

- **接口地址**：`/api/upload/`
- **请求方法**：POST
- **请求类型**：`multipart/form-data`
- **请求参数**：

| 参数名    | 类型   | 是否必填 | 说明         |
|-----------|--------|----------|--------------|
| file      | file   | 是       | 支持txt/pdf/docx|
| user_id   | string | 否       | 用户ID，默认default_user |

- **请求示例**：

表单上传 `file` 文件，`user_id` 可选。

- **响应示例（成功）**：

```json
{
  "text": "文件内容文本",
  "entities": [ ... ],
  "relations": [ ... ],
  "message": "构建成功",
  "graph_id": "graph_20240601123456"
}
```

- **响应示例（失败）**：

```json
{
  "error": "No file provided"
}
```

或

```json
{
  "error": "Unsupported file format"
}
```








