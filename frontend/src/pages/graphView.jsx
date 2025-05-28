// import React, { useEffect, useRef, useState } from 'react';
// import * as d3 from 'd3';
// import NavBar from '../comps/NavBar';
// import './graphView.css';
// import { Search } from 'lucide-react';

// const GraphView = () => {
//   // State
//   const [searchQuery, setSearchQuery] = useState('');
//   const [searchType, setSearchType] = useState('All');
//   const [searchResults, setSearchResults] = useState([]);
//   const [showResults, setShowResults] = useState(false);
//   const [selectedItem, setSelectedItem] = useState(null);
//   const [graphData, setGraphData] = useState({ nodes: [], links: [] });
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [selectedEntityTypes, setSelectedEntityTypes] = useState(['All']);
//   const [entityColors, setEntityColors] = useState({
//     'Product': '#8b5cf6',
//     'Sales Order': '#f472b6',
//     'Work Order': '#000000',
//     'Risk': '#f59e0b',
//     'Issues': '#ef4444',
//     'Project': '#10b981',
//     'Customer': '#3b82f6',
//     'BOM': '#f472b6',
//     'All': '#6366f1',
//     // Add other entity types as needed
//   });
  
//   // Refs
//   const graphRef = useRef(null);
//   const tooltipRef = useRef(null);
  
//   // Entity types list
//   const entityTypes = [
//     'Product', 'Sales Order', 'Work Order', 'Risk', 
//     'Issues', 'Project', 'Customer', 'All'
//   ];

//   // Authentication headers
//   const getAuthHeaders = () => {
//     const token = localStorage.getItem('authToken');
//     const isGoogleAuth = localStorage.getItem('isGoogleAuth') === 'true';
//     return {
//       'Authorization': `Bearer ${token}`,
//       'Content-Type': 'application/json',
//       ...(isGoogleAuth && { 'Auth-Type': 'google' }),
//     };
//   };

//   // Search handler
//   const handleSearch = async () => {
//     if (!searchQuery.trim()) return;
    
//     setLoading(true);
//     setError(null);
    
//     try {
//       const response = await fetch(`/api/partgraph/search?query=${encodeURIComponent(searchQuery)}&type=${encodeURIComponent(searchType)}`, {
//         method: 'GET',
//         headers: getAuthHeaders(),
//       });
      
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
      
//       const results = await response.json();
//       setSearchResults(results);
//       setShowResults(true);
//       setLoading(false);
//     } catch (error) {
//       setError(`Error searching: ${error.message}`);
//       setLoading(false);
//     }
//   };

//   // Handle key press for search
//   const handleKeyPress = (e) => {
//     if (e.key === 'Enter') {
//       handleSearch();
//     }
//   };

//   // Handle search result selection
//   const handleResultSelect = async (item) => {
//     setSelectedItem(item);
//     setShowResults(false);
//     await fetchGraphData(item.id);
//   };

//   // Fetch graph data
//   const fetchGraphData = async (itemId, keepExisting = false) => {
//     setLoading(true);
//     setError(null);
    
//     try {
//       // Convert selected entity types to a comma-separated string
//       const entityTypesParam = selectedEntityTypes.join(',');
      
//       const response = await fetch(`/api/partgraph?id=${encodeURIComponent(itemId)}&entityTypes=${encodeURIComponent(entityTypesParam)}`, {
//         method: 'GET',
//         headers: getAuthHeaders(),
//       });
      
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
      
//       const data = await response.json();
      
//       // Process the returned data
//       let newNodes = data.nodes || [];
//       let newLinks = data.links || [];
      
//       // If keepExisting is true, merge with existing graph data
//       if (keepExisting) {
//         // Add nodes without duplicates
//         const existingNodeIds = graphData.nodes.map(n => n.id);
//         newNodes = [
//           ...graphData.nodes,
//           ...newNodes.filter(n => !existingNodeIds.includes(n.id))
//         ];
        
//         // Add links without duplicates
//         const existingLinkKeys = graphData.links.map(l => `${l.source}-${l.target}`);
//         newLinks = [
//           ...graphData.links,
//           ...newLinks.filter(l => {
//             const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
//             const targetId = typeof l.target === 'object' ? l.target.id : l.target;
//             return !existingLinkKeys.includes(`${sourceId}-${targetId}`);
//           })
//         ];
//       }
      
//       setGraphData({ nodes: newNodes, links: newLinks });
//       setLoading(false);
//     } catch (error) {
//       setError(`Error fetching graph data: ${error.message}`);
//       setLoading(false);
//     }
//   };

