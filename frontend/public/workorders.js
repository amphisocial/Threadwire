// Get DOM Elements
const workordersTable = document.getElementById('workordersTable').querySelector('tbody');
const executionStatusTable = document.getElementById('executionStatusTable').querySelector('tbody');
const partBopTable = document.getElementById("partBopTable").querySelector("tbody");

window.selectedWorkOrderRow = null;

// Fetch Work Orders from API
async function fetchWorkOrders() {
    try {
        const response = await fetch('/api/workorders');
        const workorders = await response.json();
        populateWorkOrders(workorders);
    } catch (error) {
        console.error('Error fetching work orders:', error);
    }
}

// Fetch Execution Status for a Specific Work Order
async function fetchWorkOrderExecution(workorderId) {
    try {
        const response = await fetch(`/api/workorderexecution?workorder=${workorderId}`);
        const executions = await response.json();
        populateExecutionStatus(executions);
    } catch (error) {
        console.error('Error fetching work order executions:', error);
    }
}

// Populate Work Orders Table
function populateWorkOrders(workorders) {
    workordersTable.innerHTML = '';
    workorders.forEach(workorder => {
        const row = document.createElement('tr');
        row.dataset.workorder = workorder.workorder;
	// store the unique ID (ObjectId) in a data attribute
        row.dataset.workorderId = workorder._id;
	if(workorder.blockerTag > 0)
	    row.classList.add("has-blocker");
        row.innerHTML = `
            <td>${workorder.workorder}</td>
            <td>${workorder.partnumber}</td>
            <td>${workorder.salesorder}</td>
            <td>${workorder.type}</td>
            <td>${workorder.dateCreated}</td>
            <td>${workorder.quantity}</td>
            <td>${workorder.status}</td>
        `;
        row.addEventListener('click', () => highlightWorkOrder(row, workorder.workorder));
        workordersTable.appendChild(row);
    });
}

// Highlight Selected Work Order and Fetch Execution Status
function highlightWorkOrder(row, workorderId) {
    // Remove Highlight from All Rows
    const rows = workordersTable.querySelectorAll('tr');
    rows.forEach(r => r.classList.remove('highlighted'));
    window.selectedWorkOrderRow = null;

    // Highlight Current Row
    row.classList.add('highlighted');
    window.selectedWorkOrderRow = row;

    // Clear and Fetch Execution Status
    clearExecutionStatus();
    fetchWorkOrderExecution(workorderId);

    clearPartBopTable();
	// Fetch and Populate Part BOP Table
        console.log("Fetching Part BOP for PartNumber:11"); // Debugging log
    const partnumber = row.cells[1].textContent; // Get PartNumber from the selected row
        console.log("Fetching Part BOP for PartNumber:11", partnumber); // Debugging log
    fetchPartBop(partnumber);
    
}

// Clear Execution Status Table
function clearExecutionStatus() {
    executionStatusTable.innerHTML = '';
}
function clearPartBopTable() {
    partBopTable.innerHTML = ""; // Clear all rows in the Part BOP table
}
// Filter table
function filterWorkOrders() {
    const workOrderFilter = document
        .getElementById("filterWorkOrder")
        .value.toLowerCase();
    const partNumberFilter = document
        .getElementById("filterPartNumber")
        .value.toLowerCase();

    const rows = document.querySelectorAll("#workordersTable tbody tr");

    rows.forEach((row) => {
        const workOrder = row.cells[0].textContent.toLowerCase();
        const partNumber = row.cells[1].textContent.toLowerCase();

        const matchesWorkOrder = workOrder.includes(workOrderFilter);
        const matchesPartNumber = partNumber.includes(partNumberFilter);

        // Show the row if it matches both filters, otherwise hide it
        if (matchesWorkOrder && matchesPartNumber) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}
// Function to Fetch Part BOP Data
async function fetchPartBop(partnumber) {
    try {
        console.log("Fetcing Part BOP for PartNumber:", partnumber); // Debugging log
        const response = await fetch(`/api/partbop?partnumber=${partnumber}`);
        const partBopData = await response.json();
        console.log("Part BOP Data Received:", partBopData); // Debugging log
        clearPartBopTable(); // Clear the table before populating it
        populatePartBopTable(partBopData);
    } catch (error) {
        console.error("Error fetching Part Bill of Process:", error);
    }
}

// Populate Part BOP Table
function populatePartBopTable(partBopData) {

    // Sort data by sequence in ascending order
        console.log("Feing Part BOP for PartNumber:"); // Debugging log
    const sortedBopData = partBopData.sort((a, b) => a.sequence - b.sequence);

    sortedBopData.forEach((bop) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${bop.partnumber}</td>
            <td>${bop.operation}</td>
            <td>${bop.sequence}</td>
            <td>${bop.opcode}</td>
            <td>${bop.planner}</td>
        `;
        partBopTable.appendChild(row);
    });
}
// Populate Execution Status Table
function populateExecutionStatus(executions) {
    clearExecutionStatus();
    
    // Sort by serial number first, then by timeIn
    const sortedExecutions = executions.sort((a, b) => {
        if (a.serialNumber < b.serialNumber) return -1;
        if (a.serialNumber > b.serialNumber) return 1;
        // If serial numbers are the same, sort by timeIn
        return new Date(a.timeIn) - new Date(b.timeIn);
    });

    sortedExecutions.forEach(exec => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${exec.serialNumber}</td>
            <td>${exec.operation}</td>
            <td>${exec.operator}</td>
            <td>${exec.timeIn}</td>
            <td>${exec.timeOut || '-'}</td>
            <td>${exec.status}</td>
            <td>${exec.location}</td>
        `;
        executionStatusTable.appendChild(row);
    });
}

// Initial Fetch of Work Orders
fetchWorkOrders();


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
    case "graph":
      window.location.href = "graphview.html";
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

