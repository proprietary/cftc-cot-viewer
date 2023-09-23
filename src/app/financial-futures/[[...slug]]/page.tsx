import { CFTCReportType } from "@/common_types";
import { SocrataApi } from "@/socrata_api";
import Tff from './tff';
import Link from "next/link";

export default async function Page({
    params
}: {
    params: { slug: string[] },
}) {
    const contracts = await (new SocrataApi()).fetchAvailableContracts({ reportType: CFTCReportType.FinancialFutures });
    if (params.slug == null || params.slug.length == 0) {
        return (
            <div>
                {JSON.stringify(params.slug, null, 4)}
                {contracts.map((con, idx) => {
                    if (con.commoditySubgroupName != null && con.commodityName != null)
                        return (
                            <p key={idx}>
                                {fixSubgroupName(con.commoditySubgroupName!)}
                                /
                                {fixSubgroupName(con.commodityName!)}
                                /
                                {con.cftcContractMarketCode}
                            </p>
                        )
                })}
            </div>
        )
    }
    if (params.slug.length == 3) {
        const cftcCode = params.slug.at(-1)!;
        const thisCon = contracts.find(x => x.cftcContractMarketCode === cftcCode);
        return (
            <div className="my-2">
                <h2>TFF</h2>
                <div>
                    {cftcCode}
                </div>
                <div>
                    {thisCon && (
                        <Tff cftcCode={cftcCode} contract={thisCon} />
                    )}
                </div>
            </div>
        );
    } else if (params.slug.length == 2) {
        return (
            <div>
                {JSON.stringify(params.slug, null, 4)}
                {contracts.map((con, idx) => {
                    if (con.commoditySubgroupName != null && fixSubgroupName(con.commoditySubgroupName!) === params.slug.at(0)! && fixSubgroupName(con.commodityName!) === params.slug.at(1)!) {
                        return (
                            <p key={idx}>
                                {fixSubgroupName(con.commodityName!)}
                                /
                                {con.cftcContractMarketCode}
                            </p>
                        );
                    }
                })}
            </div>
        );
    } else if (params.slug.length == 1) {
        return (
            <div>
                {JSON.stringify(params.slug, null, 4)}
                {contracts.map((con, idx) => {
                    if (con.commoditySubgroupName != null && fixSubgroupName(con.commoditySubgroupName!) === params.slug.at(0)!) {
                        return (
                            <p key={idx}>
                                {fixSubgroupName(con.commoditySubgroupName!)}
                                /
                                {fixSubgroupName(con.commodityName!)}
                                /
                                {con.cftcContractMarketCode}
                                - {con.contractMarketName ?? ''}
                            </p>
                        )
                    }
                })}
            </div>
        );
    }
    return null;
}

export async function generateStaticParams() {
    const api = new SocrataApi();
    const contracts = await api.fetchAvailableContracts({ reportType: CFTCReportType.FinancialFutures });
    let slugs = [];
    contracts.forEach((con) => {
        if (con.commoditySubgroupName == null || con.commodityName == null) return;
        slugs.push({
            slug: [fixSubgroupName(con.commoditySubgroupName!), fixSubgroupName(con.commodityName!), con.cftcContractMarketCode],
        });
    });
    let s = new Set<[string, string]>();
    for (const con of contracts) {
        if (con.commoditySubgroupName != null && con.commodityName != null)
            s.add([fixSubgroupName(con.commoditySubgroupName!), fixSubgroupName(con.commodityName!)]);
    }
    for (let [[subgroupName, commodityName]] of Array.from(s.entries())) {
        slugs.push({
            slug: [subgroupName, commodityName],
        });
    }
    return slugs;
}

function fixSubgroupName(subgroupName: string): string {
    return subgroupName.toLowerCase().split(' ').join('-');
}