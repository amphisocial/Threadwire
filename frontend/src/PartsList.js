import React, { useEffect, useState } from "react";
import axios from "axios";

const PartsList = () => {
  const [parts, setParts] = useState([]);

  useEffect(() => {
    axios.get("/api/parts")
      .then(response => setParts(response.data))
      .catch(error => console.error("Error fetching parts:", error));
  }, []);

  return (
    <div>
      <h1>Parts List</h1>
      <ul>
        {parts.map(part => (
          <li key={part.partnumber}>
            {part.partnumber} - {part.description} (${part.unit_price})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PartsList;

