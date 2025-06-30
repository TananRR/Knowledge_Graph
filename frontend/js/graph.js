import { fetchGraphData, uploadTextFile, searchNodes, downloadGraphJSON
,deleteAllGraphs,deleteGraphById,deleteGraphsByUser,fetchUserGraphIds,fetchUserGraphs} from './api.js';

let currentGraphId = null;  // 新增：当前图谱ID
let currentData = null;
let simulationRef = null;
let nodeRef = null;
let linkRef = null;
let svgRef = null;
let zoomBehavior = null;

// graph.js 顶部（在绘制函数之前）
const colorMap = {

  "Person": "#A8C5EB",      // 人物 - 淡雅天蓝
  "Organization": "#F5B8C6", // 组织 - 樱花粉
  "Location": "#9DD3F3",    // 地点 - 清澈水蓝
  "Event": "#C7B3D2",       // 事件 - 薰衣草紫
  "Concept": "#A3D8E0",     // 概念 - 薄荷蓝绿
  "DATE": "#F0C987",        // 日期 - 琥珀黄
  "Number": "#B8D9A8",      // 数字 - 新芽绿
  "Work": "#D8B3D8"         // 作品 - 丁香紫

};

// 默认颜色（未匹配类型时使用）
const defaultColor = "#64748b";
export function renderGraph(graphData) {
  d3.select("svg").selectAll("*").remove();

  const svg = d3.select("svg");
  const width = window.innerWidth;
  const height = window.innerHeight;

  svgRef = svg;
  const container = svg.append("g");

  zoomBehavior = d3.zoom()
    .scaleExtent([0.1, 5])
    .on("zoom", (event) => {
      container.attr("transform", event.transform);
    });

  svg.call(zoomBehavior);

  // 定义箭头标记
// 定义两种箭头标记（普通和高亮）
const defs = svg.append("defs");

// 普通箭头
defs.append("marker")
  .attr("id", "arrow-normal")
  .attr("viewBox", "0 -5 10 10")
  .attr("refX", 30)
  .attr("refY", 0)
  .attr("markerWidth", 8)
  .attr("markerHeight", 8)
  .attr("orient", "auto")
  .append("path")
  .attr("d", "M0,-5L10,0L0,5")
  .attr("fill", "#999");

defs.append("marker")
  .attr("id", "arrow-dark")
  .attr("viewBox", "0 -5 10 10")
  .attr("refX", 30)
  .attr("refY", 0)
  .attr("markerWidth", 8)
  .attr("markerHeight", 8)
  .attr("orient", "auto")
  .append("path")
  .attr("d", "M0,-5L10,0L0,5")
  .attr("fill", "#e0e0e0");
// 高亮箭头
defs.append("marker")
  .attr("id", "arrow-highlight")
  .attr("viewBox", "0 -5 10 10")
  .attr("refX", 30)
  .attr("refY", 0)
  .attr("markerWidth", 8)
  .attr("markerHeight", 8)
  .attr("orient", "auto")
  .append("path")
  .attr("d", "M0,-5L10,0L0,5")
  .attr("fill", "#78909C");

  // 验证数据
if (!graphData || !graphData.nodes || !graphData.links) {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "#f00")
    .text("错误：无效的图谱数据");
  return;
}


  currentData = graphData;

  // 创建力导向图模拟
 const simulation = d3.forceSimulation(graphData.nodes)
  .force("link", d3.forceLink(graphData.links)
    .id(d => d.id)
    .distance(50)
    .strength(1.1))
  .force("charge", d3.forceManyBody().strength(-50))
  .force("collide", d3.forceCollide().radius(50).strength(1.1))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .alphaDecay(0.03);


  simulationRef = simulation;

// 画关系线 - 初始使用普通箭头
const link = container.append("g")
  .selectAll("line")
  .data(graphData.links)
  .enter()
  .append("line")
  .attr("stroke", "rgba(120,120,120,0.3)")
  .attr("stroke-width", 0.8)
  .attr("marker-end", "url(#arrow-normal)"); // 初始使用普通箭头

  linkRef = link;

  // 关系文本标签
  const linkLabel = container.append("g")
    .selectAll("text")
    .data(graphData.links)
    .enter()
    .append("text")
    .text(d => d.label)
    .attr("font-size", 10)
    .attr("fill", "#666");
  // 画节点圆圈
