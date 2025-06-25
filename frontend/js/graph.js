// graph.js
import { fetchGraphData, uploadTextFile, searchNodes, downloadGraphJSON } from './api.js';

let currentData = null;
let simulationRef = null;
let nodeRef = null;
let svgRef = null;
let zoomBehavior = null;

export function renderGraph(graphDataRaw) {
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

  // 拷贝数据防止修改原数据
  const graphData = {
    entities: graphDataRaw.entities.map(d => ({ ...d })),
    relations: graphDataRaw.relations.map(d => ({
      ...d,
      source: d.source,
      target: d.target
    }))
  };
  currentData = graphData;

  // 力导向布局
  const simulation = d3.forceSimulation(graphData.entities)
    .force("link", d3.forceLink(graphData.relations).id(d => d.id).distance(200))
    .force("charge", d3.forceManyBody().strength(-500))
    .force("center", d3.forceCenter(width / 2, height / 2));
  simulationRef = simulation;

  // 画关系线
  const link = container.append("g")
    .selectAll("line")
    .data(graphData.relations)
    .enter()
    .append("line")
    .attr("stroke", "#aaa")
    .attr("marker-end", "url(#arrow)");

  // 关系文本标签
  const linkLabel = container.append("g")
    .selectAll("text")
    .data(graphData.relations)
    .enter()
    .append("text")
    .text(d => d.type)
    .attr("font-size", 10)
    .attr("fill", "#666");

  // 画节点圆圈
  const node = container.append("g")
    .selectAll("circle")
    .data(graphData.entities)
    .enter()
    .append("circle")
    .attr("r", 20)
    .attr("fill", d => d.type === "Person" ? "#1f77b4" : "#ff7f0e")
    .call(d3.drag()
      .on("start", dragStarted)
      .on("drag", dragged)
      .on("end", dragEnded));

  nodeRef = node;

  // 节点文字标签
  const label = container.append("g")
    .selectAll("text")
    .data(graphData.entities)
    .enter()
    .append("text")
    .text(d => d.name)
    .attr("font-size", 12)
    .attr("dx", 25)
    .attr("dy", ".35em");

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

  // 点击弹窗显示节点信息
  node.on("click", (event, d) => {
    alert(`实体名称：${d.name}\n类型：${d.type}\nID：${d.id}`);
  });

  // 鼠标悬浮高亮相关节点和连线
  node
    .on("mouseover", function (event, d) {
      node.attr("opacity", o =>
        o.id === d.id || graphData.relations.some(rel =>
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

  // 拖拽事件
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
  if (!keyword || !currentData) return;

  const match = currentData.entities.find(n => n.name.includes(keyword));
  if (!match) {
    alert("未找到实体：" + keyword);
    return;
  }

  const svg = svgRef;
  const width = window.innerWidth;
  const height = window.innerHeight;

  const scale = 1.5;
  const translateX = width / 2 - scale * match.x;
  const translateY = height / 2 - scale * match.y;

  svg.transition()
    .duration(750)
    .call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(translateX, translateY).scale(scale)
    );

  nodeRef
    .filter(d => d.id === match.id)
    .transition()
    .duration(200)
    .attr("stroke", "#ff0000")
    .attr("stroke-width", 4)
    .transition()
    .duration(800)
    .attr("stroke", "#000")
    .attr("stroke-width", 0);
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

window.loadGraph = async function () {
  try {
    const data = await fetchGraphData();
    renderGraph(data);
  } catch (err) {
    alert("图谱数据加载失败！");
    console.error(err);
  }
};

window.handleUpload = async function () {
  const input = document.getElementById("upload-file");
  const file = input.files[0];
  if (!file) {
    alert("请先选择文件！");
    return;
  }

  try {
    const result = await uploadTextFile(file);
    if (result.code === 0) {
      alert("上传并更新成功！");
      await loadGraph();
    } else {
      alert("上传失败：" + result.msg);
    }
  } catch (err) {
    alert("请求失败，请检查后端服务");
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

    const newEntities = results.map(d => ({
      id: d.id,
      name: d.name,
      type: d.type
    }));

    if (!currentData) currentData = { entities: [], relations: [] };
    const existingIds = new Set(currentData.entities.map(e => e.id));
    const uniqueEntities = newEntities.filter(e => !existingIds.has(e.id));

    if (!uniqueEntities.length) {
      document.getElementById("searchInput").value = results[0].name;
      focusNode();
      return;
    }

    currentData.entities.push(...uniqueEntities);

    // 重新渲染
    renderGraph(currentData);

    document.getElementById("searchInput").value = results[0].name;
    setTimeout(() => focusNode(), 500);

  } catch (err) {
    alert("查询失败！");
    console.error(err);
  }
};

window.exportJSON = downloadGraphJSON;
// 页面加载时调用
window.onload = loadGraph;
