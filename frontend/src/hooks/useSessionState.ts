import { useEffect, useState } from "react";


export function useSessionState<T>(key: string, initial: T) {
    const [value, setValue] = useState<T>(() => {
        const raw = sessionStorage.getItem(key);
        if (raw) {
            try { return JSON.parse(raw) as T; } catch { /* ignore */ }
        }
        return initial;
    });


    useEffect(() => {
        try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
    }, [key, value]);


    return [value, setValue] as const;
}