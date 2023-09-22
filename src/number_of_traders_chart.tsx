'use client';

import React from 'react';
import * as echarts from 'echarts/core';
import EChartsReactCore from 'echarts-for-react/lib/core';
import { BarChart, type BarSeriesOption } from 'echarts/charts';
import type { TooltipComponentOption, TitleComponentOption, LegendComponentOption, GridComponentOption, ToolboxComponentOption, DataZoomComponentOption } from 'echarts/components';
import { TitleComponent, LegendComponent, TooltipComponent, DataZoomComponent } from 'echarts/components';
import { SCREEN_LARGE, SCREEN_SMALL, formatDateYYYYMMDD, useViewportDimensions } from './util';
import { IAnyCOTReportType, IDisaggregatedFuturesCOTReport, IFinancialFuturesCOTReport, ILegacyFuturesCOTReport } from './socrata_cot_report';
import useLargeChartDimensions from './large_chart_dims_hook';

echarts.use([BarChart, TitleComponent, LegendComponent, DataZoomComponent, TooltipComponent, TooltipComponent])

export interface INumberOfTradersColumn {
    name: string,
    n_traders_long: keyof IFinancialFuturesCOTReport, // | keyof IDisaggregatedFuturesCOTReport | keyof ILegacyFuturesCOTReport,
    n_traders_short: keyof IFinancialFuturesCOTReport, // | keyof IDisaggregatedFuturesCOTReport | keyof ILegacyFuturesCOTReport,
}

// type Rpt = {
//     [k in keyof IFinancialFuturesCOTReport]: string | number;
//     //[k in keyof IFinancialFuturesCOTReport | keyof IDisaggregatedFuturesCOTReport | keyof ILegacyFuturesCOTReport]: string | number;
// }
type Rpt = IFinancialFuturesCOTReport;

interface FlattenedSelectedCols {
    [traderCategoryName: string]: {
        n_traders_long: Array<string | number>[],
        n_traders_short: Array<string | number>[],
    },
};

/// select data from large reports array all in one shot
function flattenColumnsFromReports(cols: readonly INumberOfTradersColumn[], reports: readonly Rpt[]): FlattenedSelectedCols {
    let selectedData: FlattenedSelectedCols = cols.reduce((colData: FlattenedSelectedCols, col: INumberOfTradersColumn) => {
        colData[col.name] = {
            n_traders_long: [],
            n_traders_short: [],
        };
        return colData;
    }, {});
    for (let i = 0; i < reports.length; ++i) {
        for (let j = 0; j < cols.length; ++j) {
            const col = cols[j];
            selectedData[col.name].n_traders_long.push([
                formatDateYYYYMMDD(new Date(reports[i].timestamp)),
                reports[i][col.n_traders_long] as number,
            ]);
            selectedData[col.name].n_traders_short.push([
                formatDateYYYYMMDD(new Date(reports[i].timestamp)),
                -1 * (reports[i][col.n_traders_short] as number),
            ]);
        }
    }
    return selectedData;
}

export default function NumberOfTradersChart(
    {
        reports,
        cols,
        loading = false,
    }: {
        reports: Array<Rpt>,
        cols: INumberOfTradersColumn[],
        loading?: boolean,
    }
) {
    type ECOption = echarts.ComposeOption<LegendComponentOption | BarSeriesOption | GridComponentOption | ToolboxComponentOption | TooltipComponentOption | DataZoomComponentOption>;
    const genSeries = React.useCallback((): BarSeriesOption[] => {
        const selectedData = flattenColumnsFromReports(cols, reports);
        let dst: BarSeriesOption[] = [];
        for (const col of cols) {
            dst.push({
                type: 'bar',
                name: `${col.name} Traders Long`,
                stack: col.name,
                data: selectedData[col.name].n_traders_long,
            });
            dst.push({
                type: 'bar',
                name: `${col.name} Traders Short`,
                stack: col.name,
                data: selectedData[col.name].n_traders_short,
            });
        }
        return dst;
    }, [reports, cols])
    const defaultWeeksShow = 10;
    const genOpt = React.useCallback((): ECOption => {
        return {
            toolbox: {
                show: true,
                feature: {
                    saveAsImage: {},
                },
            },
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                    return `
                    <div>${params.value[0]}</div>
                    <div>
                    <div style="background-color:${params.color}; width: 20px; height: 10px; border-radius: 5px; padding: 0 10px 0 10px; margin-right: 5px; display: inline;"></div>
                    ${params.seriesName}: ${Math.abs(params.value[1])}
                    </div>`;
                }
            },
            legend: {
                show: true,
            },
            dataZoom: {
                show: true,
                type: 'slider',
                start: reports.length > 0 ? (100. * Math.max(0, reports.length - defaultWeeksShow) / reports.length) : 100,
            },
            xAxis: [{
                type: 'category',
            }],
            yAxis: [
                {
                    type: 'value',
                },
            ],
            series: genSeries(),
        };
    }, [reports]);
    const {eChartsWidth, eChartsHeight} = useLargeChartDimensions();
    return (
        <div className="my-2">
            <EChartsReactCore
                echarts={echarts}
                showLoading={loading || reports.length === 0}
                theme={'dark'}
                option={genOpt()}
                style={{
                    width: eChartsWidth,
                    height: eChartsHeight,
                }}
            />
        </div>
    )
}