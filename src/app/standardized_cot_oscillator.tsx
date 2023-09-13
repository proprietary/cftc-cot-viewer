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
        yAxisLabel = 'Net Positioning',
        loading = false,
    }: {
        xAxisDates: Date[],
        columns: ITraderCategoryColumn,
        title?: string,
        loading?: boolean,
        yAxisLabel?: string,
        // priceData: [{dt: Date, price: number}],
    },
) {
    const echartsRef = React.useRef<EChartsReactCore | null>(null);
    let legendSelected = React.useRef<{ [name: string]: boolean } | null>(null);
    let rememberedDataZoom = React.useRef<[number, number] | null>(null);
    const [standardized, setStandardized] = React.useState<boolean>(true);

    //const zscoreLookback = React.useRef<number>(defaultZscoreLookback);
    //const zscoreLookbackDOMLabel = React.useRef<HTMLSpanElement | null>();
    const [zscoreLookback, setZscoreLookback] = React.useState<number>(defaultZscoreLookback);
    const zscoredSeries = React.useCallback((zs: number, standardized: boolean) => {
        let series: any = [];
        for (const traderCategoryName of Object.keys(columns)) {
            let data: number[] = [];
            if (standardized) {
                data = rollingZscore(columns[traderCategoryName].data, zs);
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
    }, [columns]);

    const genEchartsOption = React.useCallback(() => {
        let dataZoomInner: { start?: number, end?: number } = {};
        if (rememberedDataZoom.current != null) {
            const [start, end] = rememberedDataZoom.current;
            dataZoomInner.start = start;
            dataZoomInner.end = end;
        }
        return {
            aria: {
                enabled: true,
            },
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
                    start: 100 * Math.max(0, xAxisDates.length - defaultWeeksZoom) / xAxisDates.length,
                    ...dataZoomInner,
                }
            ],
            series: zscoredSeries(zscoreLookback, standardized),
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
                    name: `${yAxisLabel}`,
                    nameRotate: '90',
                    nameTextStyle: {
                        verticalAlign: 'middle',
                        align: 'center',
                    },
                    nameLocation: 'middle',
                    nameGap: 40,
                }
            ],
            title: {
                text: title,
                textStyle: { fontSize: 12 },
            },
        };
    }, [xAxisDates, columns, yAxisLabel, rememberedDataZoom, zscoreLookback, standardized]);

    const handleChangeZsLookback = (ev: React.ChangeEvent<HTMLInputElement>) => {
        const n = parseInt(ev.target.value);
        // zscoreLookback.current = n;
        setZscoreLookback(n);
        // echartsRef.current?.getEchartsInstance().setOption({
        //     series: zscoredSeries(n, standardized),
        //     yAxis: [
        //         {
        //             id: 'cot-net-positioning-axis',
        //             name: `${yAxisLabel} (z-score ${n}w lookback)`,
        //         },
        //     ],
        // });
        // if (zscoreLookbackDOMLabel.current) {
        //     zscoreLookbackDOMLabel.current.textContent = n.toString();
        // }
    };

    const handleSetStandardized = (ev: React.ChangeEvent<HTMLInputElement>) => {
        const b = ev.target.checked;
        setStandardized(b);
        // echartsRef.current?.getEchartsInstance().setOption({
        //     series: zscoredSeries(zscoreLookback, b),
        //     yAxis: [
        //         {
        //             id: 'cot-net-positioning-axis',
        //             name: b ? `${yAxisLabel} (Net Long open interest)` : `${yAxisLabel} (z-score ${zscoreLookback}w lookback)`,
        //         },
        //     ],
        // });
    }

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
    }, [columns, xAxisDates, legendSelected, rememberedDataZoom, standardized, zscoreLookback]);

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
                    <strong>
                        {zscoreLookback}
                        {/*<span ref={(ref) => { zscoreLookbackDOMLabel.current = ref; }}>
                            {zscoreLookback.current.toString() ?? ''}
                        </span> weeks */}
                    </strong>
                    <input
                        type="range"
                        className="mx-2"
                        min={2} max={100} step={1}
                        onChange={handleChangeZsLookback} />
                </label>
            </div>
            <div className="block my-5">
                <label>
                    Standardized? <input type="checkbox" onChange={handleSetStandardized} checked={standardized} />
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
