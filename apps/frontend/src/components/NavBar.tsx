import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/models", label: "Models" },
  { to: "/owned-models", label: "My Models" },
  { to: "/paints", label: "Paints" },
  { to: "/paint-inventory", label: "My Paints" },
  { to: "/projects", label: "Projects" },
  { to: "/shopping-list", label: "Shopping" },
];

export function NavBar() {
  return (
    <nav className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-slate-800 bg-workshop-bg/95 px-3 py-2 backdrop-blur">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === "/"}
          className={({ isActive }) =>
            `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive ? "bg-workshop-accent text-slate-900" : "text-slate-300 hover:bg-slate-800"
            }`
          }
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}
