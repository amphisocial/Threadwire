// GraphView.jsx
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import NavBar from '../comps/NavBar';
import './graphView.css';

const GraphView = () => {
  const graphRef = useRef(null);
  const [partNumber, setPartNumber] = useState('');
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Constants for graph layout
  const rectWidth = 150;
  const rectHeight = 50;
  const rowSpacing = 150;

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    const isGoogleAuth = localStorage.getItem('isGoogleAuth') === 'true';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(isGoogleAuth && { 'Auth-Type': 'google' }),
    };
  };

  const fetchGraphData = async (partNumber, direction) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/partgraph?partnumber=${partNumber}&direction=${direction}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setLoading(false);
      return data;
    } catch (error) {
      setError(`Error fetching graph data: ${error.message}`);
      setLoading(false);
      return { nodes: [], links: [] };
    }
  };

  const getNodeColor = (type) => {
    switch (type) {
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
  };

  useEffect(() => {

    document.title = 'Visualization';
    if (!graphRef.current || !graphData.nodes.length) return;

    const treeContainer = d3.select(graphRef.current);
    const width = graphRef.current.clientWidth;
    const height = graphRef.current.clientHeight;
    const centerX = width / 2;

    // Clear existing SVG
    treeContainer.selectAll("*").remove();

    // Initialize SVG and group container
    const svg = treeContainer
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("class", "graph-svg");

    const g = svg.append("g");

    // Initialize force simulation
    const simulation = d3.forceSimulation()
      .force("link", d3.forceLink().id(d => d.id).distance(200))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(80));

    // Position nodes in rows
    const rootNode = graphData.nodes.find(node => node.type === "part");
    if (rootNode) {
      rootNode.fx = centerX;
      rootNode.fy = rowSpacing;
    }

    const workOrders = graphData.nodes.filter(node => node.type === "workorder");
    workOrders.forEach((node, i) => {
      node.fx = (width / (workOrders.length + 1)) * (i + 1);
      node.fy = rowSpacing * 2;
    });

    const partOperations = graphData.nodes.filter(node => node.type === "partbop");
    partOperations.forEach((node, i) => {
      node.fx = (width / (partOperations.length + 1)) * (i + 1);
      node.fy = rowSpacing * 3;
    });

    // Render links
    const links = g
      .selectAll(".link")
      .data(graphData.links)
      .join("line")
      .attr("class", "graph-link");

    // Render nodes
    const nodes = g
      .selectAll(".node")
      .data(graphData.nodes)
      .join(enter => {
        const node = enter.append("g")
          .attr("class", "graph-node")
          .call(d3.drag()
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
            }));

        node.append("rect")
          .attr("width", rectWidth)
          .attr("height", rectHeight)
          .attr("rx", 5)
          .attr("fill", d => getNodeColor(d.type))
          .attr("stroke", "black");

        node.append("text")
          .attr("x", rectWidth / 2)
          .attr("y", rectHeight / 2)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .text(d => d.label);

        return node;
      });

    // Handle node clicks for expanding graph
    nodes.on("click", async (event, d) => {
      const boundingBox = event.target.getBoundingClientRect();
      const clickX = event.clientX - boundingBox.left;

      const newData = await fetchGraphData(
        d.id,
        clickX < rectWidth / 2 ? "left" : "right"
      );
      
      setGraphData(prevData => ({
        nodes: [...prevData.nodes, ...newData.nodes.filter(
          newNode => !prevData.nodes.some(
            existingNode => existingNode.id === newNode.id
          )
        )],
        links: [...prevData.links, ...newData.links.filter(
          newLink => !prevData.links.some(
            existingLink => 
              existingLink.source === newLink.source &&
              existingLink.target === newLink.target
          )
        )]
      }));
    });

    // Update positions on simulation tick
    simulation.on("tick", () => {
      links
        .attr("x1", d => d.source.x + rectWidth / 2)
        .attr("y1", d => d.source.y + rectHeight)
        .attr("x2", d => d.target.x + rectWidth / 2)
        .attr("y2", d => d.target.y);

      nodes.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Update simulation with current data
    simulation.nodes(graphData.nodes);
    simulation.force("link").links(graphData.links);
    simulation.alpha(1).restart();

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [graphData]);

  const handleSearch = async () => {
    if (!partNumber.trim()) return;
    
    try {
      const data = await fetchGraphData(partNumber.trim(), "initial");
      setGraphData(data);
    } catch (error) {
      setError("Error searching for part: " + error.message);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="app-container">
      <NavBar />
      
      <div className="main-content">
        <div className="search-container">
          <div className="search-bar">
            <input
              type="text"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter Part Number"
              className="search-input"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="search-button"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>

        <div
          ref={graphRef}
          className="graph-container"
        />
      </div>
    </div>
  );
};

export default GraphView;
