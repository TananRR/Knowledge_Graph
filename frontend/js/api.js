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

// 查询节点接口
export async function searchNodes(keyword) {
  if (!keyword.trim()) return [];

  try {
    const resp = await fetch(`${BASE_URL}/search/?q=${encodeURIComponent(keyword)}`);
    const data = await handleResponse(resp);
    return data.results || [];
  } catch (error) {
    console.error("搜索节点失败:", error);
    throw error;
  }
}

// 上传 .txt/.pdf 文件并抽取更新图谱
export async function uploadTextFile(file, onProgress = () => {}) {
  if (!file) throw new Error("没有选择文件");

  const formData = new FormData();
  formData.append("file", file);

  try {
    // 使用AbortController支持取消上传
    const controller = new AbortController();
    const signal = controller.signal;

    const resp = await fetch(`${BASE_URL}/extract/`, {
      method: "POST",
      body: formData,
      signal: signal
    });

    return await handleResponse(resp);
  } catch (error) {
    console.error("上传文件失败:", error);
    throw error;
  }
}

// 导出 JSON 文件（触发下载）
export async function downloadGraphJSON() {
  try {
    const url = `${BASE_URL}/export/?download=true`;
    const link = document.createElement("a");
    link.href = url;
    link.download = "knowledge_graph_export.json";

    // 使用document.body.appendChild确保兼容性
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("导出JSON失败:", error);
    throw error;
  }
}

// 加载图谱数据（用于可视化）
export async function fetchGraphData() {
  try {
    const response = await fetch(`${BASE_URL}/export/`);
    const rawData = await handleResponse(response);

    // 处理节点和关系
    const nodesMap = new Map();
    const relations = [];

    // 检查数据格式是否正确
    if (!Array.isArray(rawData)) {
      console.warn("数据格式不符合预期:", rawData);
      return { entities: [], relations: [] };
    }

    // 处理每个关系记录
    rawData.forEach(item => {
      // 确保记录结构完整
      if (!item.node1 || !item.node2 || !item.relationship) return;

      const node1 = item.node1;
      const node2 = item.node2;
      const rel = item.relationship;

      // 使用ID作为唯一标识，而非名称
      const node1Id = node1.id || node1.name;
      const node2Id = node2.id || node2.name;

      // 添加节点1（如果不存在）
      if (!nodesMap.has(node1Id)) {
        nodesMap.set(node1Id, {
          id: node1Id,
          ...node1,
          // 自动检测节点类型
          type: node1.country ? "Location" : (node1.age ? "Person" : "Interest")
        });
      }

      // 添加节点2（如果不存在）
      if (!nodesMap.has(node2Id)) {
        nodesMap.set(node2Id, {
          id: node2Id,
          ...node2,
          // 自动检测节点类型
          type: node2.country ? "Location" : (node2.age ? "Person" : "Interest")
        });
      }

      // 添加关系
      relations.push({
        id: `${node1Id}_${rel.type}_${node2Id}`,
        source: node1Id,
        target: node2Id,
        type: rel.type
      });
    });

    return {
      entities: Array.from(nodesMap.values()),
      relations
    };
  } catch (error) {
    console.error("获取图谱数据失败:", error);
    throw error;
  }
}