import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sample from './components/Sample.jsx';

function App() {
  return (
    <Router basename="/app">
      <Routes>
        <Route path="/Sample" element={<Sample />} />
	<Route path="/" element={<div>Home Page</div>} />
        {/* your other routes */}
      </Routes>
    </Router>
  );
}

export default App;
