// const Part = require("../models/Part");
// const SalesOrder = require("../models/SalesOrder");
// const WorkOrder = require("../models/Workorder");
// const WorkOrderExecution = require("../models/Workorderexecution");

// exports.getPartGraph = async (req, res) => {
//     //const { partnumber, type } = req.query;
//     const { partnumber, direction } = req.query;
//     const customerId = req.user?.customerId || req.customer?.id;

//     console.error("partnumber:", partnumber, "direction:", direction);
//     if (!partnumber || !direction) {
//         return res.status(400).json({ error: "Missing partnumber or direction parameter" });
//     }

//     try {
//         const graphData = await fetchGraphData(partnumber, direction, customerId);
//         res.status(200).json(graphData);
//     } catch (error) {
//         console.error("Error fetching part graph:", error);
//         res.status(500).json({ error: "Internal server error" });
//     }
// };

// async function fetchLinksForPart(part, direction) {
//     const nodes = [];
//     const links = [];

//     try {
//         if (direction === "left") {
//             // Fetch sales orders for the part
//             const salesOrders = await SalesOrder.find({ partnumber: part.partnumber, customerId });
//             console.error("Found sales orders:", salesOrders);

//             salesOrders.forEach((so) => {
//                 console.error("Found sales orders:", so.ordernumber, so.linenumber);
//                 nodes.push({
//                     id: so._id,
//                     label: `Sales Order: ${so.ordernumber}`,
//                     type: "salesorder",
//                 });

//                 links.push({
//                     source: part.partnumber,
//                     target: so._id,
//                 });
//             });
//         } else if (direction === "right") {
//             // Fetch PartBoP and WorkOrders for the part
//             const [partBoPs, workOrders] = await Promise.all([
//                 WorkOrder.PartBoP.find({ 
//                     partnumber: part.partnumber,
//                     customerId // Add company filter
//                 }),
//                 WorkOrder.WorkOrder.find({ 
//                     partnumber: part.partnumber,
//                     customerId // Add company filter
//                 }),
//             ]);
//             console.error("Found PartBoPs:", partBoPs);
//             console.error("Found WorkOrders:", workOrders);

//             // Add PartBoP operations
//             partBoPs.forEach((bop) => {
//                 nodes.push({
//                     id: bop.operation,
//                     label: `Operation: ${bop.operation}`,
//                     type: "partbop",
//                 });

//                 links.push({
//                     source: part.partnumber,
//                     target: bop.operation,
//                 });
//             });

//             // Add WorkOrders
//             workOrders.forEach((wo) => {
//                 nodes.push({
//                     id: wo.workorder,
//                     label: `Work Order: ${wo.workorder}`,
//                     type: "workorder",
//                 });

//                 links.push({
//                     source: part.partnumber,
//                     target: wo.workorder,
//                 });
//             });
//         } else if (direction === "execution") {
//             // Fetch WorkOrderExecutions for the workorder
//             const workOrderExecutions = await WorkOrderExecution.find({
//                 workorder: part.partnumber,
//                 customerId
//             });
//             console.error("Found WorkOrderExecutions:", workOrderExecutions);

//             workOrderExecutions.forEach((execution) => {
//                 nodes.push({
//                     id: execution.executionId,
//                     label: `Execution: ${execution.executionId}`,
//                     type: "execution",
//                 });

//                 links.push({
//                     source: part.partnumber,
//                     target: execution.executionId,
//                 });
//             });
//         }
//     } catch (error) {
//         console.error(`Error fetching links for ${direction}:`, error);
//     }

//     return { nodes, links };
// }
// async function fetchGraphData(partnumber, direction, customerId) {
//     const nodes = [];
//     const links = [];

//     try {
//         const filters = {
//             customerId // Add company filter
//         };
//         if (partnumber) filters.partnumber = new RegExp(partnumber, "i");

//         console.error("Filter value is:", filters.partnumber);

//         const parts = await Part.find(filters);
//         console.error("Found parts:", parts);

//         // Iterate through parts and fetch links based on direction
//         for (const pt of parts) {
//             console.error("Processing part:", pt.partnumber);

//             // Add the part as the root node
//             nodes.push({
//                 id: pt.partnumber,
//                 label: `Part: ${pt.partnumber}`,
//                 type: "part",
//             });

//             // Fetch links based on the direction
//             const fetchedLinks = await fetchLinksForPart(pt, direction, customerId);

