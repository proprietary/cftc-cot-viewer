'use client';

import React from 'react';
import * as echarts from 'echarts/core';
import EChartsReactCore from 'echarts-for-react/lib/core';
import { TitleComponent, GridComponent, LegendComponent, TooltipComponent, ToolboxComponent, DataZoomComponent, VisualMapComponent, TimelineComponent } from 'echarts/components';
import { BarChart, LineChart } from 'echarts/charts';
import { SVGRenderer, CanvasRenderer } from 'echarts/renderers';
import { IDisaggregatedFuturesCOTReport, IFinancialFuturesCOTReport, ILegacyFuturesCOTReport, ITraderCategory } from '@/socrata_cot_report';
import { rollingZscore } from '@/chart_math';
import { SCREEN_LARGE, SCREEN_MEDIUM, SCREEN_SMALL, useViewportDimensions, usePrevious } from '@/util';

echarts.use([TitleComponent, LineChart, VisualMapComponent, TimelineComponent, TooltipComponent, ToolboxComponent, DataZoomComponent, LegendComponent, GridComponent, BarChart, SVGRenderer, CanvasRenderer]);

const zscoreTooltipFormatter = (zscore: number) => `${zscore.toFixed(5)} σ`;
const defaultWeeksZoom = 50; // default number of weeks the zoom slider should have in width

interface ITraderCategoryColumn {
    [name: string]: {
        data: number[],
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

const defaultZscoreLookback = 50;

export default function StandardizedCotOscillator<RptType extends IFinancialFuturesCOTReport | IDisaggregatedFuturesCOTReport | ILegacyFuturesCOTReport>(
    {
        xAxisDates,
        columns,
        title = '',
        standardized = true,
        loading = false,
    }: {
        xAxisDates: Date[],
        columns: ITraderCategoryColumn,
        title?: string,
        // whether or not to use zscored index
        standardized?: boolean,
        loading?: boolean,
        // priceData: [{dt: Date, price: number}],
    },
) {
    const echartsRef = React.useRef<EChartsReactCore | null>(null);
    let dataZoomBounds = React.useRef<[number, number]>();

    const zscoreLookback = React.useRef<number>(defaultZscoreLookback);
    const zscoreLookbackDOMLabel = React.useRef<HTMLSpanElement | null>();
    const zscoredSeries = React.useCallback(() => {
        let series: any = [];
        for (const traderCategoryName of Object.keys(columns)) {
            let data: number[] = [];
            if (standardized) {
                data = rollingZscore(columns[traderCategoryName].data, zscoreLookback.current);
            } else {
                data = [...columns[traderCategoryName].data];
            }
            series.push({
                id: traderCategoryName,
                name: traderCategoryName,
                data,
                type: 'bar',
                tooltip: {
                    valueFormatter: standardized ? ((x: any) => x) : zscoreTooltipFormatter,
                },
            });
        }
        return series;
    }, [zscoreLookback, columns, standardized]);

    const genEchartsOption = () => {
        // let dataZoomInner: { start?: number, end?: number } = {};
        // if (dataZoomBounds.current != null) {
        //     const [start, end] = dataZoomBounds.current;
        //     dataZoomInner.start = start;
        //     dataZoomInner.end = end;
        // }
        return {
            tooltip: {
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
                    // ...dataZoomInner,
                    start: 100 * Math.max(0, xAxisDates.length - defaultWeeksZoom) / xAxisDates.length,
                }
            ],
            series: zscoredSeries(),
            xAxis: [
                {
                    data: xAxisDates.map(x => x.toLocaleDateString()),
                    type: 'category',
                },
            ],
            yAxis: [
                {
                    type: 'value',
                    name: `Net Positioning (z-score, ${zscoreLookback.current}w lookback)`,
                }
            ],
            title: {
                text: title,
                textStyle: { fontSize: 12 },
            },
        };
    };

    const handleChangeZsLookback = (ev: React.ChangeEvent<HTMLInputElement>) => {
        const n = parseInt(ev.target.value);
        // setZscoreLookback(n);
        zscoreLookback.current = n;
        echartsRef.current?.getEchartsInstance().setOption({
            series: zscoredSeries(),
        });
        if (zscoreLookbackDOMLabel.current) {
            zscoreLookbackDOMLabel.current.textContent = n.toString();
        }
    };
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
            <div>
                <label>
                    Lookback (number of weeks to use to standardize positioning):
                    <strong><span ref={(ref) => { zscoreLookbackDOMLabel.current = ref; }}>{zscoreLookback.current.toString() ?? ''}</span> weeks</strong>
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
                            dataZoomBounds.current = [ev.start, ev.end];
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
