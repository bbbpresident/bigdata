import React from "react";
import RetirementSimulator from "./components/RetirementSimulator"; // Import the RetirementSimulator component
import "./App.css";

const App: React.FC = () => {
  return (
    <div className="App">
      <RetirementSimulator />{" "}
      {/* Replace the default content with your component */}
    </div>
  );
};

export default App;
