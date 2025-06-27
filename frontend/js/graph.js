import { fetchGraphData, uploadTextFile, searchNodes, downloadGraphJSON
,deleteAllGraphs,deleteGraphById,deleteGraphsByUser,fetchUserGraphIds} from './api.js';

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
      .distance(150)
      .strength(0.8))
    .force("charge", d3.forceManyBody().strength(-500))
    .force("collide", d3.forceCollide().radius(30).strength(0.7))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .alphaDecay(0.05);

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
    .text(d => d.type)
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
  .attr("filter", "url(#nodeGlow)");        // 添加发光效果（需在defs定义）

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
    alert(`实体名称：${d.name}\n类型：${d.type}\nID：${d.id}`);
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
    alert("未找到实体：" + keyword);
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

//export function cancelFocus() {
//  if (!currentData || !simulationRef || !nodeRef || !linkRef) return;
//
//  // 重置所有节点和连线样式
//  nodeRef
//    .attr("stroke", "none")
//    .attr("stroke-width", 1)
//    .attr("fill", d => d.highlight ? "#1f77b4" : (d.type === "Person" ? "#1f77b4" : "#ff7f0e"));
//
//  linkRef
//    .attr("stroke", "#aaa")
//    .attr("stroke-width", 1.5);
//
//  // 重置高亮标记
//  if (currentData.nodes) {
//    currentData.nodes.forEach(entity => {
//      entity.highlight = false;
//    });
//  }
//
//  // 重置模拟
//  simulationRef.alpha(0.1).restart();
//
//  // 重置缩放
//  svgRef.transition()
//    .duration(750)
//    .call(zoomBehavior.transform, d3.zoomIdentity);
//}

/**
 * 将当前知识图谱导出为PNG图片
 * @param {number} [scale=2] - 导出缩放因子，提高可提高清晰度
 * @param {string} [bgColor='white'] - 背景颜色
 */
export async function exportPNG(scale = 2, bgColor = 'white') {
  try {
    // 获取并克隆SVG元素
    const svgElement = document.querySelector("svg");
    const clonedSvg = svgElement.cloneNode(true);

    // 序列化SVG
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clonedSvg);

    // 计算边界和尺寸
    const svgGroup = clonedSvg.querySelector("g");
    const bbox = svgGroup.getBBox();
    const padding = 50;
    const width = Math.ceil(bbox.width + padding * 2);
    const height = Math.ceil(bbox.height + padding * 2);

    // 创建画布
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");

    // 绘制背景
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 调整SVG位置
    const translatedSvgString = svgString.replace(
      '<g>',
      `<g transform="translate(${padding - bbox.x}, ${padding - bbox.y})">`
    );

    // 渲染SVG到画布
    const v = await canvg.Canvg.fromString(ctx, translatedSvgString, {
      ignoreDimensions: true,
      ignoreClear: true,
      scaleWidth: canvas.width,
      scaleHeight: canvas.height,
      ignoreMouse: true,
      ignoreAnimation: true
    });
    await v.render();

    // 触发下载
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `knowledge-graph-${timestamp}.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (error) {
    console.error("PNG导出失败:", error);
    alert(`PNG导出失败: ${error.message}`);
  }
}

/**
 * 将当前知识图谱导出为SVG矢量图
 * @param {boolean} [includeStyles=true] - 是否包含内联样式
 */
export function exportSVG(includeStyles = true) {
  try {
    const svgElement = document.querySelector("svg");
    const clonedSvg = svgElement.cloneNode(true);

    // 可选：移除交互元素
    clonedSvg.querySelectorAll('[event-listener]').forEach(el => {
      el.removeAttribute('event-listener');
    });

    // 序列化SVG
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clonedSvg);

    // 优化SVG字符串
    if (!includeStyles) {
      svgString = svgString.replace(/<style.*?<\/style>/gs, '');
    }

    // 创建下载
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `knowledge-graph-${timestamp}.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();

    // 清理
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);

  } catch (error) {
    console.error("SVG导出失败:", error);
    alert(`SVG导出失败: ${error.message}`);
  }
}


