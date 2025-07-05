const BASE_URL = "http://127.0.0.1:8000/api";
// 通用错误处理函数
async function handleResponse(response) {
  if (!response.ok) {
    try {
      const errorData = await response.json();
      throw new Error(errorData.error || "请求失败");
    } catch (err) {
      throw new Error(`HTTP错误 ${response.status}: ${response.statusText}`);
    }
  }
  return response.json();
}

// ✅ 搜索实体（通过关键词）
export async function searchNodes(keyword) {
  if (!keyword.trim()) return [];
  const resp = await fetch(`${BASE_URL}/search/?q=${encodeURIComponent(keyword)}`);
  const data = await handleResponse(resp);
  return data.results || [];
}

export async function uploadTextFile(file, userId) {
  if (!file) throw new Error("未选择文件");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", userId); // 传递用户ID
  console.log([...formData.entries()]); // 这行可以打印出所有formData里的字段，调试用
  const resp = await fetch(`${BASE_URL}/extract/`, {
    method: "POST",
    body: formData
  });

  return handleResponse(resp);
}


// ✅ 查询指定图谱数据（graph_id）
export async function fetchGraphData(graphId) {
  if (!graphId) throw new Error("缺少 graphId");

  const resp = await fetch(`${BASE_URL}/query/graph/?graph_id=${encodeURIComponent(graphId)}`);
  return handleResponse(resp); // 应返回 { nodes: [], links: [] }
}

// ✅ 获取用户图谱 ID 列表
export async function fetchUserGraphIds(userId) {
  const resp = await fetch(`${BASE_URL}/query/user/graph_ids/?user_id=${encodeURIComponent(userId)}`);
  return handleResponse(resp); // 应返回 { graph_ids: [] }
}

// ✅ 获取用户全部图谱结构
export async function fetchUserGraphs(userId) {
  const resp = await fetch(`${BASE_URL}/query/user/graphs/?user_id=${encodeURIComponent(userId)}`);
  return handleResponse(resp); // 应返回 { graphs: [...] }
}

// ✅ 获取系统所有图谱结构
export async function fetchAllGraphs() {
  const resp = await fetch(`${BASE_URL}/query/all/graphs/`);
  return handleResponse(resp); // 应返回 { graphs: [...] }
}

// ✅ 删除全部图谱
export async function deleteAllGraphs() {
  const resp = await fetch(`${BASE_URL}/delete/all/`, {
    method: "DELETE"
  });
  return handleResponse(resp);
}

// ✅ 删除用户
export async function deleteUser(userId, password) {
  const resp = await fetch(`${BASE_URL}/delete_user/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json", // 指定请求类型为 JSON
    },
    body: JSON.stringify({ // 将参数序列化为 JSON
      user_id: userId,
      password: password,
    }),
  });
  return handleResponse(resp);
}

// ✅ 删除指定图谱（通过 graph_id）
export async function deleteGraphById(graphId) {
  if (!graphId) throw new Error("缺少 graphId");
  const resp = await fetch(`${BASE_URL}/delete/graph/?graph_id=${encodeURIComponent(graphId)}`, {
    method: "DELETE"
  });
  return handleResponse(resp);
}

// ✅ 删除指定用户的图谱
export async function deleteGraphsByUser(userId) {
  if (!userId) throw new Error("缺少 userId");
  const resp = await fetch(`${BASE_URL}/delete/user/?user_id=${encodeURIComponent(userId)}`, {
    method: "DELETE"
  });
  return handleResponse(resp);
}

// ✅ 导出图谱为 JSON 文件
export async function downloadGraphJSON(graphId) {
  if (!graphId) throw new Error("缺少 graphId");

  const resp = await fetch(`${BASE_URL}/export/?graph_id=${encodeURIComponent(graphId)}`);
  const json = await handleResponse(resp);

  const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `graph_${graphId}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function deleteNode(graphId, nodeId) {
  const resp = await fetch(`${BASE_URL}/delete_node/?graph_id=${graphId}&node_id=${nodeId}`, {
    method: "DELETE"
  });
  return handleResponse(resp);
}

export async function addNode(graphId, newNode, link) {
  const payload = {
    graph_id: graphId,
    source_node_id: link.source,
    link: link.label,
    new_node: {
      name: newNode.name,
      type: newNode.type || "Entity",
      similarity: newNode.similarity || 1.0,
      user_id: newNode.user_id || "anonymous",
      verb: newNode.verb || link.label
    }
  };

  const resp = await fetch(`${BASE_URL}/add_node/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.message || "请求失败");
  }

  return resp.json();
}