const node = container.append("g")
  .selectAll("circle")
  .data(graphData.nodes)
  .enter()
  .append("circle")
  .attr("r", d => {
    // 按类型分级大小
    if (d.type === "Person") return 15;
    if (d.type === "Organization") return 15;
    return 14;
  })
  .attr("fill", d => colorMap[d.type] || defaultColor)
  .attr("stroke", d => d3.color(colorMap[d.type] || defaultColor).darker(0.5)) // 深色边框
  .attr("stroke-width", 1.5)

  nodeRef = node;
// 在 node 定义后添加：
const drag = d3.drag()
  .on("start", dragStarted)
  .on("drag", dragged)
  .on("end", dragEnded);

node.call(drag);
  // 节点文字标签
const label = container.append("g")
  .selectAll("text")
  .data(graphData.nodes)
  .enter()
  .append("text")
  .text(d => d.name)
  .attr("font-size", 11)
  .attr("dx", 25)                          // 更近的标签距离
  .attr("dy", ".3em")
  .attr("fill", "#222")                    // 更深的文字颜色
  .attr("font-weight", "bold")             // 加粗
  .attr("paint-order", "stroke")           // 文字描边（提高可读性）
  .attr("stroke", "white")
  .attr("stroke-width", 1);




  // 模拟更新函数
  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    label
      .attr("x", d => d.x)
      .attr("y", d => d.y);

    linkLabel
      .attr("x", d => (d.source.x + d.target.x) / 2)
      .attr("y", d => (d.source.y + d.target.y) / 2);
  });

  // 交互事件
  node.on("click", (event, d) => {
    Swal.fire({
    title: `实体：${d.name}`,
    html: `<b>类型：</b>${d.type}<br><b>ID：</b>${d.id}`,
    icon: 'info',
    confirmButtonText: '关闭'
  });
  });

  node
node
  .on("mouseover", function(event, d) {
    // 设置节点透明度
    node.attr("opacity", o =>
      o.id === d.id || graphData.links.some(rel =>
        (rel.source.id === d.id && rel.target.id === o.id) ||
        (rel.target.id === d.id && rel.source.id === o.id)
      ) ? 1 : 0.2
    );

    // 更新连线和箭头
    link
      .attr("stroke", rel =>
        rel.source.id === d.id || rel.target.id === d.id ? "#78909C" : "#e0e0e0"
      )
      .attr("marker-end", rel =>
        rel.source.id === d.id || rel.target.id === d.id
          ? "url(#arrow-highlight)"
          : "url(#arrow-dark)"
      );
  })
  .on("mouseout", function() {
    // 恢复默认状态
    node.attr("opacity", 1);
    link
      .attr("stroke", "rgba(120,120,120,0.3)")
      .attr("marker-end", "url(#arrow-normal)");
  });
  // 拖拽函数
  function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
}

