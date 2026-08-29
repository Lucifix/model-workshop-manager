import { Routes, Route } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import Dashboard from "./pages/Dashboard";
import Models from "./pages/Models";
import ModelDetail from "./pages/ModelDetail";
import OwnedModels from "./pages/OwnedModels";
import Paints from "./pages/Paints";
import PaintDetail from "./pages/PaintDetail";
import PaintInventory from "./pages/PaintInventory";
import Projects from "./pages/Projects";
import ShoppingList from "./pages/ShoppingList";

export default function App() {
  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/models" element={<Models />} />
          <Route path="/models/:id" element={<ModelDetail />} />
          <Route path="/owned-models" element={<OwnedModels />} />
          <Route path="/paints" element={<Paints />} />
          <Route path="/paints/:id" element={<PaintDetail />} />
          <Route path="/paint-inventory" element={<PaintInventory />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/shopping-list" element={<ShoppingList />} />
        </Routes>
      </main>
    </div>
  );
}
