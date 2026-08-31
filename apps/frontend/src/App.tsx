import { Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { useAuthStatus } from "./api/client";
import { LoadingState } from "./components/ui";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Models from "./pages/Models";
import ModelDetail from "./pages/ModelDetail";
import Paints from "./pages/Paints";
import PaintDetail from "./pages/PaintDetail";
import Projects from "./pages/Projects";
import ProjectNew from "./pages/ProjectNew";
import ProjectDetail from "./pages/ProjectDetail";
import ShoppingList from "./pages/ShoppingList";
import Wishlist from "./pages/Wishlist";
import Supplies from "./pages/Supplies";
import ImportExport from "./pages/ImportExport";

export default function App() {
  const { data: auth, isLoading } = useAuthStatus();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  if (!auth?.authenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/models" element={<Models />} />
          <Route path="/models/:id" element={<ModelDetail />} />
          <Route path="/owned-models" element={<Navigate to="/models?filter=owned" replace />} />
          <Route path="/paints" element={<Paints />} />
          <Route path="/paints/:id" element={<PaintDetail />} />
          <Route path="/paint-inventory" element={<Navigate to="/paints?filter=owned" replace />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/new" element={<ProjectNew />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/shopping-list" element={<ShoppingList />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/supplies" element={<Supplies />} />
          <Route path="/import-export" element={<ImportExport />} />
        </Routes>
      </main>
    </div>
  );
}
