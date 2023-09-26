'use client'

import OpenInterestChangesNormalizedChart from '@/app/open_interest_changes_normalized_chart';
import StandardizedCotOscillator from '@/app/standardized_cot_oscillator';
import TabularCOTViewer from '@/app/tabular_cot_viewer';
import { CachingCFTCApi } from '@/cftc_api';
import { CommodityCodes } from '@/cftc_codes_mapping';
import CommitmentChangesChart from '@/commitment_changes_chart';
import { CommodityInfoService } from '@/commodity_info';
import { CFTCReportType, PriceBar } from '@/common_types';
import { CommodityContractKind } from '@/lib/CommodityContractKind';
import LongShortOIChart from '@/long_short_oi_chart';
import NumberOfTradersChart from '@/number_of_traders_chart';
import { IAnyCOTReportType, IDisaggregatedFuturesCOTReport, IFinancialFuturesCOTReport, ILegacyFuturesCOTReport } from '@/socrata_cot_report';
import { formatDateYYYYMMDD } from '@/util';
import React from 'react';

export default function Legacy({
    contract,
}: {
    contract: CommodityContractKind,
}) {
    const [reports, setReports] = React.useState<Array<ILegacyFuturesCOTReport>>([]);
    const [priceBars, setPriceBars] = React.useState<PriceBar[]>([]);
    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    React.useEffect(() => {
        (async () => {
            setIsLoading(true);
            const cftcApi = new CachingCFTCApi();
            const reportsResult = await cftcApi.requestDateRange({
                cftcContractMarketCode: contract.cftcContractMarketCode,
                reportType: CFTCReportType.Legacy,
                startDate: new Date(Math.min(new Date(2006, 0, 1).getTime(), Date.parse(contract.oldestReportDate))),
                endDate: new Date(),
            }) as ILegacyFuturesCOTReport[];
            setReports(reportsResult);

            if (reportsResult.at(0)?.cftc_commodity_code != null &&
                reportsResult.at(0)?.cftc_commodity_code! in CommodityCodes &&
                CommodityCodes[reportsResult.at(0)?.cftc_commodity_code!].priceFeeds.length > 0) {
                const commodityCode = reportsResult.at(0)?.cftc_commodity_code!;
                const commodityInfo = CommodityCodes[commodityCode];
                const firstPriceFeed = commodityInfo.priceFeeds.at(0)!;
                const bars = await (new CommodityInfoService()).requestPriceFeed(commodityCode, firstPriceFeed, reportsResult.map(x => new Date(x.timestamp)));
                setPriceBars(bars);
            }
            setIsLoading(false);
        })();
    }, [contract]);
    return (
        <div className="grid grid-cols-1 gap-4 mx-2">
            <div className="my-3">
                <TabularCOTViewer reports={reports}
                    columns={[
                        {
                            name: 'Commercials',
                            longs: 'comm_positions_long_all',
                            shorts: 'comm_positions_short_all',
                            longsPctOI: 'pct_of_oi_comm_long_all',
                            shortsPctOI: 'pct_of_oi_comm_short_all',
                            tradersLong: 'traders_comm_long_all',
                            tradersShort: 'traders_comm_short_all',
                            changeInLongs: 'change_in_comm_long_all',
                            changeInShorts: 'change_in_comm_short_all',
                        },
                        {
                            name: 'Non-Commercials',
                            longs: 'noncomm_positions_long_all',
                            shorts: 'noncomm_positions_short_all',
                            spreading: 'noncomm_positions_spread',
                            longsPctOI: 'pct_of_oi_noncomm_long_all',
                            shortsPctOI: 'pct_of_oi_noncomm_short_all',
                            spreadingPctOI: 'pct_of_oi_noncomm_spread',
                            tradersLong: 'traders_noncomm_long_all',
                            tradersShort: 'traders_noncomm_short_all',
                            tradersSpreading: 'traders_noncomm_spread_all',
                            changeInLongs: 'change_in_noncomm_long_all',
                            changeInShorts: 'change_in_noncomm_short_all',
                            changeInSpreading: 'change_in_noncomm_spead_all',
                        },
                        {
                            name: 'Non-Reportables',
                            longs: 'nonrept_positions_long_all',
                            shorts: 'nonrept_positions_short_all',
                            longsPctOI: 'pct_of_oi_nonrept_long_all',
                            shortsPctOI: 'pct_of_oi_nonrept_short_all',
                            changeInLongs: 'change_in_nonrept_long_all',
                            changeInShorts: 'change_in_nonrept_short_all',
                        },
                    ]}
                />
            </div>
            <div className="my-2 h-screen mx-auto">
                <h2 className="text-2xl text-center p-4">Net Positioning</h2>
                <StandardizedCotOscillator
                    yAxisLabel='Net Exposure as % Open Interest'
                    plottedColumns={[
                        { name: 'Commercials', data: reports.map(x => (x.comm_positions_long_all - x.comm_positions_short_all) / x.open_interest_all) },
                        { name: 'Non-Commercials', data: reports.map(x => (x.noncomm_positions_long_all - x.noncomm_positions_short_all) / x.open_interest_all) },
                        { name: 'Non-Reportables', data: reports.map(x => (x.nonrept_positions_long_all - x.nonrept_positions_short_all) / x.open_interest_all) },
                    ]}
                    xAxisDates={reports.map(x => formatDateYYYYMMDD(new Date(x.timestamp)))}
                    title={reports.at(0)?.contract_market_name}
                    loading={isLoading || reports.length === 0}
                    priceData={priceBars}
                />
            </div>
            <div className="my-2 min-h-screen">
                <h2 className="text-2xl text-center p-4">
                    Long and Short Open Interest
                </h2>
                <LongShortOIChart
                    data={reports}
                    longCols={[
                        { name: 'Commercials', column: 'comm_positions_long_all', },
                        { name: 'Non-Commercials', column: 'noncomm_positions_long_all', },
                        { name: 'Non-Reportables', column: 'nonrept_positions_long_all', },
                    ]}
                    shortCols={[
                        { name: 'Commercials', column: 'comm_positions_short_all', },
                        { name: 'Non-Commercials', column: 'noncomm_positions_short_all', },
                        { name: 'Non-Reportables', column: 'nonrept_positions_short_all', },
                    ]} />
            </div>
            <div className="my-2 min-h-screen h-screen">
                <div className="text-2xl text-center p-4">
                    Changes in Commitments over N weeks
                </div>
                <CommitmentChangesChart
                    dataFrame={reports}
                    cols={
                        [
                            {
                                name: 'Commercials',
                                longs: 'comm_positions_long_all',
                                shorts: 'comm_positions_short_all',
                            },
                            {
                                name: 'Non-Commercials',
                                longs: 'noncomm_positions_long_all',
                                shorts: 'noncomm_positions_short_all',
                            },
                            {
                                name: 'Non-Reportables',
                                longs: 'nonrept_positions_long_all',
                                shorts: 'nonrept_positions_short_all',
                            },
                        ]
                    }
                />
            </div>
            <div className="my-2 min-h-screen">
                <div className="text-2xl text-center p-4">
                    Changes in Commitments over N weeks (normalized)
                </div>
                <OpenInterestChangesNormalizedChart
                    priceData={priceBars}
                    reports={reports}
                    cols={[
                        {
                            traderCategoryName: 'Commercials',
                            longs: 'comm_positions_long_all',
                            shorts: 'comm_positions_short_all',
                        },
                        {
                            traderCategoryName: 'Non-Commercials',
                            longs: 'noncomm_positions_long_all',
                            shorts: 'noncomm_positions_short_all',
                        },
                        {
                            traderCategoryName: 'Non-Reportables',
                            longs: 'nonrept_positions_long_all',
                            shorts: 'nonrept_positions_short_all',
                        },
                    ]}
                />
            </div>
            <div className="my-2 min-h-screen">
                <div className="text-2xl text-center p-4">
                    Number of Traders
                </div>
                <NumberOfTradersChart
                    reports={reports}
                    cols={
                        [
                            {
                                name: 'Commercials',
                                n_traders_long: 'traders_comm_long_all',
                                n_traders_short: 'traders_comm_short_all',
                            },
                            {
                                name: 'Non-Commercials',
                                n_traders_long: 'traders_noncomm_long_all',
                                n_traders_short: 'traders_noncomm_short_all',
                            },
                        ]
                    }
                />
            </div>

        </div>
    )
}