//   // Handle entity type selection
//   const handleEntityTypeSelect = (type) => {
//     // If "All" is selected, select only "All"
//     if (type === 'All') {
//       setSelectedEntityTypes(['All']);
//     } else {
//       // If currently "All" is selected and user selects something else,
//       // replace "All" with the new selection
//       if (selectedEntityTypes.includes('All')) {
//         setSelectedEntityTypes([type]);
//       } else {
//         // Toggle the selection
//         if (selectedEntityTypes.includes(type)) {
//           setSelectedEntityTypes(selectedEntityTypes.filter(t => t !== type));
//         } else {
//           setSelectedEntityTypes([...selectedEntityTypes, type]);
//         }
//       }
//     }
//   };

//   // Clear all selections
//   const handleClearAll = () => {
//     setSelectedEntityTypes([]);
//   };

//   // Handle color change for entity type
//   const handleColorChange = (type, color) => {
//     setEntityColors({
//       ...entityColors,
//       [type]: color
//     });
//   };

//   // Effect to update graph when entity type selection changes
//   useEffect(() => {
//     if (selectedItem) {
//       fetchGraphData(selectedItem.id);
//     }
//   }, [selectedEntityTypes]);

//   // Effect to render graph visualization
//   useEffect(() => {
//     document.title = 'Thread Visualization';
    
//     if (!graphRef.current || !graphData.nodes.length) return;
    
//     // Clear existing SVG
//     d3.select(graphRef.current).selectAll("*").remove();
    
//     const svg = d3.select(graphRef.current).append("svg")
//       .attr("width", "100%")
//       .attr("height", "100%")
//       .attr("class", "graph-svg");
    
//     const width = graphRef.current.clientWidth;
//     const height = graphRef.current.clientHeight;
//     const tooltip = d3.select(tooltipRef.current);
    
//     // Create a force simulation
//     const simulation = d3.forceSimulation(graphData.nodes)
//       .force("link", d3.forceLink(graphData.links)
//         .id(d => d.id)
//         .distance(150))
//       .force("charge", d3.forceManyBody().strength(-800))
//       .force("center", d3.forceCenter(width / 2, height / 2));
    
//     // Prepare link data for D3
//     const linkData = graphData.links.map(link => {
//       // If link.source or link.target are strings, find the corresponding nodes
//       const sourceNode = typeof link.source === 'string' 
//         ? graphData.nodes.find(n => n.id === link.source) 
//         : link.source;
      
//       const targetNode = typeof link.target === 'string' 
//         ? graphData.nodes.find(n => n.id === link.target) 
//         : link.target;
      
//       return {
//         ...link,
//         source: sourceNode || link.source,
//         target: targetNode || link.target
//       };
//     });
    
//     // Add links
//     const link = svg.append("g")
//       .selectAll("line")
//       .data(linkData)
//       .enter().append("line")
//       .attr("class", "graph-link");
    
//     // Add nodes
//     const node = svg.append("g")
//       .selectAll(".node")
//       .data(graphData.nodes)
//       .enter().append("g")
//       .attr("class", "graph-node")
//       .call(d3.drag()
//         .on("start", dragstarted)
//         .on("drag", dragged)
//         .on("end", dragended))
//       .on("mouseover", (event, d) => {
//         tooltip
//           .style("opacity", 1)
//           .html(`<div class="tooltip-content"><strong>${d.label || d.id}</strong><br>${d.description || d.type}</div>`)
//           .style("left", (event.pageX + 10) + "px")
//           .style("top", (event.pageY - 28) + "px");
//       })
//       .on("mouseout", () => {
//         tooltip.style("opacity", 0);
//       })
//       .on("dblclick", (event, d) => {
//         fetchGraphData(d.id, true);
//       });
    
//     // Add rounded rectangles to nodes
//     node.append("rect")
//       .attr("width", d => (d.label || d.id).length * 9 + 20)
//       .attr("height", 30)
//       .attr("rx", 15)
//       .attr("ry", 15)
//       .attr("x", d => -((d.label || d.id).length * 9 + 20) / 2)
//       .attr("y", -15)
//       .attr("fill", d => entityColors[d.type] || "#888");
    
//     // Add labels to nodes
//     node.append("text")
//       .text(d => d.label || d.id)
//       .attr("text-anchor", "middle")
//       .attr("dy", 5)
//       .attr("fill", "white")
//       .style("font-size", "12px")
//       .style("pointer-events", "none");
    
//     // Simulation tick function
//     simulation.on("tick", () => {
//       link
//         .attr("x1", d => d.source.x)
//         .attr("y1", d => d.source.y)
//         .attr("x2", d => d.target.x)
//         .attr("y2", d => d.target.y);
      
//       node.attr("transform", d => `translate(${d.x},${d.y})`);
//     });
    
