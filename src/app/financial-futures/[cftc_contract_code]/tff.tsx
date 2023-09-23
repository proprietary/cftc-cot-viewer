'use client'

import StandardizedCotOscillator from '@/app/standardized_cot_oscillator';
import { CachingCFTCApi } from '@/cftc_api';
import { CommodityCodes } from '@/cftc_codes_mapping';
import { CommodityInfoService } from '@/commodity_info';
import { CFTCReportType, PriceBar } from '@/common_types';
import { CommodityContractKind } from '@/socrata_api';
import { IFinancialFuturesCOTReport } from '@/socrata_cot_report';
import { formatDateYYYYMMDD } from '@/util';
import React from 'react';

export default function Tff({
    cftcCode, contract
}: {
    cftcCode: string,
    contract: CommodityContractKind,
}) {
    const [reports, setReports] = React.useState<IFinancialFuturesCOTReport[]>([]);
    const [priceBars, setPriceBars] = React.useState<PriceBar[]>([]);
    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    React.useEffect(() => {
        (async () => {
            setIsLoading(true);
            let cftcApi = new CachingCFTCApi();
            const reportsResult = await cftcApi.requestDateRange({
                contract,
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
        <div>
            {cftcCode}
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
                    loading={reports.length === 0}
                    priceData={priceBars}
                />
            </div>
        </div>
    )
}