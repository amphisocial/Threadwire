document.addEventListener("DOMContentLoaded", () => {
  loadSalesOrders(); // Fetch and populate the sales orders table on page load
});

// Variables to track the currently editable rows
let editableSalesOrderRow = null;
let editableBlockerRow = null;
let selectedSalesOrderRow = null; // Track the currently selected row
window.selectedSalesOrderRow = null; // Track the currently selected row

/* Load and Populate Sales Orders Table */

async function loadSalesOrders() {
  try {
    const response = await fetch("/api/salesorders");
    const salesOrders = await response.json();
    populateSalesOrdersTable(salesOrders);
  } catch (error) {
    console.error("Error loading sales orders:", error);
  }
}

function populateSalesOrdersTable(salesOrders) {
  const tbody = document.querySelector("#salesOrdersTable tbody");
  tbody.innerHTML = ""; // Clear existing rows

  salesOrders.forEach((order) => {
    const row = document.createElement("tr");
    row.dataset.orderNumber = order.ordernumber;
    row.dataset.lineNumber = order.linenumber;
    if(order.blockerTag > 0)
	  row.classList.add("has-blocker");
    // store the DB _id or ordernumber in data attributes
    row.dataset.salesOrderId = order._id; 

    row.innerHTML = `
      <td class="edit-icon">
        <button onclick="toggleSalesOrderEdit(this)">✏️</button>
      </td>
      <td>${order.ordernumber}</td>
      <td>${order.linenumber}</td>
      <td>${order.partnumber}</td>
      <td>${order.quantity}</td>
      <td>${order.amount}</td>
      <td>${order.customer_name}</td>
      <td>${order.shipping_date}</td>
      <td>${order.shipping_status}</td>
    `;

    // Add click listener for filtering Blockers and highlighting the row
    row.addEventListener("click", (event) => {
      if (editableSalesOrderRow === row) return; // Skip if the row is being edited

      highlightSelectedRow(row); // Highlight the selected row
      loadBlockersForSalesOrder(order.ordernumber, order.linenumber); // Load blockers
    });

    tbody.appendChild(row);
  });
}

function highlightSelectedRow(row) {
  // Remove highlight from the previously selected row
  if (selectedSalesOrderRow) {
    selectedSalesOrderRow.classList.remove("highlighted");
    window.selectedSalesOrderRow = null;
  }

  // Add highlight to the current row
  row.classList.add("highlighted");
  selectedSalesOrderRow = row; // Update the selected row
  window.selectedSalesOrderRow = row;
}

/*Filter salesorders */
function filterSalesOrders() {
  const orderNumberFilter = document
    .getElementById("filterOrderNumber")
    .value.toLowerCase();
  const partNumberFilter = document
    .getElementById("filterPartNumber")
    .value.toLowerCase();
  const customerNameFilter = document
    .getElementById("filterCustomerName")
    .value.toLowerCase();
  const shippingStatusFilter = document
    .getElementById("filterShippingStatus")
    .value.toLowerCase();

  const rows = document.querySelectorAll("#salesOrdersTable tbody tr");

  rows.forEach((row) => {
    const orderNumber = row.cells[1].textContent.toLowerCase();
    const partNumber = row.cells[3].textContent.toLowerCase();
    const customerName = row.cells[6].textContent.toLowerCase();
    const shippingStatus = row.cells[8].textContent.toLowerCase();

    const matchesOrderNumber = orderNumber.includes(orderNumberFilter);
    const matchesPartNumber = partNumber.includes(partNumberFilter);
    const matchesCustomerName = customerName.includes(customerNameFilter);
    const matchesShippingStatus = shippingStatus.includes(
      shippingStatusFilter
    );

    // Show row if it matches any filter; hide it otherwise
    if (
      matchesOrderNumber &&
      matchesPartNumber &&
      matchesCustomerName &&
      matchesShippingStatus
    ) {
      row.style.display = ""; // Show row
    } else {
      row.style.display = "none"; // Hide row
    }
  });
}


