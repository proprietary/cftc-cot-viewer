'use client'

import {
    IAnyCOTReportType,
    IDisaggregatedFuturesCOTReport,
    IFinancialFuturesCOTReport,
    ILegacyFuturesCOTReport,
} from '@/socrata_cot_report'
import React from 'react'
import StandardizedCotOscillator, {
    IPlottedColumn,
} from './standardized_cot_oscillator'
import { formatDateYYYYMMDD } from '@/util'
import { PriceBar } from '@/common_types'

type CotReportKey =
    | keyof IFinancialFuturesCOTReport
    | keyof IDisaggregatedFuturesCOTReport
    | keyof ILegacyFuturesCOTReport

interface ITraderCategoryColumn {
    traderCategoryName: string
    longs: CotReportKey
    shorts: CotReportKey
}

const defaultWeeksLookback = 5

enum PositioningAggregationType {
    Net,
    Longs,
    Shorts,
}

export default function OpenInterestChangesNormalizedChart({
    reports,
    cols,
    priceData,
}: {
    reports: {
        [k in
            | keyof IFinancialFuturesCOTReport
            | keyof IDisaggregatedFuturesCOTReport
            | keyof ILegacyFuturesCOTReport]?: any
    }[]
    cols: readonly ITraderCategoryColumn[]
    priceData?: readonly PriceBar[]
}) {
    const [weeksLookback, setWeeksLookback] =
        React.useState<number>(defaultWeeksLookback)
    const handleChangeWeeksLookback = (
        ev: React.ChangeEvent<HTMLInputElement>
    ) => {
        let n = parseInt(ev.target.value)
        setWeeksLookback(n)
    }
    const [aggregationType, setAggregationType] = React.useState(
        PositioningAggregationType.Net
    )
    const handleChangeAggregationType = React.useCallback(
        (ev: React.ChangeEvent<HTMLInputElement>) => {
            setAggregationType(
                parseInt(ev.target.value) as PositioningAggregationType
            )
        },
        []
    )
    const generateColumns = React.useCallback((): [
        string[],
        IPlottedColumn[],
    ] => {
        let xAxisDates: string[] = []
        let yAxisColumns: IPlottedColumn[] = cols.map(
            ({ traderCategoryName }) => ({ name: traderCategoryName, data: [] })
        )
        for (let idx = 0; idx < reports.length; ++idx) {
            let earlierWeekIdx = Math.max(0, idx - weeksLookback)
            let earlierWeekReport = reports[earlierWeekIdx]
            let thisReport = reports[idx]
            for (
                let colIdx = 0;
                colIdx < yAxisColumns.length && colIdx < cols.length;
                ++colIdx
            ) {
                let col = cols[colIdx]
                let entry: number
                switch (aggregationType) {
                    case PositioningAggregationType.Net:
                        entry =
                            thisReport[col.longs] -
                            thisReport[col.shorts] -
                            (earlierWeekReport[col.longs] -
                                earlierWeekReport[col.shorts])
                        break
                    case PositioningAggregationType.Longs:
                        entry =
                            thisReport[col.longs] - earlierWeekReport[col.longs]
                        break
                    case PositioningAggregationType.Shorts:
                        entry =
                            thisReport[col.shorts] -
                            earlierWeekReport[col.shorts]
                        break
                    default:
                        throw new Error('should be unreachable')
                }
                yAxisColumns[colIdx].data.push(entry)
            }
            xAxisDates.push(formatDateYYYYMMDD(new Date(thisReport.timestamp)))
        }
        return [xAxisDates, yAxisColumns]
    }, [reports, cols, aggregationType, weeksLookback])
    const [xAxisDates, yAxisColumns] = generateColumns()
    return (
        <div className="my-2">
            <div className="flex items-center">
                <label className="inline-flex items-center space-x-2 cursor-pointer px-3">
                    <input
                        className="h-4 w-4"
                        type="radio"
                        value={PositioningAggregationType.Net}
                        checked={
                            aggregationType === PositioningAggregationType.Net
                        }
                        onChange={handleChangeAggregationType}
                    />
                    <div>Net</div>
                </label>
                <label className="inline-flex items-center space-x-2 cursor-pointer px-3">
                    <input
                        className="h-4 w-4"
                        type="radio"
                        value={PositioningAggregationType.Longs}
                        checked={
                            aggregationType === PositioningAggregationType.Longs
                        }
                        onChange={handleChangeAggregationType}
                    />
                    <div>Longs</div>
                </label>
                <label className="inline-flex items-center space-x-2 cursor-pointer px-3">
                    <input
                        className="h-4 w-4"
                        type="radio"
                        value={PositioningAggregationType.Shorts}
                        checked={
                            aggregationType ===
                            PositioningAggregationType.Shorts
                        }
                        onChange={handleChangeAggregationType}
                    />
                    <div>Shorts</div>
                </label>
            </div>

            <div className="flex items-center my-3">
                <label className="w-full inline-flex items-center space-x-3">
                    <div>
                        Change in position vs. <strong>{weeksLookback}Δ</strong>{' '}
                        weeks ago:{' '}
                    </div>
                    <input
                        type="range"
                        className="w-1/4"
                        min={1}
                        max={50}
                        step={1}
                        value={weeksLookback}
                        onChange={handleChangeWeeksLookback}
                    />
                </label>
            </div>

            <StandardizedCotOscillator
                yAxisLabel="Changes in Open Interest"
                xAxisDates={xAxisDates}
                plottedColumns={yAxisColumns}
                priceData={priceData}
            />
        </div>
    )
}
