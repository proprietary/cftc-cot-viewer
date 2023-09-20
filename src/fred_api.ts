import { PriceBar } from './common_types';
import { formatDateYYYYMMDD } from './util';

interface FredObservation {
    date: string,
    value: string,
}

export async function requestFredObservations(seriesId: string, until: Date = new Date()): Promise<PriceBar[]> {
    let params = new URLSearchParams({
        'series_id': seriesId,
        'observation_end': formatDateYYYYMMDD(until),
    });
    let resp = await fetch('https://fred.libhack.so/v0/observations?' + params, {
        method: 'GET',
    });
    if (resp.status !== 200) {
        console.error(resp.statusText);
        console.error(await resp.text());
        throw new Error(resp.statusText);
    }
    let responseBody: FredObservation[] = await resp.json();
    const bars: PriceBar[] = responseBody.map((o, idx, arr) => {
        let close = parseFloat(o.value);
        // smooth out NaNs by taking previous day values
        if (isNaN(parseFloat(o.value))) {
            for (let pastIdx = idx; pastIdx >= 0; pastIdx--) {
                let maybeClosePrice: number = parseFloat(arr[pastIdx].value);
                if (!isNaN(maybeClosePrice)) {
                    close = maybeClosePrice;
                    break;
                }
            }
        }
        return {
            timestamp: new Date(Date.parse(o.date)),
            close,
        };
    });
    return bars;
}