export function focusNode() {
  const keyword = document.getElementById("searchInput").value.trim();
  if (!keyword || !currentData || !simulationRef || !nodeRef || !linkRef) return;

  const match = currentData.nodes.find(n => n.name.includes(keyword));
  if (!match) {
     Swal.fire({
    icon: 'warning',
    title: '未找到实体',
    text: `关键词：${keyword}`,
    confirmButtonText: '确定'
  });
    return;
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const simulation = simulationRef;
  const svg = svgRef;

  // 确保节点有有效坐标
  if (isNaN(match.x) || isNaN(match.y)) {
    match.x = width / 2;
    match.y = height / 2;
  }

  // 暂停模拟并清除所有固定位置
  simulation.stop();
  currentData.nodes.forEach(node => {
    node.fx = null;
    node.fy = null;
  });

  // 固定焦点节点在中心
  match.fx = width / 2;
  match.fy = height / 2;

  // 获取邻居节点并确保有有效坐标
  const neighbors = currentData.links
    .filter(rel => rel.source.id === match.id || rel.target.id === match.id)
    .map(rel => (rel.source.id === match.id ? rel.target : rel.source))
    .map(node => {
      if (isNaN(node.x)) node.x = match.x + (Math.random() - 0.5) * 100;
      if (isNaN(node.y)) node.y = match.y + (Math.random() - 0.5) * 100;
      return node;
    });

  // 环形布局邻居节点
  const radius = Math.min(200, 50 + neighbors.length * 20);
  const angleStep = (2 * Math.PI) / neighbors.length;
  neighbors.forEach((neighbor, i) => {
    const angle = i * angleStep;
    neighbor.fx = match.fx + radius * Math.cos(angle);
    neighbor.fy = match.fy + radius * Math.sin(angle);
  });

  // 重新初始化力导向图
  simulation
    .force("link", d3.forceLink(currentData.links).id(d => d.id).distance(150))
    .alpha(1)
    .restart();

  // 强制更新连线位置
  simulation.tick(10); // 执行10次迭代以稳定布局

  // 应用缩放变换
  const scale = 1.5;
  const translateX = width / 2 - scale * match.x;
  const translateY = height / 2 - scale * match.y;

  svg.transition()
    .duration(750)
    .call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(translateX, translateY).scale(scale)
    )
    .on("end", () => {
      setTimeout(() => {
        // 释放固定位置，让布局自然发展
        match.fx = null;
        match.fy = null;
        neighbors.forEach(n => {
          n.fx = null;
          n.fy = null;
        });
        simulation.alpha(0.3).restart();
      }, 1000);
    });

  // 高亮显示
  nodeRef
    .attr("stroke", d =>
      d.id === match.id || neighbors.some(n => n.id === d.id) ? "#fe865c" : "none"
    )
    .attr("stroke-width", d =>
      d.id === match.id || neighbors.some(n => n.id === d.id) ? 3 : 1
    );

}

export async function loadGraphList(userId) {
  const select = document.getElementById("graphSelect");
select.innerHTML = "";  // 清空之前的选项

  try {
    const data = await fetchUserGraphIds(userId);
    const graphIds = data.graph_ids || [];

    // ✅ 只有在用户有两个及以上图谱时，才添加“加载所有图谱”
    if (graphIds.length >= 2) {
      const allOption = document.createElement("option");
      allOption.value = "all";
      allOption.text = "加载所有图谱";
      select.appendChild(allOption);
    }

    // 添加每个图谱选项
    graphIds.forEach(id => {
      const option = document.createElement("option");
      option.value = id;
      option.text = id;
      select.appendChild(option);
    });

    console.log("已刷新图谱下拉列表：", graphIds);
    return graphIds;

  } catch (err) {
    console.error("加载用户图谱列表失败：", err);
    alert("加载用户图谱列表失败！");
    return [];
  }
}

window.handleUpload = async function () {
  const input = document.getElementById("upload-file");
  const file = input.files[0];
  const fileNameDisplay = document.getElementById("file-name"); // 获取文件名显示元素

  if (!file) {
     Swal.fire({ icon: 'warning', title: '请先选择文件！' });
    return;
  }

  const userId = sessionStorage.getItem('currentUser') || "default_user";

  try {
    const result = await uploadTextFile(file,userId);
    if (result.graph_id) {
      Swal.fire({ icon: 'success', title: '上传并更新成功！' });
      currentGraphId = result.graph_id;
      document.querySelector("button[onclick='handleSearch()']").disabled = false;

      // 清除文件选择和显示
      input.value = ""; // 重置文件输入框
      fileNameDisplay.textContent = ""; // 清空文件名显示

      // ✅ 上传成功后，刷新图谱下拉列表
      await loadGraphList(userId);

      // ✅ 重新选中当前图谱
      const select = document.getElementById("graphSelect");
      select.value = currentGraphId;

      try {
        const graphData = await fetchGraphData(currentGraphId);
        console.log("图谱数据：", graphData);
        renderGraph(graphData);
      } catch (err2) {
        alert("获取或渲染图谱失败！");
        console.error("渲染失败：", err2);
      }
    } else {
      Swal.fire({ icon: 'error', title: '上传失败', text: result.msg || '未知错误' });
    }
  } catch (err) {
     Swal.fire({ icon: 'error', title: '上传请求失败', text: '请检查后端服务' });
    console.error("上传失败：", err);
  }
};

