import { CFTCCommodityCode, IPriceFeed, PriceBar } from './common_types';

export interface ICommodityInfoDetail {
    name: string,
    priceFeeds: IPriceFeed[],
    urls?: string[],
    ticker?: string,
    priceChartUrls?: string[],
};

export interface ICommodityCodes {
    [cftcCommodityCode: CFTCCommodityCode]: ICommodityInfoDetail,
};

export const CommodityCodes: ICommodityCodes = {
    '043': {
        name: 'UST 10Y Note',
        priceFeeds: [
            {
                source: 'FRED',
                name: '10 Year Treasury Yield (inverted)',
                //  Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity, Quoted on an Investment Basis
                symbol: 'DGS10',
                // invert yield to get price
                transforms: [
                    fredTreasuryYield,
                ],
            },
        ],
    },
    '020': {
        name: 'UST Bond',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'DGS30',
                name: '30 Year Treasury Yield (inverted)',
                transforms: [
                    fredTreasuryYield,
                ]
            }
        ],
    },
    '042': {
        name: 'UST 2Y Note',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'DGS2',
                name: '2 Year Treasury Yield (inverted)',
                transforms: [fredTreasuryYield],
            },
        ],
    },
    '044': {
        name: 'UST 5Y Note',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'DGS5',
                name: '5 Year Treasury Yield (inverted)',
                transforms: [fredTreasuryYield],
            },
        ],
    },
    '138': {
        name: 'S&P 500',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'SP500',
                name: 'S&P 500 index spot',
                transforms: [],
            },
        ],
    },
    '209': {
        name: 'Nasdaq-100',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'NASDAQ100',
                name: 'Nasdaq-100 index spot',
            },
        ],
    },
    '124': {
        name: 'DJIA',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'DJIA',
                name: 'Dow Jones Industrial Average index spot',
            },
        ],
    },
    '117': {
        name: 'VIX',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'VIXCLS',
                name: 'VIX spot',
            },
        ],
    },
    '095': {
        name: 'Mexican Peso',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'DEXMXUS',
                name: 'US Dollar to Mexican Peso spot exchange rate',
                transforms: [(x: number) => x * -1],
            },
        ],
        urls: [
            'https://www.cmegroup.com/markets/fx/emerging-market/mexican-peso.html',
        ],
    },
};

function fredTreasuryYield(priceBars: PriceBar[]) {
    return priceBars.map((priceBar: PriceBar) => {
        return { ...priceBar, close: priceBar.close * -1.0 };
    });
}