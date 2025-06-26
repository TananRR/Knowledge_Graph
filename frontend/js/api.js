const BASE_URL = "http://127.0.0.1:8000/api";

// 通用错误处理
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

// 关键词搜索节点
export async function searchNodes(keyword) {
  if (!keyword.trim()) return [];
  const resp = await fetch(`${BASE_URL}/search/?q=${encodeURIComponent(keyword)}`);
  return handleResponse(resp).then(data => data.results || []);
}

// 上传文本文件并提取图谱
export async function uploadTextFile(file, onProgress = () => {}) {
  if (!file) throw new Error("未选择文件");

  const formData = new FormData();
  formData.append("file", file);

  const resp = await fetch(`${BASE_URL}/upload/`, {
    method: "POST",
    body: formData
  });

  return handleResponse(resp);
}

// 拉取指定图谱数据
export async function fetchGraphData(graphId) {
  if (!graphId) throw new Error("缺少 graphId");

  const resp = await fetch(`${BASE_URL}/graph/${graphId}`);
  return handleResponse(resp); // { nodes: [], links: [] }
}

// 删除图谱
// 删除所有图谱 ✅ OK
export async function deleteAllGraph() {
  const resp = await fetch(`${BASE_URL}/delete/all/`, {
    method: "DELETE"
  });
  return handleResponse(resp);
}

// 删除某个图谱 ✅ 使用 GET 参数传 graph_id
export async function deleteGraphById(graphId) {
  const resp = await fetch(`${BASE_URL}/delete/graph/?graph_id=${encodeURIComponent(graphId)}`, {
    method: "DELETE"
  });
  return handleResponse(resp);
}

// 删除某用户的图谱 ✅ 使用 GET 参数传 user_id
export async function deleteGraphByUser(userId) {
  const resp = await fetch(`${BASE_URL}/delete/user/?user_id=${encodeURIComponent(userId)}`, {
    method: "DELETE"
  });
  return handleResponse(resp);
}



// 导出图谱 JSON 文件
export async function downloadGraphJSON(graphId) {
  if (!graphId) throw new Error("缺少 graphId");
  const resp = await fetch(`${BASE_URL}/export/${graphId}`);
  const json = await handleResponse(resp);

  const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `graph_${graphId}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
