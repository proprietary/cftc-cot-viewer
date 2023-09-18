export interface PriceBar {
    timestamp: Date,
    close: number,
};

export type PriceFeedSource = 'FRED' | 'unknown';

export type CFTCCommodityCode = string;

export interface IPriceFeed {
    source: PriceFeedSource,
    name: string,
    symbol: string,
    transforms?: Function[],
};