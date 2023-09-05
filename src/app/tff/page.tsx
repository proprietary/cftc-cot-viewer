'use client';

import React from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { TitleComponent, GridComponent, LegendComponent, TooltipComponent, ToolboxComponent, DataZoomComponent } from 'echarts/components';
import { BarChart } from 'echarts/charts';
import { SVGRenderer, CanvasRenderer } from 'echarts/renderers';
import { rollingZscore } from '@/util';

async function fetchTffData() {
  // curl -X GET -L -o tff.json 'https://publicreporting.cftc.gov/resource/gpe5-46if.json?$limit=100000'
  let r = await fetch('/tff.json');
  return await r.json();
}

echarts.use([TitleComponent, TooltipComponent, ToolboxComponent, DataZoomComponent, LegendComponent, GridComponent, BarChart, SVGRenderer, CanvasRenderer]);

function TradersInFinancialFutures({ tffData, shouldZscore, commodityNameSelected }: { tffData: any, shouldZscore: boolean, commodityNameSelected: string }) {
  const byContractName = tffData.filter((row: any) => row['contract_market_name'] === commodityNameSelected).sort(((a: any, b: any) => {
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
    tooltip: {},
    legend: {},
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
  const [tffData, setTffData] = React.useState<any>([]);
  const [categoryTree, setCategoryTree] = React.useState<Array<any>>([]);
  const [commoditySelected, setCommoditySelected] = React.useState<string>("");
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
      setCommoditySelected(ct[0][1][0]);
    }
  }, [tffData]);
  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-between p-10">
        <h2>Traders in Financial Futures</h2>
        <select title="Futures Contract" className="text-slate-50 bg-slate-900 p-2 m-2 rounded-md"
          value={commoditySelected}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setCommoditySelected(e.target.value); }}>
          {categoryTree.map(([commoditySubgroupName, commodityNames]: [string, string[]], idx: number) => (
            <optgroup key={idx} label={commoditySubgroupName}>
              {commodityNames.map((commodityName: string, jdx: number) => (
                <option key={jdx}>{commodityName}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <TradersInFinancialFutures shouldZscore={false} tffData={tffData} commodityNameSelected={commoditySelected} />
      </main>
    </>
  );
}

function buildCommodityCategoryTree(data: any): any {
  let tbl = new Map<string, string[]>();
  for (const entry of data) {
    let commoditySubgroupName = entry['commodity_subgroup_name'];
    const commodityName = entry['contract_market_name'];
    // special handling for stock indices:
    // divide them according to their more specific category labels
    if (commoditySubgroupName === 'STOCK INDICES') {
      commoditySubgroupName = entry['commodity'];
    }
    let subgroups: string[] | undefined;
    if ((subgroups = tbl.get(commoditySubgroupName)) != null) {
      if (subgroups.findIndex((x: string) => x === commodityName) === -1) {
        tbl.set(commoditySubgroupName, [...subgroups, commodityName]);
      }
    } else {
      tbl.set(commoditySubgroupName, [commodityName]);
    }
  }
  return Array.from(tbl.entries());
}