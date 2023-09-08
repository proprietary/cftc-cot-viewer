'use client';

import React from 'react';
import * as echarts from 'echarts/core';
import EChartsReactCore from 'echarts-for-react/lib/core';
import { BarChart } from 'echarts/charts';
import { TitleComponent, GridComponent, LegendComponent, ToolboxComponent, TooltipComponent, DataZoomComponent, } from 'echarts/components';
import { SVGRenderer, CanvasRenderer } from 'echarts/renderers';
import { useRouter } from 'next/navigation';
import { useSearchParams, usePathname } from 'next/navigation';

import { CachingCFTCApi, DateRangeRequest, CFTCReportType, ContractListRequest, CommodityContractKind } from '@/cftc_api';

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
                    <DisaggregatedCommoditiesNetPositioning reports={reports} loading={loadingDownstream} />
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

function DisaggregatedCommoditiesNetPositioning({ reports, loading }: { reports: any[], loading: boolean }) {
    const dates = reports.map(x => new Date(x['timestamp']).toLocaleDateString());
    const option = {
        aria: {
            show: true,
        },
        tooltip: {
            show: true,
            trigger: 'axis',
        },
        legend: {
            itemGap: 5,
        },
        title: {
            show: reports.length > 0,
            text: reports.length > 0 ? reports[0]['commodity_name'] : '',
            textStyle: {
                fontFamily: 'sans-serif',
                fontSize: 18,
            }
        },
        toolbox: {
            show: true,
            feature: {
                dataZoom: { show: true, },
                reset: { show: true, }
            }
        },
        dataZoom: [
            {
                type: 'slider',
                filterMode: 'filter',
                startValue: dates[Math.max(0, dates.length - 50)],
            }
        ],
        grid: {
            left: '5%',
            right: '5%',
            bottom: '5%',
            top: '5%',
            containLabel: true
        },
        xAxis: [
            {
                type: 'category',
                data: dates,
            }
        ],
        yAxis: [
            { type: 'value', name: 'Net Contracts (Long - Short)', }
        ],
        series: [
            { type: 'bar', data: reports.map(x => x['prod_merc_positions_long'] - x['prod_merc_positions_short']), name: 'Producer/Merchant' },
            { type: 'bar', data: reports.map(x => x['swap_positions_long_all'] - x['swap__positions_short_all']), name: 'Swap Dealers' },
            { type: 'bar', data: reports.map(x => x['m_money_positions_long_all'] - x['m_money_positions_short_all']), name: 'Managed Money', },
            { type: 'bar', data: reports.map(x => x['other_rept_positions_long'] - x['other_rept_positions_short']), name: 'Other Reportables', },
            { type: 'bar', data: reports.map(x => x['nonrept_positions_long_all'] - x['nonrept_positions_short_all']), name: 'Non-Reportables', },
        ]
    };
   
    return (
        <EChartsReactCore
            echarts={echarts}
            showLoading={loading === true || reports.length === 0}
            option={option}
            theme={'dark'}
            style={{ height: '1000px', width: '90vw' }} />
    );

}

echarts.use([TitleComponent, TooltipComponent, ToolboxComponent, DataZoomComponent, LegendComponent, GridComponent, BarChart, SVGRenderer, CanvasRenderer]);
