'use client';

import React from 'react';
import { IAnyCOTReportType, IFinancialFuturesCOTReport, IDisaggregatedFuturesCOTReport, ILegacyFuturesCOTReport } from '@/socrata_cot_report';

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
    const navNextPage = React.useCallback((ev: any) => {
        ev.preventDefault();
        setReportsIdx(prevReportsIdx => Math.min(reports.length - 1, prevReportsIdx + 1));
    }, [reports, currentReportsIdx]);
    const navPrevPage = React.useCallback((ev: any) => {
        ev.preventDefault();
        setReportsIdx(prevReportsIdx => Math.max(0, prevReportsIdx - 1));
    }, [reports, currentReportsIdx]);
    const handleChangeDropdownDate = React.useCallback((ev: any) => {
        const val: any = ev.target.value;
        setReportsIdx(val);
    }, [reports, currentReportsIdx]);
    const report = reports.at(currentReportsIdx);
    return (
        <div>
            <div>
                <label>
                    Report Date
                    <select value={currentReportsIdx} onChange={handleChangeDropdownDate} className="bg-slate-900 text-white w-1/4 rounded-md m-2 text-lg">
                        {reports.map((report, idx) => (
                            <option key={idx} value={idx}>{new Date(report.timestamp).toLocaleDateString()}</option>
                        ))}
                    </select>
                </label>
            </div>
            <nav>
                <button disabled={currentReportsIdx <= 0} onClick={navPrevPage}>Prev</button>
                <button disabled={currentReportsIdx >= reports.length - 1} onClick={navNextPage}>Next</button>
            </nav>
            <div>
                <table>
                    <caption>
                        {reports.at(currentReportsIdx)?.market_and_exchange_names} week ending {new Date(report?.timestamp ?? new Date().getTime()).toLocaleDateString()} - Net Positions
                    </caption>
                    <thead>
                        <tr>
                            <th>

                            </th>
                            <th>
                                Net Position (longs - shorts)
                            </th>
                            <th>
                                1wk ago
                            </th>
                            <th>
                                4wk ago
                            </th>
                            <th>
                                3M %ile
                            </th>
                            <th>
                                1Y %ile
                            </th>
                            <th>
                                1Y z-score
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
                                    <td>3mop</td>
                                    <td>1yp</td>
                                    <td>1yz</td>

                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <table>
                    <caption>
                        {reports.at(currentReportsIdx)?.market_and_exchange_names} - week ending {new Date(reports.at(currentReportsIdx)?.timestamp ?? 0).toLocaleDateString()} - Full Report
                    </caption>
                    <thead>
                        <tr>
                            <th>
                            </th>
                            <th colSpan={3}>
                                Longs
                            </th>
                            <th colSpan={3}>
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
                                % of Open Interest
                            </th>
                            <th>
                                # Traders
                            </th>

                            <th>
                                Positions
                            </th>
                            <th>
                                % of Open Interest
                            </th>
                            <th>
                                # Traders
                            </th>

                            <th>
                                Positions
                            </th>
                            <th>
                                % of Open Interest
                            </th>
                            <th>
                                # Traders
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
                                    <td className="font-mono text-right">
                                        {column.tradersLong && report[column.tradersLong] as number}
                                    </td>

                                    <td className="font-mono text-right">
                                        {fmtThousandsSeparators(report[column.shorts] as number)}
                                    </td>
                                    <td className="font-mono text-right">
                                        {report[column.shortsPctOI] as number}%
                                    </td>
                                    <td className="font-mono text-right">
                                        {column.tradersShort && report[column.tradersShort] as number}
                                    </td>

                                    <td className="font-mono text-right">
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