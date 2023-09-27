
export function mapToObject<K, V>(m: Map<K, V>) {
    let out: any = {};
    for (const [k, v] of m.entries()) {
        if (v instanceof Map) {
            out[k] = mapToObject(v);
        } else {
            out[k] = v;
        }
    }
    return out;
}
