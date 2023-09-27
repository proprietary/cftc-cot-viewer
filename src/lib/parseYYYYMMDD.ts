/// Parses date string like 2023-09-01 to `Date`
export function parseYYYYMMDD(yyyyMMDD: string): Date {
    let parts = yyyyMMDD.split('-')
    if (
        parts.length !== 3 ||
        parts[0].length !== 4 ||
        parts[1].length !== 2 ||
        parts[2].length !== 2
    )
        return new Date(0)
    let [yyyy, mm, dd]: string[] = parts
    let yyyy_n = parseInt(yyyy)
    let mm_n = parseInt(mm[0]) * 10 + parseInt(mm[1])
    let dd_n = parseInt(dd[0]) * 10 + parseInt(dd[1])
    let result = new Date(yyyy_n, mm_n - 1, dd_n)
    return isValidDate(result) ? result : new Date(0)
}

function isValidDate(d: Date): boolean {
    return d instanceof Date && !isNaN(d.getTime())
}
