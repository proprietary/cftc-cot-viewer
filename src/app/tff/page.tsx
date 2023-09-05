'use client';

import React, { useCallback } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { TitleComponent, GridComponent, LegendComponent, TooltipComponent, ToolboxComponent, DataZoomComponent } from 'echarts/components';
import { BarChart } from 'echarts/charts';
import { SVGRenderer, CanvasRenderer } from 'echarts/renderers';
import { rollingZscore } from '@/util';
import { useRouter } from 'next/navigation';
import { useSearchParams, usePathname } from 'next/navigation';

async function fetchTffData() {
  // curl -X GET -L -o tff.json 'https://publicreporting.cftc.gov/resource/gpe5-46if.json?$limit=100000'
  let r = await fetch('/tff.json');
  return await r.json();
}

echarts.use([TitleComponent, TooltipComponent, ToolboxComponent, DataZoomComponent, LegendComponent, GridComponent, BarChart, SVGRenderer, CanvasRenderer]);

function TradersInFinancialFutures({ tffData, filterFn, shouldZscore, commodityNameSelected }: { tffData: any, filterFn: any, shouldZscore: boolean, commodityNameSelected: string }) {
  const byContractName = tffData.filter(filterFn).sort(((a: any, b: any) => {
    const a_ = new Date(a['report_date_as_yyyy_mm_dd']);
    const b_ = new Date(b['report_date_as_yyyy_mm_dd']);
    return a_.getTime() - b_.getTime();
  }));
  let dealersBars = byContractName
    .map((x: any) => (x['dealer_positions_long_all'] - x['dealer_positions_short_all']));
  let assetMgrsBars = byContractName
    .map((x: any) => x['asset_mgr_positions_long'] - x['asset_mgr_positions_short']);
  let levFundsBars = byContractName.map((x: any) => x['lev_money_positions_long'] - x['lev_money_positions_short']);
  let otherRptBars = byContractName.map((x: any) => x['other_rept_positions_long'] - x['other_rept_positions_short']);
  let nonRptBars = byContractName.map((x: any) => x['nonrept_positions_long_all'] - x['nonrept_positions_short_all']);
  if (shouldZscore === true && tffData.length > 0) {
    dealersBars = rollingZscore(dealersBars, 504);
    nonRptBars = rollingZscore(nonRptBars, 504);
    assetMgrsBars = rollingZscore(assetMgrsBars, 504);
    levFundsBars = rollingZscore(levFundsBars, 504);
    otherRptBars = rollingZscore(otherRptBars, 504);
  }
  const dates = byContractName.map((x: any) => new Date(x['report_date_as_yyyy_mm_dd']).toLocaleDateString());
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
      showLoading={byContractName.length === 0}
      option={option}
      theme={'dark'}
      style={{ height: '1000px', width: '90vw' }} />
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

  const [tffData, setTffData] = React.useState<any>([]);
  const [categoryTree, setCategoryTree] = React.useState<Array<any>>([]);
  const [commoditySelected, setCommoditySelected] = React.useState<string>(cftcCodeQueryParam ?? '');

  React.useEffect(() => {
    (async () => {
      const d = await fetchTffData();
      setTffData(d);
    })();
  }, []);
  React.useEffect(() => {
    if (tffData.length > 0) {
      const ct = buildCommodityCategoryTree(tffData);
      setCategoryTree(ct);
      if (commoditySelected === '') {
        setCommoditySelected(ct[0][1][0].cftcContractMarketCode);
      }
    }
  }, [tffData]);
  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-between p-10">
        <h2>Traders in Financial Futures</h2>
        <select title="Futures Contract" className="text-slate-50 bg-slate-900 p-2 m-2 rounded-md text-lg w-3/4"
          value={commoditySelected}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
             setCommoditySelected(e.target.value);
             router.push(pathname + "?" + createQueryString('cftcCode', e.target.value));
             }}>
          {categoryTree.map(([commodityCategory, commodityContracts]: [string, CommodityContract[]], idx: number) => (
            <optgroup key={idx} label={commodityCategory}>
              {commodityContracts.map((commod: CommodityContract, jdx: number) => (
                <option key={jdx} value={commod.cftcContractMarketCode}>{commod.contractMarketName}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <TradersInFinancialFutures
        filterFn={(x: any) => x['cftc_contract_market_code'] === commoditySelected}
        shouldZscore={false} tffData={tffData} commodityNameSelected={commoditySelected} />
      </main>
    </>
  );
}

enum CFTCReportType {
  Financial,
  Disaggregated,
  Legacy,
};

class CommodityContract {
  cftcReportType: CFTCReportType;
  contractMarketName: string;
  commodityName: string;
  commoditySubgroupName: string;
  cftcContractMarketCode: string;

  constructor({ commodityName, contractMarketName, commoditySubgroupName, cftcContractMarketCode, cftcReportType }: any) {
    this.commodityName = commodityName;
    this.commoditySubgroupName = commoditySubgroupName;
    this.cftcContractMarketCode = cftcContractMarketCode;
    this.cftcReportType = cftcReportType;
    this.contractMarketName = contractMarketName;
  }

  static fromSocrataApiJson(payload: any): CommodityContract {
    let commoditySubgroupName = payload['commodity_subgroup_name'];
    if (commoditySubgroupName === 'STOCK INDICES') {
      // special handling for stock indices:
      // divide them according to their more specific category labels
      commoditySubgroupName = payload['commodity'];
    }
    return new CommodityContract({
      cftcReportType: payload['commodity_group_name'] === 'FINANCIAL INSTRUMENTS' ? CFTCReportType.Financial : CFTCReportType.Disaggregated,
      contractMarketName: payload['contract_market_name'],
      cftcContractMarketCode: payload['cftc_contract_market_code'],
      commodityName: payload['commodity_name'],
      commoditySubgroupName,
    });
  }

  public equals(other: CommodityContract): boolean {
    return other.cftcContractMarketCode === this.cftcContractMarketCode;
  }

  public get categoryName(): string {
    return this.commoditySubgroupName;
  }
}

function buildCommodityCategoryTree(data: any): any {
  let tbl = new Map<string, CommodityContract[]>();
  for (const entry of data) {
    let commod = CommodityContract.fromSocrataApiJson(entry);
    let foundSubgroups: CommodityContract[] | undefined;
    if ((foundSubgroups = tbl.get(commod.categoryName)) != null) {
      if (foundSubgroups.findIndex((x: CommodityContract) => commod.equals(x)) === -1) {
        tbl.set(commod.categoryName, [...foundSubgroups, commod]);
      }
    } else {
      tbl.set(commod.categoryName, [commod]);
    }
  }
  return Array.from(tbl.entries());
}

// TODO(zds): Filter out garbage from TFF data dump like 2008 Russell