import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import LetterComposer from "./LetterComposer";
import LetterFieldGenerator from "./LetterFieldGenerator";

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-300 flex flex-col items-center justify-center p-6">
    
    <BrowserRouter>
      <nav style={{padding: 0, marginleft:525, gap: 10, display: 'flex'}}>
        <Link to="/">Składanie liter</Link>
        <Link to="/field">Field Generator</Link>
      </nav>
      <Routes>
        <Route path="/" element={<LetterComposer />} />
        <Route path="/field" element={<LetterFieldGenerator />} />
      </Routes>
    </BrowserRouter>

    </div>
  );
}



export default App;

