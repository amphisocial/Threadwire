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
import { Search } from 'lucide-react';

const GraphView = () => {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('All');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [centerItem, setCenterItem] = useState(null);
  const [selectedNodeDetails, setSelectedNodeDetails] = useState(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
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
  });
  
  // Refs
  const graphRef = useRef(null);
  const tooltipRef = useRef(null);
  
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
    setCenterItem(item);
    setShowResults(false);
    await fetchGraphData(item.id, false, true);
  };

  // Fetch detailed information about a node
  const fetchNodeDetails = async (nodeId, nodeType) => {
    try {
      const response = await fetch(`/api/partgraph/details?id=${encodeURIComponent(nodeId)}&type=${encodeURIComponent(nodeType)}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
        const details = await response.json();
        return details;
      } else {
        return {
          id: nodeId,
          type: nodeType,
          basicInfo: true
        };
      }
    } catch (error) {
      return {
        id: nodeId,
        type: nodeType,
        basicInfo: true,
        error: error.message
      };
    }
  };

  // Handle single-click for details
  const handleNodeClick = async (node, event) => {
    event.stopPropagation();
    
    if (event.detail === 2) return;
    
    setTimeout(async () => {
      if (event.detail === 1) {
        const nodeDetails = await fetchNodeDetails(node.id, node.type);
        
        const enhancedDetails = {
          ...nodeDetails,
          label: node.label,
          description: node.description,
          isCenter: node.isCenter,
          ...node
        };
        
        setSelectedNodeDetails(enhancedDetails);
        setShowDetailsPanel(true);
      }
    }, 200);
  };

  // Handle double-click to make center and show relationships
  const handleNodeDoubleClick = async (node, event) => {
    event.stopPropagation();
    
    closeDetailsPanel();
    
    setCenterItem({
      id: node.id,
      type: node.type,
      description: node.description || node.label
    });
    
    await fetchGraphData(node.id, false, true);
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
      const entityTypesParam = selectedEntityTypes.join(',');
      
      const response = await fetch(`/api/partgraph?id=${encodeURIComponent(itemId)}&entityTypes=${encodeURIComponent(entityTypesParam)}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      let newNodes = data.nodes || [];
      let newLinks = data.links || [];
      
      if (setAsCenter) {
        newNodes = newNodes.map(node => ({
          ...node,
          isCenter: node.id === itemId
        }));
      }
      
      if (keepExisting) {
        const existingNodeIds = graphData.nodes.map(n => n.id);
        const filteredNewNodes = newNodes.filter(n => !existingNodeIds.includes(n.id));
        
        const updatedExistingNodes = graphData.nodes.map(node => ({
          ...node,
          isCenter: setAsCenter && node.id === itemId
        }));
        
        newNodes = [...updatedExistingNodes, ...filteredNewNodes];
        
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

  // Handle entity type selection
  const handleEntityTypeSelect = (type) => {
    if (type === 'All') {
      setSelectedEntityTypes(['All']);
    } else {
      if (selectedEntityTypes.includes('All')) {
        setSelectedEntityTypes([type]);
      } else {
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
    
    d3.select(graphRef.current).selectAll("*").remove();
    
    const svg = d3.select(graphRef.current).append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("class", "graph-svg");
    
    const width = graphRef.current.clientWidth;
    const height = graphRef.current.clientHeight;
    const tooltip = d3.select(tooltipRef.current);
    
    const simulation = d3.forceSimulation(graphData.nodes)
      .force("link", d3.forceLink(graphData.links)
        .id(d => d.id)
        .distance(150))
      .force("charge", d3.forceManyBody().strength(-800))
      .force("center", d3.forceCenter(width / 2, height / 2));
    
    const linkData = graphData.links.map(link => {
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
    
    const link = svg.append("g")
      .selectAll("line")
      .data(linkData)
      .enter().append("line")
      .attr("class", "graph-link");
    
    const node = svg.append("g")
      .selectAll(".node")
      .data(graphData.nodes)
      .enter().append("g")
      .attr("class", "graph-node")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))
      .on("mouseover", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(`<div class="tooltip-content"><strong>${d.label || d.id}</strong><br>${d.description || d.type}</div>`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      })
      .on("click", (event, d) => {
        handleNodeClick(d, event);
      })
      .on("dblclick", (event, d) => {
        handleNodeDoubleClick(d, event);
      });
    
    node.append("rect")
      .attr("width", d => (d.label || d.id).length * 9 + 20)
      .attr("height", 30)
      .attr("rx", 15)
      .attr("ry", 15)
      .attr("x", d => -((d.label || d.id).length * 9 + 20) / 2)
      .attr("y", -15)
      .attr("fill", d => d.isCenter ? "#ff6b6b" : (entityColors[d.type] || "#888"));
    
    node.append("text")
      .text(d => d.label || d.id)
      .attr("text-anchor", "middle")
      .attr("dy", 5)
      .attr("fill", "white")
      .style("font-size", "12px")
      .style("pointer-events", "none");
    
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    
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
    
    return () => {
      simulation.stop();
    };
  }, [graphData, entityColors]);

  return (
    <div className="app-container">
      <NavBar />
      
      <div className="main-content">
        <div className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-title">Thread Level</div>
            
            {centerItem && (
              <div className="center-item-display">
                <div className="center-item-header">
                  <span>Center Item</span>
                </div>
                <div className="center-item-info">
                  <div className="center-item-id">{centerItem.id}</div>
                  <div className="center-item-type">{centerItem.type}</div>
                </div>
              </div>
            )}
            
            {entityTypes.map((type) => (
              <div key={type} className="entity-type-item">
                <div className="entity-type-name">{type}</div>
                
                <div className="entity-type-controls">
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
            
            <button 
              className="clear-all-button"
              onClick={handleClearAll}
            >
              Clear All
            </button>
          </div>
        </div>
        
        <div className="visualization-container">
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
          
          {loading && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
            </div>
          )}
          
          {!loading && !error && graphData.nodes.length === 0 && (
            <div className="empty-state">
              Search for an item to visualize its relationships
            </div>
          )}
          
          <div
            ref={graphRef}
            className="graph-container"
          />
          
          <div 
            ref={tooltipRef} 
            className="tooltip"
          ></div>
        </div>
      </div>
      
      {showDetailsPanel && selectedNodeDetails && (
        <div className="details-panel-overlay" onClick={closeDetailsPanel}>
          <div className="details-panel" onClick={(e) => e.stopPropagation()}>
            <div className="details-panel-header">
              <h3>Node Details</h3>
              <button 
                className="close-button"
                onClick={closeDetailsPanel}
              >
                ×
              </button>
            </div>
            
            <div className="details-panel-content">
              <div className="details-section">
                <h4>Basic Information</h4>
                <div className="details-row">
                  <span className="details-label">ID:</span>
                  <span className="details-value">{selectedNodeDetails.id}</span>
                </div>
                <div className="details-row">
                  <span className="details-label">Type:</span>
                  <span className="details-value">{selectedNodeDetails.type}</span>
                </div>
                {selectedNodeDetails.description && (
                  <div className="details-row">
                    <span className="details-label">Description:</span>
                    <span className="details-value">{selectedNodeDetails.description}</span>
                  </div>
                )}
                {selectedNodeDetails.isCenter && (
                  <div className="details-row">
                    <span className="details-label">Status:</span>
                    <span className="details-value">Center Node</span>
                  </div>
                )}
              </div>

              {!selectedNodeDetails.isCenter && (
                <div className="details-section">
                  <h4>Actions</h4>
                  <button 
                    className="action-button"
                    onClick={() => {
                      handleNodeDoubleClick(selectedNodeDetails, { stopPropagation: () => {} });
                      closeDetailsPanel();
                    }}
                  >
                    Make Center & Show Relationships
                  </button>
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