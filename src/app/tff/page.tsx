'use client';

import React, { useCallback } from 'react';
import cloneDeep from 'lodash-es/cloneDeep';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { TitleComponent, GridComponent, LegendComponent, TooltipComponent, ToolboxComponent, DataZoomComponent, VisualMapComponent, TimelineComponent } from 'echarts/components';
import { BarChart, LineChart } from 'echarts/charts';
import { SVGRenderer, CanvasRenderer } from 'echarts/renderers';
import { useRouter } from 'next/navigation';
import { useSearchParams, usePathname } from 'next/navigation';
import { CachingCFTCApi, ContractListRequest, CFTCReportType, CommodityContractKind } from '@/cftc_api';
import { IFinancialFuturesCOTReport } from '@/socrata_cot_report';
import { rollingZscore } from '@/chart_math';
import { SCREEN_LARGE, SCREEN_MEDIUM, SCREEN_SMALL, useViewportDimensions, usePrevious } from '@/util';
import StandardizedCotOscillator from '../standardized_cot_oscillator';
import { CommodityInfoService } from '@/commodity_info';
import { CommodityCodes } from '@/cftc_codes_mapping';
import { PriceBar } from '@/common_types';
import StackedAbsValuesChart from '@/stacked_abs_values_chart';
import CommitmentChangesChart from '@/commitment_changes_chart';

echarts.use([TitleComponent, LineChart, VisualMapComponent, TimelineComponent, TooltipComponent, ToolboxComponent, DataZoomComponent, LegendComponent, GridComponent, BarChart, SVGRenderer, CanvasRenderer]);

type CategoryName = string;

