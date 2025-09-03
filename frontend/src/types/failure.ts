export interface FailureRow {
    workDate: string; // e.g. "2025-08-29"
    vflash1: number;
    hipot1: number;
    ats1: number;
    heatup: number;
    vibration: number;
    burnin: number;
    hipot2: number;
    ats2: number;
    vflash2: number;
    ats3: number;
    total: number;
}


export const STATION_KEYS = [
    "VFlash1",
    "Hipot1",
    "ATS1",
    "Heatup",
    "Vibration",
    "BurnIn",
    "Hipot2",
    "ATS2",
    "VFlash2",
    "ATS3",
] as const;


export type StationKey = typeof STATION_KEYS[number];


export const stationColors: Record<StationKey, string> = {
    VFlash1: "#ffa94d",
    Hipot1: "#ffd54f",
    ATS1: "#ff5733",
    Heatup: "#f7941d",
    Vibration: "#d6412b",
    BurnIn: "rgba(126,15,15)",
    Hipot2: "#f9e79f",
    ATS2: "#ffc300",
    VFlash2: "#555555",
    ATS3: "#888888",
};


export const stationMap: Record<StationKey, string> = {
    VFlash1: "%LASH",
    Hipot1: "%IPOT_1",
    ATS1: "%TS1",
    Heatup: "%TUP",
    Vibration: "%RATION",
    BurnIn: "%RN_IN",
    Hipot2: "%IPOT_2",
    ATS2: "%TS2",
    VFlash2: "%LASH2",
    ATS3: "%TS3",
};
// helper: map StationKey to row property name
export const toProp = (key: StationKey) => key.toLowerCase() as keyof FailureRow;