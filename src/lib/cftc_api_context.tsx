// Creates a persistent service so components share the IndexedDB "connection"

import React from 'react';
import { CachingCFTCApi } from '@/lib/cftc_api';

const CFTCApiContext = React.createContext<CachingCFTCApi | null>(null);

export function useCFTCApi(): CachingCFTCApi | null {
    const svc = React.useContext(CFTCApiContext);
    if (!svc) {
        throw new Error('`useCFTCApi()` must be used within a `<CFTCApiProvider>`');
    }
    return svc;
}

export function CFTCApiProvider({ children }: { children: React.ReactNode }) {
    const svc = new CachingCFTCApi();
    return (
        <CFTCApiContext.Provider value={svc}>
            {children}
        </CFTCApiContext.Provider>
    )
}