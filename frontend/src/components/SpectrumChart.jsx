import { useEffect, useRef } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
} from "chart.js";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip
);

function buildLabels(reading) {
  const labels = [];
  const step = reading.hz_step / 1e6;
  const start = reading.hz_low / 1e6;
  for (let i = 0; i < reading.db_values.length; i++) {
    labels.push((start + i * step).toFixed(3));
  }
  return labels;
}

export default function SpectrumChart({ reading }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!reading || !canvasRef.current) return;

    const labels = buildLabels(reading);
    const data = reading.db_values;

    if (chartRef.current) {
      chartRef.current.data.labels = labels;
      chartRef.current.data.datasets[0].data = data;
      chartRef.current.update("none");
      return;
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Power (dBm)",
            data,
            borderColor: "#4ade80",
            backgroundColor: "rgba(74,222,128,0.08)",
            borderWidth: 1.5,
            pointRadius: 0,
            fill: true,
            tension: 0.1,
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: { tooltip: { mode: "index", intersect: false } },
        scales: {
          x: {
            ticks: {
              color: "#9ca3af",
              maxTicksLimit: 10,
              callback: (val, i) => labels[i],
            },
            title: { display: true, text: "Frequency (MHz)", color: "#9ca3af" },
            grid: { color: "#1f2937" },
          },
          y: {
            ticks: { color: "#9ca3af" },
            title: { display: true, text: "Power (dBm)", color: "#9ca3af" },
            grid: { color: "#1f2937" },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [reading]);

  if (!reading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
        No spectrum data
      </div>
    );
  }

  return (
    <div className="relative h-52">
      <canvas ref={canvasRef} />
    </div>
  );
}
