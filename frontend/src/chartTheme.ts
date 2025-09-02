import { Chart } from "chart.js/auto";

// Global font and color
Chart.defaults.color = "#cbd5e1"; // slate-300
Chart.defaults.font.family = "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, \"Apple Color Emoji\", \"Segoe UI Emoji\"";
Chart.defaults.font.size = 12;

// Layout and animations
Chart.defaults.animation = { duration: 300, easing: "easeOutQuart" } as any;

// Gridlines and scales
Chart.defaults.scale.grid.color = "rgba(255, 255, 255, 0.1)";
Chart.defaults.scale.ticks.color = "#cbd5e1"; // slate-300

// Elements
Chart.defaults.elements.bar.borderWidth = 2;
Chart.defaults.elements.bar.borderSkipped = false;
// Set rounded bars (cast for broader Chart.js typing compatibility)
(Chart.defaults.elements.bar as any).borderRadius = 8;
Chart.defaults.elements.line.borderWidth = 3;
Chart.defaults.elements.line.tension = 0.4;
Chart.defaults.elements.point.radius = 4;
Chart.defaults.elements.point.hoverRadius = 6;
Chart.defaults.elements.point.borderWidth = 2;
Chart.defaults.elements.point.borderColor = "#ffffff";

// Plugins: legend and tooltip
Chart.defaults.plugins.legend.position = "top";
Chart.defaults.plugins.legend.labels.color = "#e2e8f0"; // slate-200
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.pointStyle = "circle" as any;
Chart.defaults.plugins.legend.labels.padding = 20;

Chart.defaults.plugins.tooltip.backgroundColor = "rgba(0, 0, 0, 0.8)";
Chart.defaults.plugins.tooltip.titleColor = "#ffffff";
Chart.defaults.plugins.tooltip.bodyColor = "#e2e8f0";
Chart.defaults.plugins.tooltip.borderColor = "rgba(255, 255, 255, 0.1)";
Chart.defaults.plugins.tooltip.borderWidth = 1;
// Rounded tooltip corners
(Chart.defaults.plugins.tooltip as any).cornerRadius = 8;
Chart.defaults.plugins.tooltip.titleFont = { size: 14, weight: "bold" } as any;
Chart.defaults.plugins.tooltip.bodyFont = { size: 13 } as any;

// Responsive
Chart.defaults.maintainAspectRatio = false;
