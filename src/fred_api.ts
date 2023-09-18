import { PriceBar } from './common_types';
import { formatDateYYYYMMDD } from './util';

const FredAPIUrl = 'https://api.stlouisfed.org';

export async function requestFredSeries(symbol: string, since: Date = new Date(), apiKey: string = process.env.NEXT_PUBLIC_FRED_API_KEY!): Promise<PriceBar[]> {
    let offset: number = 0;
    let bars: PriceBar[] = [];
    do {
        let params = new URLSearchParams({
            'series_id': symbol,
            'api_key': apiKey,
            'file_type': 'json',
            // 'frequency': 'wetu',
            'frequency': 'd',
            'aggregation_method': 'eop',
            'offset': offset.toString(),
            'observation_end': formatDateYYYYMMDD(since),
        });
        let resp = await fetch(FredAPIUrl + '/fred/series/observations?' + params, {
            method: 'GET',
        });
        if (resp.status !== 200) {
            console.error(resp.statusText);
            throw new Error(resp.statusText);
        }
        let responseBody: any = await resp.json();
        if (responseBody['count'] >= responseBody['limit']) {
            offset += responseBody['count'] + 1;
        }
        bars.concat(responseBody['observations'].map((o: any): PriceBar => ({
            timestamp: new Date(Date.parse(o['date'])),
            close: parseFloat(o['value']),
        })));
    } while (offset > 0);
    return bars;
}
