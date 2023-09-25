import { CFTCCommodityGroupType, CFTCCommodityCode, CFTCSubgroupName, CFTCReportType } from "@/common_types";
import { CommodityContractKind } from "./CommodityContractKind";
import FlatteningForwardIterator from "@/lib/flattening_forward_iterator";

export type RootCommodityContractsTreeType = {
    [commodityGroupName: string]: SubgroupsTreeType,
}

type SubgroupsTreeType = {
    [commoditySubgroupName: CFTCSubgroupName]: CommoditiesTreeType,
}

type CommoditiesTreeType = {
    [commodityName: string]: MarketAndExchangeTreeType;
}

type CommoditiesTreeType2 = {
    [cftcCommodityCode: string]: {
        byCommodityName: { commodityName: string, contractSets: ContractTriplet },
        byCftcCommodityCode: { cftcCommodityCode: string, contractSets: ContractTriplet },
        byContractMarketName: { contractMarketName: string, contractSets: ContractTriplet },
        byMarketAndExchangeName: any,
    },
}

type MarketAndExchangeTreeType = {
    [marketAndExchangeNames: string]: ContractTriplet,
}

export type ContractTriplet = {
    [reportType in CFTCReportType]: CommodityContractKind[];
}

export type CommodityContractKindVariants = {
    [reportType in CFTCReportType]: CommodityContractKind | undefined;
}

export class ContractsTree implements Iterable<CommodityContractKind> {
    private tff: readonly CommodityContractKind[];
    private disaggregated: readonly CommodityContractKind[];
    private legacy: readonly CommodityContractKind[];

    private tree: RootCommodityContractsTreeType;
    private commodityNamesToCommodityCodes: Record<string, string> = {};

    private nameEncoder: (raw: string) => string;

    constructor(nameEncoder: (raw: string) => string, tff: readonly CommodityContractKind[], disaggregated: readonly CommodityContractKind[], legacy: readonly CommodityContractKind[]) {
        this.nameEncoder = nameEncoder;
        this.tff = tff;
        this.disaggregated = disaggregated;
        this.legacy = legacy;
        this.tree = this.buildTree(tff, disaggregated, legacy);
    }

    public [Symbol.iterator](): Iterator<CommodityContractKind> {
        return new FlatteningForwardIterator(this.tff, this.disaggregated, this.legacy);
    }

    public getSubgroupNames(groupName: string): string[] {
        return Object.keys(this.tree[groupName] ?? {});
    }

    public getGroupNames(): string[] {
        return Object.keys(this.tree);
    }

    public getCommodityNames(groupName: string, subgroupName: string): string[] {
        return Object.keys(this.tree[groupName]?.[subgroupName] ?? {});
    }

    public getCommodityMarketNames(groupName: string, subgroupName: string): string[] {
        const ct: CommoditiesTreeType = this.tree[groupName][subgroupName];
        let contracts = Object.values(ct).flatMap(x => Object.values(x)).flatMap(x => Object.values(x)).flat(1);
        return Array.from(new Set(contracts.map(x => x.contractMarketName)).values());
    }

    public getCommods(groupName: string, subgroupName: string): CommodityContractKind[] {
        const ct: CommoditiesTreeType = this.tree[groupName][subgroupName];
        let contracts = Object.values(ct).flatMap(x => Object.values(x)).flatMap(x => Object.values(x)).flat(1);
        return contracts;
    }

