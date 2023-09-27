'use client';

import { useState, useEffect } from "react";
import { SCREEN_LARGE, SCREEN_MEDIUM, SCREEN_SMALL } from "./util";
import { ViewportDimensions } from './util';

export default function useLargeChartDimensions() {
    // compute breakpoints for the ECharts instance; making it responsive
    const viewportDimensions = useViewportDimensions();
    let { height: eChartsHeight, width: eChartsWidth } = viewportDimensions;
    // mobile
    eChartsWidth = viewportDimensions.width * 0.95;
    eChartsHeight = viewportDimensions.height * 0.7;
    if (viewportDimensions.width >= SCREEN_SMALL) {
        eChartsWidth = 600;
        eChartsHeight = 500;
    }
    if (viewportDimensions.width >= SCREEN_MEDIUM) {
        eChartsWidth = 750;
        eChartsHeight = 600;
    }
    if (viewportDimensions.width >= SCREEN_LARGE) {
        eChartsWidth = 950;
        eChartsHeight = 700;
    }
    return { eChartsWidth, eChartsHeight };
}
export function useViewportDimensions() {
    const [viewportDimensions, setViewportDimensions] = useState(getViewportDimensions());
    useEffect(() => {
        function handleResize() {
            setViewportDimensions(getViewportDimensions());
        }
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);
    return viewportDimensions;
}

export function getViewportDimensions(): ViewportDimensions {
    if (typeof window === 'undefined') {
        return {
            width: 380,
            height: 350,
        };
    }
    const { innerWidth: width, innerHeight: height } = window;
    return { width, height };
}

