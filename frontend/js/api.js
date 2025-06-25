// api.js
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

// 导出 JSON 文件（触发下载）
export function downloadGraphJSON() {
  const url = "http://127.0.0.1:8000/export/?download=true";

  const link = document.createElement("a");
  link.href = url;
  link.download = "knowledge_graph_export.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 加载图谱数据（用于可视化）
export async function fetchGraphData() {
  const resp = await fetch("http://127.0.0.1:8000/api/export/");
  if (!resp.ok) throw new Error("加载图谱数据失败");

  const rawData = await resp.json();

  const entities = [];
  const relations = [];

  rawData.forEach(item => {
    const n1 = item.node1;
    const n2 = item.node2;
    const rel = item.relationship;

    if (!entities.find(e => e.id === n1.id)) {
      entities.push({ id: n1.id, name: n1.name, type: n1.label || "Entity" });
    }
    if (!entities.find(e => e.id === n2.id)) {
      entities.push({ id: n2.id, name: n2.name, type: n2.label || "Entity" });
    }

    relations.push({
      source: n1.id,
      target: n2.id,
      type: rel.type || "关系"
    });
  });

  return { entities, relations };
}