    public select<WhereCols extends keyof CommodityContractKind, BinColumns extends keyof CommodityContractKind>(
        where: { [k in WhereCols]: string }, // Pick<CommodityContractKind, QueryCols>,
        binByCols: BinColumns[],
    ): Map<BinColumns, Map<CommodityContractKind[keyof CommodityContractKind], CommodityContractKindVariants[]>> {
        let outputMap = new Map<BinColumns, Map<CommodityContractKind[keyof CommodityContractKind], CommodityContractKindVariants[]>>();
        binByCols.forEach(g => { outputMap.set(g, new Map<CommodityContractKind[keyof CommodityContractKind], CommodityContractKindVariants[]>()); });

        for (const contract of this) {
            let ok = true;
            for (const [queryCol, queryValue] of Object.entries(where)) {
                const entry = contract[queryCol as WhereCols];
                if (entry !== queryValue && this.nameEncoder(entry?.toString() ?? '') !== queryValue) {
                    ok = false;
                    break;
                }
            }
            if (!ok) continue;
            for (const binCol of binByCols) {
                const colValue = contract[binCol];
                const outputBin = outputMap.get(binCol);
                if (outputBin == null)
                    outputMap.set(
                        binCol,
                        new Map<CommodityContractKind[keyof CommodityContractKind], CommodityContractKindVariants[]>()
                    );
                const newEntry: CommodityContractKindVariants = {
                    [CFTCReportType.FinancialFutures]: contract.reportType === CFTCReportType.FinancialFutures ? contract : undefined,
                    [CFTCReportType.Disaggregated]: contract.reportType === CFTCReportType.Disaggregated ? contract : undefined,
                    [CFTCReportType.Legacy]: contract.reportType == CFTCReportType.Legacy ? contract : undefined,
                };
                if (!outputBin!.has(colValue)) {
                    outputBin!.set(colValue, [newEntry]);
                } else {
                    let rowEntries = outputBin!.get(colValue)!;
                    let inserted = false;
                    for (let i = 0; i < rowEntries.length; ++i) {
                        let match = Object.values(rowEntries[i]).find(x => x?.cftcContractMarketCode === contract.cftcContractMarketCode);
                        if (match != null) {
                            rowEntries[i][contract.reportType] = contract;
                            inserted = true;
                            break;
                        }
                    }
                    if (!inserted) {
                        rowEntries.push(newEntry);
                    }
                    outputBin!.set(colValue, rowEntries);
                }
            }
        }
        return outputMap;
    }

    private getInnerCommodityContractsSorted(
        groupName: string,
        subgroupName: string,
        commodityName: string,
        reportType: CFTCReportType
    ): [marketAndExchangeName: string, CommodityContractKind[]][] {
        let found: MarketAndExchangeTreeType = this.tree[groupName]?.[subgroupName]?.[commodityName];
        let shaped: [marketAndExchangeName: string, CommodityContractKind[]][] = [];
        for (const [marketAndExchangeName, detail] of Object.entries(found)) {
            shaped.push([marketAndExchangeName, detail[reportType]]);
        }
        shaped.sort(([_1, reports1], [_2, reports2]) => {
            const oldest1 = Math.min(...reports1.map(x => Date.parse(x.oldestReportDate)));
            const oldest2 = Math.min(...reports2.map(x => Date.parse(x.oldestReportDate)));
            return oldest1 - oldest2;
        });
        return shaped;
    }

    public getCommodityContracts(
        groupName: string,
        subgroupName: string,
        commodityName: string,
    ): { marketAndExchangeName: string, contractsSet: ContractTriplet }[] {
        const contracts: MarketAndExchangeTreeType = this.tree[groupName]?.[subgroupName]?.[commodityName] ?? {};
        let fields = Object.entries(contracts);
        // put contracts with oldest records first; more likely to be worth seeing
        fields.sort(([_1, contractsSet1], [_2, contractsSet2]) => {
            let oldest1 = Math.min(...Object.values(contractsSet1).map((v) => Math.min(...v.map(w => Date.parse(w.oldestReportDate)))));
            let oldest2 = Math.min(...Object.values(contractsSet2).map((v) => Math.min(...v.map(w => Date.parse(w.oldestReportDate)))));
            return oldest1 - oldest2;
        })
        return fields.map(([marketAndExchangeName, contractsSet]) => ({
            marketAndExchangeName,
            contractsSet,
        }));
    }

    public getCommodityContract(groupName: string, subgroupName: string, commodityName: string, reportType: CFTCReportType, cftcContractMarketCode: string): CommodityContractKind | null {
        const cons: MarketAndExchangeTreeType = this.tree[groupName]?.[subgroupName]?.[commodityName];
        for (const [_, contractSet] of Object.entries(cons)) {
            const needle = contractSet[reportType].find(x => x.cftcContractMarketCode === cftcContractMarketCode);
            if (needle != null) {
                return needle;
            }
        }
        return null;
    }

