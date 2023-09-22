'use client';

import React from 'react';
import * as echarts from 'echarts/core';
import EChartsReactCore from 'echarts-for-react/lib/core';
import { TitleComponent, GridComponent, LegendComponent, TooltipComponent, ToolboxComponent, DataZoomComponent, VisualMapComponent, TimelineComponent } from 'echarts/components';
import { BarChart, LineChart } from 'echarts/charts';
import { SVGRenderer, CanvasRenderer } from 'echarts/renderers';
import { IDisaggregatedFuturesCOTReport, IFinancialFuturesCOTReport, ILegacyFuturesCOTReport, ITraderCategory } from '@/socrata_cot_report';
import { rollingMinMaxScaler, rollingMinMaxScalerOptimized, rollingQuantileNormalization, rollingRobustScaler, rollingZscore } from '@/chart_math';
import { SCREEN_LARGE, SCREEN_MEDIUM, SCREEN_SMALL, useViewportDimensions, usePrevious } from '@/util';
import { PriceBar } from '@/common_types';

echarts.use([TitleComponent, LineChart, VisualMapComponent, TimelineComponent, TooltipComponent, ToolboxComponent, DataZoomComponent, LegendComponent, GridComponent, BarChart, SVGRenderer, CanvasRenderer]);

const zscoreTooltipFormatter = (zscore: number) => `${zscore.toFixed(5)} σ`;
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

const defaultLookback = 50;

enum NormalizationMethod {
    StandardZscore = 'zscore',
    RobustScaler = 'robust-scaler',
    MinMaxScaler = 'min-max-scaler',
    QuantileTransformer = 'quantile-transformer',
};

