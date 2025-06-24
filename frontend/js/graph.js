let currentData = null;
let simulationRef = null;
let nodeRef = null;
let svgRef = null;

function loadGraph() {
    d3.json("static/graph.json")
        .then(data => renderGraph(data))
        .catch(err => alert("加载失败：" + err));
}

function renderGraph(graphDataRaw) {
    d3.select("svg").selectAll("*").remove();

    const svg = d3.select("svg");
    const width = window.innerWidth;
    const height = window.innerHeight;

    svgRef = svg;
    const container = svg.append("g");

    svg.call(
        d3.zoom()
            .scaleExtent([0.1, 5])
            .on("zoom", (event) => {
                container.attr("transform", event.transform);
            })
    );

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

    const graphData = {
        entities: graphDataRaw.entities.map(d => ({ ...d })),
        relations: graphDataRaw.relations.map(d => ({
            ...d,
            source: d.source,
            target: d.target
        }))
    };
    currentData = graphData;

    const simulation = d3.forceSimulation(graphData.entities)
        .force("link", d3.forceLink(graphData.relations).id(d => d.id).distance(200))
        .force("charge", d3.forceManyBody().strength(-500))
        .force("center", d3.forceCenter(width / 2, height / 2));
    simulationRef = simulation;

    const link = container.append("g")
        .selectAll("line")
        .data(graphData.relations)
        .enter()
        .append("line")
        .attr("stroke", "#aaa")
        .attr("marker-end", "url(#arrow)");

    const linkLabel = container.append("g")
        .selectAll("text")
        .data(graphData.relations)
        .enter()
        .append("text")
        .text(d => d.type)
        .attr("font-size", 10)
        .attr("fill", "#666");

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

    node.on("click", (event, d) => {
        alert(`实体名称：${d.name}\n类型：${d.type}\nID：${d.id}`);
    });

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

// 🔍 聚焦关键词节点
function focusNode() {
    const keyword = document.getElementById("searchInput").value.trim();
    if (!keyword || !currentData) return;

    const match = currentData.entities.find(n => n.name.includes(keyword));
    if (!match) {
        alert("未找到实体：" + keyword);
        return;
    }

    const { x, y } = match;
    svgRef.transition()
        .duration(750)
        .call(
            d3.zoom().transform,
            d3.zoomIdentity
                .translate(window.innerWidth / 2, window.innerHeight / 2)
                .scale(1.5)
                .translate(-x, -y)
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

// ⬇️ 导出为 PNG
function exportPNG() {
    const svgElement = document.querySelector("svg");
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);

    const canvas = document.createElement("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");

    const v = canvg.Canvg.fromString(ctx, svgString);
    v.start().then(() => {
        const link = document.createElement("a");
        link.download = "graph.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
}

// ⬇️ 导出为 JSON
function exportJSON() {
    if (!currentData) {
        alert("无可导出的数据");
        return;
    }

    const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "graph.json";
    a.click();
    URL.revokeObjectURL(url);
}

window.onload = loadGraph;
