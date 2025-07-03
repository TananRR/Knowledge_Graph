
import colorManager from '../theme/colorThemeManager.js';

export class GraphRenderer {
  constructor() {
  this.id = Math.random().toString(36).slice(2, 8);  // ✅ 随机 ID
  console.log("[GraphRenderer] 实例创建，ID =", this.id);
    this.colorManager = colorManager;
    this.currentGraphId = null;
    this.currentData = null;
    this.simulationRef = null;
    this.nodeRef = null;
    this.linkRef = null;
    this.svgRef = null;
    this.zoomBehavior = null;
  }

  /**
   * 渲染知识图谱f
   * @param {Object} graphData - 图谱数据 {nodes: [], links: []}
   */
  renderGraph(graphData) {
console.log(`[GraphRenderer ${this.id}] 渲染触发，当前主题:`, this.colorManager.currentTheme);
console.log(`[GraphRenderer ${this.id}] 当前节点数:`, graphData?.nodes?.length);


    // 清除现有SVG内容
    d3.select("svg").selectAll("*").remove();

    // 基础SVG设置
    const svg = d3.select("svg");
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.svgRef = svg;

    // 创建容器组和缩放行为
    const container = svg.append("g");
    this.zoomBehavior = d3.zoom()
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => container.attr("transform", event.transform));
    svg.call(this.zoomBehavior);

    // 验证数据
    if (!graphData || !graphData.nodes || !graphData.links) {
      throw new Error('无效的图谱数据');
    }

    this.currentData = graphData;
  console.log(`[GraphRenderer ${this.id}] currentData 赋值后节点数:`, this.currentData?.nodes?.length);

    // 1. 创建箭头定义
    this.createArrowMarkers(svg);

    // 2. 创建连线
    this.createLinks(container);

    // 3. 创建连线标签
    this.createLinkLabels(container);

    // 4. 创建节点
    this.createNodes(container);

    // 5. 创建节点标签
    const labels = this.createNodeLabels(container);

    // 6. 力导向模拟
    this.setupForceSimulation(width, height, labels);

    // 7. 拖拽交互
    this.setupDragBehavior();

