'use client';

import React from 'react';
import { IAnyCOTReportType, IFinancialFuturesCOTReport, IDisaggregatedFuturesCOTReport, ILegacyFuturesCOTReport } from '@/socrata_cot_report';
import { formatDateYYYYMMDD } from '@/util';
import { quantileTransformAt, zscore } from '@/chart_math';
import { ArrSlice, newArrSlice } from '@/arr_slice';

type FilteredCOTReport<T extends IFinancialFuturesCOTReport | IDisaggregatedFuturesCOTReport | ILegacyFuturesCOTReport> = {
    [K in keyof T]: T[K] extends number ? K : never;
};

type FilteredCOTReportOnlyKeysToNumbers<T extends IFinancialFuturesCOTReport | IDisaggregatedFuturesCOTReport | ILegacyFuturesCOTReport> = FilteredCOTReport<T>[keyof T];

export interface ITradersCategoryColumn<T extends IFinancialFuturesCOTReport | IDisaggregatedFuturesCOTReport | ILegacyFuturesCOTReport> {
    name: string,
    longs: FilteredCOTReportOnlyKeysToNumbers<T>,
    shorts: FilteredCOTReportOnlyKeysToNumbers<T>,
    spreading?: FilteredCOTReportOnlyKeysToNumbers<T>,
    longsPctOI: FilteredCOTReportOnlyKeysToNumbers<T>,
    shortsPctOI: FilteredCOTReportOnlyKeysToNumbers<T>,
    spreadingPctOI?: FilteredCOTReportOnlyKeysToNumbers<T>,
    tradersLong?: FilteredCOTReportOnlyKeysToNumbers<T>,
    tradersShort?: FilteredCOTReportOnlyKeysToNumbers<T>,
    tradersSpreading?: FilteredCOTReportOnlyKeysToNumbers<T>,
}

function fmtThousandsSeparators(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
            <div>
                <label>
                    Report Date
                    <select value={currentReportsIdx} onChange={handleChangeDropdownDate} className="bg-slate-900 text-white w-1/4 rounded-md m-2 text-lg">
                        {reports.map((report, idx) => (
                            <option key={idx} value={idx}>{formatDateYYYYMMDD(new Date(report.timestamp))}</option>
                        ))}
                    </select>
                </label>
            </div>
            <nav>
                <button disabled={currentReportsIdx <= 0} onClick={navPrevPage}>Prev</button>
                <button disabled={currentReportsIdx >= reports.length - 1} onClick={navNextPage}>Next</button>
            </nav>
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
                                        {fmtThousandsSeparators((report[column.longs] as number) - (report[column.shorts] as number))}
                                    </td>
                                    <td className="font-mono text-right">
                                        {fmtThousandsSeparators((reports.at(currentReportsIdx - 1)?.[column.longs] as number ?? 0) - (reports.at(currentReportsIdx - 1)?.[column.shorts] as number ?? 0))}
                                    </td>
                                    <td className="font-mono text-right">
                                        {fmtThousandsSeparators((reports.at(currentReportsIdx - 4)?.[column.longs] as number ?? 0) - (reports.at(currentReportsIdx - 4)?.[column.shorts] as number ?? 0))}
                                    </td>
                                    <td className="font-mono text-right">
                                        {((): string => {
                                            const pastYear = newArrSlice(reports.slice(Math.max(0, currentReportsIdx - 12)).map(x => (x[column.longs] as number) - (x[column.shorts] as number)));
                                            const result = 100. * quantileTransformAt(pastYear, pastYear.arr.length - 1, 0., 1.);
                                            return `${result.toFixed(0)}%`;
                                        })()}
                                    </td>
                                    <td className="font-mono text-right">
                                        {((): string => {
                                            const pastYear = newArrSlice(reports.slice(Math.max(0, currentReportsIdx - 52)).map(x => (x[column.longs] as number) - (x[column.shorts] as number)));
                                            const result = 100. * quantileTransformAt(pastYear, pastYear.arr.length - 1, 0., 1.);
                                            return `${result.toFixed(0)}%`;
                                        })()}

                                    </td>
                                    <td className="font-mono text-right">
                                        {((): string => {
                                            const pastYear = newArrSlice(reports.slice(Math.max(0, currentReportsIdx - 104)).map(x => (x[column.longs] as number) - (x[column.shorts] as number)));
                                            const result = 100. * quantileTransformAt(pastYear, pastYear.arr.length - 1, 0., 1.);
                                            return `${result.toFixed(0)}%`;
                                        })()}
                                    </td>
                                    <td className="font-mono text-right">
                                        {zscore(newArrSlice(reports.slice(Math.max(0, currentReportsIdx - 52)).map(x => (x[column.longs] as number) - (x[column.shorts] as number)))).toFixed(3)}σ
                                    </td>
                                    <td className="font-mono text-right">
                                        {zscore(newArrSlice(reports.slice(Math.max(0, currentReportsIdx - 104)).map(x => (x[column.longs] as number) - (x[column.shorts] as number)))).toFixed(3)}σ
                                    </td>

                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <table className="table-auto caption-top border-collapse min-w-full">
                    <caption>
                        {reports.at(currentReportsIdx)?.market_and_exchange_names} - week ending {formatDateYYYYMMDD(new Date(reports.at(currentReportsIdx)?.timestamp ?? 0))} - Full Report
                    </caption>
                    <thead>
                        <tr>
                            <th>
                            </th>
                            <th colSpan={3} className="border-r border-slate-700">
                                Longs
                            </th>
                            <th colSpan={3} className="border-r border-slate-700">
                                Shorts
                            </th>
                            <th colSpan={3}>
                                Spreading
                            </th>
                        </tr>
                        <tr>
                            <th>
                            </th>

                            <th>
                                Positions
                            </th>
                            <th>
                                <abbr title="Percentage of total open interest held long by this category of trader">
                                    % OI
                                </abbr>
                            </th>
                            <th className="text-sm mr-5 border-r border-slate-700">
                                <abbr title="Number of traders long">#</abbr>
                            </th>

                            <th className="ml-8">
                                Positions
                            </th>
                            <th>
                                <abbr title="Percentage of total open interest held short by this category of trader">
                                    % OI
                                </abbr>
                            </th>
                            <th className="text-sm mr-5 border-r border-slate-700">
                                <abbr title="Number of traders short">#</abbr>
                            </th>

                            <th className="ml-8">
                                Positions
                            </th>
                            <th>
                                <abbr title="Percentage of total open interest held in spreading positions by this category of trader">
                                    % OI
                                </abbr>
                            </th>
                            <th>
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
                                        {fmtThousandsSeparators(report[column.longs] as number)}
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
                                        {report[column.shortsPctOI] as number}%
                                    </td>
                                    <td className="font-mono text-right border-r border-slate-700">
                                        {column.tradersShort && report[column.tradersShort] as number}
                                    </td>

                                    <td className="font-mono text-right ml-8">
                                        {column.spreading && fmtThousandsSeparators(report[column.spreading] as number)}
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
        </div>
    )
}