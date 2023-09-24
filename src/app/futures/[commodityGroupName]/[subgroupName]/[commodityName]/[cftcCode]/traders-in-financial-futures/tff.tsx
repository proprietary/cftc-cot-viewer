'use client'

import OpenInterestChangesNormalizedChart from '@/app/open_interest_changes_normalized_chart';
import StandardizedCotOscillator from '@/app/standardized_cot_oscillator';
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
                startDate: new Date(2000, 0, 1),
                endDate: new Date(),
            }) as IFinancialFuturesCOTReport[];
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
        <div className="flex flex-col items-center justify-between p-2">
            <pre>{JSON.stringify(contract, null, 4)}</pre>
            <div className="my-2">
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
            <div className="my-2">
                <div className="text-lg">Long and Short Open Interest</div>
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
            <div className="my-2">
                <div className="text-lg">Changes in Commitments over N weeks</div>
                <CommitmentChangesChart
                    dataFrame={reports}
                    cols={
                        [
                            {
                                name: 'Dealers',
                                column: 'dealer_positions_long_all',
                                longs: 'dealer_positions_long_all',
                                shorts: 'dealer_positions_short_all',
                            },
                            {
                                name: 'Asset Managers',
                                column: 'asset_mgr_positions_long',
                                longs: 'asset_mgr_positions_long',
                                shorts: 'asset_mgr_positions_short',
                            },
                            {
                                name: 'Leveraged Funds',
                                column: 'lev_money_positions_long',
                                longs: 'lev_money_positions_long',
                                shorts: 'lev_money_positions_short',
                            },
                            {
                                name: 'Other Reportables',
                                column: 'other_rept_positions_long',
                                longs: 'other_rept_positions_long',
                                shorts: 'other_rept_positions_short',
                            },
                            {
                                name: 'Non-Reportables',
                                column: 'nonrept_positions_long_all',
                                longs: 'nonrept_positions_long_all',
                                shorts: 'nonrept_positions_short_all',
                            },
                        ]
                    }
                />
            </div>
            <div className="my-2">
                <div className="text-lg">Changes in Commitments over N weeks (normalized)</div>
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
            <div className="my-2">
                <div className="text-lg">Number of Traders</div>
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