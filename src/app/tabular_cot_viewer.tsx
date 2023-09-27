'use client';

import React from 'react';
import { IAnyCOTReportType, IFinancialFuturesCOTReport, IDisaggregatedFuturesCOTReport, ILegacyFuturesCOTReport } from '@/socrata_cot_report';
import { formatDateYYYYMMDD } from '@/util';
import { quantileTransformAt, zscore } from '@/lib/chart_math';
import { ArrSlice, newArrSlice } from '@/lib/arr_slice';
import { interpolateColor } from '@/lib/interpolate_color';

type FilteredCOTReport<T extends IFinancialFuturesCOTReport | IDisaggregatedFuturesCOTReport | ILegacyFuturesCOTReport> = {
    [K in keyof T]: T[K] extends number ? K : never;
};

type FilteredCOTReportOnlyKeysToNumbers<T extends IFinancialFuturesCOTReport | IDisaggregatedFuturesCOTReport | ILegacyFuturesCOTReport> = FilteredCOTReport<T>[keyof T];

export interface ITradersCategoryColumn<T extends IFinancialFuturesCOTReport | IDisaggregatedFuturesCOTReport | ILegacyFuturesCOTReport> {
    name: string,
    longs: FilteredCOTReportOnlyKeysToNumbers<T>,
    shorts: FilteredCOTReportOnlyKeysToNumbers<T>,
    spreading?: FilteredCOTReportOnlyKeysToNumbers<T>,
    changeInLongs: FilteredCOTReportOnlyKeysToNumbers<T>,
    changeInShorts: FilteredCOTReportOnlyKeysToNumbers<T>,
    changeInSpreading?: FilteredCOTReportOnlyKeysToNumbers<T>,
    longsPctOI: FilteredCOTReportOnlyKeysToNumbers<T>,
    shortsPctOI: FilteredCOTReportOnlyKeysToNumbers<T>,
    spreadingPctOI?: FilteredCOTReportOnlyKeysToNumbers<T>,
    tradersLong?: FilteredCOTReportOnlyKeysToNumbers<T>,
    tradersShort?: FilteredCOTReportOnlyKeysToNumbers<T>,
    tradersSpreading?: FilteredCOTReportOnlyKeysToNumbers<T>,
}

