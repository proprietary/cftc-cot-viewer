import { CFTCCommodityCode, IPriceFeed, PriceBar } from '../common_types';
import { CommodityContractKind } from './CommodityContractKind';

export class StaticCommodityInfo {
    public static lookup(contract: CommodityContractKind): ICommodityInfoDetail | null {
        for (const entry of CommodityCodes[contract.cftcCommodityCode] ?? []) {
            if (entry.matcher && !entry.matcher(contract)) {
                continue;
            }
            return entry;
        }
        return null;
    }
}

export interface ICommodityInfoDetail {
    name: string,
    cftcCommodityCode: string,
    priceFeeds: IPriceFeed[],
    urls?: string[],
    ticker?: string,
    priceChartUrls?: string[],
    matcher?: (contract: CommodityContractKind) => boolean,
};

export interface ICommodityCodes {
    [cftcCommodityCode: CFTCCommodityCode]: ICommodityInfoDetail[],
};

export const CommodityCodes: ICommodityCodes = {
    '043': [{
        name: 'UST 10Y Note',
        cftcCommodityCode: '043',
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
    }],
    '020': [{
        name: 'UST Bond',
        cftcCommodityCode: '020',
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
    }],
    '042': [{
        name: 'UST 2Y Note',
        cftcCommodityCode: '042',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'DGS2',
                name: '2 Year Treasury Yield (inverted)',
                transforms: [fredTreasuryYield],
            },
        ],
    }],
    '044': [{
        name: 'UST 5Y Note',
        cftcCommodityCode: '044',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'DGS5',
                name: '5 Year Treasury Yield (inverted)',
                transforms: [fredTreasuryYield],
            },
        ],
    }],
    '138': [{
        name: 'S&P 500',
        cftcCommodityCode: '138',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'SP500',
                name: 'S&P 500 index spot',
                transforms: [],
            },
        ],
        matcher: (contract) => ['S&P 500 Consolidated', 'E-MINI S&P 500'].includes(contract.contractMarketName),
    }],
    '209': [{
        name: 'Nasdaq-100',
        cftcCommodityCode: '209',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'NASDAQ100',
                name: 'Nasdaq-100 index spot',
            },
        ],
    }],
    '124': [{
        name: 'DJIA',
        cftcCommodityCode: '124',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'DJIA',
                name: 'Dow Jones Industrial Average index spot',
            },
        ],
    }],
    '117': [{
        name: 'VIX',
        cftcCommodityCode: '117',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'VIXCLS',
                name: 'VIX spot',
            },
        ],
    }],
    '095': [{
        name: 'Mexican Peso',
        cftcCommodityCode: '095',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'DEXMXUS',
                name: 'U.S. Dollar to Mexican Peso spot exchange rate',
                transforms: [(x: number) => x * -1],
            },
        ],
        urls: [
            'https://www.cmegroup.com/markets/fx/emerging-market/mexican-peso.html',
        ],
    }],
    '090': [{
        name: 'Canadian Dollar',
        cftcCommodityCode: '090',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'DEXCAUS',
                name: 'U.S. Dollar to Canadian Dollar spot exchange rate',
                transforms: [(x: number) => x * -1],
            },
        ],
    }],
    '112': [{
        name: 'New Zealand Dollar',
        cftcCommodityCode: '112',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'DEXUSNZ',
                name: 'U.S. Dollar to New Zealand Dollar spot exchange rate',
                transforms: [(x: number) => x * -1],
            },
        ],
    }],
    '102': [{
        name: 'Brazilian Real',
        cftcCommodityCode: '102',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'DEXBZUS',
                name: 'U.S. Dollar to Brazilian Reals spot exchange rate',
                transforms: [(x: number) => x * -1],
            },
        ],
    }],
    '133': [{
        name: 'Bitcoin',
        cftcCommodityCode: '133',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'CBBTCUSD',
                name: 'Bitcoin (Coinbase)',
                transforms: [],
            },
        ],
    }],
    '146': [{
        name: 'Ether',
        cftcCommodityCode: '146',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'CBETHUSD',
                name: 'Ethereum (Coinbase)',
                transforms: [],
            },
        ],
    }],
    '097': [{
        name: 'Japanese Yen',
        cftcCommodityCode: '097',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'DEXJPUS',
                name: 'U.S. Dollar to Japanese Yen spot exchange rate',
                transforms: [(x: number) => x * -1],
            },
        ],
    }],
    '092': [{
        name: 'Swiss Franc',
        cftcCommodityCode: '092',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'DEXSZUS',
                name: 'U.S. Dollar to Swiss Francs spot exchange rate',
                transforms: [(x: number) => x * -1]
            },
        ],
    }],
    '232': [{
        name: 'Australian Dollar',
        cftcCommodityCode: '232',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'DEXUSAL',
                name: 'U.S. Dollars to Australian Dollar spot exchange rate',
                transforms: [],
            },
        ],
    }],
    '099': [{
        name: 'Euro',
        cftcCommodityCode: '099',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'DEXUSEU',
                name: 'U.S. Dollars to Euro spot exchange rate',
                transforms: [],
            },
        ],
    }],
    '122': [{
        name: 'South African Rand',
        cftcCommodityCode: '122',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'DEXSFUS',
                name: 'U.S. Dollar to South African Rand spot exchange rate',
                transforms: [(x: number) => x * -1],
            },
        ],
    }],
    '240': [{
        name: 'Nikkei 225',
        cftcCommodityCode: '240',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'NIKKEI225',
                name: 'Nikkei 225 Stock Average index spot',
                transforms: [],
            },
        ],
    }],
    '098': [{
        name: 'USD Index',
        cftcCommodityCode: '098',
        priceFeeds: [
            {
                source: 'FRED',
                symbol: 'DTWEXBGS',
                name: 'Nominal Broad U.S. Dollar Index (not DXY but similar)',
                transforms: [],
            },
        ],
    }],
    '134': [{
        name: 'SOFR-1M',
        cftcCommodityCode: '134',
        matcher: (c) => c.contractMarketName === 'SOFR-1M',
        priceFeeds: [
            {
                source: 'FRED',
                name: '30-Day Average SOFR',
                symbol: 'SOFR30DAYAVG',
                transforms: [],
            },
        ],
    },
    {
        name: 'SOFR-3M',
        cftcCommodityCode: '134',
        matcher: c => c.contractMarketName === 'SOFR-3M',
        priceFeeds: [
            {
                source: 'FRED',
                name: '90-Day Average SOFR',
                symbol: 'SOFR90DAYAVG',
                transforms: [],
            },
        ],
    }],
    '001': [
        {
            name: 'Wheat',
            cftcCommodityCode: '001',
            priceFeeds: [
                {
                    source: 'FRED',
                    name: 'Global price of wheat',
                    symbol: 'PWHEAMTUSDM',
                    transforms: [],
                },
            ],
        },
    ],
    '002': [
        {
            name: 'Corn',
            cftcCommodityCode: '002',
            priceFeeds: [
                {
                    source: 'FRED',
                    name: 'Global price of corn',
                    symbol: 'PMAIZMTUSDM',
                    transforms: [],
                },
            ],
        },
    ],
    '005': [
        {
            name: 'Soybeans',
            cftcCommodityCode: '005',
            priceFeeds: [
                {
                    source: 'FRED',
                    name: 'Global price of soybeans',
                    symbol: 'PSOYBUSDQ',
                    transforms: [],
                },
            ],
        },
    ],
    '067': [
        {
            name: 'WTI Crude Oil',
            cftcCommodityCode: '067',
            priceFeeds: [
                {
                    source: 'FRED',
                    name: 'Crude Oil Prices: West Texas Intermediate (WTI) - Cushing, Oklahoma',
                    symbol: 'DCOILWTICO',
                    transforms: [],
                },
            ],
        },
    ],
    '083': [
        {
            name: 'Coffee',
            cftcCommodityCode: '083',
            priceFeeds: [
                {
                    source: 'FRED',
                    name: 'Global price of coffee, other mild arabica',
                    symbol: 'PCOFFOTMUSDM',
                    transforms: [],
                },
            ],
        },
    ],
    '085': [
        {
            name: 'Copper',
            cftcCommodityCode: '085',
            priceFeeds: [
                {
                    source: 'FRED',
                    name: 'Global price of copper',
                    symbol: 'PCOPPUSDM',
                    transforms: [],
                },
            ],
        },
    ],
    '111': [
        {
            name: 'RBOB Gasoline',
            cftcCommodityCode: '111',
            priceFeeds: [
                {
                    source: 'FRED',
                    symbol: 'GASREGW',
                    name: 'US Regular All Formulations Gas Price',
                    transforms: [],
                },
            ],
        },
    ],
    '023': [
        {
            name: 'Natural Gas',
            cftcCommodityCode: '023',
            priceFeeds: [
                {
                    source: 'FRED',
                    symbol: 'DHHNGSP',
                    name: 'Henry Hub Natural Gas Spot Price',
                    transforms: [],
                },
            ],
        },
    ],
    '033': [
        {
            name: 'Cotton',
            cftcCommodityCode: '033',
            priceFeeds: [
                {
                    source: 'FRED',
                    name: 'Global price of cotton',
                    symbol: 'PCOTTINDUSDM',
                    transforms: [],
                },
            ],
        },
    ],
    '040': [
        {
            name: 'Orange Juice, Frozen Concentrate',
            cftcCommodityCode: '040',
            priceFeeds: [
                {
                    source: 'FRED',
                    name: 'Orange Juice, Frozen Concentrate, 12 Ounce Can',
                    symbol: 'APU0000713111',
                    transforms: [],
                },
            ],
        },
    ],
    '052': [
        {
            name: 'Milk',
            cftcCommodityCode: '052',
            priceFeeds: [
                {
                    source: 'FRED',
                    name: 'Milk cost per gallon in the U.S.',
                    symbol: 'APU0000709112',
                    transforms: [],
                },
            ],
        },
    ],
    '054': [
        {
            name: 'Lean Hogs',
            cftcCommodityCode: '054',
            priceFeeds: [
                {
                    source: 'FRED',
                    name: 'Global price of Swine',
                    symbol: 'PPORKUSDM',
                    transforms: [],
                },
            ],
        },
    ],
    '073': [
        {
            name: 'Cocoa',
            cftcCommodityCode: '073',
            priceFeeds: [
                {
                    source: 'FRED',
                    name: 'Global price of Cocoa',
                    symbol: 'PCOCOUSDM',
                    transforms: [],
                },
            ],
        },
    ],
};

function fredTreasuryYield(priceBars: PriceBar[]) {
    return priceBars.map((priceBar: PriceBar) => {
        return { ...priceBar, close: priceBar.close * -1.0 };
    });
}