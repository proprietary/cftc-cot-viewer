'use client';

import React from 'react';
import * as echarts from 'echarts/core';
import EChartsReactCore from 'echarts-for-react/lib/core';
import type { LineSeriesOption } from 'echarts/charts';
import { LineChart, } from 'echarts/charts';
import type { TooltipComponentOption, TitleComponentOption, LegendComponentOption, DataZoomComponentOption, GridComponentOption, DatasetComponentOption, ToolboxComponentOption } from 'echarts/components';
import { DataZoomComponent, DataZoomSliderComponent, DatasetComponent, LegendComponent, TitleComponent, ToolboxComponent, TooltipComponent } from 'echarts/components';
import { LHAssert, SCREEN_LARGE, SCREEN_SMALL, formatDateYYYYMMDD, useViewportDimensions } from './util';
import { IFinancialFuturesCOTReport, IAnyCOTReportType, IDisaggregatedFuturesCOTReport, ILegacyFuturesCOTReport } from './socrata_cot_report';

echarts.use([TitleComponent, LineChart, DatasetComponent, TooltipComponent, LegendComponent, DataZoomComponent, DataZoomSliderComponent, ToolboxComponent]);

export interface IDataFrameColumns {
    column: keyof IFinancialFuturesCOTReport | keyof IDisaggregatedFuturesCOTReport | keyof ILegacyFuturesCOTReport,
    name: string,
}

type ECOption = echarts.ComposeOption<
    LineSeriesOption |
    TitleComponentOption |
    TooltipComponentOption |
    DataZoomComponentOption |
    ToolboxComponentOption |
    GridComponentOption
>;

export default function LongShortOIChart(
    {
        longCols,
        shortCols,
        data
    }: {
        data: IAnyCOTReportType[],
        longCols: IDataFrameColumns[],
        shortCols: IDataFrameColumns[],
    }
)
    {
    const generateOptions = (): ECOption => {
        const longSeries: LineSeriesOption[] = longCols.map(({ name, column }) => {
            return {
                type: 'line',
                name,
                encode: {
                    x: 'timestamp',
                    y: column as string,
                },
                smooth: true,
                areaStyle: {},
                stack: 'total_longs',
                lineStyle: {
                    width: 0,
                },
                showSymbol: false,
                emphasis: {
                    focus: 'series',
                },
                xAxisIndex: 0,
                yAxisIndex: 0,
            };
        });
        const shortSeries: LineSeriesOption[] = shortCols.map(({ name, column }) => {
            return {
                type: 'line',
                name,
                encode: {
                    x: 'timestamp',
                    y: column as string,
                },
                smooth: true,
                areaStyle: {},
                stack: 'total_shorts',
                lineStyle: {
                    width: 0,
                },
                showSymbol: false,
                emphasis: {
                    focus: 'series',
                },
                xAxisIndex: 1,
                yAxisIndex: 1,
            };
        });
        return {
            title: {
            },
            tooltip: {
                trigger: 'axis',
                show: true,
                axisPointer: {
                    type: "cross",
                },
            },
            toolbox: {
                show: true,
                feature: {
                    saveAsImage: {},
                },
            },
            legend: {
                show: true,
            },
            grid: [
                {
                    containLabel: true,
                    top: '5%',
                    bottom: '55%',
                },
                {
                    containLabel: true,
                    top: '55%',
                    bottom: '5%',
                },
            ],
            dataset: {
                source: data,
                dimensions: Object.keys(data.at(0) ?? {}),
            },
            dataZoom: [
                {
                    type: 'slider',
                    filterMode: 'filter',
                    start: 100. * Math.max(data.length - defaultDataZoomWeeks, 0) / data.length,
                    xAxisIndex: [0, 1],
                },
            ],
            xAxis: [
                {
                    type: 'time',
                    axisLabel: {
                        formatter: (value: any) => {
                            let d = new Date(value);
                            return formatDateYYYYMMDD(d);
                        }
                    },
                    gridIndex: 0,
                    // data: xAxisData.map(x => formatDateYYYYMMDD(x)),
                },
                {
                    type: 'time',
                    axisLabel: {
                        formatter: (value: any) => {
                            let d = new Date(value);
                            return formatDateYYYYMMDD(d);
                        }
                    },
                    gridIndex: 1,
                    // data: xAxisData.map(x => formatDateYYYYMMDD(x)),
                },
            ],
            yAxis: [
                {
                    type: 'value',
                    gridIndex: 0,
                    scale: true,
                    name: 'Longs',
                    nameTextStyle: {
                        fontSize: 20,
                        fontWeight: 'bold',
                        align: 'left',
                        verticalAlign: 'top',
                    },
                },
                {
                    type: 'value',
                    gridIndex: 1,
                    scale: true,
                    name: 'Shorts',
                    nameTextStyle: {
                        fontSize: 20,
                        fontWeight: 'bold',
                        align: 'left',
                        verticalAlign: 'top',
                    },
                },
            ],
            series: [...longSeries, ...shortSeries],
        };
    }

    // compute breakpoints for the ECharts instance; making it responsive
    const viewportDimensions = useViewportDimensions();
    let { height: eChartsHeight, width: eChartsWidth } = viewportDimensions;
    if (viewportDimensions.width >= SCREEN_SMALL) {
        eChartsWidth = viewportDimensions.width * 0.99;
        eChartsHeight = viewportDimensions.height * 0.99;
    }
    if (viewportDimensions.width >= SCREEN_LARGE) {
        eChartsWidth = viewportDimensions.width * 0.8;
        eChartsHeight = viewportDimensions.height * 0.8;
    }

    return (
        <div className="my-5">
            <div className="w-full">
                <EChartsReactCore
                    echarts={echarts}
                    theme={"dark"}
                    option={generateOptions()}
                    style={{
                        height: eChartsHeight,
                        width: eChartsWidth,
                    }}
                />
            </div>
        </div>
    )
}

const defaultDataZoomWeeks = 20;