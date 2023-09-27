'use client';

import React from 'react';
import * as echarts from 'echarts/core';
import EChartsReactCore from 'echarts-for-react/lib/core';
import { TitleComponent, GridComponent, LegendComponent, TooltipComponent, ToolboxComponent, DataZoomComponent, VisualMapComponent, TimelineComponent } from 'echarts/components';
import type { TitleComponentOption, GridComponentOption, TooltipComponentOption, ToolboxComponentOption, DataZoomComponentOption, AriaComponentOption, } from 'echarts/components';
import type { BarSeriesOption } from 'echarts/charts';
import { BarChart, LineChart } from 'echarts/charts';
import { SVGRenderer, CanvasRenderer } from 'echarts/renderers';
import { IDisaggregatedFuturesCOTReport, IFinancialFuturesCOTReport, ILegacyFuturesCOTReport, ITraderCategory } from '@/socrata_cot_report';
import { rollingMinMaxScaler, rollingMinMaxScalerOptimized, rollingQuantileNormalization, rollingRobustScaler, rollingZscore } from '@/lib/chart_math';
import { SCREEN_LARGE, SCREEN_MEDIUM, SCREEN_SMALL, usePrevious } from '@/util';
import { useViewportDimensions } from '@/large_chart_dims_hook';
import { PriceBar } from '@/common_types';
import useLargeChartDimensions from '@/large_chart_dims_hook';

echarts.use([TitleComponent, LineChart, VisualMapComponent, TimelineComponent, TooltipComponent, ToolboxComponent, DataZoomComponent, LegendComponent, GridComponent, BarChart, SVGRenderer, CanvasRenderer]);

const defaultWeeksZoom = 50; // default number of weeks the zoom slider should have in width

interface ITraderCategoryColumn {
    [name: string]: {
        data: number[],
        normalizingDivisor?: number,
    },
};

function extractRawNetPositioning<RptType extends IFinancialFuturesCOTReport | IDisaggregatedFuturesCOTReport | ILegacyFuturesCOTReport>
    (reports: readonly RptType[], traderCategories: ITraderCategory<RptType>[]): ITraderCategoryColumn {
    let dst: ITraderCategoryColumn = {};
    for (const traderCategory of traderCategories) {
        dst[traderCategory.shortName] = {
            data: reports.map((r) => {
                const longs = r[traderCategory.keyNames.longPositions];
                const shorts = r[traderCategory.keyNames.shortPositions];
                return (longs as number) - (shorts as number);
            }),
        };
    }
    return dst;
}

function extractZscoredPositioning<RptType extends IFinancialFuturesCOTReport | IDisaggregatedFuturesCOTReport | ILegacyFuturesCOTReport>
    (reports: readonly RptType[], traderCategories: ITraderCategory<RptType>[], zscoreLookback: number): ITraderCategoryColumn {
    let dst: ITraderCategoryColumn = {};
    for (const traderCategory of traderCategories) {
        let data = reports.map((r) => {
            const longs = r[traderCategory.keyNames.longPositions];
            const shorts = r[traderCategory.keyNames.shortPositions];
            const totalOpenInt = r.open_interest_all;
            return ((longs as number) - (shorts as number)) / totalOpenInt;
        });
        data = rollingZscore(data, zscoreLookback);
        dst[traderCategory.shortName] = {
            data,
        };
    }
    return dst;
}

export interface IPlottedColumn {
    name: string,
    data: number[],
}

const defaultLookback = 50;

enum NormalizationMethod {
    None = 'none',
    StandardZscore = 'zscore',
    RobustScaler = 'robust-scaler',
    MinMaxScaler = 'min-max-scaler',
    QuantileTransformer = 'quantile-transformer',
};

const tooltipFormatters: Record<NormalizationMethod, (value: string | number) => string> = {
    [NormalizationMethod.None]: (value) => value.toString(),
    [NormalizationMethod.StandardZscore]: (value: string | number): string => {
        let n = value;
        if (typeof value !== 'number') {
            n = parseFloat(value);
        }
        return `${(n as number).toFixed(5)}σ`
    },
    [NormalizationMethod.RobustScaler]: (value) => value.toString(),
    [NormalizationMethod.MinMaxScaler]: (value) => value.toString(),
    [NormalizationMethod.QuantileTransformer]: (value: string | number) => {
        let n = value;
        if (typeof value !== 'number') {
            n = parseFloat(value);
        }
        return `${(100 * (n as number)).toFixed(0)}%`;
    },
};

const yAxisLabels: Record<NormalizationMethod, (label: string) => string> = {
    [NormalizationMethod.StandardZscore]: (label) => `${label} - σ (standard deviations)`,
    [NormalizationMethod.QuantileTransformer]: (label) => `${label} - %iles`,
    [NormalizationMethod.RobustScaler]: label => `${label} - normalized`,
    [NormalizationMethod.MinMaxScaler]: label => `${label} - %iles`,
    [NormalizationMethod.None]: label => label,
}