// 删除当前子图
window.handleDeleteGraph = async function () {
const userId = sessionStorage.getItem('currentUser') || "default_user";
 if (!currentGraphId) {
  Swal.fire({ icon: 'warning', title: '当前没有选中的图谱！' });
  return;
}
Swal.fire({
  title: `确定删除图谱 ${currentGraphId} 吗？`,
  icon: 'warning',
  showCancelButton: true,
  confirmButtonText: '确定',
  cancelButtonText: '取消'
}).then((res) => {
  if (!res.isConfirmed) return;
  deleteGraphById(currentGraphId)
    .then(async result => {
      Swal.fire({ icon: 'success', title: '图谱删除成功', text: result.message });
      d3.select("svg").selectAll("*").remove();
      currentData = null;
      currentGraphId = null;
      // ✅ 删除成功后，刷新图谱下拉列表
      await loadGraphList(userId);
    })
    .catch(err => {
      Swal.fire({ icon: 'error', title: '删除失败！' });
      console.error(err);
    });
});

};

// 删除指定用户图谱（你可以通过 prompt 让用户输入 user_id）
window.handleDeleteByUser = async function () {
const userId = sessionStorage.getItem('currentUser') || "default_user";
if (!userId) return;

// 使用 SweetAlert 弹出确认框
Swal.fire({
  title: '确认删除？',
  text: '确定删除所有图谱吗？此操作无法撤销！',
  icon: 'warning',
  showCancelButton: true,
  confirmButtonColor: '#d33',
  cancelButtonColor: '#00a8e6',
  confirmButtonText: '是的，删除',
  cancelButtonText: '取消'
}).then(async (result) => {
  if (result.isConfirmed) {
    try {
      const res = await deleteGraphsByUser(userId);
      await Swal.fire({
        title: '删除成功',
        text: res.message || "用户图谱已成功删除",
        icon: 'success',
        confirmButtonText: '确定'
      });

      d3.select("svg").selectAll("*").remove();
      currentData = null;
      currentGraphId = null;
        // ✅ 删除成功后，刷新图谱下拉列表
      await loadGraphList(userId);
    } catch (err) {
      await Swal.fire({
        title: '删除失败',
        text: '发生错误，请稍后再试',
        icon: 'error',
        confirmButtonText: '确定'
      });
      console.error(err);
    }
  }
});
};

window.handleSearch = async function () {
  const keyword = document.getElementById("searchInput").value.trim();
  if (!keyword) {
    Swal.fire({ icon: 'warning', title: '请输入关键词！' });
    return;
  }

  try {
    const results = await searchNodes(keyword);
    if (!results.length) {
      Swal.fire({ icon: 'info', title: '未找到相关实体！' });
      return;
    }

    // 高亮匹配的节点，而不是添加新节点
    const matchedIds = results.map(d => d.id);
    if (currentData && currentData.nodes) {
      currentData.nodes.forEach(entity => {
        entity.highlight = matchedIds.includes(entity.id);
      });

      // 更新节点样式
      nodeRef.attr("fill", d =>
        d.highlight ?  "#FFDC90":"#009ac8" );

      // 如果有匹配结果，聚焦到第一个匹配节点
      document.getElementById("searchInput").value = results[0].name;
      focusNode();
      document.getElementById("searchInput").value = "";

    }

  } catch (err) {
    Swal.fire({ icon: 'error', title: '查询失败！' });
    console.error(err);
  }
};

window.exportJSON = async function() {
  if (!currentGraphId) {
    Swal.fire({ icon: 'warning', title: '没有可导出的图谱' });
    return;
  }
  try {
    await downloadGraphJSON(currentGraphId);
  } catch (e) {
   Swal.fire({ icon: 'error', title: '导出失败' });
    console.error(e);
  }
};