    // 8. 鼠标交互
    this.setupMouseInteractions();
  }

  /**
   * 创建箭头标记定义
   * @param {Object} svg - D3 SVG选择器
   */
  createArrowMarkers(svg) {
    const defs = svg.append("defs");
    ['normal', 'highlight', 'muted'].forEach(type => {
      defs.append("marker")
        .attr(`id`, `arrow-${type}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 30)
        .attr("refY", 0)
        .attr("markerWidth", 8)
        .attr("markerHeight", 8)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", this.colorManager.colors.arrow[type]);
    });
  }

  /**
   * 创建连线元素
   * @param {Object} container - D3容器组
   */
  createLinks(container) {
    this.linkRef = container.append("g")
      .selectAll("line")
      .data(this.currentData.links)
      .enter()
      .append("line")
      .attr("class", "link-line")
      .attr("stroke", this.colorManager.colors.link.normal)
      .attr("stroke-width", 0.8)
      .attr("marker-end", "url(#arrow-normal)");
  }

  /**
   * 创建连线标签
   * @param {Object} container - D3容器组
   */
  createLinkLabels(container) {
  this.linkLabelRef = container.append("g")
    .selectAll("text")
    .data(this.currentData.links)
    .enter()
    .append("text")
    .attr("class", "link-label")
    .text(d => d.label || "")  // 确保有默认值
    .attr("font-size", "10px")
    .attr("fill", this.colorManager.colors.link.text)
    .attr("text-anchor", "middle")  // 文本居中
    .attr("dy", "-0.5em")  // 垂直偏移
}

  /**
   * 创建节点元素
   * @param {Object} container - D3容器组
   */
  createNodes(container) {
    this.nodeRef = container.append("g")
      .selectAll("circle")
      .data(this.currentData.nodes)
      .enter()
      .append("circle")
      .attr("r", d => {
        const sizeMap = { Person: 15, Organization: 15, default: 14 };
        return sizeMap[d.type] || sizeMap.default;
      })
      .attr("fill", d => this.colorManager.colors.node[d.type] || this.colorManager.colors.node.default)
      .attr("stroke", d =>
        d3.color(this.colorManager.colors.node[d.type] || this.colorManager.colors.node.default).darker(0.5)
      )
      .attr("stroke-width", 1.5);
  }

  /**
   * 创建节点标签
   * @param {Object} container - D3容器组
   * @returns {Object} - 标签选择器
   */
  createNodeLabels(container) {
    return container.append("g")
      .selectAll("text")
      .data(this.currentData.nodes)
      .enter()
      .append("text")
      .attr("class", "node-label")
      .text(d => d.name)
      .attr("font-size", 11)
      .attr("dx", 25)
      .attr("dy", ".3em")
      .attr("fill", this.colorManager.colors.label.primary)
      .attr("font-weight", "bold")
      .attr("paint-order", "stroke")
      .attr("stroke", this.colorManager.colors.label.stroke)
      .attr("stroke-width", 1);
  }

  /**
   * 设置力导向图模拟
   * @param {number} width - SVG宽度
   * @param {number} height - SVG高度
   * @param {Object} labels - 节点标签选择器
   */
 setupForceSimulation(width, height, labels) {

  // 调整力模拟参数
  this.simulationRef = d3.forceSimulation(this.currentData.nodes)
    .force("link",
      d3.forceLink(this.currentData.links)
        .id(d => d.id)
        .distance(100)  // 增加连接线长度
        .strength(0.3)  // 降低连接力强度
    )
    .force("charge",
      d3.forceManyBody()
        .strength(-150)  // 增加排斥力
        .distanceMax(150) // 限制最大作用距离
    )
    .force("collide",
      d3.forceCollide()
        .radius(d => {
          const sizeMap = { Person: 25, Organization: 25, default: 20 };
          return sizeMap[d.type] || sizeMap.default;
        })
        .strength(0.9)  // 调整碰撞强度
    )
.force("center",
      d3.forceCenter(width / 2, height / 2)
    )
    .alphaDecay(0.02)  // 减慢模拟衰减速度
    .on("tick", () => {
    // 更新连线位置
    this.linkRef
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    // 更新节点位置
    this.nodeRef
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    // 更新节点标签位置
    labels
      .attr("x", d => d.x)
      .attr("y", d => d.y);

    // 更新连线标签位置 - 新增这部分
    d3.selectAll(".link-label")
      .attr("x", d => (d.source.x + d.target.x) / 2)
      .attr("y", d => (d.source.y + d.target.y) / 2);
  });
  // 添加初始脉冲使布局更快稳定
  this.simulationRef.alpha(1).restart();
}


  /**
   * 设置拖拽行为
   */
  setupDragBehavior() {
    const drag = d3.drag()
      .on("start", this.dragStarted.bind(this))
      .on("drag", this.dragged.bind(this))
      .on("end", this.dragEnded.bind(this));
    this.nodeRef.call(drag);
  }

  /**
   * 设置鼠标交互
   */
  setupMouseInteractions() {
    this.nodeRef
      .on("mouseover", this.handleNodeMouseOver.bind(this))
      .on("mouseout", this.handleNodeMouseOut.bind(this));
  }

  /**
   * 拖拽开始事件处理
   */
  dragStarted(event, d) {
    if (!event.active) this.simulationRef.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  /**
   * 拖拽中事件处理
   */
  dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  /**
   * 拖拽结束事件处理
   */
  dragEnded(event, d) {
    if (!event.active) this.simulationRef.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  /**
   * 节点鼠标悬停事件处理
   */
 handleNodeMouseOver(event, d) {
  // 高亮相关节点
  this.nodeRef.attr("opacity", o =>
    o.id === d.id || this.currentData.links.some(rel =>
      (rel.source.id === d.id && rel.target.id === o.id) ||
      (rel.target.id === d.id && rel.source.id === o.id)
    ) ? 1 : 0.3
  );

  // 高亮相关连线
  this.linkRef
    .attr("stroke", rel =>
      rel.source.id === d.id || rel.target.id === d.id
        ? this.colorManager.colors.link.highlight
        : this.colorManager.colors.link.muted
    )
    .attr("marker-end", rel =>
      rel.source.id === d.id || rel.target.id === d.id
        ? "url(#arrow-highlight)"
        : "url(#arrow-muted)"
    );

  // 高亮相关连线标签
  d3.selectAll(".link-label")
    .attr("fill", rel =>
      rel.source.id === d.id || rel.target.id === d.id
        ? this.colorManager.colors.label.highlight
        : this.colorManager.colors.link.muted
    );

  // 高亮相关节点名称（新增部分）
  d3.selectAll(".node-label")
    .attr("opacity", o =>
      o.id === d.id || this.currentData.links.some(rel =>
        (rel.source.id === d.id && rel.target.id === o.id) ||
        (rel.target.id === d.id && rel.source.id === o.id)
      ) ? 1 : 0.3
    );
}

  /**
   * 节点鼠标移出事件处理
   */
handleNodeMouseOut() {
  this.resetElementStyles();
  this.nodeRef.attr("opacity", 1);

  // 恢复连线标签颜色
  d3.selectAll(".link-label")
    .attr("fill", this.colorManager.colors.link.text);

  // 恢复节点名称透明度（新增部分）
  d3.selectAll(".node-label")
    .attr("opacity", 1);
}

  /**
   * 重置所有元素样式
   */
resetElementStyles() {
  this.nodeRef
    .attr("stroke", d =>
      d3.color(this.colorManager.colors.node[d.type] || this.colorManager.colors.node.default).darker(0.5)
    );

  this.linkRef
    .attr("stroke", this.colorManager.colors.link.normal)
    .attr("marker-end", "url(#arrow-normal)");

  // 恢复连线标签颜色
  d3.selectAll(".link-label")
    .attr("fill", this.colorManager.colors.link.text);

  // 恢复节点名称透明度（新增部分）
  d3.selectAll(".node-label")
    .attr("opacity", 1);
}

  /**
   * 聚焦到特定节点
   * @param {string} keyword - 要聚焦的节点名称关键词
   * @returns {boolean} - 是否成功找到并聚焦节点
   */
  focusNode(keyword) {
    if (!keyword || !this.currentData || !this.simulationRef || !this.nodeRef || !this.linkRef) return false;

    const match = this.currentData.nodes.find(n => n.name.includes(keyword));
    if (!match) return false;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const simulation = this.simulationRef;
    const svg = this.svgRef;

    // 确保节点有有效坐标
    if (isNaN(match.x) || isNaN(match.y)) {
      match.x = width / 2;
      match.y = height / 2;
    }

    // 暂停模拟并清除所有固定位置
    simulation.stop();
    this.currentData.nodes.forEach(node => {
      node.fx = null;
      node.fy = null;
    });

    // 固定焦点节点在中心
    match.fx = width / 2;
    match.fy = height / 2;

    // 获取邻居节点并确保有有效坐标
    const neighbors = this.currentData.links
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
      .force("link", d3.forceLink(this.currentData.links).id(d => d.id).distance(150))
      .alpha(1)
      .restart();

    // 强制更新连线位置
    simulation.tick(10);

    // 应用缩放变换
    const scale = 1.5;
    const translateX = width / 2 - scale * match.x;
    const translateY = height / 2 - scale * match.y;

    svg.transition()
      .duration(750)
      .call(
        this.zoomBehavior.transform,
        d3.zoomIdentity.translate(translateX, translateY).scale(scale)
      )
      .on("end", () => {
        setTimeout(() => {
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
    this.nodeRef
      .attr("stroke", d =>
        d.id === match.id || neighbors.some(n => n.id === d.id) ? "#fe865c" : "none")
      .attr("stroke-width", d =>
        d.id === match.id || neighbors.some(n => n.id === d.id) ? 3 : 1);

    return true;
  }

  /**
   * 清空图谱
   */
  clearGraph() {
    d3.select("svg").selectAll("*").remove();
    this.currentData = null;
  }

  /**
   * 显示空状态消息
   */
  showEmptyMessage() {
    d3.select("svg").selectAll("*").remove();
    d3.select("svg").append("text")
      .attr("x", window.innerWidth / 2)
      .attr("y", window.innerHeight / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "20px")
      .attr("fill", "#666")
      .text("图谱中没有数据，请先上传数据");
  }

  /**
   * 导出图谱为PNG
   */
  async exportPNG() {
    try {
      const svg = document.querySelector("svg");
      if (!svg) throw new Error("未找到SVG元素");

      // 克隆SVG并设置必要的属性
      const clonedSvg = svg.cloneNode(true);
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clonedSvg.setAttribute('width', svg.clientWidth);
      clonedSvg.setAttribute('height', svg.clientHeight);

      // 添加白色背景
      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRect.setAttribute('width', '100%');
      bgRect.setAttribute('height', '100%');
      bgRect.setAttribute('fill', 'white');
      clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

      // 创建canvas
      const canvas = document.createElement('canvas');
      canvas.width = svg.clientWidth * 2;  // 2倍分辨率
      canvas.height = svg.clientHeight * 2;
      const ctx = canvas.getContext('2d');

      // 设置白色背景
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 将SVG转换为数据URL
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const img = new Image();
      const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
      const url = URL.createObjectURL(svgBlob);

      // 等待图片加载
      await new Promise((resolve, reject) => {
        img.onload = () => {
          // 绘制到canvas
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('图片加载失败'));
        };
        img.src = url;
      });

      // 触发下载
      const link = document.createElement('a');
      link.download = `knowledge-graph-${new Date().toISOString().slice(0,10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

    } catch (error) {
      console.error('PNG导出失败:', error);
      throw error;
    }
  }

  /**
   * 导出图谱为SVG
   */
  async exportSVG() {
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

    } catch (error) {
      console.error("导出SVG失败:", error);
      throw error;
    }
  }
  /**
 * 只更新图谱元素的样式而不重新创建它们
 */
updateStyles() {
  if (!this.currentData) return;

  console.log(`[GraphRenderer ${this.id}] 更新样式，当前主题:`, this.colorManager.currentTheme);

  // 1. 更新箭头标记（必须重新创建）
  this.createArrowMarkers(this.svgRef);

  // 2. 更新连线样式
  this.linkRef
    .attr("stroke", this.colorManager.colors.link.normal)
    .attr("marker-end", "url(#arrow-normal)");

  // 3. 更新连线标签颜色
  d3.selectAll(".link-label")
    .attr("fill", this.colorManager.colors.link.text);

  // 4. 更新节点颜色
  this.nodeRef
    .attr("fill", d => this.colorManager.colors.node[d.type] || this.colorManager.colors.node.default)
    .attr("stroke", d =>
      d3.color(this.colorManager.colors.node[d.type] || this.colorManager.colors.node.default).darker(0.5)
    );

  // 5. 更新节点标签样式
  d3.selectAll(".node-label")
    .attr("fill", this.colorManager.colors.label.primary)
    .attr("stroke", this.colorManager.colors.label.stroke);
}
}