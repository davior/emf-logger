const colors = {
  pending: "bg-yellow-800 text-yellow-200",
  running: "bg-green-800 text-green-200 animate-pulse",
  completed: "bg-blue-800 text-blue-200",
  failed: "bg-red-800 text-red-200",
  cancelled: "bg-gray-700 text-gray-300",
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
        colors[status] ?? "bg-gray-700 text-gray-300"
      }`}
    >
      {status}
    </span>
  );
}
