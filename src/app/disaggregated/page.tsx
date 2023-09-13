'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams, usePathname } from 'next/navigation';

import { CachingCFTCApi, CFTCReportType, ContractListRequest, CommodityContractKind } from '@/cftc_api';
import StandardizedCotOscillator from '../standardized_cot_oscillator';

export default function Disaggregated() {
    const [cftcApi, setCftcApi] = React.useState<CachingCFTCApi>();
    const [commodityContracts, setCommodityContracts] = React.useState<CommodityContractKind[]>([]);
    const [reports, setReports] = React.useState<Array<any>>([]);
    const [loadingDownstream, setLoadingDownstream] = React.useState<boolean>(false);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [cftcContractMarketCode, setCftcContractMarketCode] = React.useState<string>(searchParams.get('cftcCode') ?? '');

    // Retrieve "contracts" aka the types of contracts, like "WTI Crude Oil".
    React.useEffect(() => {
        (async () => {
            try {
                let api = new CachingCFTCApi();
                setCftcApi(api);
                const req: ContractListRequest = {
                    reportType: CFTCReportType.Disaggregated,
                };
                let allContracts = await api.requestCommodityContracts(req);
                setCommodityContracts(allContracts);
                if (cftcContractMarketCode == null || cftcContractMarketCode.length === 0) {
                    setCftcContractMarketCode(allContracts[0].cftcContractMarketCode);
                }
            } catch (e) {
                console.error(e);
                throw e;
            }
        })();
    }, [setCommodityContracts, setCftcApi, setCftcContractMarketCode]);

    // Retrieve the actual Commitment of Traders data.
    React.useEffect(() => {
        (async () => {
            try {
                if (cftcApi == null || cftcContractMarketCode == null || cftcContractMarketCode.length === 0) {
                    return;
                }
                setLoadingDownstream(true);
                const res = await cftcApi.requestDateRange({
                    reportType: CFTCReportType.Disaggregated,
                    contract: { reportType: CFTCReportType.Disaggregated, cftcContractMarketCode, },
                    startDate: new Date(2000, 0, 1),
                    endDate: new Date(),
                });
                setReports(res);
                setLoadingDownstream(false);
            } catch (e) {
                console.error(e);
                setLoadingDownstream(false);
                throw e;
            } finally {
                setLoadingDownstream(false);
            }
        })();
    }, [cftcApi, cftcContractMarketCode, setReports, setLoadingDownstream]);
    const handleChange = async (ev: React.FormEvent<HTMLSelectElement>) => {
        const newCftcCode = (ev.target as HTMLSelectElement).value;
        // keep in sync with query string
        let p = new URLSearchParams(searchParams);
        p.set('cftcCode', newCftcCode);
        const newSearchParams = p.toString();
        router.push(pathname + "?" + newSearchParams);
        setCftcContractMarketCode(newCftcCode);
    }
    return (
        <div className="flex min-h-screen flex-col items-center justify-between p-10">
            <h1>Disaggregated</h1>
            <div className="bg-inherit grid grid-flow-row">
                <select className="text-slate-50 bg-slate-900 p-2 m-2 rounded-md text-lg w-3/4"
                    value={cftcContractMarketCode} onChange={handleChange}
                >
                    {Array.from(buildCommodityCategoryTree(commodityContracts).entries())
                        .map(([categoryName, commodities]: [CategoryName, CommodityContractKind[]], idx: number) => (
                            <optgroup key={idx} label={categoryName}>
                                {commodities.map((commodKind: CommodityContractKind, jdx: number) => (
                                    <option key={jdx} value={commodKind.cftcContractMarketCode}>{commodKind.marketAndExchangeNames}</option>
                                ))}
                            </optgroup>
                        ))}
                </select>
                <div>
                    <StandardizedCotOscillator
                        columns={{
                            'Producer/Merchant': {
                                data: reports.map(x => x['prod_merc_positions_long'] - x['prod_merc_positions_short']),
                            },
                            'Swap Dealers': {
                                data: reports.map(x => x['swap_positions_long_all'] - x['swap__positions_short_all']),
                            },
                            'Managed Money': {
                                data: reports.map(x => x['m_money_positions_long_all'] - x['m_money_positions_short_all']),
                            },
                            'Other Reportables': {
                                data: reports.map(x => x['other_rept_positions_long'] - x['other_rept_positions_short']),
                            },
                            'Non-Reportables': {
                                data: reports.map(x => x['nonrept_positions_long_all'] - x['nonrept_positions_short_all']),
                            },
                        }}
                        xAxisDates={reports.map(x => new Date(x.timestamp))}
                        title={reports.length > 0 ? reports.at(0)?.contract_market_name : ''}
                        loading={loadingDownstream}
                    />
                </div>
            </div>
        </div>
    );
}

type CategoryName = string;

function buildCommodityCategoryTree(source: CommodityContractKind[]): Map<CategoryName, CommodityContractKind[]> {
    let dst: Map<CategoryName, CommodityContractKind[]> = new Map();
    for (const entry of source) {
        if (!dst.has(entry.commoditySubgroupName!)) {
            dst.set(entry.commoditySubgroupName!, [entry]);
        } else {
            const loc = dst.get(entry.commoditySubgroupName!);
            dst.set(entry.commoditySubgroupName!, [...loc ?? [], entry]);
        }
    }
    return dst;
}

