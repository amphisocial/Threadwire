document.addEventListener("DOMContentLoaded", () => {
  const isLoggedIn = sessionStorage.getItem("userId");

  if (!isLoggedIn) {
    // Redirect to threadwire.ai if not logged in
    window.location.href = "https://threadwire.ai";
    return null; // Prevent rendering the component
  }
  loadBlockers(); // Fetch and populate the blockers table on page load

});

// Variables to track the currently editable rows
document.addEventListener("DOMContentLoaded", () => {
  loadBlockers(); // Fetch and populate the blockers table on page load
});

// Variables to track the currently editable rows
let editableBlockerRow = null;
let editableActionRow = null;

/* Load and Populate Blockers Table */
async function loadBlockers() {
  try {
    const response = await fetch("/api/blockers");
    const blockers = await response.json();
    populateBlockersTable(blockers);
  } catch (error) {
    console.error("Error loading blockers:", error);
  }
}
let selectedBlockerRow = null; // Track the currently selected blocker row

/* Highlight Selected Blocker Row and Load Action Items */

function highlightSelectedBlockerRow(row, blockerId) {
  // Remove highlight from the previously selected row
  if (selectedBlockerRow) {
    selectedBlockerRow.classList.remove("highlighted");
  }

  // If the clicked row is the same as the currently selected row, unhighlight it
  if (selectedBlockerRow === row) {
    selectedBlockerRow = null; // Reset the selected row
    clearActionItems(); // Clear the action items table
  } else {
    // Highlight the new row
    row.classList.add("highlighted");
    selectedBlockerRow = row; // Update the selected row

    // Load action items for the newly selected blocker
    loadActionItemsForBlocker(blockerId);
  }
}
/* Load and Populate Blockers Table */
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
      <td>${blocker.salesorder}</td>
      <td>${blocker.linenumber}</td>
      <td>${blocker.partnumber}</td>
      <td>${blocker.category}</td>
      <td>${blocker.impact}</td>
      <td>${blocker.owner}</td>
      <td>${blocker.probability}</td>
    `;

    // Add click listener to toggle highlight and load action items
    row.addEventListener("click", () => highlightSelectedBlockerRow(row, blocker._id));

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
    // Make the row editable
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
    const keys = ["title", "status", "salesorder", "linenumber", "partnumber", "category", "impact", "owner", "probability"];
    acc[keys[index]] = input.value;
    return acc;
  }, {});

  try {
    const response = await fetch("/api/blockers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ _id: blockerId, ...blockerData }),
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

/* Load and Populate Actions Table */

function clearActionItems() {
  const tbody = document.querySelector("#actionsTable tbody");
  tbody.innerHTML = ""; // Clear all rows in the Action Items table
}

async function loadActionItemsForBlocker(blockerId) {
  try {
    const response = await fetch(`/api/actions?blockerId=${blockerId}`);
    const actionItems = await response.json();
    populateActionItemsTable(actionItems);
  } catch (error) {
    console.error("Error loading action items:", error);
  }
}

function populateActionItemsTable(actionItems) {
  const tbody = document.querySelector("#actionsTable tbody");
  tbody.innerHTML = ""; // Clear existing rows

  actionItems.forEach((action) => {
    const row = document.createElement("tr");
    row.dataset.actionId = action._id;

    row.innerHTML = `
      <td class="edit-icon">
        <button onclick="toggleActionEdit(this, '${action._id}')">✏️</button>
      </td>
      <td>${action.actionItem}</td>
      <td>${action.assignedTo}</td>
      <td>${action.status}</td>
      <td>${action.remark}</td>
    `;

    tbody.appendChild(row);
  });
}


/*filters */
function filterBlockers() {
  const statusFilter = document
    .getElementById("filterStatus")
    .value.toLowerCase();
  const categoryFilter = document
    .getElementById("filterCategory")
    .value.toLowerCase();
  const impactFilter = document
    .getElementById("filterImpact")
    .value.toLowerCase();

  const rows = document.querySelectorAll("#blockersTable tbody tr");

  rows.forEach((row) => {
    const status = row.cells[2].textContent.toLowerCase(); // Status column
    const category = row.cells[6].textContent.toLowerCase(); // Category column
    const impact = row.cells[7].textContent.toLowerCase(); // Impact column

    const matchesStatus = status.includes(statusFilter);
    const matchesCategory = category.includes(categoryFilter);
    const matchesImpact = impact.includes(impactFilter);

    // Show row if it matches all filter conditions; hide it otherwise
    if (matchesStatus && matchesCategory && matchesImpact) {
      row.style.display = ""; // Show row
    } else {
      row.style.display = "none"; // Hide row
    }
  });
}


/* Edit and Save Action Functions */
function toggleActionEdit(button, actionId) {
  const row = button.closest("tr");
  const cells = Array.from(row.cells).slice(1); // Exclude the edit icon column

  if (editableActionRow && editableActionRow !== row) {
    alert("Please save or cancel the current edit before editing another row.");
    return;
  }

  const isEditing = button.textContent === "💾";

  if (isEditing) {
    saveAction(row, actionId);
    button.textContent = "✏️";
    editableActionRow = null;
  } else {
    // Make the row editable
    cells.forEach((cell) => {
      const originalValue = cell.textContent;
      cell.innerHTML = `<input type="text" value="${originalValue}" />`;
    });
    button.textContent = "💾";
    editableActionRow = row;
  }
}

async function saveAction(row, actionId) {
  const inputs = row.querySelectorAll("input");
  const actionData = Array.from(inputs).reduce((acc, input, index) => {
    const keys = ["actionItem", "assignedTo", "status", "remark"];
    acc[keys[index]] = input.value;
    return acc;
  }, {});

  try {
    const response = await fetch(`/api/actions/${actionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(actionData),
    });

    if (!response.ok) {
      throw new Error("Failed to save action item");
    }

    alert("Action item saved successfully.");

    // Restore the row to non-editable state
    const cells = Array.from(row.cells).slice(1);
    cells.forEach((cell, index) => {
      cell.textContent = actionData[Object.keys(actionData)[index]];
    });
  } catch (error) {
    console.error("Error saving action item:", error);
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

