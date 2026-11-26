'use client';

import {useEffect} from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

export default function AOSProvider() {
    useEffect(() => {
        // AOS adds classes to every [data-aos] element. Doing that while React is still hydrating the
        // page (it hydrates streamed sections after this effect runs) causes hydration mismatches, so
        // wait until the browser is idle, i.e. hydration work is done, or at most 500 ms.
        const start = () => AOS.init({duration: 900, once: true});
        if ('requestIdleCallback' in window) {
            const id = window.requestIdleCallback(start, {timeout: 500});
            return () => window.cancelIdleCallback(id);
        }
        const timer = setTimeout(start, 200);
        return () => clearTimeout(timer);
    }, []);

    return null;
}