window.exportPNG = async function() {
  try {
    // 1. 获取并克隆SVG元素
    const svgElement = document.querySelector("svg");
    const clonedSvg = svgElement.cloneNode(true);

    // 2. 添加白色背景矩形作为第一个元素
    const svgNS = "http://www.w3.org/2000/svg";
    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", "#FFFFFF");
    clonedSvg.insertBefore(rect, clonedSvg.firstChild);

    // 3. 计算边界和尺寸
    const svgGroup = clonedSvg.querySelector("g");
    const bbox = svgGroup.getBBox();
    const padding = 50;
    const width = Math.ceil(bbox.width + padding * 2);
    const height = Math.ceil(bbox.height + padding * 2);

    // 4. 创建画布并设置尺寸
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext("2d");

    // 5. 填充背景色
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 6. 调整SVG位置并序列化
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clonedSvg);
    svgString = svgString.replace(
      '<g>',
      `<g transform="translate(${padding - bbox.x}, ${padding - bbox.y})">`
    );

    // 7. 使用canvg渲染
    const v = await canvg.Canvg.fromString(ctx, svgString, {
      ignoreDimensions: true,
      ignoreClear: true,
      scaleWidth: width * 2,
      scaleHeight: height * 2,
      ignoreMouse: true,
      ignoreAnimation: true
    });

    // 8. 等待渲染完成
    await v.render();
    await new Promise(resolve => setTimeout(resolve, 500)); // 额外等待时间

    // 9. 触发下载
    const link = document.createElement("a");
    link.download = `knowledge-graph-${new Date().toISOString().slice(0, 19)}.png`;
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (error) {
    Swal.fire({ icon: 'error', title: '导出失败' });
    alert(`导出失败: ${error.message}`);
  }
}

window.exportSVG = async function() {
  try {
    // 获取 SVG 元素
    const svgElement = document.querySelector("svg");
    if (!svgElement) {
      throw new Error("未找到SVG元素");
    }

    // 克隆 SVG 以避免影响原 DOM
    const clonedSvg = svgElement.cloneNode(true);

    // 添加 XML 命名空间，确保在导出后可正确被各平台解析
    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    // 序列化 SVG
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clonedSvg);

    // 添加 XML 声明
    svgString = '<?xml version="1.0" standalone="no"?>\n' + svgString;

    // 创建 Blob 并生成 URL
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    // 创建下载链接
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `knowledge-graph-${timestamp}.svg`;
    link.href = url;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 释放 URL 对象
    URL.revokeObjectURL(url);

    console.log("导出SVG成功");

  } catch (error) {
    console.error("导出SVG失败:", error);
    Swal.fire({ icon: 'error', title: '导出失败' });
  }
};

// 页面加载时调用
window.onload = async function () {
  const userId = sessionStorage.getItem('currentUser') || "default_user";

  try {
    const graphIds = await loadGraphList(userId);

    if (!graphIds.length) {
      d3.select("svg").selectAll("*").remove();
      d3.select("svg").append("text")
        .attr("x", window.innerWidth / 2)
        .attr("y", window.innerHeight / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("fill", "#666")
        .text("图谱中没有数据，请先上传数据");
      return;
    }

    // 默认选中最后一个并加载
    const select = document.getElementById("graphSelect");
    select.value = graphIds[graphIds.length - 1];
    currentGraphId = select.value;

    const graphData = await fetchGraphData(currentGraphId);
    renderGraph(graphData);

  } catch (err) {
     Swal.fire({ icon: 'error', title: '图谱数据加载失败！' });
    console.error(err);
  }
};

// 用户手动选择后点击加载
window.loadSelectedGraph = async function () {
  const select = document.getElementById("graphSelect");
  const selectedId = select.value;
  if (!selectedId) return;

  try {
    if (selectedId === "all") {
      const userId = sessionStorage.getItem('currentUser') || "default_user";
      const allGraphs = await fetchUserGraphs(userId); // 返回的是数组

      if (!Array.isArray(allGraphs)) {
        throw new Error("返回格式错误：预期为图谱数组");
      }

      // 合并所有图谱的节点与关系
      const mergedData = {
        nodes: [],
        links: []
      };

      const nodeMap = new Map(); // 避免重复节点
      const linkSet = new Set(); // 避免重复边

      for (const graph of allGraphs) {
        for (const node of graph.nodes) {
          if (!nodeMap.has(node.id)) {
            nodeMap.set(node.id, node);
          }
        }
        for (const link of graph.links) {
          const key = `${link.source}->${link.target}`;
          if (!linkSet.has(key)) {
            linkSet.add(key);
            mergedData.links.push(link);
          }
        }
      }

      mergedData.nodes = Array.from(nodeMap.values());

      currentGraphId = "all";
      renderGraph(mergedData);
    } else {
      currentGraphId = selectedId;
      const graphData = await fetchGraphData(currentGraphId);
      renderGraph(graphData);
    }
  } catch (err) {
 Swal.fire({
  icon: 'error',
  title: '图谱加载失败',
  text: error.message
});
    console.error(err);
  }
};


