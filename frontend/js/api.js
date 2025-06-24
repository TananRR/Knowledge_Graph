const BASE_URL = "http://127.0.0.1:8000/api";

// 查询节点接口
export async function searchNodes(keyword) {
  const resp = await fetch(`${BASE_URL}/search/?q=${encodeURIComponent(keyword)}`);
  if (!resp.ok) throw new Error("请求失败");
  const data = await resp.json();
  return data.results || [];
}

// 上传 .txt/.pdf 文件并抽取更新图谱
export async function uploadTextFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const resp = await fetch(`${BASE_URL}/upload-file/`, {
    method: "POST",
    body: formData,
  });

  const result = await resp.json();
  return result;
}

// 获取上传后处理好的图谱数据（示例接口）
export async function getKnowledgeGraph(data) {
  const resp = await fetch(`${BASE_URL}/get-json/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"  // ✅ 正确的类型是 application/json
    },
    body: JSON.stringify(data)
  });

  const result = await resp.json();
  return result;
}
