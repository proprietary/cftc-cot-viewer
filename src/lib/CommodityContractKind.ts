import { CFTCContractMarketCode, CFTCReportType, CFTCCommodityGroupType } from "../common_types";

export interface CommodityContractKind {
    // This must be distinct.
    cftcContractMarketCode: CFTCContractMarketCode;

    reportType: CFTCReportType;

    group?: CFTCCommodityGroupType;

    // location of where it's traded, e.g., NYC
    cftcRegionCode?: string;

    // name of the exchange
    cftcMarketCode?: string;

    // Distinct code for a specific commodity. For example, crude oil is always "067", and contracts with WTI or Brent both have "067".
    cftcCommodityCode?: string;

    // e.g., NATURAL GAS AND PRODUCTS
    commoditySubgroupName?: string;

    cftcSubgroupCode?: string;

    // e.g., BUTANE OPIS MT BELV NONTET FP  - ICE FUTURES ENERGY DIV
    marketAndExchangeNames?: string;

    // name of the contract itself, e.g., E-mini S&P 500
    contractMarketName?: string;

    // e.g., NATURAL GAS LIQUIDS
    commodityName?: string;

    // corresponds to column `commodity` in the API result--no idea if it's different from `commodityName`
    commodity?: string;
}
