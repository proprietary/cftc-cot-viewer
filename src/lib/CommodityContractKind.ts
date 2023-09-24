import { CFTCContractMarketCode, CFTCReportType, CFTCCommodityGroupType } from "../common_types";

export interface CommodityContractKind {
    // Internal enum to tag this struct. This is not in the API output.
    reportType: CFTCReportType;

    // oldest report date as reported by Socrata/CFTC API, as an ISO date string
    // this is not one of the API columns by default; have to ask for it via `select min(date...)`
    oldestReportDate: string,

    // The rest of these all correspond 1-to-1 with the API result columns:
    
    // This must be distinct.
    cftcContractMarketCode: CFTCContractMarketCode;

    group: CFTCCommodityGroupType;

    // location of where it's traded, e.g., NYC
    cftcRegionCode: string;

    // name of the exchange
    cftcMarketCode: string;

    // Distinct code for a specific commodity. For example, crude oil is always "067", and contracts with WTI or Brent both have "067".
    cftcCommodityCode: string;

    // e.g., NATURAL GAS AND PRODUCTS
    commoditySubgroupName: string;

    // Not always present; Legacy COT reports don't have htis field
    cftcSubgroupCode?: string;

    // e.g., BUTANE OPIS MT BELV NONTET FP  - ICE FUTURES ENERGY DIV
    marketAndExchangeNames: string;

    // name of the contract itself, e.g., E-mini S&P 500
    contractMarketName: string;

    // e.g., NATURAL GAS LIQUIDS
    commodityName: string;

    // corresponds to column `commodity` in the API result--no idea if it's different from `commodityName`
    commodity: string;

}
