const Part = require("../models/Part");
const SalesOrder = require("../models/SalesOrder");
const WorkOrder = require("../models/Workorder");
const WorkOrderExecution = require("../models/Workorderexecution");

exports.getPartGraph = async (req, res) => {
    //const { partnumber, type } = req.query;
        const { partnumber, direction } = req.query;
    console.error("partnumber:",partnumber,"direction:",direction);
    if (!partnumber || !direction) {
        return res.status(400).json({ error: "Missing partnumber or direction parameter" });
    }

    try {
        const graphData = await fetchGraphData(partnumber, direction);
        res.status(200).json(graphData);
    } catch (error) {
        console.error("Error fetching part graph:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

async function fetchLinksForPart(part, direction) {
    const nodes = [];
    const links = [];

    try {
        if (direction === "left") {
            // Fetch sales orders for the part
            const salesOrders = await SalesOrder.find({ partnumber: part.partnumber });
            console.error("Found sales orders:", salesOrders);

            salesOrders.forEach((so) => {
            console.error("Found sales orders:", so.ordernumber, so.linenumber);
                nodes.push({
                    id: so._id,
                    label: `Sales Order: ${so.ordernumber}`,
                    type: "salesorder",
                });

                links.push({
                    source: part.partnumber,
                    target: so._id,
                });
            });
        } else if (direction === "right") {
            // Fetch PartBoP and WorkOrders for the part
            const [partBoPs, workOrders] = await Promise.all([
                WorkOrder.PartBoP.find({ partnumber: part.partnumber }),
                WorkOrder.WorkOrder.find({ partnumber: part.partnumber }),
            ]);

            console.error("Found PartBoPs:", partBoPs);
            console.error("Found WorkOrders:", workOrders);

            // Add PartBoP operations
            partBoPs.forEach((bop) => {
                nodes.push({
                    id: bop.operation,
                    label: `Operation: ${bop.operation}`,
                    type: "partbop",
                });

                links.push({
                    source: part.partnumber,
                    target: bop.operation,
                });
            });

            // Add WorkOrders
            workOrders.forEach((wo) => {
                nodes.push({
                    id: wo.workorder,
                    label: `Work Order: ${wo.workorder}`,
                    type: "workorder",
                });

                links.push({
                    source: part.partnumber,
                    target: wo.workorder,
                });
            });
        } else if (direction === "execution") {
            // Fetch WorkOrderExecutions for the workorder
            const workOrderExecutions = await WorkOrderExecution.find({
                workorder: part.partnumber,
            });
            console.error("Found WorkOrderExecutions:", workOrderExecutions);

            workOrderExecutions.forEach((execution) => {
                nodes.push({
                    id: execution.executionId,
                    label: `Execution: ${execution.executionId}`,
                    type: "execution",
                });

                links.push({
                    source: part.partnumber,
                    target: execution.executionId,
                });
            });
        }
    } catch (error) {
        console.error(`Error fetching links for ${direction}:`, error);
    }

    return { nodes, links };
}
async function fetchGraphData(partnumber, direction) {
    const nodes = [];
    const links = [];

    try {
        const filters = {};
        if (partnumber) filters.partnumber = new RegExp(partnumber, "i");

        console.error("Filter value is:", filters.partnumber);

        const parts = await Part.find(filters);
        console.error("Found parts:", parts);

        // Iterate through parts and fetch links based on direction
        for (const pt of parts) {
            console.error("Processing part:", pt.partnumber);

            // Add the part as the root node
            nodes.push({
                id: pt.partnumber,
                label: `Part: ${pt.partnumber}`,
                type: "part",
            });

            // Fetch links based on the direction
            const fetchedLinks = await fetchLinksForPart(pt, direction);

            // Merge fetched nodes and links
            nodes.push(...fetchedLinks.nodes);
            links.push(...fetchedLinks.links);
        }

        console.error("Final nodes array:", nodes);
        console.error("Final links array:", links);

        return { nodes, links };
    } catch (error) {
        console.error("Error fetching graph data:", error);
        return { nodes: [], links: [] };
    }
}

