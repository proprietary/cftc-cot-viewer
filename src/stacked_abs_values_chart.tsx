'use client'

import React from 'react'
import * as echarts from 'echarts/core'
import EChartsReactCore from 'echarts-for-react/lib/core'
import type { LineSeriesOption } from 'echarts/charts'
import { LineChart } from 'echarts/charts'
import type {
    TooltipComponentOption,
    TitleComponentOption,
    LegendComponentOption,
    DataZoomComponentOption,
    GridComponentOption,
    DatasetComponentOption,
    ToolboxComponentOption,
} from 'echarts/components'
import {
    DataZoomComponent,
    DataZoomSliderComponent,
    DatasetComponent,
    LegendComponent,
    TitleComponent,
    ToolboxComponent,
    TooltipComponent,
} from 'echarts/components'
import {
    LHAssert,
    SCREEN_LARGE,
    SCREEN_SMALL,
    formatDateYYYYMMDD,
} from './util'
import useLargeChartDimensions, {
    useViewportDimensions,
} from './large_chart_dims_hook'
import {
    IFinancialFuturesCOTReport,
    IAnyCOTReportType,
    IDisaggregatedFuturesCOTReport,
    ILegacyFuturesCOTReport,
} from './socrata_cot_report'

echarts.use([
    TitleComponent,
    LineChart,
    DatasetComponent,
    TooltipComponent,
    LegendComponent,
    DataZoomComponent,
    DataZoomSliderComponent,
    ToolboxComponent,
])

export interface IDataFrameColumns {
    column:
        | keyof IFinancialFuturesCOTReport
        | keyof IDisaggregatedFuturesCOTReport
        | keyof ILegacyFuturesCOTReport
    name: string
}

type ECOption = echarts.ComposeOption<
    | LineSeriesOption
    | TitleComponentOption
    | TooltipComponentOption
    | DataZoomComponentOption
    | ToolboxComponentOption
    | GridComponentOption
>

export default function StackedAbsValuesChart({
    cols,
    data,
}: {
    data: IAnyCOTReportType[]
    cols: IDataFrameColumns[]
}) {
    const generateOptions = (): ECOption => {
        const series: LineSeriesOption[] = cols.map(({ name, column }) => {
            return {
                type: 'line',
                name,
                encode: {
                    x: 'timestamp',
                    y: column as string,
                },
                smooth: true,
                areaStyle: {},
                stack: 'Total',
                lineStyle: {
                    width: 0,
                },
                showSymbol: false,
                emphasis: {
                    focus: 'series',
                },
            }
        })
        return {
            title: {},
            tooltip: {
                trigger: 'axis',
                show: true,
                axisPointer: {
                    type: 'cross',
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
            grid: {
                containLabel: true,
            },
            dataset: {
                source: data,
                dimensions: Object.keys(data.at(0) ?? {}),
            },
            dataZoom: [
                {
                    id: 'cot-abs-vals-stacked-area-chart',
                    type: 'slider',
                    filterMode: 'filter',
                    start: 80,
                },
            ],
            xAxis: [
                {
                    type: 'time',
                    axisLabel: {
                        formatter: (value: any) => {
                            let d = new Date(value)
                            return formatDateYYYYMMDD(d)
                        },
                    },
                    // data: xAxisData.map(x => formatDateYYYYMMDD(x)),
                },
            ],
            yAxis: [
                {
                    type: 'value',
                },
            ],
            series,
        }
    }

    // compute breakpoints for the ECharts instance; making it responsive
    const { eChartsWidth, eChartsHeight } = useLargeChartDimensions()

    return (
        <div className="my-5">
            <div className="w-full">
                <EChartsReactCore
                    echarts={echarts}
                    theme={'dark'}
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