//     // Drag functions
//     function dragstarted(event, d) {
//       if (!event.active) simulation.alphaTarget(0.3).restart();
//       d.fx = d.x;
//       d.fy = d.y;
//     }
    
//     function dragged(event, d) {
//       d.fx = event.x;
//       d.fy = event.y;
//     }
    
//     function dragended(event, d) {
//       if (!event.active) simulation.alphaTarget(0);
//       d.fx = null;
//       d.fy = null;
//     }
    
//     // Cleanup
//     return () => {
//       simulation.stop();
//     };
//   }, [graphData, entityColors]);

//   return (
//     <div className="app-container">
//       <NavBar />
      
//       <div className="main-content">
//         {/* Left Sidebar */}
//         <div className="sidebar">
//           <div className="sidebar-section">
//             <div className="sidebar-title">Thread Level</div>
            
//             {/* Entity Type Filters */}
//             {entityTypes.map((type) => (
//               <div key={type} className="entity-type-item">
//                 <div className="entity-type-name">{type}</div>
                
//                 <div className="entity-type-controls">
//                   {/* Color Picker */}
//                   <div 
//                     className="color-picker-wrapper"
//                     style={{ backgroundColor: entityColors[type] }}
//                   >
//                     <input
//                       type="color"
//                       value={entityColors[type]}
//                       onChange={(e) => handleColorChange(type, e.target.value)}
//                       className="color-picker"
//                     />
//                   </div>
                  
//                   {/* Checkbox */}
//                   <div 
//                     className={`entity-checkbox ${selectedEntityTypes.includes(type) ? 'checked' : ''}`}
//                     onClick={() => handleEntityTypeSelect(type)}
//                   >
//                     {selectedEntityTypes.includes(type) && (
//                       <span className="checkbox-check">✓</span>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             ))}
            
//             {/* Clear All Button */}
//             <button 
//               className="clear-all-button"
//               onClick={handleClearAll}
//             >
//               Clear All
//             </button>
//           </div>
//         </div>
        
//         {/* Main Content Area */}
//         <div className="visualization-container">
//           {/* Search Bar */}
//           <div className="search-container">
//             <div className="search-bar">
//               <div className="search-input-wrapper">
//                 <Search className="search-icon" size={18} />
//                 <input
//                   type="text"
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                   onKeyDown={handleKeyPress}
//                   placeholder="Search All"
//                   className="search-input"
//                 />
                
//                 {/* Search Type Dropdown */}
//                 <select
//                   value={searchType}
//                   onChange={(e) => setSearchType(e.target.value)}
//                   className="search-type-select"
//                 >
//                   <option value="All">All</option>
//                   {entityTypes.filter(type => type !== 'All').map(type => (
//                     <option key={type} value={type}>{type}</option>
//                   ))}
//                 </select>
//               </div>
              
//               <button
//                 onClick={handleSearch}
//                 disabled={loading}
//                 className="search-button"
//               >
//                 <Search size={18} />
//               </button>
//             </div>
            
//             {/* Search Results Dropdown */}
//             {showResults && searchResults.length > 0 && (
//               <div className="search-results">
//                 {searchResults.map((result) => (
//                   <div
//                     key={result.id}
//                     className="search-result-item"
//                     onClick={() => handleResultSelect(result)}
//                   >
//                     <div className="result-id">{result.id}</div>
//                     <div className="result-type">{result.type}</div>
//                   </div>
//                 ))}
//               </div>
//             )}
            
//             {error && (
//               <div className="error-message">
//                 {error}
//               </div>
//             )}
//           </div>
          
//           {/* Loading Indicator */}
//           {loading && (
//             <div className="loading-overlay">
//               <div className="loading-spinner"></div>
//             </div>
//           )}
          
//           {/* Empty State */}
//           {!loading && !error && graphData.nodes.length === 0 && (
//             <div className="empty-state">
//               Search for an item to visualize its relationships
//             </div>
//           )}
          
//           {/* Graph Container */}
//           <div
//             ref={graphRef}
//             className="graph-container"
//           />
          
//           {/* Tooltip */}
//           <div 
//             ref={tooltipRef} 
//             className="tooltip"
//           ></div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default GraphView;


import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import NavBar from '../comps/NavBar';
import './graphView.css';
import { Search, Target } from 'lucide-react';

