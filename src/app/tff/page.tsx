'use client';

import React, { useCallback } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { TitleComponent, GridComponent, LegendComponent, TooltipComponent, ToolboxComponent, DataZoomComponent } from 'echarts/components';
import { BarChart, LineChart } from 'echarts/charts';
import { SVGRenderer, CanvasRenderer } from 'echarts/renderers';
import { useRouter } from 'next/navigation';
import { useSearchParams, usePathname } from 'next/navigation';
import { CachingCFTCApi, ContractListRequest, CFTCReportType, CommodityContractKind } from '@/cftc_api';
import { IFinancialFuturesCOTReport } from '@/socrata_cot_report';
import { rollingZscore } from '@/chart_math';

echarts.use([TitleComponent, LineChart, TooltipComponent, ToolboxComponent, DataZoomComponent, LegendComponent, GridComponent, BarChart, SVGRenderer, CanvasRenderer]);

type CategoryName = string;

function TradersInFinancialFutures({ reports, loading }: { reports: IFinancialFuturesCOTReport[], loading: boolean }) {
  let dealersBars = reports
    .map((x: IFinancialFuturesCOTReport) => (x.dealer_positions_long_all - x.dealer_positions_short_all));
  let assetMgrsBars = reports
    .map((x: any) => x['asset_mgr_positions_long'] - x['asset_mgr_positions_short']);
  let levFundsBars = reports.map((x: any) => x['lev_money_positions_long'] - x['lev_money_positions_short']);
  let otherRptBars = reports.map((x: any) => x['other_rept_positions_long'] - x['other_rept_positions_short']);
  let nonRptBars = reports.map((x: any) => x['nonrept_positions_long_all'] - x['nonrept_positions_short_all']);
  const dates = reports.map((x: any) => new Date(x['timestamp']).toLocaleDateString());
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
      show: true,
      text: reports != null && reports.length > 0 ? reports[0]['contract_market_name'] : '',
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
      { type: 'value', name: 'Net Contracts', }
    ],
    series: [
      { type: 'bar', data: dealersBars, name: 'Dealers' },
      { type: 'bar', data: assetMgrsBars, name: 'Asset Managers' },
      { type: 'bar', data: levFundsBars, name: 'Leveraged Funds', },
      { type: 'bar', data: otherRptBars, name: 'Other Reportables', },
      { type: 'bar', data: nonRptBars, name: 'Non-Reportables', },
    ]
  };

  return (
    <ReactEChartsCore
      echarts={echarts}
      showLoading={loading || reports.length === 0}
      option={option}
      theme={'dark'}
      style={{ height: '1000px', width: '90vw' }} />
  );
}

function ZscoredLineChart({ reports, loading }: { reports: IFinancialFuturesCOTReport[], loading: boolean }) {
  const [zsLookback, setZsLookback] = React.useState<number>(50);
  let dealers = reports.map(x => (x.dealer_positions_long_all - x.dealer_positions_short_all) / x.open_interest_all);
  let assetMgrs = reports.map(x => (x.asset_mgr_positions_long - x.asset_mgr_positions_short) / x.open_interest_all);
  let levFunds = reports.map(x => (x.lev_money_positions_long - x.lev_money_positions_short) / x.open_interest_all);
  let otherRpts = reports.map(x => (x.other_rept_positions_long - x.other_rept_positions_short) / x.open_interest_all);
  let nonRpts = reports.map(x => (x.nonrept_positions_long_all - x.nonrept_positions_short_all) / x.open_interest_all);
  dealers = rollingZscore(dealers, zsLookback);
  assetMgrs = rollingZscore(assetMgrs, zsLookback);
  levFunds = rollingZscore(levFunds, zsLookback);
  otherRpts = rollingZscore(otherRpts, zsLookback);
  nonRpts = rollingZscore(nonRpts, zsLookback);
  const dates = reports.map(x => new Date(x.timestamp).toLocaleDateString());
  const echartsOption = {
    tooltip: {},
    title: {},
    legend: {},
    grid: {},
    toolbox: {
      show: true,
      feature: {
        dataZoom: {
          show: true,
        },
      }
    },
    dataZoom: [
      {
        type: 'slider',
        filterMode: 'filter',
        //startValue: dates[Math.max(0, dates.length - 50)],
      }
    ],
    xAxis: [
      {
        type: 'category',
        data: dates,
      },
    ],
    yAxis: [
      {
        type: 'value',
        name: 'Net Positioning (z-score)',
      }
    ],
    series: [
      {
        name: 'Dealers',
        type: 'line',
        stack: 'Total',
        data: dealers,
      },
      {
        name: 'Asset Managers',
        type: 'line',
        stack: 'Total',
        data: assetMgrs,
      },
      {
        name: 'Leveraged Funds',
        type: 'line',
        stack: 'Total',
        data: levFunds,
      },
      {
        name: 'Other Reportables',
        type: 'line',
        stack: 'Total',
        data: otherRpts,
      },
      {
        name: 'Non-Reportables',
        type: 'line',
        stack: 'Total',
        data: nonRpts,
      },
    ],
  };
  const handleChangeZsLookback = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const n = parseInt(ev.target.value);
    console.log(n);
    setZsLookback(n);
  };
  return (
    <div className="my-5">
      <div>
        <label>
          Lookback (number of weeks to use to standardize positioning)
          <input type="range" min={5} max={500} value={zsLookback} onChange={handleChangeZsLookback} />
        </label>
      </div>
      <ReactEChartsCore echarts={echarts}
        showLoading={loading || reports.length === 0}
        option={echartsOption}
        theme={"dark"}
        style={{ height: '1000px', width: '90vw' }} />
    </div>
  );
}

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
  }, [setCftcApi, setFuturesContracts, setCommoditySelected]);

  // Retrieve the actual Commitment of Traders reports data.
  React.useEffect(() => {
    (async () => {
      try {
        if (cftcApi == null) {
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
  }, [cftcApi, setTffData, commoditySelected, setLoading]);
  const handleChangeCommoditySelected = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(pathname + "?" + createQueryString("cftcCode", ev.target.value));
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
        <TradersInFinancialFutures reports={tffData} loading={loading} />
        <ZscoredLineChart reports={tffData} loading={false} />
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