window.handleUpload = async function () {
  const input = document.getElementById("upload-file");
  const file = input.files[0];
  const fileNameDisplay = document.getElementById("file-name"); // 获取文件名显示元素

  if (!file) {
    alert("请先选择文件！");
    return;
  }

  try {
    const result = await uploadTextFile(file);
    if (result.graph_id) {
      alert("上传并更新成功！");
      currentGraphId = result.graph_id;
      document.querySelector("button[onclick='handleSearch()']").disabled = false;

      // 清除文件选择和显示
      input.value = ""; // 重置文件输入框
      fileNameDisplay.textContent = ""; // 清空文件名显示

      try {
        const graphData = await fetchGraphData(currentGraphId);
        console.log("图谱数据：", graphData);
        renderGraph(graphData);
      } catch (err2) {
        alert("获取或渲染图谱失败！");
        console.error("渲染失败：", err2);
      }
    } else {
      alert("上传失败：" + (result.msg || "未知错误"));
    }
  } catch (err) {
    alert("上传请求失败，请检查后端服务");
    console.error("上传失败：", err);
  }
};


// 删除全部图谱
window.handleDeleteAll = async function () {
  if (!confirm("确定删除所有图谱吗？此操作不可恢复！")) return;

  try {
    const result = await deleteAllGraphs(); // 调用接口
    alert(result.message || "所有图谱删除成功");
    d3.select("svg").selectAll("*").remove();
    currentData = null;
    currentGraphId = null;
  } catch (err) {
    alert("删除失败，请检查后端服务");
    console.error(err);
  }
};

// 删除当前子图
window.handleDeleteGraph = async function () {
  if (!currentGraphId) return alert("当前没有选中的图谱！");
  if (!confirm(`确定删除图谱 ${currentGraphId} 吗？`)) return;

  try {
    const result = await deleteGraphById(currentGraphId);
    alert(result.message || "图谱删除成功");
    d3.select("svg").selectAll("*").remove();
    currentData = null;
    currentGraphId = null;
  } catch (err) {
    alert("删除失败！");
    console.error(err);
  }
};

// 删除指定用户图谱（你可以通过 prompt 让用户输入 user_id）
window.handleDeleteByUser = async function () {
  const userId = prompt("请输入要删除的用户 ID：");
  if (!userId) return;

  if (!confirm(`确定删除用户 ${userId} 的所有图谱吗？`)) return;

  try {
    const result = await deleteGraphsByUser(userId);
    alert(result.message || "用户图谱删除成功");
    d3.select("svg").selectAll("*").remove();
    currentData = null;
    currentGraphId = null;
  } catch (err) {
    alert("删除失败！");
    console.error(err);
  }
};


window.handleSearch = async function () {
  const keyword = document.getElementById("searchInput").value.trim();
  if (!keyword) {
    alert("请输入关键词！");
    return;
  }

  try {
    const results = await searchNodes(keyword);
    if (!results.length) {
      alert("未找到相关实体！");
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
    }

  } catch (err) {
    alert("查询失败！");
    console.error(err);
  }
};

window.exportJSON = async function() {
  if (!currentGraphId) {
    alert("没有可导出的图谱");
    return;
  }
  try {
    await downloadGraphJSON(currentGraphId);
  } catch (e) {
    alert("导出失败");
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
    console.error("PNG导出失败:", error);
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
    alert(`导出SVG失败: ${error.message}`);
  }
};


// 页面加载时调用
window.onload = async function () {
  try {
    const data = await fetchUserGraphIds("default_user");
    const graphIds = data.graph_ids || [];

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

    // ✅ 动态填充下拉框
    const select = document.getElementById("graphSelect");
    graphIds.forEach(id => {
      const option = document.createElement("option");
      option.value = id;
      option.text = id;
      select.appendChild(option);
    });

    // 默认选中最后一个并加载
    select.value = graphIds[graphIds.length - 1];
    currentGraphId = select.value;
    const graphData = await fetchGraphData(currentGraphId);
    renderGraph(graphData);

  } catch (err) {
    alert("图谱数据加载失败！");
    console.error(err);
  }
};

// 用户手动选择后点击加载
window.loadSelectedGraph = async function () {
  const select = document.getElementById("graphSelect");
  const selectedId = select.value;
  if (!selectedId) return;

  try {
    currentGraphId = selectedId;
    const graphData = await fetchGraphData(currentGraphId);
    renderGraph(graphData);
  } catch (err) {
    alert("图谱加载失败！");
    console.error(err);
  }
};

