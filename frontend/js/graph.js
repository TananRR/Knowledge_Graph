import { fetchGraphData, uploadTextFile, searchNodes, downloadGraphJSON
,deleteAllGraphs,deleteGraphById,deleteGraphsByUser,fetchUserGraphIds} from './api.js';

let currentGraphId = null;  // 新增：当前图谱ID
let currentData = null;
let simulationRef = null;
let nodeRef = null;
let linkRef = null;
let svgRef = null;
let zoomBehavior = null;

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
  svg.append("defs").append("marker")
    .attr("id", "arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 25)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#aaa");

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

  // 画关系线
  const link = container.append("g")
    .selectAll("line")
    .data(graphData.links)
    .enter()
    .append("line")
    .attr("stroke", "#aaa")
    .attr("stroke-width", 1.5)
    .attr("marker-end", "url(#arrow)");

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
    .attr("r", d => d.type === "Person" ? 20 : 15) // 人节点稍大
    .attr("fill", d => {
      switch(d.type) {
        case "Person": return "#1f77b4";
        case "Location": return "#ff7f0e";
        case "Interest": return "#2ca02c";
        default: return "#9467bd";
      }
    })
    .call(d3.drag()
      .on("start", dragStarted)
      .on("drag", dragged)
      .on("end", dragEnded));

  nodeRef = node;

  // 节点文字标签
  const label = container.append("g")
    .selectAll("text")
    .data(graphData.nodes)
    .enter()
    .append("text")
    .text(d => d.name)
    .attr("font-size", 12)
    .attr("dx", 25)
    .attr("dy", ".35em");

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
    .on("mouseover", function(event, d) {
      node.attr("opacity", o =>
        o.id === d.id || graphData.links.some(rel =>
          (rel.source.id === d.id && rel.target.id === o.id) ||
          (rel.target.id === d.id && rel.source.id === o.id)
        ) ? 1 : 0.2
      );
      link.attr("stroke", rel =>
        rel.source.id === d.id || rel.target.id === d.id ? "#f00" : "#aaa"
      );
    })
    .on("mouseout", () => {
      node.attr("opacity", 1);
      link.attr("stroke", "#aaa");
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
      d.id === match.id || neighbors.some(n => n.id === d.id) ? "#ff0000" : "none"
    )
    .attr("stroke-width", d =>
      d.id === match.id || neighbors.some(n => n.id === d.id) ? 3 : 1
    );

  linkRef
    .attr("stroke", d =>
      d.source.id === match.id || d.target.id === match.id ? "#f00" : "#aaa"
    )
    .attr("stroke-width", d =>
      d.source.id === match.id || d.target.id === match.id ? 2.5 : 1.5
    );
}

export function cancelFocus() {
  if (!currentData || !simulationRef || !nodeRef || !linkRef) return;

  // 重置所有节点和连线样式
  nodeRef
    .attr("stroke", "none")
    .attr("stroke-width", 1)
    .attr("fill", d => d.highlight ? "#1f77b4" : (d.type === "Person" ? "#1f77b4" : "#ff7f0e"));

  linkRef
    .attr("stroke", "#aaa")
    .attr("stroke-width", 1.5);

  // 重置高亮标记
  if (currentData.nodes) {
    currentData.nodes.forEach(entity => {
      entity.highlight = false;
    });
  }

  // 重置模拟
  simulationRef.alpha(0.1).restart();

  // 重置缩放
  svgRef.transition()
    .duration(750)
    .call(zoomBehavior.transform, d3.zoomIdentity);
}

export async function exportPNG() {
  const svgElement = document.querySelector("svg");
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(svgElement);

  const svgGroup = svgElement.querySelector("g");
  const bbox = svgGroup.getBBox();

  const padding = 50;
  const width = (bbox.width + padding * 2);
  const height = (bbox.height + padding * 2);

  const canvas = document.createElement("canvas");
  canvas.width = width * 2;    // 高清
  canvas.height = height * 2;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const translatedSvgString = svgString.replace(
    '<g>',
    `<g transform="translate(${padding - bbox.x}, ${padding - bbox.y})">`
  );

  const v = await canvg.Canvg.fromString(ctx, translatedSvgString, {
    ignoreDimensions: true,
    ignoreClear: true,
    scaleWidth: canvas.width,
    scaleHeight: canvas.height
  });
  await v.render();

  const link = document.createElement("a");
  link.download = "knowledge-graph.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}


window.handleUpload = async function () {
  const input = document.getElementById("upload-file");
  const file = input.files[0];
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

      try {
        const graphData = await fetchGraphData(currentGraphId);
        console.log("图谱数据：", graphData);  // 👉 看看是啥
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
        d.highlight ? "#1f77b4" : (d.type === "Person" ? "#1f77b4" : "#ff7f0e")
      );

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

