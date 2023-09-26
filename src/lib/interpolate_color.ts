export function interpolateColor(value: number, min: number = -1., max: number = 1.): string {
    // put in range of [0, 1]
    value = (value + Math.abs(min)) / (max - min);
    // 0deg (red) to 120deg (green)
    const hue = 0 + value * 30;
    const saturation = 80;
    const lightness = 50;
    const hsl = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    return hsl;
}
