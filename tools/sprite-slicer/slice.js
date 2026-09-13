const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
    const flags = {};
    const positional = [];
    for (const token of argv) {
        if (token.startsWith('--')) {
            const [key, value] = token.slice(2).split('=');
            flags[key] = value === undefined ? true : value;
        } else {
            positional.push(token);
        }
    }
    return { input: positional[0], outDir: positional[1], flags };
}

function colorDistance(r1, g1, b1, r2, g2, b2) {
    const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
    return Math.sqrt(dr * dr + dg * dg + db * db);
}

async function main() {
    const { input, outDir, flags } = parseArgs(process.argv.slice(2));
    if (!input || !outDir) {
        console.error('Usage: node slice.js <input.png> <outDir> [--prefix=fruit] [--min-size=16] [--padding=2] [--alpha-threshold=10] [--color-threshold=24]');
        process.exit(1);
    }

    const prefix = flags.prefix || 'sprite';
    const minSize = parseInt(flags['min-size'] || '16', 10);
    const padding = parseInt(flags.padding || '2', 10);
    const alphaThreshold = parseInt(flags['alpha-threshold'] || '10', 10);
    const colorThreshold = parseInt(flags['color-threshold'] || '24', 10);

    const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;

    const idx = (x, y) => (y * width + x) * channels;
    const bgR = data[idx(0, 0)];
    const bgG = data[idx(0, 0) + 1];
    const bgB = data[idx(0, 0) + 2];

    const isBackground = (x, y) => {
        const i = idx(x, y);
        const a = data[i + 3];
        if (a <= alphaThreshold) return true;
        return colorDistance(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB) <= colorThreshold;
    };

    const labels = new Int32Array(width * height).fill(-1);
    const queue = new Int32Array(width * height);
    const blobs = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const p = y * width + x;
            if (labels[p] !== -1 || isBackground(x, y)) continue;

            let head = 0, tail = 0;
            queue[tail++] = p;
            labels[p] = blobs.length;
            let minX = x, maxX = x, minY = y, maxY = y;

            while (head < tail) {
                const cp = queue[head++];
                const cx = cp % width;
                const cy = (cp - cx) / width;
                if (cx < minX) minX = cx;
                if (cx > maxX) maxX = cx;
                if (cy < minY) minY = cy;
                if (cy > maxY) maxY = cy;

                const neighbors = [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]];
                for (const [nx, ny] of neighbors) {
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    const np = ny * width + nx;
                    if (labels[np] !== -1 || isBackground(nx, ny)) continue;
                    labels[np] = blobs.length;
                    queue[tail++] = np;
                }
            }

            blobs.push({ minX, minY, maxX, maxY });
        }
    }

    const kept = blobs
        .filter(b => (b.maxX - b.minX + 1) >= minSize && (b.maxY - b.minY + 1) >= minSize)
        .sort((a, b) => (a.minY - b.minY) || (a.minX - b.minX));

    fs.mkdirSync(outDir, { recursive: true });
    const manifest = [];

    for (let i = 0; i < kept.length; i++) {
        const b = kept[i];
        const left = Math.max(0, b.minX - padding);
        const top = Math.max(0, b.minY - padding);
        const right = Math.min(width, b.maxX + 1 + padding);
        const bottom = Math.min(height, b.maxY + 1 + padding);
        const w = right - left;
        const h = bottom - top;
        const fileName = `${prefix}_${String(i).padStart(2, '0')}.png`;

        await sharp(input).extract({ left, top, width: w, height: h }).toFile(path.join(outDir, fileName));
        manifest.push({ index: i, file: fileName, x: left, y: top, width: w, height: h });
    }

    fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`Sliced ${kept.length} sprite(s) into ${outDir}`);
    console.table(manifest.map(m => ({ file: m.file, x: m.x, y: m.y, w: m.width, h: m.height })));
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