//             // Merge fetched nodes and links
//             nodes.push(...fetchedLinks.nodes);
//             links.push(...fetchedLinks.links);
//         }

//         console.error("Final nodes array:", nodes);
//         console.error("Final links array:", links);

//         return { nodes, links };
//     } catch (error) {
//         console.error("Error fetching graph data:", error);
//         return { nodes: [], links: [] };
//     }
// }

const Part = require("../models/Part");
const SalesOrder = require("../models/SalesOrder");
const { WorkOrder, PartBoP } = require("../models/Workorder");
const WorkOrderExecution = require("../models/Workorderexecution");
const Blocker = require("../models/Blocker");
const Company = require("../models/Company");

// Main entry point for the graph API
exports.getPartGraph = async (req, res) => {
    const { id, entityTypes } = req.query;
    const customerId = req.user?.customerId || req.customer?.id;

    if (!id) {
        return res.status(400).json({ error: "Missing id parameter" });
    }

    try {
        // Parse entityTypes from query parameter (comma-separated list)
        const selectedTypes = entityTypes ? entityTypes.split(',') : ['All'];
        
        // Determine the entity type of the provided ID
        const entityType = await determineEntityType(id, customerId);
        
        if (!entityType) {
            return res.status(404).json({ error: "Entity not found" });
        }
        
        // Fetch graph data with the determined type
        const graphData = await fetchGraphData(id, entityType, selectedTypes, customerId);
        res.status(200).json(graphData);
    } catch (error) {
        console.error("Error fetching entity graph:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Search entities by query and type
exports.searchEntities = async (req, res) => {
    const { query, type } = req.query;
    const customerId = req.user?.customerId || req.customer?.id;

    if (!query) {
        return res.status(400).json({ error: "Missing search query" });
    }

    try {
        const results = await searchByType(query, type, customerId);
        res.status(200).json(results);
    } catch (error) {
        console.error("Error searching entities:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Determine the entity type of a given ID
async function determineEntityType(id, customerId) {
    console.log(`Determining entity type for ID: "${id}", customerId: "${customerId}"`);
    
    // Check each model to find which one contains the ID
    try {
        // Check for Part
        console.log("Checking if it's a Part...");
        const part = await Part.findOne({ 
            partnumber: id, 
            customerId 
        });
        if (part) {
            console.log("Found as Part");
            return 'Product';
        }

        // Check for Sales Order - looking up by ordernumber first, then _id
        console.log("Checking if it's a Sales Order...");
        const salesOrder = await SalesOrder.findOne({ 
            ordernumber: id,
            customerId 
        });
        if (salesOrder) {
            console.log("Found as Sales Order by ordernumber");
            return 'Sales Order';
        }

        // Check for Work Order - looking up by workorder first, then _id
        console.log("Checking if it's a Work Order...");
        const workOrder = await WorkOrder.findOne({ 
            workorder: id,
            customerId 
        });
        if (workOrder) {
            console.log("Found as Work Order by workorder");
            return 'Work Order';
        }

        // Try ObjectId lookups if the ID looks like an ObjectId
        if (/^[0-9a-fA-F]{24}$/.test(id)) {
            console.log("Trying ObjectId lookups...");
            
            // Check for Sales Order by _id
            const salesOrderById = await SalesOrder.findOne({ 
                _id: id,
                customerId 
            });
            if (salesOrderById) {
                console.log("Found as Sales Order by _id");
                return 'Sales Order';
            }
            
            // Check for Work Order by _id
            const workOrderById = await WorkOrder.findOne({ 
                _id: id,
                customerId 
            });
            if (workOrderById) {
                console.log("Found as Work Order by _id");
                return 'Work Order';
            }
            
            // Check for Blocker (Risk or Issue)
            const blocker = await Blocker.findOne({ 
                _id: id,
                customerId 
            });
            if (blocker) {
                console.log(`Found as Blocker of type ${blocker.type}`);
                return blocker.type; // 'Risk' or 'Issue'
            }
            
            // Check for Company (Customer)
            const companyById = await Company.findOne({ 
                _id: id 
            });
            if (companyById) {
                console.log("Found as Customer by _id");
                return 'Customer';
            }
        }

        // Check for Company (Customer) by name
        console.log("Checking if it's a Customer by name...");
        const company = await Company.findOne({ 
            name: id
        });
        if (company) {
            console.log("Found as Customer by name");
            return 'Customer';
        }
        
        // Try a more permissive search for Work Orders - some may have different field names
        console.log("Trying broader work order search...");
        const anyWorkOrder = await WorkOrder.findOne({
            $or: [
                { workorder: id },
                { workOrderId: id },
                { wo: id }
            ],
            customerId
        });
        if (anyWorkOrder) {
            console.log("Found as Work Order through broader search");
            return 'Work Order';
        }
        
        // Special handling for Operation
        if (id.startsWith('OP') || /^[A-Z0-9]{2,10}$/.test(id)) {
            console.log("Assuming it's an Operation based on format");
            return 'Operation';
        }

        console.log("Entity type not determined for ID:", id);
        return null; // Not found in any collection
    } catch (error) {
        console.error("Error determining entity type:", error);
        return null;
    }
}

// Search entities by query and optional type
async function searchByType(query, type, customerId) {
    const results = [];
    const queryRegex = new RegExp(query, "i");

    try {
        // If no specific type is requested or type is 'All', search all entity types
        if (!type || type === 'All') {
            // Search Parts
            const parts = await Part.find({
                $or: [
                    { partnumber: queryRegex },
                    { description: queryRegex }
                ],
                customerId
            }).limit(10);
            
            parts.forEach(part => {
                results.push({
                    id: part.partnumber,
                    type: 'Product',
                    description: part.description || `Part ${part.partnumber}`
                });
            });

            // Search Sales Orders
            const salesOrders = await SalesOrder.find({
                $or: [
                    { ordernumber: queryRegex },
                    { program: queryRegex }
                ],
                customerId
            }).limit(10);
            
            salesOrders.forEach(so => {
                results.push({
                    id: so.ordernumber,
                    type: 'Sales Order',
                    description: `Sales Order for ${so.customer_name || 'customer'}`
                });
            });

            // Search Work Orders
            const workOrders = await WorkOrder.find({
                $or: [
                    { workorder: queryRegex },
                    { description: queryRegex }
                ],
                customerId
            }).limit(10);
            
            workOrders.forEach(wo => {
                results.push({
                    id: wo.workorder,
                    type: 'Work Order',
                    description: wo.description || `Work Order ${wo.workorder}`
                });
            });

            // Search Blockers (Risks and Issues)
            const blockers = await Blocker.find({
                $or: [
                    { title: queryRegex },
                    { description: queryRegex }
                ],
                customerId
            }).limit(10);
            
            blockers.forEach(blocker => {
                results.push({
                    id: blocker._id.toString(),
                    type: blocker.type, // 'Risk' or 'Issue'
                    description: blocker.title || `${blocker.type} ${blocker._id}`
                });
            });

            // Search Companies (Customers)
            const companies = await Company.find({
                name: queryRegex
            }).limit(10);
            
            companies.forEach(company => {
                results.push({
                    id: company._id.toString(),
                    type: 'Customer',
                    description: company.name || `Customer ${company._id}`
                });
            });
        } else {
            // Search only the specified entity type
            switch(type) {
                case 'Product':
                    const parts = await Part.find({
                        $or: [
                            { partnumber: queryRegex },
                            { description: queryRegex }
                        ],
                        customerId
                    }).limit(20);
                    
                    parts.forEach(part => {
                        results.push({
                            id: part.partnumber,
                            type: 'Product',
                            description: part.description || `Part ${part.partnumber}`
                        });
                    });
                    break;
                
                case 'Sales Order':
                    const salesOrders = await SalesOrder.find({
                        $or: [
                            { ordernumber: queryRegex },
                            { program: queryRegex }
                        ],
                        customerId
                    }).limit(20);
                    
                    salesOrders.forEach(so => {
                        results.push({
                            id: so.ordernumber,
                            type: 'Sales Order',
                            description: `Sales Order for ${so.customer_name || 'customer'}`
                        });
                    });
                    break;
                
                case 'Work Order':
                    const workOrders = await WorkOrder.find({
                        $or: [
                            { workorder: queryRegex },
                            { description: queryRegex }
                        ],
                        customerId
                    }).limit(20);
                    
                    workOrders.forEach(wo => {
                        results.push({
                            id: wo.workorder,
                            type: 'Work Order',
                            description: wo.description || `Work Order ${wo.workorder}`
                        });
                    });
                    break;
                
                case 'Risk':
                    const risks = await Blocker.find({
                        $or: [
                            { title: queryRegex },
                            { description: queryRegex }
                        ],
                        type: 'Risk',
                        customerId
                    }).limit(20);
                    
                    risks.forEach(risk => {
                        results.push({
                            id: risk._id.toString(),
                            type: 'Risk',
                            description: risk.title || `Risk ${risk._id}`
                        });
                    });
                    break;
                
                case 'Issues':
                    const issues = await Blocker.find({
                        $or: [
                            { title: queryRegex },
                            { description: queryRegex }
                        ],
                        type: 'Issue',
                        customerId
                    }).limit(20);
                    
                    issues.forEach(issue => {
                        results.push({
                            id: issue._id.toString(),
                            type: 'Issues',
                            description: issue.title || `Issue ${issue._id}`
                        });
                    });
                    break;
                
                case 'Customer':
                    const companies = await Company.find({
                        name: queryRegex
                    }).limit(20);
                    
                    companies.forEach(company => {
                        results.push({
                            id: company._id.toString(),
                            type: 'Customer',
                            description: company.name || `Customer ${company._id}`
                        });
                    });
                    break;
            }
        }

        return results;
    } catch (error) {
        console.error("Error searching entities:", error);
        return [];
    }
}

// Fetch relationship graph data for an entity
async function fetchGraphData(id, entityType, selectedTypes, customerId) {
    // Initialize the graph data
    let nodes = [];
    let links = [];

    try {
        // Add the central/root node
        const rootNode = await getEntityDetails(id, entityType, customerId);
        if (!rootNode) {
            return { nodes, links };
        }

        nodes.push(rootNode);

        // If 'All' is selected, include all entity types
        const includeAllTypes = selectedTypes.includes('All');
        
        // Fetch relationships based on entity type
        const relationships = await fetchRelationships(id, entityType, customerId);
        
        // Filter relationships based on selected entity types
        for (const rel of relationships) {
            if (includeAllTypes || selectedTypes.includes(rel.targetType)) {
                // Add the relationship target node
                const targetNode = await getEntityDetails(rel.targetId, rel.targetType, customerId);
                if (targetNode) {
                    nodes.push(targetNode);
                    
                    // Add the link
                    links.push({
                        source: id,
                        target: rel.targetId,
                        type: rel.targetType
                    });
                }
            }
        }

        return { nodes, links };
    } catch (error) {
        console.error("Error fetching graph data:", error);
        return { nodes, links };
    }
}

// Get entity details by ID and type
async function getEntityDetails(id, entityType, customerId) {
    try {
        switch(entityType) {
            case 'Product':
                const part = await Part.findOne({ partnumber: id, customerId });
                if (part) {
                    return {
                        id: part.partnumber,
                        label: part.partnumber,
                        description: part.description || `Part ${part.partnumber}`,
                        type: 'Product'
                    };
                }
                break;
            
            case 'Sales Order':
                // Try to find by ordernumber first (should be a string field)
                let salesOrder = await SalesOrder.findOne({ ordernumber: id, customerId });
                
                // If not found and the id looks like a MongoDB ObjectId, try that
                if (!salesOrder && /^[0-9a-fA-F]{24}$/.test(id)) {
                    try {
                        salesOrder = await SalesOrder.findOne({ _id: id, customerId });
                    } catch (error) {
                        console.log("Error looking up sales order by _id:", error);
                    }
                }
                
                if (salesOrder) {
                    return {
                        id: salesOrder.ordernumber || salesOrder._id.toString(),
                        label: salesOrder.ordernumber || salesOrder._id.toString(),
                        description: `SO: ${salesOrder.customer_name || 'customer'} - ${salesOrder.program || ''}`,
                        type: 'Sales Order'
                    };
                }
                break;
            
            case 'Work Order':
                // Try to find by workorder first (should be a string field)
                let workOrder = await WorkOrder.findOne({ workorder: id, customerId });
                
                // If not found and the id looks like a MongoDB ObjectId, try that
                if (!workOrder && /^[0-9a-fA-F]{24}$/.test(id)) {
                    try {
                        workOrder = await WorkOrder.findOne({ _id: id, customerId });
                    } catch (error) {
                        console.log("Error looking up work order by _id:", error);
                    }
                }
                
                if (workOrder) {
                    return {
                        id: workOrder.workorder || workOrder._id.toString(),
                        label: workOrder.workorder || workOrder._id.toString(),
                        description: workOrder.description || `Work Order ${workOrder.workorder}`,
                        type: 'Work Order'
                    };
                }
                break;
            
            case 'Risk':
            case 'Issue':
            case 'Issues':
                // For Blockers, we expect an ObjectId
                const type = entityType === 'Issues' ? 'Issue' : entityType;
                
                // Only try to find by _id if it looks like a valid ObjectId
                if (/^[0-9a-fA-F]{24}$/.test(id)) {
                    try {
                        const blocker = await Blocker.findOne({ 
                            _id: id,
                            type,
                            customerId 
                        });
                        
                        if (blocker) {
                            return {
                                id: blocker._id.toString(),
                                label: blocker.title || blocker._id.toString(),
                                description: blocker.description || `${blocker.type}: ${blocker.title}`,
                                type: blocker.type === 'Issue' ? 'Issues' : 'Risk'
                            };
                        }
                    } catch (error) {
                        console.log(`Error looking up ${type} by _id:`, error);
                    }
                }
                break;
            
            case 'Customer':
                // Try by name first (might be a string)
                let company = await Company.findOne({ name: id });
                
                // If not found and the id looks like a MongoDB ObjectId, try that
                if (!company && /^[0-9a-fA-F]{24}$/.test(id)) {
                    try {
                        company = await Company.findOne({ _id: id });
                    } catch (error) {
                        console.log("Error looking up company by _id:", error);
                    }
                }
                
                if (company) {
                    return {
                        id: company._id.toString(),
                        label: company.name,
                        description: `${company.name} (${company.address || 'No address'})`,
                        type: 'Customer'
                    };
                }
                break;
                
            case 'Operation':
                // For operations, we might not have a dedicated model
                // Just return a basic node with the operation ID
                return {
                    id: id,
                    label: id,
                    description: `Operation: ${id}`,
                    type: 'Operation'
                };
                break;
        }
        
        return null;
    } catch (error) {
        console.error(`Error fetching details for ${entityType} ${id}:`, error);
        return null;
    }
}

// Fetch relationships for an entity
async function fetchRelationships(id, entityType, customerId) {
    const relationships = [];

    try {
        // Log some diagnostic info
        console.log(`Fetching relationships for ${entityType} ${id} with customerId ${customerId}`);
        
        switch(entityType) {
            case 'Product':
                // Products are related to Sales Orders and Work Orders
                
                // Fetch related Sales Orders
                const salesOrders = await SalesOrder.find({ partnumber: id, customerId });
                console.log(`Found ${salesOrders.length} related sales orders`);
                
                salesOrders.forEach(so => {
                    relationships.push({
                        targetId: so.ordernumber || so._id.toString(),
                        targetType: 'Sales Order'
                    });
                });
                
                // Fetch related Work Orders
                const workOrders = await WorkOrder.find({ partnumber: id, customerId });
                console.log(`Found ${workOrders.length} related work orders`);
                
                workOrders.forEach(wo => {
                    relationships.push({
                        targetId: wo.workorder || wo._id.toString(),
                        targetType: 'Work Order'
                    });
                });
                
                // Fetch related Blockers (Risks and Issues)
                // First, get the part's MongoDB ObjectId
                const partDoc = await Part.findOne({ partnumber: id, customerId });

                if (partDoc) {
                    try {
                        // Now use the part's ObjectId to find related blockers
                        const partBlockers = await Blocker.find({
                            relatedParts: partDoc._id, // Use the ObjectId instead of the part number string
                            customerId
                        });
                        
                        console.log(`Found ${partBlockers.length} blockers related to this part`);
                        
                        partBlockers.forEach(blocker => {
                            relationships.push({
                                targetId: blocker._id.toString(),
                                targetType: blocker.type === 'Issue' ? 'Issues' : 'Risk'
                            });
                        });
                    } catch (error) {
                        console.error("Error fetching related blockers:", error);
                        // Continue execution even if this query fails
                    }
                }

                // If this part has a blockerTag, find related parts
                // We already have partDoc from above, so we can reuse it
                if (partDoc && partDoc.blockerTag) {
                    console.log(`Found blockerTag ${partDoc.blockerTag}, looking for related items`);
                    
                    // Find other parts with the same blocker tag
                    const relatedParts = await Part.find({ 
                        blockerTag: partDoc.blockerTag, 
                        partnumber: { $ne: id },
                        customerId 
                    });
                    
                    console.log(`Found ${relatedParts.length} related parts with same blockerTag`);
                    
                    relatedParts.forEach(relatedPart => {
                        relationships.push({
                            targetId: relatedPart.partnumber,
                            targetType: 'Product'
                        });
                    });
                    
                    // Add code to find sales orders and work orders with the same blockerTag
                    const relatedSalesOrders = await SalesOrder.find({
                        blockerTag: partDoc.blockerTag,
                        customerId
                    });
                    
                    console.log(`Found ${relatedSalesOrders.length} related sales orders with same blockerTag`);
                    
                    relatedSalesOrders.forEach(so => {
                        relationships.push({
                            targetId: so.ordernumber || so._id.toString(),
                            targetType: 'Sales Order'
                        });
                    });
                    
                    const relatedWorkOrders = await WorkOrder.find({
                        blockerTag: partDoc.blockerTag,
                        customerId
                    });
                    
                    console.log(`Found ${relatedWorkOrders.length} related work orders with same blockerTag`);
                    
                    relatedWorkOrders.forEach(wo => {
                        relationships.push({
                            targetId: wo.workorder || wo._id.toString(),
                            targetType: 'Work Order'
                        });
                    });
                }
                
                // Fetch operations from PartBoP
                try {
                    const operations = await PartBoP.find({ partnumber: id, customerId });
                    console.log(`Found ${operations.length} operations for this part`);
                    
                    operations.forEach(op => {
                        if (op.operation) {
                            relationships.push({
                                targetId: op.operation,
                                targetType: 'Operation'
                            });
                        }
                    });
                } catch (error) {
                    console.error("Error fetching PartBoP operations:", error);
                }
                break;
            
            case 'Sales Order':
                // Sales Orders are related to Parts, Customers, and possibly blockers
                
                // Fetch the sales order
                const salesOrder = await SalesOrder.findOne({ 
                    $or: [{ ordernumber: id }, { _id: id }],
                    customerId 
                });
                
                if (salesOrder) {
                    // Relate to the part
                    if (salesOrder.partnumber) {
                        const part = await Part.findOne({ 
                            partnumber: salesOrder.partnumber,
                            customerId 
                        });
                        
                        if (part) {
                            relationships.push({
                                targetId: part.partnumber,
                                targetType: 'Product'
                            });
                        }
                    }
                    
                    // Relate to the customer
                    if (salesOrder.customerId) {
                        const company = await Company.findOne({ _id: salesOrder.customerId });
                        if (company) {
                            relationships.push({
                                targetId: company._id.toString(),
                                targetType: 'Customer'
                            });
                        }
                    }
                    
                    // Find related blockers
                    try {
                        const soBlockers = await Blocker.find({
                            relatedSalesOrders: salesOrder._id,
                            customerId
                        });
                        
                        console.log(`Found ${soBlockers.length} blockers related to this sales order`);
                        
                        soBlockers.forEach(blocker => {
                            relationships.push({
                                targetId: blocker._id.toString(),
                                targetType: blocker.type === 'Issue' ? 'Issues' : 'Risk'
                            });
                        });
                    } catch (error) {
                        console.error("Error fetching related blockers for sales order:", error);
                    }
                    
                    // If this sales order has a blocker tag, find related items
                    if (salesOrder.blockerTag) {
                        console.log(`Found sales order blockerTag ${salesOrder.blockerTag}, looking for related items`);
                        
                        // Find work orders with the same blocker tag
                        const relatedWorkOrders = await WorkOrder.find({ 
                            blockerTag: salesOrder.blockerTag,
                            customerId 
                        });
                        
                        console.log(`Found ${relatedWorkOrders.length} work orders with same blockerTag`);
                        
                        relatedWorkOrders.forEach(wo => {
                            relationships.push({
                                targetId: wo.workorder || wo._id.toString(),
                                targetType: 'Work Order'
                            });
                        });
                        
                        // Find parts with the same blocker tag
                        const relatedParts = await Part.find({ 
                            blockerTag: salesOrder.blockerTag,
                            customerId 
                        });
                        
                        console.log(`Found ${relatedParts.length} parts with same blockerTag`);
                        
                        relatedParts.forEach(part => {
                            relationships.push({
                                targetId: part.partnumber,
                                targetType: 'Product'
                            });
                        });
                        
                        // Find other sales orders with the same blockerTag
                        const relatedSalesOrders = await SalesOrder.find({
                            blockerTag: salesOrder.blockerTag,
                            ordernumber: { $ne: salesOrder.ordernumber },
                            customerId
                        });
                        
                        console.log(`Found ${relatedSalesOrders.length} other sales orders with same blockerTag`);
                        
                        relatedSalesOrders.forEach(so => {
                            relationships.push({
                                targetId: so.ordernumber || so._id.toString(),
                                targetType: 'Sales Order'
                            });
                        });
                    }
                }
                break;
            
            case 'Work Order':
                // Work Orders are related to Parts, Sales Orders, and Blockers
                
                // Fetch the work order
                const workOrder = await WorkOrder.findOne({ 
                    $or: [{ workorder: id }, { _id: id }],
                    customerId 
                });
                
                if (workOrder) {
                    // Relate to the part
                    if (workOrder.partnumber) {
                        const part = await Part.findOne({ 
                            partnumber: workOrder.partnumber,
                            customerId 
                        });
                        
                        if (part) {
                            relationships.push({
                                targetId: part.partnumber,
                                targetType: 'Product'
                            });
                        }
                    }
                    
                    // Relate to the sales order
                    if (workOrder.salesorder) {
                        const so = await SalesOrder.findOne({ 
                            $or: [{ ordernumber: workOrder.salesorder }, { _id: workOrder.salesorder }],
                            customerId 
                        });
                        
                        if (so) {
                            relationships.push({
                                targetId: so.ordernumber || so._id.toString(),
                                targetType: 'Sales Order'
                            });
                        }
                    }
                    
                    // Find related blockers
                    try {
                        const woBlockers = await Blocker.find({
                            relatedWorkOrders: workOrder._id,
                            customerId
                        });
                        
                        console.log(`Found ${woBlockers.length} blockers related to this work order`);
                        
                        woBlockers.forEach(blocker => {
                            relationships.push({
                                targetId: blocker._id.toString(),
                                targetType: blocker.type === 'Issue' ? 'Issues' : 'Risk'
                            });
                        });
                    } catch (error) {
                        console.error("Error fetching related blockers for work order:", error);
                    }
                    
                    // If this work order has a blocker tag, find related items
                    if (workOrder.blockerTag) {
                        console.log(`Found work order blockerTag ${workOrder.blockerTag}, looking for related items`);
                        
                        // Find sales orders with the same blocker tag
                        const relatedSalesOrders = await SalesOrder.find({ 
                            blockerTag: workOrder.blockerTag,
                            customerId 
                        });
                        
                        console.log(`Found ${relatedSalesOrders.length} sales orders with same blockerTag`);
                        
                        relatedSalesOrders.forEach(so => {
                            relationships.push({
                                targetId: so.ordernumber || so._id.toString(),
                                targetType: 'Sales Order'
                            });
                        });
                        
                        // Find parts with the same blocker tag
                        const relatedParts = await Part.find({ 
                            blockerTag: workOrder.blockerTag,
                            customerId 
                        });
                        
                        console.log(`Found ${relatedParts.length} parts with same blockerTag`);
                        
                        relatedParts.forEach(part => {
                            relationships.push({
                                targetId: part.partnumber,
                                targetType: 'Product'
                            });
                        });
                        
                        // Find other work orders with the same blockerTag
                        const relatedWorkOrders = await WorkOrder.find({
                            blockerTag: workOrder.blockerTag,
                            workorder: { $ne: workOrder.workorder },
                            customerId
                        });
                        
                        console.log(`Found ${relatedWorkOrders.length} other work orders with same blockerTag`);
                        
                        relatedWorkOrders.forEach(wo => {
                            relationships.push({
                                targetId: wo.workorder || wo._id.toString(),
                                targetType: 'Work Order'
                            });
                        });
                    }
                    
                    // Fetch WorkOrderExecutions
                    try {
                        const executions = await WorkOrderExecution.find({ 
                            workorder: workOrder.workorder,
                            customerId 
                        });
                        
                        console.log(`Found ${executions.length} executions for this work order`);
                        
                        executions.forEach(execution => {
                            relationships.push({
                                targetId: execution._id.toString(),
                                targetType: 'Execution'
                            });
                        });
                    } catch (error) {
                        console.error("Error fetching work order executions:", error);
                    }
                }
                break;
            
            case 'Risk':
            case 'Issue':
            case 'Issues':
                // Find the blocker
                const type = entityType === 'Issues' ? 'Issue' : entityType;
                const blocker = await Blocker.findOne({ 
                    _id: id,
                    type,
                    customerId 
                });
                
                if (blocker) {
                    // Relate to work orders
                    if (blocker.relatedWorkOrders && blocker.relatedWorkOrders.length > 0) {
                        for (const woId of blocker.relatedWorkOrders) {
                            try {
                                const workOrder = await WorkOrder.findById(woId);
                                if (workOrder && workOrder.customerId.toString() === customerId.toString()) {
                                    relationships.push({
                                        targetId: workOrder.workorder || workOrder._id.toString(),
                                        targetType: 'Work Order'
                                    });
                                }
                            } catch (error) {
                                console.error(`Error fetching related work order ${woId}:`, error);
                            }
                        }
                    }
                    
                    // Relate to sales orders
                    if (blocker.relatedSalesOrders && blocker.relatedSalesOrders.length > 0) {
                        for (const soId of blocker.relatedSalesOrders) {
                            try {
                                const salesOrder = await SalesOrder.findById(soId);
                                if (salesOrder && salesOrder.customerId.toString() === customerId.toString()) {
                                    relationships.push({
                                        targetId: salesOrder.ordernumber || salesOrder._id.toString(),
                                        targetType: 'Sales Order'
                                    });
                                }
                            } catch (error) {
                                console.error(`Error fetching related sales order ${soId}:`, error);
                            }
                        }
                    }
                    
                    // Relate to parts
                    if (blocker.relatedParts && blocker.relatedParts.length > 0) {
                        for (const partId of blocker.relatedParts) {
                            try {
                                const part = await Part.findById(partId);
                                if (part && part.customerId.toString() === customerId.toString()) {
                                    relationships.push({
                                        targetId: part.partnumber,
                                        targetType: 'Product'
                                    });
                                }
                            } catch (error) {
                                console.error(`Error fetching related part ${partId}:`, error);
                            }
                        }
                    }
                    
                    // If this is a risk, find related issues
                    if (blocker.type === 'Risk') {
                        try {
                            const relatedIssues = await Blocker.find({
                                type: 'Issue',
                                // Assuming there might be a relationship field, add it here
                                // Example: riskId: blocker._id,
                                customerId
                            }).limit(10);
                            
                            console.log(`Found ${relatedIssues.length} issues potentially related to this risk`);
                            
                            relatedIssues.forEach(issue => {
                                relationships.push({
                                    targetId: issue._id.toString(),
                                    targetType: 'Issues'
                                });
                            });
                        } catch (error) {
                            console.error("Error fetching related issues for risk:", error);
                        }
                    }
                    
                    // If this is an issue, find related risks
                    if (blocker.type === 'Issue') {
                        try {
                            const relatedRisks = await Blocker.find({
                                type: 'Risk',
                                // Assuming there might be a relationship field, add it here
                                // Example: relatedIssues: blocker._id,
                                customerId
                            }).limit(10);
                            
                            console.log(`Found ${relatedRisks.length} risks potentially related to this issue`);
                            
                            relatedRisks.forEach(risk => {
                                relationships.push({
                                    targetId: risk._id.toString(),
                                    targetType: 'Risk'
                                });
                            });
                        } catch (error) {
                            console.error("Error fetching related risks for issue:", error);
                        }
                    }
                }
                break;
            
            case 'Customer':
                // Find the company
                const company = await Company.findOne({ 
                    $or: [{ _id: id }, { name: id }]
                });
                
                if (company) {
                    // Find sales orders for this customer
                    try {
                        const customerSalesOrders = await SalesOrder.find({
                            customerId: company._id,
                        }).limit(20);
                        
                        console.log(`Found ${customerSalesOrders.length} sales orders for this customer`);
                        
                        customerSalesOrders.forEach(so => {
                            relationships.push({
                                targetId: so.ordernumber || so._id.toString(),
                                targetType: 'Sales Order'
                            });
                        });
                    } catch (error) {
                        console.error("Error fetching sales orders for customer:", error);
                    }
                    
                    // Find parts for this customer (based on customerId)
                    try {
                        const customerParts = await Part.find({
                            customerId: company._id
                        }).limit(20);
                        
                        console.log(`Found ${customerParts.length} parts for this customer`);
                        
                        customerParts.forEach(part => {
                            relationships.push({
                                targetId: part.partnumber,
                                targetType: 'Product'
                            });
                        });
                    } catch (error) {
                        console.error("Error fetching parts for customer:", error);
                    }
                }
                break;
        }
        
        console.log(`Returning ${relationships.length} relationships for ${entityType} ${id}`);
        return relationships;
    } catch (error) {
        console.error(`Error fetching relationships for ${entityType} ${id}:`, error);
        return [];
    }
}             
             
