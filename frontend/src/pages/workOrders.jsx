// WorkOrders.jsx
import React, { useState, useEffect } from 'react';
import Navbar from '../comps/NavBar';
import ImportWorkOrders from '../comps/ImportWorkOrders';
import ImportPartBoP from '../comps/ImportPartBoP';
import ImportExecution from '../comps/ImportExecution';
import BlockerManager from '../comps/BlockerWorkModal';
import WorkOrdersTable from '../comps/WorkOrdersTable';
import PartBoPTable from '../comps/PartBoPTable';
import ExecutionTable from '../comps/ExecutionTable';
import './workOrders.css';


const WorkOrders = () => {
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [executionData, setExecutionData] = useState([]);
  const [partBopData, setPartBopData] = useState([]);
  const blockerManagerRef = useRef(null);

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    const isGoogleAuth = localStorage.getItem('isGoogleAuth') === 'true';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(isGoogleAuth && { 'Auth-Type': 'google' }),
    };
  };

  const fetchWorkOrders = async () => {
    try {
      const response = await fetch('/api/workorders', {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      setWorkOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching work orders:', error);
    }
  };

  const fetchWorkOrderExecution = async (workorderId) => {
    try {
      const response = await fetch(`/api/workorderexecution?workorder=${workorderId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      setExecutionData(data);
    } catch (error) {
      console.error('Error fetching work order executions:', error);
    }
  };

  const fetchPartBop = async (partnumber) => {
    try {
      const response = await fetch(`/api/partbop?partnumber=${partnumber}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      setPartBopData(data);
    } catch (error) {
      console.error('Error fetching Part Bill of Process:', error);
    }
  };

  const handleWorkOrderSelect = (workOrder) => {
    if (!workOrder) return;
    setSelectedWorkOrder(workOrder);
    fetchWorkOrderExecution(workOrder.workorder);
    fetchPartBop(workOrder.partnumber);
  };

  const handleAddRiskIssue = () => {
    if (!selectedWorkOrder) {
      alert("Please select a Work Order first.");
      return;
    }
    
    if (blockerManagerRef.current && blockerManagerRef.current.handleAddRiskIssue) {
      blockerManagerRef.current.handleAddRiskIssue();
    }
  };

  const handleEditRiskIssue = async () => {
    if (!selectedWorkOrder) {
      alert("Please select a Work Order first.");
      return;
    }

    if (blockerManagerRef.current && blockerManagerRef.current.handleEditRiskIssue) {
      blockerManagerRef.current.handleEditRiskIssue();
    }
  };

  return (
    <div>
      <div className="app-container">
        <Navbar />
        <div className="wo-left-pane">

          <div>
            <h2 className="wo-section-title">Work Orders</h2>
            <div className='wo-section-navbar'>
              <ImportWorkOrders onImportComplete={fetchWorkOrders} />
              <button
                className="wo-risk-button"
                onClick={handleAddRiskIssue}
              >
                + Add Risk/Issue
              </button>
              <button
                className="wo-risk-button"
                onClick={handleEditRiskIssue}
              >
                Edit Risk/Issue
              </button>
            </div>

            <WorkOrdersTable
              workOrders={workOrders}
              selectedWorkOrder={selectedWorkOrder}
              onWorkOrderSelect={handleWorkOrderSelect}
            />
          </div>

          <div>
            <h2 className="wo-section-title">Part Bill of Process</h2>
            <ImportPartBoP />
            <PartBoPTable partBopData={partBopData} />
          </div>
        </div>

        <div className="wo-right-pane">
          <h2 className="wo-section-title">Execution Status</h2>
          <ImportExecution />
          <ExecutionTable executionData={executionData} />
        </div>
      </div>

      <BlockerManager
        ref={blockerManagerRef}
        selectedWorkOrder={selectedWorkOrder}
        onBlockerSaved={fetchWorkOrders}
        getAuthHeaders={getAuthHeaders}
      />
    </div>
  );
};

export default WorkOrders;