    public getCftcCodes(
        groupName: string,
        subgroupName: string,
        commodityName: string,
    ): string[] {
        let cons: MarketAndExchangeTreeType = this.tree[groupName]?.[subgroupName]?.[commodityName];
        let dst = [];
        for (const contractSet of Object.values(cons)) {
            for (const contracts of Object.values(contractSet)) {
                for (const contract of contracts) {
                    dst.push(contract.cftcContractMarketCode);
                }
            }
        }
        return dst;
    }

    public getContractSet(
        groupName: string,
        subgroupName: string,
        commodityName: string,
        cftcContractMarketCode: string,
    ): [marketAndExchangeName: string, contractSet: ContractTriplet] {
        let cons: MarketAndExchangeTreeType = this.tree[groupName]?.[subgroupName]?.[commodityName];
        for (const [marketAndExchangeName, contractSet] of Object.entries(cons)) {
            for (const contracts of Object.values(contractSet)) {
                if (contracts.findIndex(x => x.cftcContractMarketCode === cftcContractMarketCode) !== -1) {
                    return [marketAndExchangeName, contractSet];
                }
            }
        }
        return ['', { [CFTCReportType.FinancialFutures]: [], [CFTCReportType.Disaggregated]: [], [CFTCReportType.Legacy]: [] }];
    }

    public getMarketAndExchangeNames(
        groupName: string,
        subgroupName: string,
        commodityName: string,
    ): string[] {
        return this.getCommodityContracts(
            groupName,
            subgroupName,
            commodityName,
        ).map(({ marketAndExchangeName }) => marketAndExchangeName);
    }

    public getCommodityContractsByReportType(
        groupName: string,
        subgroupName: string,
        commodityName: string,
        marketAndExchangeName: string,
        reportType: CFTCReportType,
    ): CommodityContractKind[] {
        return this.tree[groupName]?.[subgroupName]?.[commodityName]?.[marketAndExchangeName]?.[reportType] ?? [];
    }

    public getCommodityCodeFromName(commodityName: string): string | null {
        return this.commodityNamesToCommodityCodes[commodityName] ?? null;
    }

    public encodeName(src: string): string {
        return this.nameEncoder(src);
    }

    private buildTree(...src: Array<readonly CommodityContractKind[]>): RootCommodityContractsTreeType {
        const e = this.nameEncoder;
        let dst: RootCommodityContractsTreeType = {
            [e(CFTCCommodityGroupType.Agriculture)]: {},
            [e(CFTCCommodityGroupType.NaturalResources)]: {},
            [e(CFTCCommodityGroupType.Financial)]: {},
        };
        for (const contracts of src) {
            for (const contract of contracts) {
                if (contract == null || contract.group == null || contract.commoditySubgroupName == null || contract.commodityName == null || contract.commodity == null) {
                    continue;
                }
                if (dst[e(contract.group)] == null) {
                    console.error(`Unexpected group name: ${contract.group}`);
                    dst[e(contract.group)] = {};
                }
                if (dst[e(contract.group)][e(contract.commoditySubgroupName)] == null) {
                    dst[e(contract.group)][e(contract.commoditySubgroupName)] = {};
                }
                if (dst[e(contract.group)][e(contract.commoditySubgroupName)][e(contract.commodityName)] == null) {
                    dst[e(contract.group)][e(contract.commoditySubgroupName)][e(contract.commodityName)] = {};
                }
                if (dst[e(contract.group)][e(contract.commoditySubgroupName)][e(contract.commodityName)][contract.marketAndExchangeNames] == null) {
                    dst[e(contract.group)][e(contract.commoditySubgroupName)][e(contract.commodityName)][contract.marketAndExchangeNames] = {
                        [CFTCReportType.Disaggregated]: [],
                        [CFTCReportType.FinancialFutures]: [],
                        [CFTCReportType.Legacy]: [],
                    };
                }
                dst[e(contract.group)][e(contract.commoditySubgroupName)][e(contract.commodityName)][contract.marketAndExchangeNames][contract.reportType].push(contract);
                this.commodityNamesToCommodityCodes[e(contract.commodityName)] = contract.cftcCommodityCode;
            }
        }
        return dst;
    }
}
