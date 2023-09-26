'use client';

// Chart showing the N-weekly changes in commitments (OI) for each trader category

import React from 'react';
import * as echarts from 'echarts/core';
import type { BarSeriesOption } from 'echarts/charts';
import { BarChart } from 'echarts/charts';
import type { DatasetComponentOption, TitleComponentOption, LegendComponentOption, DataZoomComponentOption, TooltipComponentOption, ToolboxComponentOption, GraphicComponentOption } from 'echarts/components';
import { TitleComponent, LegendComponent, DatasetComponent, GridComponent, TooltipComponent, GridComponentOption, ToolboxComponent, DataZoomComponent, GraphicComponent, } from 'echarts/components';
import { IAnyCOTReportType, IDisaggregatedFuturesCOTReport, IFinancialFuturesCOTReport, ILegacyFuturesCOTReport } from './socrata_cot_report';
import { SCREEN_LARGE, SCREEN_SMALL, formatDateYYYYMMDD } from './util';
import useLargeChartDimensions, { useViewportDimensions } from './large_chart_dims_hook';
import EChartsReactCore from 'echarts-for-react/lib/core';

echarts.use([BarChart, TitleComponent, GraphicComponent, LegendComponent, DataZoomComponent, DatasetComponent, GridComponent]);

export interface IDataFrameColumns {
    column: keyof IFinancialFuturesCOTReport,
    longs: keyof IFinancialFuturesCOTReport,
    shorts: keyof IFinancialFuturesCOTReport,
    name: string,
}

const DEFAULT_N_WEEKS_DELTA = 5;

enum PositioningAggregationMethod {
    Net = 'Net',
    Longs = 'Longs',
    Shorts = 'Shorts',
}

export default function CommitmentChangesChart({
    dataFrame,
    cols,
}: {
    dataFrame: Array<IFinancialFuturesCOTReport>,
    cols: IDataFrameColumns[],
}) {
    type ECOption = echarts.ComposeOption<BarSeriesOption | TitleComponentOption | GraphicComponentOption | GridComponentOption | LegendComponentOption | ToolboxComponentOption | DataZoomComponentOption | TooltipComponentOption>;
    const echartsRef = React.useRef<EChartsReactCore | null>(null);
    const [nWeeksDelta, setNWeeksDelta] = React.useState<number>(DEFAULT_N_WEEKS_DELTA);
    const [posnMethod, setPosnMethod] = React.useState<PositioningAggregationMethod>(PositioningAggregationMethod.Net);

    const genSeries = React.useCallback((): BarSeriesOption[] => {
        return cols.map(({ longs, shorts, name }, colIdx) => {
            let data: [number, number][] = [];
            for (let i = nWeeksDelta; i < dataFrame.length; ++i) {
                let thisRow = dataFrame[i];
                let prevRow = dataFrame[i - nWeeksDelta];
                switch (posnMethod) {
                    case PositioningAggregationMethod.Net: {
                        data.push([
                            thisRow.timestamp,
                            ((thisRow[longs] as number) - (thisRow[shorts] as number)) - ((prevRow[longs] as number) - (prevRow[shorts] as number)),
                        ]);
                        break;
                    }
                    case PositioningAggregationMethod.Longs: {
                        data.push([
                            thisRow.timestamp,
                            (thisRow[longs] as number) - (prevRow[longs] as number),
                        ]);
                        break;
                    }
                    case PositioningAggregationMethod.Shorts: {
                        data.push([
                            thisRow.timestamp,
                            (thisRow[shorts] as number) - (prevRow[shorts] as number),
                        ]);
                        break;
                    }
                }
            }
            return {
                type: 'bar',
                name,
                data,
                xAxisIndex: colIdx,
                yAxisIndex: colIdx,
            };
        });
    }, [cols, dataFrame, nWeeksDelta, posnMethod]);

    const genOpt = React.useCallback((): ECOption => {
        return {
            toolbox: {
                show: true,
                feature: {
                    saveAsImage: {},
                },
            },
            title: {
                show: true,
                text: dataFrame.length > 0 ? dataFrame.at(0)!.contract_market_name : '',
                textStyle: {
                    fontSize: 10,
                },
            },
            tooltip: {
                trigger: 'axis',
            },
            legend: {
                show: false,
            },
            dataZoom: {
                show: true,
                type: 'slider',
                filterMode: 'filter',
                start: 80,
                xAxisIndex: cols.map((_, idx) => idx),
            },
            grid: cols.map((_, idx, arr) => ({
                left: '2%',
                top: `${idx * (95 / arr.length) + 5}%`,
                right: '2%',
                // bottom: 'auto',
                height: `${(80 / arr.length)}%`,
                containLabel: true,
            })),
            xAxis: cols.map((_, idx) => ({
                type: 'time',
                axisLabel: {
                    formatter: (value: any) => formatDateYYYYMMDD(new Date(value)),
                },
                gridIndex: idx,
            })),
            yAxis: cols.map(({ name }, idx) => ({
                type: 'value',
                gridIndex: idx,
                name,
                nameTextStyle: {
                    fontSize: 15,
                    align: 'left',
                    verticalAlign: 'top',
                    padding: [0, 0, 5, 0],
                }
            })),
            series: genSeries(),
        };
    }, []);

    React.useEffect(() => {
        echartsRef.current?.getEchartsInstance().setOption({
            series: genSeries(),
        });
    }, [cols, dataFrame, nWeeksDelta, posnMethod]);

    // compute breakpoints for the ECharts instance; making it responsive
    const { eChartsHeight, eChartsWidth } = useLargeChartDimensions();

    const handleOptionChange = React.useCallback((ev: React.ChangeEvent<HTMLInputElement>) => {
        setPosnMethod(ev.target.value as PositioningAggregationMethod);
    }, []);

    const echartsOptionRef = React.useRef<ECOption>(genOpt());

    const optTypes = [PositioningAggregationMethod.Net, PositioningAggregationMethod.Longs, PositioningAggregationMethod.Shorts];
    return (
        <div className="my-2">
            <div className="flex items-center">
                <label className="w-full flex flex-col">
                    <div>
                        Change in position vs. <strong>{nWeeksDelta}</strong> weeks ago:
                        <strong className="pl-2">{nWeeksDelta} Δ</strong>
                    </div>
                    <input className="py-3" type="range" min={1} max={50} step={1} value={nWeeksDelta} onChange={(ev) => { setNWeeksDelta(parseInt(ev.target.value)); }} />
                </label>
            </div>
            <div className="flex items-center">
                {optTypes.map((option, idx) => {
                    return (
                        <label className="inline-flex items-center space-x-2 cursor-pointer px-3" key={idx}>
                            <input
                                type="radio"
                                name="radioGroup"
                                value={option}
                                checked={posnMethod === option}
                                onChange={handleOptionChange}
                                className="form-radio h-4 w-4" />
                            <span>{option}</span>
                        </label>
                    );
                })}
            </div>
            <div className="my-1">
                <EChartsReactCore
                    echarts={echarts}
                    ref={ref => { echartsRef.current = ref; }}
                    option={echartsOptionRef.current}
                    theme={"dark"}
                    style={{
                        height: eChartsHeight,
                        width: eChartsWidth,
                    }}
                />
            </div>
        </div>
    );
}

function applyDelta(series: readonly number[], nDelta: number): number[] {
    let series_ = [...series.slice(nDelta)];
    for (let i = 0; i < series_.length; ++i) {
        series_[i] = series_[i] - series_[i - nDelta];
    }
    return series_;
}