import React from "react";
import PartsList from "./PartsList.js";


function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<PartsList />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;

