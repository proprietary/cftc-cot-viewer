'use client'

import OpenInterestChangesNormalizedChart from '@/app/open_interest_changes_normalized_chart';
import StandardizedCotOscillator from '@/app/standardized_cot_oscillator';
import TabularCOTViewer from '@/app/tabular_cot_viewer';
import { CachingCFTCApi } from '@/lib/cftc_api';
import { CommodityCodes, StaticCommodityInfo } from '@/lib/cftc_codes_mapping';
import CommitmentChangesChart from '@/commitment_changes_chart';
import { CommodityInfoService } from '@/lib/commodity_info';
import { CFTCReportType, PriceBar } from '@/common_types';
import { CommodityContractKind } from '@/lib/CommodityContractKind';
import LongShortOIChart from '@/long_short_oi_chart';
import NumberOfTradersChart from '@/number_of_traders_chart';
import { IAnyCOTReportType, IDisaggregatedFuturesCOTReport, IFinancialFuturesCOTReport, ILegacyFuturesCOTReport } from '@/socrata_cot_report';
import { formatDateYYYYMMDD } from '@/util';
import React from 'react';

export default function Tff({
    contract,
}: {
    contract: CommodityContractKind,
}) {
    const [reports, setReports] = React.useState<Array<IFinancialFuturesCOTReport>>([]);
    const [priceBars, setPriceBars] = React.useState<PriceBar[]>([]);
    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    React.useEffect(() => {
        (async () => {
            setIsLoading(true);
            const cftcApi = new CachingCFTCApi();
            const reportsResult = await cftcApi.requestDateRange({
                cftcContractMarketCode: contract.cftcContractMarketCode,
                reportType: CFTCReportType.FinancialFutures,
                startDate: new Date(Math.min(new Date(2006, 0, 1).getTime(), Date.parse(contract.oldestReportDate))),
                endDate: new Date(),
            }) as IFinancialFuturesCOTReport[];
            setReports(reportsResult);

            const info = StaticCommodityInfo.lookup(contract);
            if (info && info.priceFeeds.length > 0) {
                const firstPriceFeed = info.priceFeeds.at(0)!;
                const bars = await (new CommodityInfoService()).requestPriceFeed(contract.cftcCommodityCode, firstPriceFeed, reportsResult.map(x => new Date(x.timestamp)));
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
                            name: 'Dealers',
                            longs: 'dealer_positions_long_all',
                            shorts: 'dealer_positions_short_all',
                            spreading: 'dealer_positions_spread_all',
                            longsPctOI: 'pct_of_oi_dealer_long_all',
                            shortsPctOI: 'pct_of_oi_dealer_short_all',
                            spreadingPctOI: 'pct_of_oi_dealer_spread_all',
                            tradersLong: 'traders_dealer_long_all',
                            tradersShort: 'traders_dealer_short_all',
                            tradersSpreading: 'traders_dealer_spread_all',
                            changeInLongs: 'change_in_dealer_long_all',
                            changeInShorts: 'change_in_dealer_short_all',
                            changeInSpreading: 'change_in_dealer_spread_all',
                        },
                        {
                            name: 'Asset Managers',
                            longs: 'asset_mgr_positions_long',
                            shorts: 'asset_mgr_positions_short',
                            spreading: 'asset_mgr_positions_spread',
                            longsPctOI: 'pct_of_oi_asset_mgr_long',
                            shortsPctOI: 'pct_of_oi_asset_mgr_short',
                            spreadingPctOI: 'pct_of_oi_asset_mgr_spread',
                            tradersLong: 'traders_asset_mgr_long_all',
                            tradersShort: 'traders_asset_mgr_short_all',
                            tradersSpreading: 'traders_asset_mgr_spread',
                            changeInLongs: 'change_in_asset_mgr_long',
                            changeInShorts: 'change_in_asset_mgr_short',
                            changeInSpreading: 'change_in_asset_mgr_spread',
                        },
                        {
                            name: 'Leveraged Funds',
                            longs: 'lev_money_positions_long',
                            shorts: 'lev_money_positions_short',
                            spreading: 'lev_money_positions_spread',
                            longsPctOI: 'pct_of_oi_lev_money_long',
                            shortsPctOI: 'pct_of_oi_lev_money_short',
                            spreadingPctOI: 'pct_of_oi_lev_money_spread',
                            tradersLong: 'traders_lev_money_long_all',
                            tradersShort: 'traders_lev_money_short_all',
                            tradersSpreading: 'traders_lev_money_spread',
                            changeInLongs: 'change_in_lev_money_long',
                            changeInShorts: 'change_in_lev_money_short',
                            changeInSpreading: 'change_in_lev_money_spread',
                        },
                        {
                            name: 'Other Reportables',
                            longs: 'other_rept_positions_long',
                            shorts: 'other_rept_positions_short',
                            spreading: 'other_rept_positions_spread',
                            longsPctOI: 'pct_of_oi_other_rept_long',
                            shortsPctOI: 'pct_of_oi_other_rept_short',
                            spreadingPctOI: 'pct_of_oi_other_rept_spread',
                            tradersLong: 'traders_other_rept_long_all',
                            tradersShort: 'traders_other_rept_short',
                            tradersSpreading: 'traders_other_rept_spread',
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
                        { name: 'Dealers', data: reports.map(x => (x.dealer_positions_long_all - x.dealer_positions_short_all) / x.open_interest_all) },
                        { name: 'Asset Managers', data: reports.map(x => (x.asset_mgr_positions_long - x.asset_mgr_positions_short) / x.open_interest_all) },
                        { name: 'Leveraged Funds', data: reports.map(x => (x.lev_money_positions_long - x.lev_money_positions_short) / x.open_interest_all) },
                        { name: 'Other Reportables', data: reports.map(x => (x.other_rept_positions_long - x.other_rept_positions_short) / x.open_interest_all) },
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
                    longCols={[{ name: 'Dealers', column: 'dealer_positions_long_all', },
                    { name: 'Asset Managers', column: 'asset_mgr_positions_long', },
                    { name: 'Leveraged Funds', column: 'lev_money_positions_long', },
                    { name: 'Other Reportables', column: 'other_rept_positions_long', },
                    { name: 'Non-Reportables', column: 'nonrept_positions_long_all', },
                    ]}
                    shortCols={[
                        { name: 'Dealers', column: 'dealer_positions_short_all', },
                        { name: 'Asset Managers', column: 'asset_mgr_positions_short', },
                        { name: 'Leveraged Funds', column: 'lev_money_positions_short', },
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
                                name: 'Dealers',
                                longs: 'dealer_positions_long_all',
                                shorts: 'dealer_positions_short_all',
                            },
                            {
                                name: 'Asset Managers',
                                longs: 'asset_mgr_positions_long',
                                shorts: 'asset_mgr_positions_short',
                            },
                            {
                                name: 'Leveraged Funds',
                                longs: 'lev_money_positions_long',
                                shorts: 'lev_money_positions_short',
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
                            traderCategoryName: 'Dealers',
                            longs: 'dealer_positions_long_all',
                            shorts: 'dealer_positions_short_all',
                        },
                        {
                            traderCategoryName: 'Asset Managers',
                            longs: 'asset_mgr_positions_long',
                            shorts: 'asset_mgr_positions_short',
                        },
                        {
                            traderCategoryName: 'Leveraged Funds',
                            longs: 'lev_money_positions_long',
                            shorts: 'lev_money_positions_short',
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
                                name: 'Dealers',
                                n_traders_long: 'traders_dealer_long_all',
                                n_traders_short: 'traders_dealer_short_all',
                            },
                            {
                                name: 'Asset Managers',
                                n_traders_long: 'traders_asset_mgr_long_all',
                                n_traders_short: 'traders_asset_mgr_short_all',
                            },
                            {
                                name: 'Leveraged Funds',
                                n_traders_long: 'traders_lev_money_long_all',
                                n_traders_short: 'traders_lev_money_short_all',
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