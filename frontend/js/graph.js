d3.json("static/graph.json").then(function (graphDataRaw) {
    const svg = d3.select("svg");
    const width = window.innerWidth;
    const height = window.innerHeight;

    const container = svg.append("g");

    // 缩放 & 拖动行为绑定
    svg.call(
        d3.zoom()
            .scaleExtent([0.1, 5])
            .on("zoom", (event) => {
                container.attr("transform", event.transform);
            })
    );

    // 设置箭头样式
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

    const simulation = d3.forceSimulation(graphData.entities)
        .force("link", d3.forceLink(graphData.relations).id(d => d.id).distance(200))
        .force("charge", d3.forceManyBody().strength(-500))
        .force("center", d3.forceCenter(width / 2, height / 2));

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

    // 拖动函数
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

    // 节点点击弹窗
    node.on("click", (event, d) => {
        alert(`实体名称：${d.name}\n类型：${d.type}\nID：${d.id}`);
    });

    // 悬停高亮
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
});
