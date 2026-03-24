
export const formatCurrency = (value: number) => {
    const safe = (value == null || isNaN(value)) ? 0 : value;
    return `$ ${Math.round(safe).toLocaleString()}`;
};

export const formatPercent = (value: number, decimals: number = 1) => {
    const safe = (value == null || isNaN(value)) ? 0 : value;
    return `${safe.toFixed(decimals)}%`;
};

export const getMonthNameShort = (name: string) => {
    return name.substring(0, 3).toLowerCase() + ".";
};

export const calculatePerformance = (kmPct: number, bonoPct: number) => {
    return parseFloat(((kmPct + bonoPct) / 2).toFixed(1));
};

export const getStatusClass = (pct: number, threshold: number = 90) => {
    return pct >= threshold ? "text-success" : "text-danger";
};

export const getBadgeStatusClass = (pct: number, threshold: number = 90) => {
    return pct >= threshold ? "success" : "danger";
};
