// // import logo from './logo.svg';
// // import './App.css';

// // function App() {
// //   return (
// //     <div className="App">
// //       <header className="App-header">
// //         <img src={logo} className="App-logo" alt="logo" />
// //         <p>
// //           Edit <code>src/App.js</code> and save to reload.
// //         </p>
// //         <a
// //           className="App-link"
// //           href="https://reactjs.org"
// //           target="_blank"
// //           rel="noopener noreferrer"
// //         >
// //           Learn React
// //         </a>
// //       </header>
// //     </div>
// //   );
// // }

// import React from 'react';
// import Card from './components/Card';

// const data = {
//   status: "Awaiting Shipping",
//   operationsStatus: "Pending",
//   newStatus: "Pending",
//   partNumber: "MRTV00856-01",
//   description: "ECT0687 Open VPX INTEL XEON",
//   manufacturer: "Northrop Grumman",
//   program: "Eagle Claw",
//   quantity: 15,
//   salesOrder: "122265952",
//   lineNumber: 15.5,
//   contractDate: "2024-06-15",
//   anticipatedShipDate: "2024-06-15",
//   orderAmount: 95650,
// };

// function App() {
//   return (
//     <div>
//       <h1>Delivery Manager</h1>
//       <Card data={data} />
//     </div>
//   );
// }

// export default App;

import React from "react";
import CalendarWithCards from "./components/CalendarWithCards";
import "./components/CalendarWithCards.css";

function App() {
  return (
    <div>
      <h1>Delivery Calendar</h1>
      <CalendarWithCards />
    </div>
  );
}

export default App;