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

  const [loading, setLoading] = React.useState<boolean>(false);
  const [cftcApi, setCftcApi] = React.useState<CachingCFTCApi>();
  const [tffData, setTffData] = React.useState<Array<IFinancialFuturesCOTReport>>([]);
  const [futuresContracts, setFuturesContracts] = React.useState<CommodityContractKind[]>([]);
  const [commoditySelected, setCommoditySelected] = React.useState<string>(cftcCodeQueryParam ?? '');

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
        <StandardizedCotOscillator
          columns={{
            'Dealers': { data: tffData.map(x => x.dealer_positions_long_all - x.dealer_positions_short_all) },
            'Asset Managers': { data: tffData.map(x => x.asset_mgr_positions_long - x.asset_mgr_positions_short) },
            'Leveraged Funds': { data: tffData.map(x => x.lev_money_positions_long - x.lev_money_positions_short) },
            'Other Reportables': { data: tffData.map(x => x.other_rept_positions_long - x.other_rept_positions_short) },
            'Non-Reportables': { data: tffData.map(x => x.nonrept_positions_long_all - x.nonrept_positions_short_all ) },
          }}
          xAxisDates={tffData.map(x => new Date(x.timestamp))}
          title={tffData.at(0)?.contract_market_name}
          loading={loading}
        />
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