export default function Tff() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams()!;
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams);
      params.set(name, value);
      return params.toString();
    }, [searchParams]);
  const cftcCodeQueryParam = searchParams.get('cftcCode');

  const commodityInfoSvc = React.useRef<CommodityInfoService>(new CommodityInfoService());
  const [loading, setLoading] = React.useState<boolean>(false);
  const [cftcApi, setCftcApi] = React.useState<CachingCFTCApi>();
  const [tffData, setTffData] = React.useState<Array<IFinancialFuturesCOTReport>>([]);
  const [futuresContracts, setFuturesContracts] = React.useState<CommodityContractKind[]>([]);
  const [commoditySelected, setCommoditySelected] = React.useState<string>(cftcCodeQueryParam ?? '');
  const [priceData, setPriceData] = React.useState<PriceBar[]>([]);

  // Retrieve "contracts", aka all the different types of futures contracts.
  React.useEffect(() => {
    (async () => {
      try {
        let api = new CachingCFTCApi();
        setCftcApi(api);
        const req: ContractListRequest = {
          reportType: CFTCReportType.FinancialFutures,
        };
        let contracts = await api.requestCommodityContracts(req);
        setFuturesContracts(contracts);
        if (commoditySelected == null || commoditySelected.length === 0) {
          setCommoditySelected(contracts[0].cftcContractMarketCode);
        }
      } catch (e) {
        console.error(e);
        throw e;
      }
    })();
  }, []);

  // Retrieve the actual Commitment of Traders reports data.
  React.useEffect(() => {
    (async () => {
      try {
        if (cftcApi == null || commoditySelected.length === 0) {
          return;
        }
        setLoading(true);
        const tffData: IFinancialFuturesCOTReport[] = await cftcApi.requestDateRange({
          reportType: CFTCReportType.FinancialFutures,
          startDate: new Date(2000, 0, 1),
          endDate: new Date(),
          contract: {
            reportType: CFTCReportType.FinancialFutures,
            cftcContractMarketCode: commoditySelected,
          },
        }) as IFinancialFuturesCOTReport[];
        setTffData(tffData);
        // get price data, if any is available
        if (tffData.at(0)?.cftc_commodity_code != null && tffData.at(0)?.cftc_commodity_code! in CommodityCodes) {
          const commodityCode = tffData.at(0)!.cftc_commodity_code;
          const commodityInfo = CommodityCodes[commodityCode];
          if (commodityInfo.priceFeeds.length > 0) {
            // for now just handle one type of price feed
            const priceFeed = commodityInfo.priceFeeds[0];
            const bars = await commodityInfoSvc.current?.requestPriceFeed(commodityCode, priceFeed, tffData.map(x => new Date(x.timestamp)));
            setPriceData(bars);
          } else {
            setPriceData([]);
          }
        } else {
          setPriceData([]);
        }
      } catch (e) {
        console.error(e);
        throw e;
      } finally {
        setLoading(false);
      }
    })();
  }, [cftcApi, commoditySelected]);
  const handleChangeCommoditySelected = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    const thisSelection = ev.target.value;
    if (thisSelection.length > 0) {
      router.push(pathname + "?" + createQueryString("cftcCode", ev.target.value));
    }
    setCommoditySelected(ev.target.value);
  };
  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-between p-10">
        <h2>Traders in Financial Futures</h2>
        <select title="Futures Contract" className="text-slate-50 bg-slate-900 p-2 m-2 rounded-md text-lg w-3/4"
          value={commoditySelected}
          onChange={handleChangeCommoditySelected}>
          {Array.from(buildFinancialFuturesCategoryTree(futuresContracts).entries())
            .map(([commodityCategory, commodityContracts]: [CategoryName, CommodityContractKind[]], idx: number) => (
              <optgroup key={idx} label={commodityCategory}>
                {commodityContracts.map((commod: CommodityContractKind, jdx: number) => (
                  <option key={jdx} value={commod.cftcContractMarketCode}>{commod.marketAndExchangeNames}</option>
                ))}
              </optgroup>
            ))}
        </select>
        <div className="my-2">
          <div className="block">
            <span className="text-lg">Net Positioning</span>
            <abbr title="Net of Longs minus Shorts held by traders in the given category (Long - Short = Net)">Longs - Shorts</abbr>
          </div>
          <StandardizedCotOscillator
            columns={{
              'Dealers': { data: tffData.map(x => x.dealer_positions_long_all - x.dealer_positions_short_all), normalizingDivisor: tffData.at(0)?.open_interest_all },
              'Asset Managers': { data: tffData.map(x => x.asset_mgr_positions_long - x.asset_mgr_positions_short), normalizingDivisor: tffData.at(0)?.open_interest_all },
              'Leveraged Funds': { data: tffData.map(x => x.lev_money_positions_long - x.lev_money_positions_short), normalizingDivisor: tffData.at(0)?.open_interest_all },
              'Other Reportables': { data: tffData.map(x => x.other_rept_positions_long - x.other_rept_positions_short), normalizingDivisor: tffData.at(0)?.open_interest_all, },
              'Non-Reportables': { data: tffData.map(x => x.nonrept_positions_long_all - x.nonrept_positions_short_all), normalizingDivisor: tffData.at(0)?.open_interest_all, },
            }}
            xAxisDates={tffData.map(x => new Date(x.timestamp))}
            title={tffData.at(0)?.contract_market_name}
            loading={loading}
            priceData={priceData}
          />
        </div>
        <div className="my-2">
          <div className="text-lg">
            Open Interest
          </div>
          <StackedAbsValuesChart cols={
            [
              { name: 'Dealers', column: 'dealer_positions_long_all', },
              { name: 'Asset Managers', column: 'asset_mgr_positions_long', },
              { name: 'Leveraged Funds', column: 'lev_money_positions_long', },
              { name: 'Other Reportables', column: 'other_rept_positions_long', },
              { name: 'Non-Reportables', column: 'nonrept_positions_long_all', },
            ]
          }
            data={tffData}
          />
        </div>
        <div className="my-2">
          <div className="text-lg">Changes in Commitments over N weeks</div>
          <CommitmentChangesChart dataFrame={tffData}
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
          <p>Commodity code: {tffData.at(0)?.cftc_commodity_code}</p>
          <p>Commodity name: {tffData.at(0)?.commodity_name}</p>
          <p>Commodity: {tffData.at(0)?.commodity}</p>
          <p>Subgroup name: {tffData.at(0)?.commodity_subgroup_name}</p>
          <p>Group name: {tffData.at(0)?.commodity_group_name}</p>
          <p>Contract market name: {tffData.at(0)?.contract_market_name}</p>
          <p>Market and exchange names: {tffData.at(0)?.market_and_exchange_names}</p>
        </div>
      </main>
    </>
  );
}

function buildFinancialFuturesCategoryTree(contracts: CommodityContractKind[]): Map<CategoryName, CommodityContractKind[]> {
  let dst = new Map<CategoryName, CommodityContractKind[]>();
  for (const entry of contracts) {
    let categoryName: CategoryName = entry.commoditySubgroupName!;
    if (categoryName === 'STOCK INDICES') {
      // special handling for stock indices:
      // categorize them with a more granular category label (e.g., "S&P Sectors") which is given as 'commodity'
      categoryName = entry.commodityName!;
    }
    let foundSubgroups: CommodityContractKind[] | undefined;
    if ((foundSubgroups = dst.get(categoryName)) != null) {
      if (foundSubgroups.findIndex((x: CommodityContractKind) => x.cftcContractMarketCode === entry.cftcContractMarketCode) === -1) {
        dst.set(categoryName, [...foundSubgroups, entry]);
      }
    } else {
      dst.set(categoryName, [entry]);
    }
  }
  return dst;
}