function fmtThousandsSeparators(num: number | undefined): string {
    return num == null ? '' : num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function TabularCOTViewer<T extends IFinancialFuturesCOTReport | IDisaggregatedFuturesCOTReport | ILegacyFuturesCOTReport>({
    reports,
    columns,
}: {
    reports: T[],
    columns: ITradersCategoryColumn<T>[],
}) {
    const [currentReportsIdx, setReportsIdx] = React.useState<number>(reports.length - 1);
    React.useEffect(() => {
        // update `currentReportsIdx` when `reports` updates
        setReportsIdx(reports.length - 1);
    }, [reports]);
    const navNextPage = (ev: any) => {
        ev.preventDefault();
        setReportsIdx(prevReportsIdx => Math.min(reports.length - 1, prevReportsIdx + 1));
    };
    const navPrevPage = (ev: any) => {
        ev.preventDefault();
        setReportsIdx(prevReportsIdx => Math.max(0, prevReportsIdx - 1));
    };
    const handleChangeDropdownDate = (ev: any) => {
        const val: any = ev.target.value;
        setReportsIdx(val);
    };
    const report = reports.at(currentReportsIdx);
    return (
        <div className="overflow-x-auto mx-auto">
            <div className="flex-inline gap-5">
                <label>
                    <select
                        value={currentReportsIdx} onChange={handleChangeDropdownDate}
                        className="bg-slate-900 text-white w-1/4 rounded-md m-2 text-lg p-1 text-center"
                    >
                        {reports.map((report, idx) => (
                            <option key={idx} value={idx}>{formatDateYYYYMMDD(new Date(report.timestamp))}</option>
                        ))}
                    </select>
                </label>
                <button disabled={currentReportsIdx <= 0} onClick={navPrevPage} className="px-5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-arrow-left" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z" />
                    </svg>
                </button>
                <button disabled={currentReportsIdx >= reports.length - 1} onClick={navNextPage} className="px-5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-arrow-right" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z" />
                    </svg>
                </button>
            </div>
            <div>
                <table className="table-auto">
                    <caption>
                        {reports.at(currentReportsIdx)?.market_and_exchange_names} week ending {formatDateYYYYMMDD(new Date(report?.timestamp ?? new Date().getTime()))} - Net Positions
                    </caption>
                    <thead>
                        <tr>
                            <th>

                            </th>
                            <th>
                                <abbr title="Longs minus Shorts">Net Position</abbr>
                            </th>
                            <th>
                                <abbr title="Net position 1 week ago">1wk ago</abbr>
                            </th>
                            <th>
                                <abbr title="Net position 4 weeks ago">4wk ago</abbr>
                            </th>
                            <th>
                                <abbr title="Z-score of the current net positioning with respect to the last 3 months">
                                    3M z-score
                                </abbr>
                            </th>
                            <th>
                                <abbr title="Z-score of the current net positioning with respect to the last 6 months">
                                    6M z-score
                                </abbr>
                            </th>
                            <th>
                                <abbr title="Z-score of the current net positioning with respect to the last 1 year">
                                    1Y z-score
                                </abbr>
                            </th>
                            <th>
                                <abbr title="Z-score of the current net positioning with respect to the last 2 year">
                                    2Y z-score
                                </abbr>
                            </th>
                            <th>
                                <abbr title="Percentile of current net positioning with respect to the past 3 months">
                                    3M %ile
                                </abbr>
                            </th>
                            <th>
                                <abbr title="Pecentile of current net positioning with respect to the last 1 year">
                                    1Y %ile
                                </abbr>
                            </th>
                            <th>
                                <abbr title="Pecentile of current net positioning with respect to the last 2 years">
                                    2Y %ile
                                </abbr>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.length > 0 && columns.map((column, colIdx) => {
                            const report = reports.at(currentReportsIdx);
                            if (report == null) return null;
                            const past3M = newArrSlice(reports.slice(Math.max(0, currentReportsIdx - 12)).map(x => (x[column.longs] as number) - (x[column.shorts] as number)));
                            const past3MPercentile = quantileTransformAt(past3M, past3M.arr.length - 1, 0., 1.);
                            const past1Y = newArrSlice(reports.slice(Math.max(0, currentReportsIdx - 52)).map(x => (x[column.longs] as number) - (x[column.shorts] as number)));
                            const past1YPercentile = quantileTransformAt(past1Y, past1Y.arr.length - 1, 0., 1.);
                            const past2Y = newArrSlice(reports.slice(Math.max(0, currentReportsIdx - 104)).map(x => (x[column.longs] as number) - (x[column.shorts] as number)));
                            const past2YPercentile = quantileTransformAt(past2Y, past2Y.arr.length - 1, 0., 1.);
                            const past6M = newArrSlice(reports.slice(Math.max(0, currentReportsIdx - 26)).map(x => (x[column.longs] as number) - (x[column.shorts] as number)));
                            const past3MZScore = zscore(past3M);
                            const past6MZScore = zscore(past6M);
                            const past1YZScore = zscore(past1Y);
                            const past2YZScore = zscore(past2Y);
                            return (
                                <tr key={colIdx}>
                                    <td>{column.name}</td>

                                    <td className="font-mono text-right">
                                        {fmtThousandsSeparators((report[column.longs] as number) - (report[column.shorts] as number))}
                                    </td>
                                    <td className="font-mono text-right">
                                        {fmtThousandsSeparators((reports.at(currentReportsIdx - 1)?.[column.longs] as number ?? 0) - (reports.at(currentReportsIdx - 1)?.[column.shorts] as number ?? 0))}
                                    </td>
                                    <td className="font-mono text-right">
                                        {fmtThousandsSeparators((reports.at(currentReportsIdx - 4)?.[column.longs] as number ?? 0) - (reports.at(currentReportsIdx - 4)?.[column.shorts] as number ?? 0))}
                                    </td>
                                    <td className="font-mono text-right" style={{ backgroundColor: interpolateColor(past3MZScore, -2., 2.) }}>
                                        {past3MZScore.toFixed(3)}σ
                                    </td>
                                    <td className="font-mono text-right" style={{ backgroundColor: interpolateColor(past6MZScore, -2., 2.) }}>
                                        {past6MZScore.toFixed(3)}σ
                                    </td>
                                    <td className="font-mono text-right" style={{ backgroundColor: interpolateColor(past1YZScore, -2., 2.) }}>
                                        {past1YZScore.toFixed(3)}σ
                                    </td>
                                    <td className="font-mono text-right" style={{ backgroundColor: interpolateColor(past2YZScore, -2., 2.) }}>
                                        {past2YZScore.toFixed(3)}σ
                                    </td>
                                    <td className="font-mono text-right" style={{ backgroundColor: interpolateColor(past3MPercentile, 0., 1.) }}>
                                        {(100. * past3MPercentile).toFixed(0)}%
                                    </td>
                                    <td className="font-mono text-right" style={{ backgroundColor: interpolateColor(past1YPercentile, 0., 1.) }}>
                                        {(100. * past1YPercentile).toFixed(0)}%
                                    </td>
                                    <td className="font-mono text-right" style={{ backgroundColor: interpolateColor(past2YPercentile, 0., 1.) }}>
                                        {(100. * past2YPercentile).toFixed(0)}%
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <table className="table-auto caption-top border-collapse min-w-full mt-8">
                    <caption>
                        {reports.at(currentReportsIdx)?.market_and_exchange_names} - week ending {formatDateYYYYMMDD(new Date(reports.at(currentReportsIdx)?.timestamp ?? 0))} - Full Report
                    </caption>
                    <thead>
                        <tr>
                            <th>
                            </th>
                            <th colSpan={4} className="border-r border-slate-700">
                                Longs
                            </th>
                            <th colSpan={4} className="border-r border-slate-700">
                                Shorts
                            </th>
                            <th colSpan={4}>
                                Spreading
                            </th>
                        </tr>
                        <tr>
                            <th>
                            </th>

                            <th className="text-right">
                                Positions
                            </th>
                            <th className="text-right">
                                <abbr title="Change in long positions from the previous week">
                                    Δ
                                </abbr>
                            </th>
                            <th className="text-right">
                                <abbr title="Percentage of total open interest held long by this category of trader">
                                    % OI
                                </abbr>
                            </th>
                            <th className="text-sm mr-5 border-r border-slate-700 text-right">
                                <abbr title="Number of traders long">#</abbr>
                            </th>

                            <th className="ml-8 text-right">
                                Positions
                            </th>
                            <th className="text-right">
                                <abbr title="Change in long positions from the previous week">
                                    Δ
                                </abbr>
                            </th>
                            <th className="text-right">
                                <abbr title="Percentage of total open interest held short by this category of trader">
                                    % OI
                                </abbr>
                            </th>
                            <th className="text-sm mr-5 border-r border-slate-700 text-right">
                                <abbr title="Number of traders short">#</abbr>
                            </th>

                            <th className="ml-8 text-right">
                                Positions
                            </th>
                            <th className="text-right">
                                <abbr title="Change in long positions from the previous week">
                                    Δ
                                </abbr>
                            </th>
                            <th className="text-right">
                                <abbr title="Percentage of total open interest held in spreading positions by this category of trader">
                                    % OI
                                </abbr>
                            </th>
                            <th className="text-right">
                                <abbr title="Number of traders spreading">#</abbr>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.length > 0 && columns.map((column, colIdx) => {
                            const report = reports.at(currentReportsIdx);
                            if (report == null) return null;
                            return (
                                <tr key={colIdx}>
                                    <td>{column.name}</td>

                                    <td className="font-mono text-right">
                                        <span>{fmtThousandsSeparators(report[column.longs] as number)}</span>
                                    </td>
                                    <td className="font-mono text-right">
                                        {fmtThousandsSeparators(report[column.changeInLongs] as number)}
                                    </td>
                                    <td className="font-mono text-right">
                                        {report[column.longsPctOI] as number}%
                                    </td>
                                    <td className="font-mono text-right border-r border-slate-700">
                                        {column.tradersLong && report[column.tradersLong] as number}
                                    </td>

                                    <td className="font-mono text-right ml-8">
                                        {fmtThousandsSeparators(report[column.shorts] as number)}
                                    </td>
                                    <td className="font-mono text-right">
                                        {fmtThousandsSeparators(report[column.changeInShorts] as number)}
                                    </td>
                                    <td className="font-mono text-right">
                                        {report[column.shortsPctOI] as number}%
                                    </td>
                                    <td className="font-mono text-right border-r border-slate-700">
                                        {column.tradersShort && report[column.tradersShort] as number}
                                    </td>

                                    <td className="font-mono text-right ml-8">
                                        {column.spreading && fmtThousandsSeparators(report[column.spreading] as number)}
                                    </td>
                                    <td className="font-mono text-right">
                                        {column.changeInSpreading && fmtThousandsSeparators(report[column.changeInSpreading] as number)}
                                    </td>
                                    <td className="font-mono text-right">
                                        {column.spreadingPctOI && `${report[column.spreadingPctOI] as number}%`}
                                    </td>
                                    <td className="font-mono text-right">
                                        {column.tradersSpreading && report[column.tradersSpreading] as number}
                                    </td>

                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div >
    )
}