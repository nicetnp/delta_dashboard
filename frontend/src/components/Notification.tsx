import { useEffect, useState } from "react";


export default function Notification({ triggerKey }: { triggerKey: string }) {
    const [show, setShow] = useState(false);


    useEffect(() => {
        if (!triggerKey) return;
        setShow(true);
        const t1 = setTimeout(() => setShow(false), 3000);
        return () => clearTimeout(t1);
    }, [triggerKey]);


    if (!show) return null;
    return (
        <div className="fixed bottom-5 right-5 bg-green-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-opacity">
            Data has been updated!
        </div>
    );
}