/* Toggle and save salesorder */
function toggleSalesOrderEdit(button) {
  const row = button.closest("tr");
  const cells = Array.from(row.cells).slice(1); // Exclude the edit icon column

  if (editableSalesOrderRow && editableSalesOrderRow !== row) {
    alert("Please save or cancel the current edit before editing another row.");
    return;
  }

  const isEditing = button.textContent === "💾";

  if (isEditing) {
    saveSalesOrder(row);
    button.textContent = "✏️";
    editableSalesOrderRow = null;
  } else {
    // Only make the `blockerTag` editable
    const blockerTagCell = cells[8]; // BlockerTag is the last column (index 8)
    const originalValue = blockerTagCell.textContent;
    blockerTagCell.innerHTML = `
      <select>
        <option value="Yes" ${originalValue === "Yes" ? "selected" : ""}>Yes</option>
        <option value="No" ${originalValue === "No" ? "selected" : ""}>No</option>
      </select>`;
    button.textContent = "💾";
    editableSalesOrderRow = row;
  }
}

async function saveSalesOrder(row) {
  const cells = row.querySelectorAll("select");
  const updatedBlockerTag = cells[0].value; // Update the blockerTag value

  const orderNumber = row.dataset.orderNumber;
  const lineNumber = row.dataset.lineNumber;

  try {
    const response = await fetch(`/api/salesorders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ordernumber: orderNumber,
        linenumber: lineNumber,
        blockerTag: updatedBlockerTag,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save sales order");
    }

    alert("Sales order saved successfully.");

    // Restore the row to non-editable state
    const blockerTagCell = row.cells[9];
    blockerTagCell.textContent = updatedBlockerTag; // Replace with the updated value
  } catch (error) {
    console.error("Error saving sales order:", error);
  }
}

/* Load and Populate Blockers Table */
async function loadBlockersForSalesOrder(orderNumber, lineNumber) {
  try {
    const response = await fetch(`/api/blockers?salesorder=${orderNumber}&linenumber=${lineNumber}`);
    const blockers = await response.json();
    populateBlockersTable(blockers);
  } catch (error) {
    console.error("Error loading blockers:", error);
  }
}

function populateBlockersTable(blockers) {
  const tbody = document.querySelector("#blockersTable tbody");
  tbody.innerHTML = ""; // Clear existing rows

  blockers.forEach((blocker) => {
    const row = document.createElement("tr");
    row.dataset.blockerId = blocker._id;

    row.innerHTML = `
      <td class="edit-icon">
        <button onclick="toggleBlockerEdit(this, '${blocker._id}')">✏️</button>
      </td>
      <td>${blocker.title}</td>
      <td>${blocker.status}</td>
      <td>${blocker.partnumber}</td>
      <td>${blocker.category}</td>
      <td>${blocker.impact}</td>
      <td>${blocker.owner}</td>
      <td>${blocker.probability}</td>
    `;

    tbody.appendChild(row);
  });
}

/* Edit and Save Blocker Functions */
function toggleBlockerEdit(button, blockerId) {
  const row = button.closest("tr");
  const cells = Array.from(row.cells).slice(1); // Exclude the edit icon column

  if (editableBlockerRow && editableBlockerRow !== row) {
    alert("Please save or cancel the current edit before editing another row.");
    return;
  }

  const isEditing = button.textContent === "💾";

  if (isEditing) {
    saveBlocker(row, blockerId);
    button.textContent = "✏️";
    editableBlockerRow = null;
  } else {
    // Make all columns editable
    cells.forEach((cell) => {
      const originalValue = cell.textContent;
      cell.innerHTML = `<input type="text" value="${originalValue}" />`;
    });
    button.textContent = "💾";
    editableBlockerRow = row;
  }
}

async function saveBlocker(row, blockerId) {
  const inputs = row.querySelectorAll("input");
  const blockerData = Array.from(inputs).reduce((acc, input, index) => {
    const keys = ["title", "status", "partnumber", "category", "impact", "owner", "probability"];
    acc[keys[index]] = input.value;
    return acc;
  }, {});

  try {
    const response = await fetch(`/api/blockers?_id=${blockerId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(blockerData),
    });

    if (!response.ok) {
      throw new Error("Failed to save blocker");
    }

    alert("Blocker saved successfully.");

    // Restore the row to non-editable state
    const cells = Array.from(row.cells).slice(1);
    cells.forEach((cell, index) => {
      cell.textContent = blockerData[Object.keys(blockerData)[index]];
    });
  } catch (error) {
    console.error("Error saving blocker:", error);
  }
}


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