export default function StandardizedCotOscillator<RptType extends IFinancialFuturesCOTReport | IDisaggregatedFuturesCOTReport | ILegacyFuturesCOTReport>(
    {
        xAxisDates,
        columns,
        title = '',
        yAxisLabel = 'Net Positioning',
        loading = false,
        priceData,
    }: {
        xAxisDates: Date[],
        columns: ITraderCategoryColumn,
        title?: string,
        loading?: boolean,
        yAxisLabel?: string,
        priceData?: PriceBar[],
    },
) {
    const echartsRef = React.useRef<EChartsReactCore | null>(null);
    let legendSelected = React.useRef<{ [name: string]: boolean } | null>(null);
    let rememberedDataZoom = React.useRef<[number, number] | null>(null);
    const [isNormalized, setStandardized] = React.useState<boolean>(true);
    const [normalizationMethod, setNormalizationMethod] = React.useState<NormalizationMethod>(NormalizationMethod.RobustScaler);
    const [lookback, setLookback] = React.useState<number>(defaultLookback);
    const computeSeries = React.useCallback((lookback: number, isNormalized: boolean, normalizationMethod: NormalizationMethod) => {
        let series: any = [];
        for (const traderCategoryName of Object.keys(columns)) {
            let data: number[] = [...columns[traderCategoryName].data];
            let divisor = columns[traderCategoryName].normalizingDivisor;
            if (divisor != null && divisor > 0) {
                for (let i = 0; i < data.length; ++i)
                    data[i] /= divisor;
            }

            if (isNormalized) {
                switch (normalizationMethod) {
                    case NormalizationMethod.RobustScaler:
                        data = rollingRobustScaler(data, lookback);
                        break;
                    case NormalizationMethod.StandardZscore:
                        data = rollingZscore(data, lookback);
                        break;
                    case NormalizationMethod.MinMaxScaler:
                        // data = rollingMinMaxScaler(data, lookback);
                        data = rollingMinMaxScalerOptimized(data, lookback);
                        break;
                    case NormalizationMethod.QuantileTransformer:
                        data = rollingQuantileNormalization(data, lookback);
                        break;
                    default:
                        throw new Error('unknown normalization method; this should be unreachable');
                }
            }
            series.push({
                id: traderCategoryName,
                name: traderCategoryName,
                data,
                type: isNormalized && normalizationMethod === NormalizationMethod.QuantileTransformer ? 'line' : 'bar',
                // barGap: '0%',
                // barCategoryGap: '0%',
                tooltip: {
                    valueFormatter: (value: string | number): string => {
                        if (isNormalized && typeof value === 'number')
                            return `${(value as number).toFixed(5)}σ`;
                        return value.toString();
                    },
                },
            });
        }
        return series;
    }, [columns]);

    const genEchartsOption = React.useCallback(() => {
        let dataZoomInner: { start?: number, end?: number } = {};
        if (rememberedDataZoom.current != null) {
            const [start, end] = rememberedDataZoom.current;
            dataZoomInner.start = start;
            dataZoomInner.end = end;
        }
        let dst = {
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
                    start: 100 * Math.max(0, xAxisDates.length - defaultWeeksZoom) / xAxisDates.length,
                    ...dataZoomInner,
                }
            ],
            series: computeSeries(lookback, isNormalized, normalizationMethod),
            xAxis: [
                {
                    data: xAxisDates.map(x => x.toLocaleDateString()),
                    type: 'category',
                },
            ],
            yAxis: [
                {
                    id: 'cot-net-positioning-axis',
                    type: 'value',
                    name: `${yAxisLabel}` + (isNormalized ? ` (${lookback}w lookback z-score)` : ''),
                    nameRotate: '90',
                    nameTextStyle: {
                        verticalAlign: 'middle',
                        align: 'center',
                    },
                    nameLocation: 'middle',
                    nameGap: 40,
                },
            ],
            title: {
                text: title,
                textStyle: { fontSize: 12 },
            },
        };

        if (priceData != null && priceData.length > 0) {
            dst.yAxis.push({
                id: 'underlying-price-axis',
                type: 'value',
                name: 'Price',
                scale: true,
            } as any);
            dst.series.push({
                name: 'Price',
                type: 'line',
                yAxisIndex: 1,
                data: priceData.map(x => x.close),
            });
        }

        return dst;
    }, [xAxisDates, columns, yAxisLabel, rememberedDataZoom, lookback, isNormalized, normalizationMethod]);

    const handleChangeZsLookback = React.useCallback((ev: React.ChangeEvent<HTMLInputElement>) => {
        const n = parseInt(ev.target.value);
        setLookback(n);
    }, []);

    const toggleNormalized = React.useCallback((ev: React.ChangeEvent<HTMLInputElement>) => {
        const b = ev.target.checked;
        setStandardized(b);
    }, []);

    const handleSetNormalizationMethod = React.useCallback((ev: React.ChangeEvent<HTMLInputElement>) => {
        const v = ev.target.value;
        setNormalizationMethod(v as NormalizationMethod);
    }, []);

    React.useEffect(() => {
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
        // set data zoom initially
        if (rememberedDataZoom.current === null && xAxisDates != null && xAxisDates.length > 0) {
            rememberedDataZoom.current = [
                100. * Math.max(0, xAxisDates.length - defaultWeeksZoom) / xAxisDates.length,
                100.
            ];
        }
    }, [columns, xAxisDates, legendSelected, rememberedDataZoom, isNormalized, lookback, normalizationMethod]);

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
            <div className="block my-2">
                <label>
                    Normalized? <input type="checkbox" onChange={toggleNormalized} checked={isNormalized} />
                </label>
            </div>

            <div className="block m-2">
                <label>
                    Robust Scaler
                    <input type="radio" value={NormalizationMethod.RobustScaler}
                        checked={normalizationMethod === NormalizationMethod.RobustScaler}
                        onChange={handleSetNormalizationMethod}
                    />
                </label>
                <label>
                    Z-score
                    <input type="radio" value={NormalizationMethod.StandardZscore}
                        checked={normalizationMethod === NormalizationMethod.StandardZscore}
                        onChange={handleSetNormalizationMethod}
                    />
                </label>
                <label>
                    Min-Max Scaler
                    <input type="radio" value={NormalizationMethod.MinMaxScaler}
                        checked={normalizationMethod === NormalizationMethod.MinMaxScaler}
                        onChange={handleSetNormalizationMethod}
                    />
                </label>
                <label>
                    Percentiles
                    <input type="radio" value={NormalizationMethod.QuantileTransformer}
                        checked={normalizationMethod === NormalizationMethod.QuantileTransformer}
                        onChange={handleSetNormalizationMethod}
                    />
                </label>
            </div>

            <div className={'block my-1' + (isNormalized ? '' : ' hidden')}>
                <label>
                    Lookback (number of weeks to use to standardize positioning):
                    <strong>
                        {lookback}
                    </strong>
                    <input
                        type="range"
                        className="mx-2"
                        min={2} max={100} step={1}
                        onChange={handleChangeZsLookback} />
                </label>
            </div>
            <div className="w-full">
                <EChartsReactCore
                    echarts={echarts}
                    ref={(ref) => { echartsRef.current = ref; }}
                    showLoading={loading || columns == null}
                    option={genEchartsOption()}
                    theme={"dark"}
                    onEvents={{
                        'datazoom': (ev: any) => {
                            rememberedDataZoom.current = [ev.start, ev.end];
                        },
                        'legendselectchanged': (ev: any) => {
                            legendSelected.current = ev.selected;
                        },
                    }}
                    style={{
                        height: viewportDimensions.height * .8,
                        width: viewportDimensions.width < 640 ? viewportDimensions.width * 1.0 : viewportDimensions.width * 0.9,
                    }} />
            </div>
        </div>
    );
}
