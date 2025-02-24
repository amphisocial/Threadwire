// WorkOrders.jsx
import React, { useState, useEffect } from 'react';
import Navbar from '../comps/NavBar';
import ImportWorkOrders from '../comps/ImportWorkOrders';
import ImportPartBoP from '../comps/ImportPartBoP';
import ImportExecution from '../comps/ImportExecution';
import BlockerModal from '../comps/BlockerModal';
import WorkOrdersTable from '../comps/WorkOrdersTable';
import PartBoPTable from '../comps/PartBoPTable';
import ExecutionTable from '../comps/ExecutionTable';
import './workOrders.css';


const WorkOrders = () => {
    const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
    const [workOrders, setWorkOrders] = useState([]);
    const [executionData, setExecutionData] = useState([]);
    const [partBopData, setPartBopData] = useState([]);
    const [showBlockerModal, setShowBlockerModal] = useState(false);
    const [currentBlocker, setCurrentBlocker] = useState(null);
  
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
  
    return (
      <div>
        <div className="app-container">
        <Navbar />
          <div className="wo-left-pane">
            <ImportWorkOrders onImportComplete={fetchWorkOrders} />
            
            <div>
              <h2 className="wo-section-title">Work Orders</h2>
              <div>
                <button 
                  className="wo-risk-button"
                  onClick={() => {
                    if (!selectedWorkOrder) {
                      alert("Please select a Work Order first.");
                      return;
                    }
                    setCurrentBlocker(null);
                    setShowBlockerModal(true);
                  }}
                >
                  + Add Risk/Issue
                </button>
                <button 
                  className="wo-risk-button"
                  onClick={async () => {
                    if (!selectedWorkOrder) {
                      alert("Please select a Work Order first.");
                      return;
                    }
                    try {
                      const res = await fetch(`/api/blockers?relatedWorkOrders=${selectedWorkOrder._id}`);
                      const blockers = await res.json();
                      if (!blockers || blockers.length === 0) {
                        alert("No existing Risk/Issue found for this Work Order.");
                        return;
                      }
                      setCurrentBlocker(blockers[0]);
                      setShowBlockerModal(true);
                    } catch (err) {
                      console.error("Error finding blockers:", err);
                      alert("Failed to find risk/issue for this workorder.");
                    }
                  }}
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
  
        {showBlockerModal && (
          <BlockerModal
            isOpen={showBlockerModal}
            onClose={() => setShowBlockerModal(false)}
            blocker={currentBlocker}
            workOrderId={selectedWorkOrder?._id}
            onSave={() => {
              setShowBlockerModal(false);
              fetchWorkOrders();
            }}
          />
        )}
      </div>
    );
  };
  
  export default WorkOrders;
