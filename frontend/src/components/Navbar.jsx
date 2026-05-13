import { Link, NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/devices", label: "Devices" },
  { to: "/jobs/new", label: "New Job" },
];

export default function Navbar() {
  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-6">
      <Link to="/" className="text-green-400 font-bold text-lg tracking-tight">
        ⚡ EMF Logger
      </Link>
      <div className="flex gap-4 text-sm">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            className={({ isActive }) =>
              isActive
                ? "text-green-400 font-medium"
                : "text-gray-400 hover:text-gray-200 transition-colors"
            }
          >
            {l.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
