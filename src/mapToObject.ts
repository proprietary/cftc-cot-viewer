
export function mapToObject<K, V>(m: Map<K, V>) {
    let out: any = {};
    for (const [k, v] of m.entries()) {
        if (v instanceof Map) {
            out[k] = mapToObject(v);
        } else if (v instanceof Object) {
            let secondary: any = {};
            for (let branch of Object.keys(v)) {
                if ((v as any)[branch] instanceof Map) {
                    secondary[branch] = mapToObject((v as any)[branch]);
                } else {
                    secondary[branch] = (v as any)[branch];
                }
            }
            out[k] = secondary;
        } else {
            out[k] = v;
        }
    }
    return out;
}