const GraphView = () => {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('All');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [centerItem, setCenterItem] = useState(null); // New state for center item
  const [selectedNodeDetails, setSelectedNodeDetails] = useState(null); // New state for node details
  const [showDetailsPanel, setShowDetailsPanel] = useState(false); // New state for details panel visibility
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedEntityTypes, setSelectedEntityTypes] = useState(['All']);
  const [entityColors, setEntityColors] = useState({
    'Product': '#8b5cf6',
    'Sales Order': '#f472b6',
    'Work Order': '#000000',
    'Risk': '#f59e0b',
    'Issues': '#ef4444',
    'Project': '#10b981',
    'Customer': '#3b82f6',
    'BOM': '#f472b6',
    'All': '#6366f1',
    // Add other entity types as needed
  });
  
  // Refs
  const graphRef = useRef(null);
  const tooltipRef = useRef(null);
  const simulationRef = useRef(null); // New ref for simulation
  
  // Entity types list
  const entityTypes = [
    'Product', 'Sales Order', 'Work Order', 'Risk', 
    'Issues', 'Project', 'Customer', 'All'
  ];

  // Authentication headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    const isGoogleAuth = localStorage.getItem('isGoogleAuth') === 'true';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(isGoogleAuth && { 'Auth-Type': 'google' }),
    };
  };

  // Search handler
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/partgraph/search?query=${encodeURIComponent(searchQuery)}&type=${encodeURIComponent(searchType)}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const results = await response.json();
      setSearchResults(results);
      setShowResults(true);
      setLoading(false);
    } catch (error) {
      setError(`Error searching: ${error.message}`);
      setLoading(false);
    }
  };

  // Handle key press for search
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle search result selection
  const handleResultSelect = async (item) => {
    setSelectedItem(item);
    setCenterItem(item); // Set as center item
    setShowResults(false);
    await fetchGraphData(item.id, false, true); // Fresh graph with this as center
  };

  // New function to fetch detailed information about a node
  const fetchNodeDetails = async (nodeId, nodeType) => {
    setLoading(true);
    try {
      // You can create a new API endpoint for detailed node information
      // For now, we'll use the existing search to get more details
      const response = await fetch(`/api/partgraph/details?id=${encodeURIComponent(nodeId)}&type=${encodeURIComponent(nodeType)}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
        const details = await response.json();
        return details;
      } else {
        // Fallback: create basic details from existing node data
        return {
          id: nodeId,
          type: nodeType,
          basicInfo: true // Flag to indicate this is basic info
        };
      }
    } catch (error) {
      console.warn('Could not fetch detailed node information:', error);
      return {
        id: nodeId,
        type: nodeType,
        basicInfo: true,
        error: error.message
      };
    } finally {
      setLoading(false);
    }
  };

  // Handle node click for details (separate from center selection)
  const handleNodeClick = async (node, event) => {
    // Prevent event from bubbling up
    event.stopPropagation();
    
    // If this is a double-click, don't show details (let double-click handler take over)
    if (event.detail === 2) return;
    
    // Small delay to distinguish from double-click
    setTimeout(async () => {
      if (event.detail === 1) {
        // Fetch detailed information about the node
        const nodeDetails = await fetchNodeDetails(node.id, node.type);
        
        // Enhance details with information from the current node
        const enhancedDetails = {
          ...nodeDetails,
          label: node.label,
          description: node.description,
          isCenter: node.isCenter,
          // Add any other properties from the node
          ...node
        };
        
        setSelectedNodeDetails(enhancedDetails);
        setShowDetailsPanel(true);
      }
    }, 200);
  };

  // Close details panel
  const closeDetailsPanel = () => {
    setShowDetailsPanel(false);
    setSelectedNodeDetails(null);
  };

  // Fetch graph data
  const fetchGraphData = async (itemId, keepExisting = false, setAsCenter = false) => {
    setLoading(true);
    setError(null);
    
    try {
      // Convert selected entity types to a comma-separated string
      const entityTypesParam = selectedEntityTypes.join(',');
      
      const response = await fetch(`/api/partgraph?id=${encodeURIComponent(itemId)}&entityTypes=${encodeURIComponent(entityTypesParam)}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process the returned data
      let newNodes = data.nodes || [];
      let newLinks = data.links || [];
      
      // Mark the center node
      if (setAsCenter) {
        newNodes = newNodes.map(node => ({
          ...node,
          isCenter: node.id === itemId
        }));
      }
      
      // If keepExisting is true, merge with existing graph data
      if (keepExisting) {
        // Add nodes without duplicates
        const existingNodeIds = graphData.nodes.map(n => n.id);
        const filteredNewNodes = newNodes.filter(n => !existingNodeIds.includes(n.id));
        
        // Update existing nodes to remove center marking
        const updatedExistingNodes = graphData.nodes.map(node => ({
          ...node,
          isCenter: setAsCenter && node.id === itemId
        }));
        
        newNodes = [...updatedExistingNodes, ...filteredNewNodes];
        
        // Add links without duplicates
        const existingLinkKeys = graphData.links.map(l => `${l.source}-${l.target}`);
        newLinks = [
          ...graphData.links,
          ...newLinks.filter(l => {
            const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
            const targetId = typeof l.target === 'object' ? l.target.id : l.target;
            return !existingLinkKeys.includes(`${sourceId}-${targetId}`);
          })
        ];
      }
      
      setGraphData({ nodes: newNodes, links: newLinks });
      setLoading(false);
    } catch (error) {
      setError(`Error fetching graph data: ${error.message}`);
      setLoading(false);
    }
  };

  // Function to center the view on the center node
  const centerViewOnNode = (nodeId) => {
    if (!simulationRef.current) return;
    
    const svg = d3.select(graphRef.current).select("svg");
    const width = graphRef.current.clientWidth;
    const height = graphRef.current.clientHeight;
    
    // Find the center node
    const centerNode = graphData.nodes.find(n => n.id === nodeId);
    if (!centerNode) return;
    
    // Calculate translation to center the node
    const translateX = width / 2 - centerNode.x;
    const translateY = height / 2 - centerNode.y;
    
    // Apply smooth transition to center the view
    svg.select("g.graph-container")
      .transition()
      .duration(750)
      .attr("transform", `translate(${translateX}, ${translateY})`);
  };

  // Handle entity type selection
  const handleEntityTypeSelect = (type) => {
    // If "All" is selected, select only "All"
    if (type === 'All') {
      setSelectedEntityTypes(['All']);
    } else {
      // If currently "All" is selected and user selects something else,
      // replace "All" with the new selection
      if (selectedEntityTypes.includes('All')) {
        setSelectedEntityTypes([type]);
      } else {
        // Toggle the selection
        if (selectedEntityTypes.includes(type)) {
          setSelectedEntityTypes(selectedEntityTypes.filter(t => t !== type));
        } else {
          setSelectedEntityTypes([...selectedEntityTypes, type]);
        }
      }
    }
  };

  // Clear all selections
  const handleClearAll = () => {
    setSelectedEntityTypes([]);
  };

  // Handle color change for entity type
  const handleColorChange = (type, color) => {
    setEntityColors({
      ...entityColors,
      [type]: color
    });
  };

  // Effect to update graph when entity type selection changes
  useEffect(() => {
    if (centerItem) {
      fetchGraphData(centerItem.id, false, true);
    }
  }, [selectedEntityTypes]);

  // Effect to render graph visualization
  useEffect(() => {
    document.title = 'Thread Visualization';
    
    if (!graphRef.current || !graphData.nodes.length) return;
    
    // Clear existing SVG
    d3.select(graphRef.current).selectAll("*").remove();
    
    const svg = d3.select(graphRef.current).append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("class", "graph-svg");
    
    const width = graphRef.current.clientWidth;
    const height = graphRef.current.clientHeight;
    const tooltip = d3.select(tooltipRef.current);
    
    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });
    
    svg.call(zoom);
    
    // Create container group for zoom/pan
    const container = svg.append("g").attr("class", "graph-container");
    
    // Create a force simulation
    const simulation = d3.forceSimulation(graphData.nodes)
      .force("link", d3.forceLink(graphData.links)
        .id(d => d.id)
        .distance(d => {
          // Make center node have shorter links
          const sourceIsCenter = d.source.isCenter;
          const targetIsCenter = d.target.isCenter;
          return (sourceIsCenter || targetIsCenter) ? 100 : 150;
        }))
      .force("charge", d3.forceManyBody().strength(d => {
        // Make center node more attractive
        return d.isCenter ? -1200 : -800;
      }))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(50));
    
    // Store simulation reference
    simulationRef.current = simulation;
    
    // Prepare link data for D3
    const linkData = graphData.links.map(link => {
      // If link.source or link.target are strings, find the corresponding nodes
      const sourceNode = typeof link.source === 'string' 
        ? graphData.nodes.find(n => n.id === link.source) 
        : link.source;
      
      const targetNode = typeof link.target === 'string' 
        ? graphData.nodes.find(n => n.id === link.target) 
        : link.target;
      
      return {
        ...link,
        source: sourceNode || link.source,
        target: targetNode || link.target
      };
    });
    
    // Add links
    const link = container.append("g")
      .selectAll("line")
      .data(linkData)
      .enter().append("line")
      .attr("class", "graph-link")
      .style("stroke", d => {
        // Highlight links connected to center node
        const sourceIsCenter = d.source.isCenter;
        const targetIsCenter = d.target.isCenter;
        return (sourceIsCenter || targetIsCenter) ? "#ff6b6b" : "#999";
      })
      .style("stroke-width", d => {
        // Make center node links thicker
        const sourceIsCenter = d.source.isCenter;
        const targetIsCenter = d.target.isCenter;
        return (sourceIsCenter || targetIsCenter) ? 3 : 1.5;
      });
    
    // Add nodes
    const node = container.append("g")
      .selectAll(".node")
      .data(graphData.nodes)
      .enter().append("g")
      .attr("class", d => `graph-node ${d.isCenter ? 'center-node' : ''}`)
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))
      .on("mouseover", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(`
            <div class="tooltip-content">
              <strong>${d.label || d.id}</strong><br>
              ${d.description || d.type}
              ${d.isCenter ? '<br><em>(Center Node)</em>' : ''}
            </div>
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      })
      .on("click", (event, d) => {
        // Single click to show details
        handleNodeClick(d, event);
      })
      .on("dblclick", (event, d) => {
        // Double click to make center and show relationships
        handleNodeDoubleClick(d, event);
      });
    
    // Add rounded rectangles to nodes
    node.append("rect")
      .attr("width", d => (d.label || d.id).length * 9 + 20)
      .attr("height", d => d.isCenter ? 40 : 30) // Make center node taller
      .attr("rx", 15)
      .attr("ry", 15)
      .attr("x", d => -((d.label || d.id).length * 9 + 20) / 2)
      .attr("y", d => d.isCenter ? -20 : -15)
      .attr("fill", d => d.isCenter ? "#ff6b6b" : (entityColors[d.type] || "#888"))
      .attr("stroke", d => d.isCenter ? "#fff" : "none")
      .attr("stroke-width", d => d.isCenter ? 3 : 0);
    
    // Add center icon for center nodes
    node.filter(d => d.isCenter)
      .append("text")
      .text("🎯")
      .attr("text-anchor", "middle")
      .attr("dy", -25)
      .style("font-size", "16px");
    
    // Add labels to nodes
    node.append("text")
      .text(d => d.label || d.id)
      .attr("text-anchor", "middle")
      .attr("dy", d => d.isCenter ? 5 : 5)
      .attr("fill", "white")
      .style("font-size", d => d.isCenter ? "14px" : "12px")
      .style("font-weight", d => d.isCenter ? "bold" : "normal")
      .style("pointer-events", "none");
    
    // Simulation tick function
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    
    // After simulation stabilizes, center the view on the center node
    simulation.on("end", () => {
      const centerNode = graphData.nodes.find(n => n.isCenter);
      if (centerNode) {
        setTimeout(() => centerViewOnNode(centerNode.id), 100);
      }
    });
    
    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    // Cleanup
    return () => {
      simulation.stop();
      simulationRef.current = null;
    };
  }, [graphData, entityColors]);

  return (
    <div className="app-container">
      <NavBar />
      
      <div className="main-content">
        {/* Left Sidebar */}
        <div className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-title">Thread Level</div>
            
            {/* Current Center Item Display */}
            {centerItem && (
              <div className="center-item-display">
                <div className="center-item-header">
                  <Target size={16} />
                  <span>Center Item</span>
                </div>
                <div className="center-item-info">
                  <div className="center-item-id">{centerItem.id}</div>
                  <div className="center-item-type">{centerItem.type}</div>
                </div>
              </div>
            )}
            
            {/* Entity Type Filters */}
            {entityTypes.map((type) => (
              <div key={type} className="entity-type-item">
                <div className="entity-type-name">{type}</div>
                
                <div className="entity-type-controls">
                  {/* Color Picker */}
                  <div 
                    className="color-picker-wrapper"
                    style={{ backgroundColor: entityColors[type] }}
                  >
                    <input
                      type="color"
                      value={entityColors[type]}
                      onChange={(e) => handleColorChange(type, e.target.value)}
                      className="color-picker"
                    />
                  </div>
                  
                  {/* Checkbox */}
                  <div 
                    className={`entity-checkbox ${selectedEntityTypes.includes(type) ? 'checked' : ''}`}
                    onClick={() => handleEntityTypeSelect(type)}
                  >
                    {selectedEntityTypes.includes(type) && (
                      <span className="checkbox-check">✓</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Clear All Button */}
            <button 
              className="clear-all-button"
              onClick={handleClearAll}
            >
              Clear All
            </button>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="visualization-container">
          {/* Search Bar */}
          <div className="search-container">
            <div className="search-bar">
              <div className="search-input-wrapper">
                <Search className="search-icon" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Search All"
                  className="search-input"
                />
                
                {/* Search Type Dropdown */}
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="search-type-select"
                >
                  <option value="All">All</option>
                  {entityTypes.filter(type => type !== 'All').map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={handleSearch}
                disabled={loading}
                className="search-button"
              >
                <Search size={18} />
              </button>
            </div>
            
            {/* Instructions */}
            <div className="instructions">
              <small>
                <strong>Instructions:</strong> Single-click for details | Double-click to center & show relationships | Drag to move | Scroll to zoom
              </small>
            </div>
            
            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="search-result-item"
                    onClick={() => handleResultSelect(result)}
                  >
                    <div className="result-id">{result.id}</div>
                    <div className="result-type">{result.type}</div>
                  </div>
                ))}
              </div>
            )}
            
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
          </div>
          
          {/* Loading Indicator */}
          {loading && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
            </div>
          )}
          
          {/* Empty State */}
          {!loading && !error && graphData.nodes.length === 0 && (
            <div className="empty-state">
              Search for an item to visualize its relationships
            </div>
          )}
          
          {/* Graph Container */}
          <div
            ref={graphRef}
            className="graph-container"
          />
          
          {/* Tooltip */}
          <div 
            ref={tooltipRef} 
            className="tooltip"
          ></div>
        </div>
      </div>
      
      {/* Node Details Panel */}
      {showDetailsPanel && selectedNodeDetails && (
        <div className="details-panel-overlay" onClick={closeDetailsPanel}>
          <div className="details-panel" onClick={(e) => e.stopPropagation()}>
            <div className="details-panel-header">
              <h3>Node Details</h3>
              <button 
                className="close-button"
                onClick={closeDetailsPanel}
                aria-label="Close details panel"
              >
                ×
              </button>
            </div>
            
            <div className="details-panel-content">
              {/* Basic Information */}
              <div className="details-section">
                <h4>Basic Information</h4>
                <div className="details-row">
                  <span className="details-label">ID:</span>
                  <span className="details-value">{selectedNodeDetails.id}</span>
                </div>
                <div className="details-row">
                  <span className="details-label">Type:</span>
                  <span className={`details-value details-type ${selectedNodeDetails.type.toLowerCase().replace(' ', '-')}`}>
                    {selectedNodeDetails.type}
                  </span>
                </div>
                {selectedNodeDetails.label && selectedNodeDetails.label !== selectedNodeDetails.id && (
                  <div className="details-row">
                    <span className="details-label">Label:</span>
                    <span className="details-value">{selectedNodeDetails.label}</span>
                  </div>
                )}
                {selectedNodeDetails.description && (
                  <div className="details-row">
                    <span className="details-label">Description:</span>
                    <span className="details-value">{selectedNodeDetails.description}</span>
                  </div>
                )}
                {selectedNodeDetails.isCenter && (
                  <div className="details-row">
                    <span className="details-label">Status:</span>
                    <span className="details-value center-status">🎯 Center Node</span>
                  </div>
                )}
              </div>

              {/* Detailed Information (if available from API) */}
              {!selectedNodeDetails.basicInfo && (
                <>
                  {/* Product Details */}
                  {selectedNodeDetails.type === 'Product' && (
                    <div className="details-section">
                      <h4>Product Information</h4>
                      {selectedNodeDetails.partnumber && (
                        <div className="details-row">
                          <span className="details-label">Part Number:</span>
                          <span className="details-value">{selectedNodeDetails.partnumber}</span>
                        </div>
                      )}
                      {selectedNodeDetails.material && (
                        <div className="details-row">
                          <span className="details-label">Material:</span>
                          <span className="details-value">{selectedNodeDetails.material}</span>
                        </div>
                      )}
                      {selectedNodeDetails.supplier && (
                        <div className="details-row">
                          <span className="details-label">Supplier:</span>
                          <span className="details-value">{selectedNodeDetails.supplier}</span>
                        </div>
                      )}
                      {selectedNodeDetails.cost && (
                        <div className="details-row">
                          <span className="details-label">Cost:</span>
                          <span className="details-value">${selectedNodeDetails.cost}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sales Order Details */}
                  {selectedNodeDetails.type === 'Sales Order' && (
                    <div className="details-section">
                      <h4>Sales Order Information</h4>
                      {selectedNodeDetails.ordernumber && (
                        <div className="details-row">
                          <span className="details-label">Order Number:</span>
                          <span className="details-value">{selectedNodeDetails.ordernumber}</span>
                        </div>
                      )}
                      {selectedNodeDetails.customer_name && (
                        <div className="details-row">
                          <span className="details-label">Customer:</span>
                          <span className="details-value">{selectedNodeDetails.customer_name}</span>
                        </div>
                      )}
                      {selectedNodeDetails.program && (
                        <div className="details-row">
                          <span className="details-label">Program:</span>
                          <span className="details-value">{selectedNodeDetails.program}</span>
                        </div>
                      )}
                      {selectedNodeDetails.quantity && (
                        <div className="details-row">
                          <span className="details-label">Quantity:</span>
                          <span className="details-value">{selectedNodeDetails.quantity}</span>
                        </div>
                      )}
                      {selectedNodeDetails.dueDate && (
                        <div className="details-row">
                          <span className="details-label">Due Date:</span>
                          <span className="details-value">{new Date(selectedNodeDetails.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Work Order Details */}
                  {selectedNodeDetails.type === 'Work Order' && (
                    <div className="details-section">
                      <h4>Work Order Information</h4>
                      {selectedNodeDetails.workorder && (
                        <div className="details-row">
                          <span className="details-label">Work Order:</span>
                          <span className="details-value">{selectedNodeDetails.workorder}</span>
                        </div>
                      )}
                      {selectedNodeDetails.status && (
                        <div className="details-row">
                          <span className="details-label">Status:</span>
                          <span className={`details-value status-${selectedNodeDetails.status.toLowerCase()}`}>
                            {selectedNodeDetails.status}
                          </span>
                        </div>
                      )}
                      {selectedNodeDetails.assignedTo && (
                        <div className="details-row">
                          <span className="details-label">Assigned To:</span>
                          <span className="details-value">{selectedNodeDetails.assignedTo}</span>
                        </div>
                      )}
                      {selectedNodeDetails.priority && (
                        <div className="details-row">
                          <span className="details-label">Priority:</span>
                          <span className={`details-value priority-${selectedNodeDetails.priority.toLowerCase()}`}>
                            {selectedNodeDetails.priority}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Risk/Issue Details */}
                  {(selectedNodeDetails.type === 'Risk' || selectedNodeDetails.type === 'Issues') && (
                    <div className="details-section">
                      <h4>{selectedNodeDetails.type} Information</h4>
                      {selectedNodeDetails.title && (
                        <div className="details-row">
                          <span className="details-label">Title:</span>
                          <span className="details-value">{selectedNodeDetails.title}</span>
                        </div>
                      )}
                      {selectedNodeDetails.severity && (
                        <div className="details-row">
                          <span className="details-label">Severity:</span>
                          <span className={`details-value severity-${selectedNodeDetails.severity.toLowerCase()}`}>
                            {selectedNodeDetails.severity}
                          </span>
                        </div>
                      )}
                      {selectedNodeDetails.owner && (
                        <div className="details-row">
                          <span className="details-label">Owner:</span>
                          <span className="details-value">{selectedNodeDetails.owner}</span>
                        </div>
                      )}
                      {selectedNodeDetails.createdDate && (
                        <div className="details-row">
                          <span className="details-label">Created:</span>
                          <span className="details-value">{new Date(selectedNodeDetails.createdDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Customer Details */}
                  {selectedNodeDetails.type === 'Customer' && (
                    <div className="details-section">
                      <h4>Customer Information</h4>
                      {selectedNodeDetails.name && (
                        <div className="details-row">
                          <span className="details-label">Name:</span>
                          <span className="details-value">{selectedNodeDetails.name}</span>
                        </div>
                      )}
                      {selectedNodeDetails.address && (
                        <div className="details-row">
                          <span className="details-label">Address:</span>
                          <span className="details-value">{selectedNodeDetails.address}</span>
                        </div>
                      )}
                      {selectedNodeDetails.contact && (
                        <div className="details-row">
                          <span className="details-label">Contact:</span>
                          <span className="details-value">{selectedNodeDetails.contact}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Relationships Summary */}
              <div className="details-section">
                <h4>Relationships</h4>
                <div className="details-row">
                  <span className="details-label">Connected Nodes:</span>
                  <span className="details-value">
                    {graphData.links.filter(link => 
                      (typeof link.source === 'string' ? link.source : link.source.id) === selectedNodeDetails.id ||
                      (typeof link.target === 'string' ? link.target : link.target.id) === selectedNodeDetails.id
                    ).length}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="details-section">
                <h4>Actions</h4>
                <div className="details-actions">
                  {!selectedNodeDetails.isCenter && (
                    <button 
                      className="action-button center-button"
                      onClick={() => {
                        handleNodeDoubleClick(selectedNodeDetails, { stopPropagation: () => {} });
                        closeDetailsPanel();
                      }}
                    >
                      🎯 Make Center & Show Relationships
                    </button>
                  )}
                </div>
              </div>

              {/* Error or Basic Info Notice */}
              {selectedNodeDetails.basicInfo && (
                <div className="details-notice">
                  <p><strong>Note:</strong> Showing basic information only. {selectedNodeDetails.error && `Error: ${selectedNodeDetails.error}`}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphView;