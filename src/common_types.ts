export interface PriceBar {
    timestamp: Date,
    close: number,
};

export type PriceFeedSource = 'FRED' | 'unknown';

export type CFTCCommodityCode = string;

export type CFTCSubgroupName = string;

export interface IPriceFeed {
    source: PriceFeedSource,
    name: string,
    symbol: string,
    transforms?: Function[],
};
export enum CFTCReportType {
    FinancialFutures,
    Disaggregated,
    Legacy
}

export enum CFTCCommodityGroupType {
    Financial = "FINANCIAL INSTRUMENTS",
    NaturalResources = "NATURAL RESOURCES",
    Agriculture = "AGRICULTURE",
}

export type CFTCContractMarketCode = string;
