function normalizeAllCaps(allCapsString: string): string[] {
    return allCapsString.toLowerCase().split(' ')
}

function normalizeSlug(slugString: string): string[] {
    return slugString.toLowerCase().split('-')
}

function toTitle(normalizedString: string[]): string {
    return normalizedString
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

function toSlug(normalizedString: string[]): string {
    return normalizedString.join('-')
}

function toAllCaps(normalizedString: string[]): string {
    return normalizedString.map((word) => word.toUpperCase()).join(' ')
}

export function allCapsToSlug(allCapsString: string): string {
    return toSlug(normalizeAllCaps(allCapsString))
}

export function allCapsToTitle(allCapsString: string): string {
    return toTitle(normalizeAllCaps(allCapsString))
}

export function slugToTitle(slugString: string): string {
    return toTitle(normalizeSlug(slugString))
}

export function slugToAllCaps(slugString: string): string {
    return toAllCaps(normalizeSlug(slugString))
}
