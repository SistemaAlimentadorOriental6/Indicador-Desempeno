
import { Chart, registerables } from "chart.js";
import { getMonthNameShort } from "../utils/formatters";

Chart.register(...registerables);

export const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: "top" as const,
            align: "end" as const,
            labels: {
                usePointStyle: true,
                padding: 25,
                font: {
                    family: "Outfit",
                    size: 14,
                    weight: "bold" as const,
                },
            },
        },
        tooltip: {
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            titleColor: "#2c3e50",
            bodyColor: "#2c3e50",
            borderColor: "rgba(0,0,0,0.05)",
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            titleFont: {
                family: "Outfit",
                size: 14,
                weight: "bold" as const,
            },
            bodyFont: { family: "Outfit", size: 13 },
            callbacks: {
                label: function (context: any) {
                    const dataIndex = context.dataIndex;
                    const metadata = context.dataset.customMetadata
                        ? context.dataset.customMetadata[dataIndex]
                        : null;

                    if (metadata) {
                        const isBonoChart = context.dataset.label?.toLowerCase().includes("bono");

                        if (isBonoChart) {
                            return [
                                ` Cumplimiento: ${context.parsed.y}%`,
                                ` • Bono: $${Number(metadata.bono).toLocaleString()} (${metadata.bonoEff}%)`,
                            ];
                        }

                        return [
                            ` Cumplimiento: ${context.parsed.y}%`,
                            ` • Kilómetros: ${Number(metadata.km).toLocaleString()} km (${metadata.kmEff}%)`,
                            ` • Bono: $${Number(metadata.bono).toLocaleString()} (${metadata.bonoEff}%)`,
                        ];
                    }

                    let label = context.dataset.label || "";
                    if (label) label += ": ";
                    if (context.parsed.y !== null) {
                        label += context.parsed.y;
                        if (
                            label.toLowerCase().includes("cumplimiento") ||
                            label.toLowerCase().includes("eff")
                        ) {
                            label += "%";
                        }
                    }
                    return label;
                },
            },
        },
    },
    layout: {
        padding: {
            top: 60,
            bottom: 20,
            left: 20,
            right: 20,
        },
    },
    scales: {
        y: {
            beginAtZero: true,
            grid: { color: "rgba(0,0,0,0.03)" },
            ticks: {
                font: {
                    family: "Outfit",
                    size: 14,
                    weight: "bold" as const,
                },
                padding: 12,
            },
        },
        x: {
            grid: { display: false },
            ticks: {
                font: {
                    family: "Outfit",
                    size: 14,
                    weight: "bold" as const,
                },
                padding: 12,
            },
        },
    },
} as const;

export const createDetailChart = (canvas: HTMLCanvasElement) => {
    return new Chart(canvas, {
        data: {
            labels: Array(12).fill(""),
            datasets: [
                {
                    type: "line",
                    label: "Cumplimiento Global %",
                    data: [],
                    borderColor: "rgb(76, 194, 83)",
                    backgroundColor: "rgba(76, 194, 83, 0.1)",
                    fill: true,
                    tension: 0.4,
                    pointRadius: 8,
                    pointHoverRadius: 10,
                    pointBackgroundColor: "#fff",
                    borderWidth: 6,
                },
            ],
        },
        options: {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    suggestedMax: 120,
                    grace: "5%",
                },
            },
        },
    });
};

export const createKmChart = (canvas: HTMLCanvasElement) => {
    return new Chart(canvas, {
        data: {
            labels: Array(12).fill(""),
            datasets: [
                {
                    type: "bar",
                    label: "KM Reales",
                    data: [],
                    backgroundColor: "#4cc253",
                    borderRadius: 8,
                    order: 1,
                },
                {
                    type: "bar",
                    label: "KM Programados",
                    data: [],
                    backgroundColor: "#e2e8f0",
                    borderRadius: 8,
                    order: 2,
                },
                {
                    type: "line",
                    label: "Eff",
                    data: [],
                    hidden: true,
                    order: 0 // Si se muestra, al frente de todo
                },
            ],
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                legend: {
                    ...commonOptions.plugins.legend,
                    position: "bottom" as const,
                    align: "center" as const,
                    labels: {
                        ...commonOptions.plugins.legend.labels,
                        padding: 30,
                        filter: (item: any) => item.text !== "Eff"
                    },
                },
            },
            layout: {
                padding: {
                    top: 80,
                    bottom: 20,
                },
            },
        },
        plugins: [
            {
                id: "topLabels",
                afterDatasetsDraw(chart: any) {
                    const { ctx, data } = chart;
                    const eff = data.datasets[2].data;
                    eff.forEach((v: any, i: number) => {
                        if (!v || v === 0) return;
                        const metaReal = chart.getDatasetMeta(0).data[i];
                        const metaProg = chart.getDatasetMeta(1).data[i];
                        if (!metaReal || !metaProg) return;

                        // Centrar entre las dos barras y poner sobre la más alta
                        const x = (metaReal.x + metaProg.x) / 2;
                        const y = Math.min(metaReal.y, metaProg.y);

                        ctx.fillStyle = "#4cc253"; // Usar el verde corporativo
                        ctx.font = "bold 13px Outfit";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "bottom";
                        ctx.fillText(v + "%", x, y - 8);
                    });
                },
            },
        ],
    });
};

export const createBonoChart = (canvas: HTMLCanvasElement) => {
    return new Chart(canvas, {
        data: {
            labels: Array(12).fill(""),
            datasets: [
                {
                    type: "line",
                    label: "Cumplimiento Bono %",
                    data: [],
                    borderColor: "rgb(76, 194, 83)",
                    backgroundColor: "rgba(76, 194, 83, 0.1)",
                    fill: true,
                    tension: 0.4,
                    pointRadius: 8,
                    pointHoverRadius: 10,
                    pointBackgroundColor: "#fff",
                    borderWidth: 6,
                },
            ],
        },
        options: commonOptions,
    });
};