type ECOption = echarts.ComposeOption<BarSeriesOption | DataZoomComponentOption | AriaComponentOption | GridComponentOption | TitleComponentOption | ToolboxComponentOption | TooltipComponentOption>;

export default function StandardizedCotOscillator(
    {
        xAxisDates,
        plottedColumns,
        title = '',
        yAxisLabel = '',
        loading = false,
        priceData,
    }: {
        xAxisDates: readonly string[],
        plottedColumns: readonly IPlottedColumn[],
        title?: string,
        loading?: boolean,
        yAxisLabel?: string,
        priceData?: readonly PriceBar[],
    },
) {
    const echartsRef = React.useRef<EChartsReactCore | null>(null);

    // compute breakpoints for the ECharts instance; making it responsive
    let { eChartsWidth, eChartsHeight } = useLargeChartDimensions();

    let legendSelected = React.useRef<{ [name: string]: boolean } | null>(null);
    let rememberedDataZoom = React.useRef<[number, number] | null>(null);
    const [normalizationMethod, setNormalizationMethod] = React.useState<NormalizationMethod>(NormalizationMethod.RobustScaler);
    const [lookback, setLookback] = React.useState<number>(defaultLookback);

    const computeSeries = React.useCallback((): BarSeriesOption[] => {
        let series: any = [];
        for (const column of plottedColumns) {
            let data: number[] = [];
            switch (normalizationMethod) {
                case NormalizationMethod.None:
                    data = column.data;
                    break;
                case NormalizationMethod.RobustScaler:
                    data = rollingRobustScaler(column.data, lookback);
                    break;
                case NormalizationMethod.StandardZscore:
                    data = rollingZscore(column.data, lookback);
                    break;
                case NormalizationMethod.MinMaxScaler:
                    data = rollingMinMaxScalerOptimized(column.data, lookback);
                    break;
                case NormalizationMethod.QuantileTransformer:
                    data = rollingQuantileNormalization(column.data, lookback);
                    break;
                default:
                    throw new Error('unknown normalization method; this should be unreachable');
            }
            series.push({
                id: column.name,
                name: column.name,
                data,
                type: 'bar',
                // barGap: '0%',
                // barCategoryGap: '0%',
                tooltip: {
                    valueFormatter: tooltipFormatters[normalizationMethod],
                }
            });
        }
        return series;
    }, [plottedColumns, lookback, normalizationMethod]);

    const genEchartsOption = React.useMemo((): ECOption => {
        let dst: ECOption = {
            aria: {
                enabled: true,
            },
            tooltip: {
                show: true,
                trigger: 'axis',
            },
            legend: {
                padding: 5,
            },
            grid: {
                containLabel: true,
            },
            toolbox: {
                show: true,
                feature: {
                    saveAsImage: {},
                    // TODO(zds): implement CSV export with `dataView`
                },
            },
            dataZoom: [
                {
                    id: 'cot-horizontal-zoom',
                    type: 'slider',
                    filterMode: 'filter',
                    // start: 100 * Math.max(0, xAxisDates.length - defaultWeeksZoom) / xAxisDates.length,
                    // ...dataZoomInner,
                }
            ],
            series: [],
            xAxis: [
                {
                    type: 'category',
                    data: xAxisDates as any,
                    boundaryGap: false,
                },
            ],
            yAxis: [
                {
                    id: 'cot-net-positioning-axis',
                    type: 'value',
                    nameRotate: 90,
                    nameTextStyle: {
                        verticalAlign: 'middle',
                        align: 'center',
                    },
                    nameLocation: 'middle',
                    nameGap: 40,
                    scale: true,
                },
            ],
            title: {
                show: true,
                text: title,
                textStyle: { fontSize: 12 },
            },
        };
        return dst;
    }, [xAxisDates]);

    // update price chart if available
    React.useEffect(() => {
        if (priceData != null && priceData.length > 0)
            echartsRef.current?.getEchartsInstance().setOption({
                yAxis: [
                    {
                        id: 'underlying-price-axis',
                        type: 'value',
                        name: 'Price',
                        scale: true,
                    },
                ],
                series: [
                    {
                        name: 'Price',
                        type: 'line',
                        yAxisIndex: 1,
                        data: priceData.map(x => x.close),
                    }
                ]
            })
    }, [priceData]);

    // update series
    React.useEffect(() => {
        const pds = generatePriceDataSeries(priceData ?? []);
        echartsRef.current?.getEchartsInstance().setOption({
            series: [
                ...computeSeries(),
                ...(pds?.series ?? []),
            ],
            yAxis: [
                {
                    id: 'cot-net-positioning-axis',
                    name: yAxisLabels[normalizationMethod](yAxisLabel),
                },
                ...(pds?.yAxis ?? {}),
            ],
            dataZoom: [
                {
                    id: 'cot-horizontal-zoom',
                    start: rememberedDataZoom.current != null ? rememberedDataZoom.current[0] : 100 * Math.max(0, xAxisDates.length - defaultWeeksZoom) / xAxisDates.length,
                    end: rememberedDataZoom.current != null ? rememberedDataZoom.current[1] : 100,
                },
            ],
            ...(eChartsWidth > SCREEN_SMALL ? { title: { show: true } } : {})
        });

        // preserve legend selections
        if (legendSelected.current != null) {
            const ec = echartsRef.current?.getEchartsInstance();
            for (const [legendItemName, isSelected] of Object.entries(legendSelected.current)) {
                if (!isSelected)
                    ec?.dispatchAction({
                        type: 'legendToggleSelect',
                        name: legendItemName,
                        selected: legendSelected.current,
                    });
            }
        }

        // handle sizing and responsiveness
        echartsRef.current?.getEchartsInstance().resize();
    }, [plottedColumns, lookback, normalizationMethod, eChartsHeight, eChartsWidth]);

    // required after loading from SSR or else charts will be wrongly sized
    // kind of a hack 🙄
    React.useEffect(() => {
        echartsRef.current?.getEchartsInstance().resize();
    }, []);

    const handleChangeZsLookback = React.useCallback((ev: React.ChangeEvent<HTMLInputElement>) => {
        const n = parseInt(ev.target.value);
        setLookback(n);
    }, []);

    const handleSetNormalizationMethod = React.useCallback((ev: React.ChangeEvent<HTMLInputElement>) => {
        const v = ev.target.value;
        setNormalizationMethod(v as NormalizationMethod);
    }, []);

    return (
        <div className="w-full">
            <div className="m-2 flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                    <input type="radio" value={NormalizationMethod.RobustScaler}
                        checked={normalizationMethod === NormalizationMethod.RobustScaler}
                        onChange={handleSetNormalizationMethod}
                    />
                    <span>Robust Scaler</span>
                </label>
                <label className="flex items-center space-x-2">
                    <input type="radio" value={NormalizationMethod.StandardZscore}
                        checked={normalizationMethod === NormalizationMethod.StandardZscore}
                        onChange={handleSetNormalizationMethod}
                    />
                    <span>Z-score</span>
                </label>
                <label className="flex items-center space-x-2">
                    <input type="radio" value={NormalizationMethod.MinMaxScaler}
                        checked={normalizationMethod === NormalizationMethod.MinMaxScaler}
                        onChange={handleSetNormalizationMethod}
                    />
                    <span>Min-Max Scaler</span>
                </label>
                <label className="flex items-center space-x-2">
                    <input type="radio" value={NormalizationMethod.QuantileTransformer}
                        checked={normalizationMethod === NormalizationMethod.QuantileTransformer}
                        onChange={handleSetNormalizationMethod}
                    />
                    <span>Percentiles</span>
                </label>
                <label className="flex items-center space-x-2">
                    <input type="radio" value={NormalizationMethod.None}
                        checked={normalizationMethod === NormalizationMethod.None}
                        onChange={handleSetNormalizationMethod}
                    />
                    <span>Raw (no normalization)</span>
                </label>
            </div>

            <div className="m-2 flex items-center">
                <label className="flex flex-col w-full">
                    <div>
                        Lookback number of weeks for normalization
                        <strong className="px-2">
                            {lookback}
                        </strong>
                    </div>
                    <input
                        type="range"
                        className="py-3"
                        min={2} max={100} step={1}
                        onChange={handleChangeZsLookback} />
                </label>
            </div>
            <div className="m-2">
                <EChartsReactCore
                    echarts={echarts}
                    ref={(ref) => { echartsRef.current = ref; }}
                    showLoading={loading || plottedColumns == null}
                    option={genEchartsOption}
                    theme={"dark"}
                    onEvents={{
                        'datazoom': (ev: any) => {
                            rememberedDataZoom.current = [ev.start, ev.end];
                        },
                        'legendselectchanged': (ev: any) => {
                            legendSelected.current = ev.selected;
                        },
                    }} />
            </div>
        </div>
    );
}

const generatePriceDataSeries = (priceData: readonly PriceBar[]) => {
    let dst = {
        yAxis: [
            {
                id: 'underlying-price-axis',
                type: 'value',
                name: 'Price',
                scale: true,
            },
        ],
        series: [
            {
                name: 'Price',
                type: 'line',
                yAxisIndex: 1,
                data: priceData.map(x => x.close),
            }
        ]
    };
    return dst;
}