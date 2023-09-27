import { expect, test, describe } from '@jest/globals'
import { parseYYYYMMDD } from './parseYYYYMMDD'

describe('parse YYYY-MM-DD function', () => {
    test('test cases', () => {
        let inputs = [
            '1974-01-28',
            '1974-01-29',
            '1974-01-30',
            '1974-01-31',
            '1974-02-01',
            '1974-02-04',
            '1974-02-05',
            '1974-02-06',
            '1974-02-07',
            '1974-02-08',
            '1974-02-11',
            '1974-02-12',
            '1974-02-13',
            '1974-02-14',
            '1974-02-15',
            '1974-02-18',
            '1974-02-19',
            '1974-02-20',
            '1974-02-21',
            '1974-02-22',
            '1974-02-25',
            '1974-02-26',
            '1974-02-27',
            '1974-02-28',
            '1974-03-01',
            '1974-03-04',
            '1974-03-05',
            '1974-03-06',
            '1974-03-07',
            '1974-03-08',
            '1974-03-11',
            '1974-03-12',
            '1974-03-13',
            '1974-03-14',
            '1974-03-15',
            '1974-03-18',
            '1974-03-19',
            '1974-03-20',
            '1974-03-21',
            '1974-03-22',
            '1974-03-25',
            '1974-03-26',
            '1974-03-27',
            '1974-03-28',
            '1974-03-29',
            '1974-04-01',
            '1974-04-02',
            '1974-04-03',
            '1974-04-04',
            '1974-04-05',
        ]
        let expecteds = [
            128588400000, 128674800000, 128761200000, 128847600000,
            128934000000, 129193200000, 129279600000, 129366000000,
            129452400000, 129538800000, 129798000000, 129884400000,
            129970800000, 130057200000, 130143600000, 130402800000,
            130489200000, 130575600000, 130662000000, 130748400000,
            131007600000, 131094000000, 131180400000, 131266800000,
            131353200000, 131612400000, 131698800000, 131785200000,
            131871600000, 131958000000, 132217200000, 132303600000,
            132390000000, 132476400000, 132562800000, 132822000000,
            132908400000, 132994800000, 133081200000, 133167600000,
            133426800000, 133513200000, 133599600000, 133686000000,
            133772400000, 134031600000, 134118000000, 134204400000,
            134290800000, 134377200000,
        ]
        for (let i = 0; i < inputs.length && i < expecteds.length; ++i) {
            expect(parseYYYYMMDD(inputs[i])).toBeTruthy()
            expect(parseYYYYMMDD(inputs[i]).getTime()).toEqual(expecteds[i])
        }
    })
})
