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
    const [reports, setReports] = React.useState<Array<IDisaggregatedFuturesCOTReport>>([]);
    const [priceBars, setPriceBars] = React.useState<PriceBar[]>([]);
    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    React.useEffect(() => {
        (async () => {
            setIsLoading(true);
            const cftcApi = new CachingCFTCApi();
            const reportsResult = await cftcApi.requestDateRange({
                cftcContractMarketCode: contract.cftcContractMarketCode,
                reportType: CFTCReportType.Disaggregated,
                startDate: new Date(Math.min(new Date(2006, 0, 1).getTime(), Date.parse(contract.oldestReportDate))),
                endDate: new Date(),
            }) as IDisaggregatedFuturesCOTReport[];
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
                            name: 'Producer/Merchant',
                            longs: 'prod_merc_positions_long',
                            shorts: 'prod_merc_positions_short',
                            longsPctOI: 'pct_of_oi_prod_merc_long',
                            shortsPctOI: 'pct_of_oi_prod_merc_short',
                            tradersLong: 'traders_prod_merc_long_all',
                            tradersShort: 'traders_prod_merc_short_all',
                            changeInLongs: 'change_in_prod_merc_long',
                            changeInShorts: 'change_in_prod_merc_short',
                        },
                        {
                            name: 'Swap Dealers',
                            longs: 'swap_positions_long_all',
                            shorts: 'swap__positions_short_all',
                            spreading: 'swap__positions_spread_all',
                            longsPctOI: 'pct_of_oi_swap_long_all',
                            shortsPctOI: 'pct_of_oi_swap_short_all',
                            spreadingPctOI: 'pct_of_oi_swap_spread_all',
                            tradersLong: 'traders_swap_long_other',
                            tradersShort: 'traders_swap_short_other',
                            tradersSpreading: 'traders_swap_spread_all',
                            changeInLongs: 'change_in_swap_long_all',
                            changeInShorts: 'change_in_swap_short_all',
                            changeInSpreading: 'change_in_swap_spread_all',
                        },
                        {
                            name: 'Managed Money',
                            longs: 'm_money_positions_long_all',
                            shorts: 'm_money_positions_short_all',
                            spreading: 'm_money_positions_spread',
                            longsPctOI: 'pct_of_oi_m_money_long_all',
                            shortsPctOI: 'pct_of_oi_m_money_short_all',
                            spreadingPctOI: 'pct_of_oi_m_money_spread',
                            changeInLongs: 'change_in_m_money_long_all',
                            changeInShorts: 'change_in_m_money_short_all',
                            changeInSpreading: 'change_in_m_money_spread',
                        },
                        {
                            name: 'Other Reportables',
                            longs: 'other_rept_positions_long',
                            shorts: 'other_rept_positions_short',
                            spreading: 'other_rept_positions_spread',
                            longsPctOI: 'pct_of_oi_other_rept_long',
                            shortsPctOI: 'pct_of_oi_other_rept_short',
                            spreadingPctOI: 'pct_of_oi_other_rept_spread',
                            changeInLongs: 'change_in_other_rept_long',
                            changeInShorts: 'change_in_other_rept_short',
                            changeInSpreading: 'change_in_other_rept_spread',
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
                        { name: 'Producer/Merchant', data: reports.map(x => (x.prod_merc_positions_long - x.prod_merc_positions_short) / x.open_interest_all) },
                        { name: 'Swap Dealers', data: reports.map(x => (x.swap_positions_long_all - x.swap__positions_short_all) / x.open_interest_all) },
                        { name: 'Managed Money', data: reports.map(x => (x.m_money_positions_long_all - x.m_money_positions_short_all) / x.open_interest_all) },
                        { name: 'Other Reportables', data: reports.map(x => (x.other_rept_positions_long - x.other_rept_positions_short)/x.open_interest_all), },
                        { name: 'Non-Reportables', data: reports.map(x => (x.nonrept_positions_long_all - x.nonrept_positions_short_all)/x.open_interest_all), },
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
                        { name: 'Producer/Merchant', column: 'prod_merc_positions_long', },
                        { name: 'Swap Dealers', column: 'swap_positions_long_all', },
                        { name: 'Managed Money', column: 'm_money_positions_long_all', },
                        { name: 'Other Reportables', column: 'other_rept_positions_long', },
                        { name: 'Non-Reportables', column: 'nonrept_positions_long_all', },
                    ]}
                    shortCols={[
                        { name: 'Producer/Merchant', column: 'prod_merc_positions_short', },
                        { name: 'Swap Dealers', column: 'swap__positions_short_all', },
                        { name: 'Managed Money', column: 'm_money_positions_short_all', },
                        { name: 'Other Reportables', column: 'other_rept_positions_short', },
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
                                name: 'Producer/Merchant',
                                longs: 'prod_merc_positions_long',
                                shorts: 'prod_merc_positions_short',
                            },
                            {
                                name: 'Swap Dealers',
                                longs: 'swap_positions_long_all',
                                shorts: 'swap__positions_short_all',
                            },
                            {
                                name: 'Managed Money',
                                longs: 'm_money_positions_long_all',
                                shorts: 'm_money_positions_short_all',
                            },
                            {
                                name: 'Other Reportables',
                                longs: 'other_rept_positions_long',
                                shorts: 'other_rept_positions_short',
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
                            traderCategoryName: 'Producer/Merchant',
                            longs: 'prod_merc_positions_long',
                            shorts: 'prod_merc_positions_short',
                        },
                        {
                            traderCategoryName: 'Swap Dealers',
                            longs: 'swap_positions_long_all',
                            shorts: 'swap__positions_short_all',
                        },
                        {
                            traderCategoryName: 'Managed Money',
                            longs: 'm_money_positions_long_all',
                            shorts: 'm_money_positions_short_all',
                        },
                        {
                            traderCategoryName: 'Other Reportables',
                            longs: 'other_rept_positions_long',
                            shorts: 'other_rept_positions_short',
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
                                name: 'Producer/Merchant',
                                n_traders_long: 'traders_prod_merc_long_all',
                                n_traders_short: 'traders_prod_merc_short_all',
                            },
                            {
                                name: 'Swap Dealers',
                                n_traders_long: 'traders_swap_long_other',
                                n_traders_short: 'traders_swap_short_other',
                            },
                            {
                                name: 'Managed Money',
                                n_traders_long: 'traders_m_money_long_other',
                                n_traders_short: 'traders_m_money_short_all',
                            },
                            {
                                name: 'Other Reportables',
                                n_traders_long: 'traders_other_rept_long_all',
                                n_traders_short: 'traders_other_rept_short',
                            },
                        ]
                    }
                />
            </div>

        </div>
    )
}