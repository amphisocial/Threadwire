document.addEventListener("DOMContentLoaded", () => {
    const searchButton = document.getElementById("searchButton");
    const partNumberInput = document.getElementById("partNumberInput");
    const treeContainer = d3.select("#graphContainer");

    const width = treeContainer.node().clientWidth;
    const height = treeContainer.node().clientHeight;

    const rectWidth = 150;
    const rectHeight = 50;
    const rowSpacing = 150; // Vertical spacing between rows
    const centerX = width / 2; // Center X position for root node

    let graphData = { nodes: [], links: [] };

    // Initialize SVG and group container
    const svg = treeContainer
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background-color", "#f8f9fa");

    const g = svg.append("g");

    // Initialize the force simulation
    const simulation = d3.forceSimulation()
        .force(
            "link",
            d3.forceLink()
                .id((d) => d.id)
                .distance(200)
        )
        .force("charge", d3.forceManyBody().strength(-500)) // Push nodes apart
        .force("center", d3.forceCenter(width / 2, height / 2)) // Center the graph
        .force("collision", d3.forceCollide().radius(80)); // Prevent overlapping

    // Fetch graph data dynamically
    async function fetchGraphData(partNumber, direction) {
        try {
            const response = await fetch(`/api/partgraph?partnumber=${partNumber}&direction=${direction}`);
            return await response.json();
        } catch (error) {
            console.error("Error fetching graph data:", error);
            return { nodes: [], links: [] };
        }
    }

    // Update the graph
    function updateGraph(data) {
        // Clear the graph for a reset
        g.selectAll("*").remove();

        // Merge new nodes and links
        graphData.nodes = [
            ...graphData.nodes,
            ...data.nodes.filter(
                (newNode) => !graphData.nodes.some((existingNode) => existingNode.id === newNode.id)
            ),
        ];

        graphData.links = [
            ...graphData.links,
            ...data.links.filter(
                (newLink) =>
                    !graphData.links.some(
                        (existingLink) =>
                            existingLink.source === newLink.source &&
                            existingLink.target === newLink.target
                    )
            ),
        ];

        console.log("Updated Nodes:", graphData.nodes);
        console.log("Updated Links:", graphData.links);

        // Position nodes in rows
        const rootNode = graphData.nodes.find((node) => node.type === "part");
        if (rootNode) {
            rootNode.fx = centerX;
            rootNode.fy = rowSpacing;
        }

        const workOrders = graphData.nodes.filter((node) => node.type === "workorder");
        workOrders.forEach((node, i) => {
            node.fx = (width / (workOrders.length + 1)) * (i + 1);
            node.fy = rowSpacing * 2;
        });

        const partOperations = graphData.nodes.filter((node) => node.type === "partbop");
        partOperations.forEach((node, i) => {
            node.fx = (width / (partOperations.length + 1)) * (i + 1);
            node.fy = rowSpacing * 3;
        });

        // Render links
        const links = g
            .selectAll(".link")
            .data(graphData.links, (d) => `${d.source}-${d.target}`)
            .join(
                (enter) =>
                    enter
                        .append("line")
                        .attr("class", "link")
                        .attr("stroke", "#ccc")
                        .attr("stroke-width", 2),
                (update) => update,
                (exit) => exit.remove()
            );

        // Render nodes
        const nodes = g
            .selectAll(".node")
            .data(graphData.nodes, (d) => d.id)
            .join(
                (enter) => {
                    const node = enter.append("g").attr("class", "node");

                    node.append("rect")
                        .attr("width", rectWidth)
                        .attr("height", rectHeight)
                        .attr("rx", 5)
                        .attr("fill", (d) => {
                            switch (d.type) {
                                case "part":
                                    return "#4CAF50";
                                case "salesorder":
                                    return "#FF9800";
                                case "workorder":
                                    return "#2196F3";
                                case "execution":
                                    return "#9C27B0";
                                case "partbop":
                                    return "#FF5733";
                                default:
                                    return "#757575";
                            }
                        })
                        .attr("stroke", "black");

                    node.append("text")
                        .attr("x", rectWidth / 2)
                        .attr("y", rectHeight / 2)
                        .attr("text-anchor", "middle")
                        .attr("dominant-baseline", "middle")
                        .attr("font-size", "12px")
                        .text((d) => d.label);

                    return node;
                },
                (update) => update,
                (exit) => exit.remove()
            )
            .call(
                d3.drag()
                    .on("start", (event, d) => {
                        if (!event.active) simulation.alphaTarget(0.3).restart();
                        d.fx = d.x;
                        d.fy = d.y;
                    })
                    .on("drag", (event, d) => {
                        d.fx = event.x;
                        d.fy = event.y;
                    })
                    .on("end", (event, d) => {
                        if (!event.active) simulation.alphaTarget(0);
                        d.fx = null;
                        d.fy = null;
                    })
            )
            .on("click", async (event, d) => {
                const boundingBox = event.target.getBoundingClientRect();
                const clickX = event.clientX - boundingBox.left;

                if (clickX < rectWidth / 2) {
                    console.log("Left side clicked, fetching upstream data...");
                    const data = await fetchGraphData(d.id, "left");
                    updateGraph(data);
                } else {
                    console.log("Right side clicked, fetching downstream data...");
                    const data = await fetchGraphData(d.id, "right");
                    updateGraph(data);
                }
            });

        // Update simulation with new nodes and links
        simulation.nodes(graphData.nodes);
        simulation.force("link").links(graphData.links);

        // Dynamic positioning
        simulation.on("tick", () => {
            links
                .attr("x1", (d) => d.source.x + rectWidth / 2)
                .attr("y1", (d) => d.source.y + rectHeight)
                .attr("x2", (d) => d.target.x + rectWidth / 2)
                .attr("y2", (d) => d.target.y);

            nodes.attr("transform", (d) => `translate(${d.x},${d.y})`);
        });

        // Restart simulation
        simulation.alpha(1).restart();
    }

    // Search Button Click Handler
    searchButton.addEventListener("click", async () => {
        const partNumber = partNumberInput.value.trim();
        if (partNumber) {
            try {
                const data = await fetchGraphData(partNumber, "initial");
                graphData = { nodes: [], links: [] }; // Reset graph data
                updateGraph(data); // Update graph with new part data
            } catch (error) {
                console.error("Error searching for part:", error);
            }
        }
    });
});
function navigateTo(page) {
  switch (page) {
    case "blockers": 
      window.location.href = "blockers.html";
      break;
    case "salesorders":
      window.location.href = "salesorders.html";
      break;
    case "dashboard":
      window.location.href = "landingPage.html";
      break;
    case "program": 
      window.location.href = "program.html";
      break;
    case "parts":
      window.location.href = "parts.html";
      break;
    case "workorders":
      window.location.href = "workorders.html";
      break;
    case "logout":
      sessionStorage.removeItem("userId");
      window.location.href = "logout.html";
      break;
    default:
      console.error(`Unknown page: ${page}`);
  }
}
