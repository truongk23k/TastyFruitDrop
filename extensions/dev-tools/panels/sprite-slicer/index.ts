declare const Editor: any;

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import sharp from 'sharp';

interface Rect { x: number; y: number; w: number; h: number; included: boolean; }

const HANDLE_HIT = 6;

function clamp(v: number, min: number, max: number) {
    return Math.min(Math.max(v, min), max);
}

function cursorForHandle(h: string): string {
    if (h === 'n' || h === 's') return 'ns-resize';
    if (h === 'e' || h === 'w') return 'ew-resize';
    if (h === 'ne' || h === 'sw') return 'nesw-resize';
    if (h === 'nw' || h === 'se') return 'nwse-resize';
    return 'move';
}

module.exports = Editor.Panel.define({
    template: `
        <div class="ss-root">
            <div class="ss-row">
                <button id="btn-pick-image">Chọn ảnh...</button>
                <span id="lbl-image">(chưa chọn ảnh)</span>
            </div>
            <div class="ss-row">
                <button id="btn-pick-output">Chọn thư mục lưu...</button>
                <span id="lbl-output">(chưa chọn thư mục)</span>
            </div>
            <div class="ss-row">
                <label><input type="radio" id="mode-auto" name="ss-mode" value="auto" checked> Auto (dò biên tự động)</label>
                <label><input type="radio" id="mode-grid" name="ss-mode" value="grid"> Grid (lưới cố định)</label>
            </div>
            <div class="ss-row ss-params" id="params-auto">
                <label>Min size <input id="in-min-size" type="number" value="16" style="width:60px"></label>
                <label>Padding <input id="in-padding" type="number" value="2" style="width:60px"></label>
                <label>Alpha ngưỡng <input id="in-alpha-th" type="number" value="10" style="width:60px"></label>
                <label>Màu ngưỡng <input id="in-color-th" type="number" value="24" style="width:60px"></label>
            </div>
            <div class="ss-row ss-params" id="params-grid" style="display:none">
                <label>Cell W <input id="in-cell-w" type="number" value="128" style="width:60px"></label>
                <label>Cell H <input id="in-cell-h" type="number" value="128" style="width:60px"></label>
                <label>Offset X <input id="in-offset-x" type="number" value="0" style="width:60px"></label>
                <label>Offset Y <input id="in-offset-y" type="number" value="0" style="width:60px"></label>
                <label>Spacing X <input id="in-spacing-x" type="number" value="0" style="width:60px"></label>
                <label>Spacing Y <input id="in-spacing-y" type="number" value="0" style="width:60px"></label>
            </div>
            <div class="ss-row">
                <button id="btn-detect">Xem trước (Detect)</button>
                <button id="btn-select-all">Chọn tất cả</button>
                <button id="btn-select-none">Bỏ chọn tất cả</button>
                <button id="btn-undo">Undo (Ctrl+Z)</button>
                <label>Prefix <input id="in-prefix" type="text" value="sprite" style="width:80px"></label>
                <button id="btn-export">Xuất file đã chọn</button>
            </div>
            <div class="ss-row" id="selected-info" style="display:none">
                <span>Vùng đang chọn: X <input id="sel-x" type="number" style="width:60px"> Y <input id="sel-y" type="number" style="width:60px"> W <input id="sel-w" type="number" style="width:60px"> H <input id="sel-h" type="number" style="width:60px"></span>
                <button id="btn-apply-selected">Áp dụng</button>
            </div>
            <div class="ss-canvas-wrap">
                <canvas id="ss-canvas"></canvas>
            </div>
            <div class="ss-log" id="ss-log"></div>
        </div>
    `,
    style: `
        .ss-root { display: flex; flex-direction: column; gap: 6px; padding: 8px; height: 100%; box-sizing: border-box; }
        .ss-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .ss-params label { display: flex; align-items: center; gap: 4px; }
        .ss-canvas-wrap { flex: 1; overflow: auto; border: 1px solid #444; background: repeating-conic-gradient(#2b2b2b 0% 25%, #232323 0% 50%) 50% / 20px 20px; }
        #ss-canvas { display: block; }
        .ss-log { height: 120px; overflow-y: auto; background: #1e1e1e; color: #ccc; font-family: monospace; font-size: 12px; padding: 4px; white-space: pre-wrap; }
    `,
    $: {
        canvas: '#ss-canvas',
        log: '#ss-log',
        btnPickImage: '#btn-pick-image',
        lblImage: '#lbl-image',
        btnPickOutput: '#btn-pick-output',
        lblOutput: '#lbl-output',
        modeAuto: '#mode-auto',
        modeGrid: '#mode-grid',
        paramsAuto: '#params-auto',
        paramsGrid: '#params-grid',
        btnDetect: '#btn-detect',
        btnSelectAll: '#btn-select-all',
        btnSelectNone: '#btn-select-none',
        btnUndo: '#btn-undo',
        btnExport: '#btn-export',
        inMinSize: '#in-min-size',
        inPadding: '#in-padding',
        inAlphaTh: '#in-alpha-th',
        inColorTh: '#in-color-th',
        inCellW: '#in-cell-w',
        inCellH: '#in-cell-h',
        inOffsetX: '#in-offset-x',
        inOffsetY: '#in-offset-y',
        inSpacingX: '#in-spacing-x',
        inSpacingY: '#in-spacing-y',
        inPrefix: '#in-prefix',
        selectedInfo: '#selected-info',
        selX: '#sel-x',
        selY: '#sel-y',
        selW: '#sel-w',
        selH: '#sel-h',
        btnApplySelected: '#btn-apply-selected',
    },
    methods: {},
    async ready() {
        const panel = this as any;
        const $ = panel.$ as { [key: string]: HTMLElement };

        const canvas = $.canvas as HTMLCanvasElement;
        const ctx = canvas.getContext('2d')!;
        const logEl = $.log;

        function log(msg: string) {
            logEl.textContent += msg + '\n';
            logEl.scrollTop = logEl.scrollHeight;
        }

        try {
            let imagePath: string | null = null;
            let outputPath: string | null = null;
            let naturalWidth = 0;
            let naturalHeight = 0;
            let displayScale = 1;
            let rects: Rect[] = [];
            let htmlImage: HTMLImageElement | null = null;
            let selectedIndex = -1;

            let dragMode: 'none' | 'move' | 'resize' | 'create' = 'none';
            let dragHandle: string | null = null;
            let dragMoved = false;
            let dragStartScreen = { x: 0, y: 0 };
            let dragStartRect: Rect | null = null;
            let createAnchor: { x: number, y: number } | null = null;
            let pendingRect: Rect | null = null;

            let undoStack: Rect[][] = [];
            function pushUndo() {
                undoStack.push(rects.map(r => ({ ...r })));
                if (undoStack.length > 50) undoStack.shift();
            }
            function undo() {
                if (undoStack.length === 0) { log('Không còn gì để undo.'); return; }
                rects = undoStack.pop()!;
                selectedIndex = -1;
                redraw();
                log('Đã undo.');
            }

            const val = (el: HTMLElement) => (el as HTMLInputElement).value;

            function currentMode(): 'auto' | 'grid' {
                return ($.modeGrid as HTMLInputElement).checked ? 'grid' : 'auto';
            }

            function updateParamVisibility() {
                const mode = currentMode();
                $.paramsAuto.style.display = mode === 'auto' ? 'flex' : 'none';
                $.paramsGrid.style.display = mode === 'grid' ? 'flex' : 'none';
            }

            function getHandles(r: Rect) {
                const sx = r.x * displayScale, sy = r.y * displayScale, sw = r.w * displayScale, sh = r.h * displayScale;
                return {
                    nw: { x: sx, y: sy }, n: { x: sx + sw / 2, y: sy }, ne: { x: sx + sw, y: sy },
                    w: { x: sx, y: sy + sh / 2 }, e: { x: sx + sw, y: sy + sh / 2 },
                    sw: { x: sx, y: sy + sh }, s: { x: sx + sw / 2, y: sy + sh }, se: { x: sx + sw, y: sy + sh },
                } as { [key: string]: { x: number, y: number } };
            }

            function hitTestHandle(r: Rect, sx: number, sy: number): string | null {
                const handles = getHandles(r);
                for (const key of Object.keys(handles)) {
                    const h = handles[key];
                    if (Math.abs(sx - h.x) <= HANDLE_HIT && Math.abs(sy - h.y) <= HANDLE_HIT) return key;
                }
                return null;
            }

            function updateSelectedInfo() {
                if (selectedIndex < 0) {
                    $.selectedInfo.style.display = 'none';
                    return;
                }
                const r = rects[selectedIndex];
                $.selectedInfo.style.display = 'flex';
                (($.selX) as HTMLInputElement).value = String(Math.round(r.x));
                (($.selY) as HTMLInputElement).value = String(Math.round(r.y));
                (($.selW) as HTMLInputElement).value = String(Math.round(r.w));
                (($.selH) as HTMLInputElement).value = String(Math.round(r.h));
            }

            function redraw() {
                if (!htmlImage) return;
                const maxW = Math.max((canvas.parentElement as HTMLElement).clientWidth - 4, 200);
                displayScale = Math.min(1, maxW / naturalWidth);
                canvas.width = Math.round(naturalWidth * displayScale);
                canvas.height = Math.round(naturalHeight * displayScale);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(htmlImage, 0, 0, canvas.width, canvas.height);
                rects.forEach((r, i) => {
                    const isSelected = i === selectedIndex;
                    ctx.strokeStyle = r.included ? '#37d67a' : '#e05555';
                    ctx.lineWidth = isSelected ? 3 : 2;
                    ctx.strokeRect(r.x * displayScale, r.y * displayScale, r.w * displayScale, r.h * displayScale);
                    ctx.fillStyle = r.included ? '#37d67a' : '#e05555';
                    ctx.font = '11px sans-serif';
                    ctx.fillText(String(i), r.x * displayScale + 2, r.y * displayScale + 12);

                    if (isSelected) {
                        ctx.strokeStyle = '#3399ff';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([4, 3]);
                        ctx.strokeRect(r.x * displayScale, r.y * displayScale, r.w * displayScale, r.h * displayScale);
                        ctx.setLineDash([]);
                        const handles = getHandles(r);
                        ctx.fillStyle = '#ffffff';
                        ctx.strokeStyle = '#3399ff';
                        Object.values(handles).forEach(h => {
                            ctx.fillRect(h.x - 4, h.y - 4, 8, 8);
                            ctx.strokeRect(h.x - 4, h.y - 4, 8, 8);
                        });
                    }
                });
                if (pendingRect) {
                    ctx.strokeStyle = '#ffcc00';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([6, 4]);
                    ctx.strokeRect(pendingRect.x * displayScale, pendingRect.y * displayScale, pendingRect.w * displayScale, pendingRect.h * displayScale);
                    ctx.setLineDash([]);
                }
                updateSelectedInfo();
            }

            function loadImageToCanvas(pathToLoad: string) {
                return new Promise<void>((resolve, reject) => {
                    const base64 = readFileSync(pathToLoad).toString('base64');
                    const ext = extname(pathToLoad).slice(1) || 'png';
                    const img = new Image();
                    img.onload = () => {
                        htmlImage = img;
                        naturalWidth = img.naturalWidth;
                        naturalHeight = img.naturalHeight;
                        rects = [];
                        selectedIndex = -1;
                        undoStack = [];
                        redraw();
                        resolve();
                    };
                    img.onerror = () => reject(new Error('Không load được ảnh'));
                    img.src = `data:image/${ext};base64,${base64}`;
                });
            }

            async function detectAuto(): Promise<Rect[]> {
                const minSize = parseInt(val($.inMinSize) || '16', 10);
                const padding = parseInt(val($.inPadding) || '2', 10);
                const alphaTh = parseInt(val($.inAlphaTh) || '10', 10);
                const colorTh = parseInt(val($.inColorTh) || '24', 10);

                const { data, info } = await sharp(imagePath as string).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
                const { width, height, channels } = info;
                const idx = (x: number, y: number) => (y * width + x) * channels;
                const bgR = data[idx(0, 0)];
                const bgG = data[idx(0, 0) + 1];
                const bgB = data[idx(0, 0) + 2];

                const isBg = (x: number, y: number) => {
                    const i = idx(x, y);
                    const a = data[i + 3];
                    if (a <= alphaTh) return true;
                    const dr = data[i] - bgR, dg = data[i + 1] - bgG, db = data[i + 2] - bgB;
                    return Math.sqrt(dr * dr + dg * dg + db * db) <= colorTh;
                };

                const labels = new Int32Array(width * height).fill(-1);
                const queue = new Int32Array(width * height);
                const blobs: { minX: number; minY: number; maxX: number; maxY: number }[] = [];

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const p = y * width + x;
                        if (labels[p] !== -1 || isBg(x, y)) continue;
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
                            const neighbors: [number, number][] = [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]];
                            for (const [nx, ny] of neighbors) {
                                if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                                const np = ny * width + nx;
                                if (labels[np] !== -1 || isBg(nx, ny)) continue;
                                labels[np] = blobs.length;
                                queue[tail++] = np;
                            }
                        }
                        blobs.push({ minX, minY, maxX, maxY });
                    }
                }

                return blobs
                    .filter(b => (b.maxX - b.minX + 1) >= minSize && (b.maxY - b.minY + 1) >= minSize)
                    .sort((a, b) => (a.minY - b.minY) || (a.minX - b.minX))
                    .map(b => {
                        const x = Math.max(0, b.minX - padding);
                        const y = Math.max(0, b.minY - padding);
                        return {
                            x,
                            y,
                            w: Math.min(width, b.maxX + 1 + padding) - x,
                            h: Math.min(height, b.maxY + 1 + padding) - y,
                            included: true,
                        };
                    });
            }

            function detectGrid(): Rect[] {
                const cellW = parseInt(val($.inCellW) || '128', 10);
                const cellH = parseInt(val($.inCellH) || '128', 10);
                const offsetX = parseInt(val($.inOffsetX) || '0', 10);
                const offsetY = parseInt(val($.inOffsetY) || '0', 10);
                const spacingX = parseInt(val($.inSpacingX) || '0', 10);
                const spacingY = parseInt(val($.inSpacingY) || '0', 10);

                const result: Rect[] = [];
                for (let y = offsetY; y + cellH <= naturalHeight; y += cellH + spacingY) {
                    for (let x = offsetX; x + cellW <= naturalWidth; x += cellW + spacingX) {
                        result.push({ x, y, w: cellW, h: cellH, included: true });
                    }
                }
                return result;
            }

            $.btnPickImage.addEventListener('click', async () => {
                try {
                    const picked = await Editor.Message.request('dev-tools', 'pick-image');
                    if (!picked) return;
                    imagePath = picked;
                    $.lblImage.textContent = picked;
                    await loadImageToCanvas(picked);
                    log(`Đã tải ảnh: ${picked}`);
                } catch (err: any) {
                    log(`Lỗi chọn ảnh: ${err.message || err}`);
                }
            });

            $.btnPickOutput.addEventListener('click', async () => {
                try {
                    const picked = await Editor.Message.request('dev-tools', 'pick-output-folder');
                    if (!picked) return;
                    outputPath = picked;
                    $.lblOutput.textContent = picked;
                    log(`Thư mục lưu: ${picked}`);
                } catch (err: any) {
                    log(`Lỗi chọn thư mục: ${err.message || err}`);
                }
            });

            $.modeAuto.addEventListener('change', updateParamVisibility);
            $.modeGrid.addEventListener('change', updateParamVisibility);

            $.btnDetect.addEventListener('click', async () => {
                try {
                    if (!imagePath) { log('Chưa chọn ảnh.'); return; }
                    const detected = currentMode() === 'auto' ? await detectAuto() : detectGrid();
                    pushUndo();
                    rects = detected;
                    selectedIndex = -1;
                    log(`Phát hiện ${rects.length} vùng.`);
                    redraw();
                } catch (err: any) {
                    log(`Lỗi detect: ${err.message || err}`);
                }
            });

            $.btnSelectAll.addEventListener('click', () => {
                pushUndo();
                rects.forEach(r => r.included = true);
                redraw();
            });

            $.btnSelectNone.addEventListener('click', () => {
                pushUndo();
                rects.forEach(r => r.included = false);
                redraw();
            });

            $.btnUndo.addEventListener('click', undo);

            $.btnApplySelected.addEventListener('click', () => {
                if (selectedIndex < 0) return;
                pushUndo();
                const r = rects[selectedIndex];
                const x = clamp(parseInt(val($.selX) || '0', 10), 0, naturalWidth - 1);
                const y = clamp(parseInt(val($.selY) || '0', 10), 0, naturalHeight - 1);
                const w = clamp(parseInt(val($.selW) || '1', 10), 1, naturalWidth - x);
                const h = clamp(parseInt(val($.selH) || '1', 10), 1, naturalHeight - y);
                r.x = x; r.y = y; r.w = w; r.h = h;
                redraw();
            });

            window.addEventListener('keydown', (ev: KeyboardEvent) => {
                const target = ev.target as HTMLElement | null;
                if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
                const isUndo = (ev.ctrlKey || ev.metaKey) && !ev.shiftKey && (ev.key === 'z' || ev.key === 'Z');
                if (isUndo) {
                    ev.preventDefault();
                    undo();
                }
            });

            canvas.addEventListener('mousedown', (ev: MouseEvent) => {
                const bounds = canvas.getBoundingClientRect();
                const sx = ev.clientX - bounds.left;
                const sy = ev.clientY - bounds.top;
                dragMoved = false;

                if (selectedIndex >= 0) {
                    const handle = hitTestHandle(rects[selectedIndex], sx, sy);
                    if (handle) {
                        pushUndo();
                        dragMode = 'resize';
                        dragHandle = handle;
                        dragStartScreen = { x: sx, y: sy };
                        dragStartRect = { ...rects[selectedIndex] };
                        return;
                    }
                }

                const ix = sx / displayScale, iy = sy / displayScale;
                let hitIndex = -1;
                for (let i = rects.length - 1; i >= 0; i--) {
                    const r = rects[i];
                    if (ix >= r.x && ix <= r.x + r.w && iy >= r.y && iy <= r.y + r.h) { hitIndex = i; break; }
                }
                if (hitIndex >= 0) {
                    selectedIndex = hitIndex;
                    pushUndo();
                    dragMode = 'move';
                    dragHandle = null;
                    dragStartScreen = { x: sx, y: sy };
                    dragStartRect = { ...rects[hitIndex] };
                } else if (selectedIndex === -1 && htmlImage) {
                    dragMode = 'create';
                    dragStartScreen = { x: sx, y: sy };
                    createAnchor = { x: clamp(ix, 0, naturalWidth), y: clamp(iy, 0, naturalHeight) };
                    pendingRect = { x: createAnchor.x, y: createAnchor.y, w: 0, h: 0, included: true };
                } else {
                    selectedIndex = -1;
                    dragMode = 'none';
                }
                redraw();
            });

            window.addEventListener('mousemove', (ev: MouseEvent) => {
                const bounds = canvas.getBoundingClientRect();
                const sx = ev.clientX - bounds.left;
                const sy = ev.clientY - bounds.top;

                if (dragMode === 'none') {
                    if (selectedIndex >= 0 && sx >= 0 && sy >= 0 && sx <= canvas.width && sy <= canvas.height) {
                        const handle = hitTestHandle(rects[selectedIndex], sx, sy);
                        canvas.style.cursor = handle ? cursorForHandle(handle) : 'pointer';
                    } else {
                        canvas.style.cursor = 'default';
                    }
                    return;
                }

                if (dragMode === 'create' && pendingRect && createAnchor) {
                    const ix = clamp(sx / displayScale, 0, naturalWidth);
                    const iy = clamp(sy / displayScale, 0, naturalHeight);
                    const x0 = Math.min(createAnchor.x, ix), y0 = Math.min(createAnchor.y, iy);
                    const x1 = Math.max(createAnchor.x, ix), y1 = Math.max(createAnchor.y, iy);
                    pendingRect.x = x0; pendingRect.y = y0; pendingRect.w = x1 - x0; pendingRect.h = y1 - y0;
                    if (Math.abs(sx - dragStartScreen.x) > 2 || Math.abs(sy - dragStartScreen.y) > 2) dragMoved = true;
                    redraw();
                    return;
                }

                if (!dragStartRect || selectedIndex < 0) return;

                const dxScreen = sx - dragStartScreen.x;
                const dyScreen = sy - dragStartScreen.y;
                if (Math.abs(dxScreen) > 2 || Math.abs(dyScreen) > 2) dragMoved = true;

                const dx = dxScreen / displayScale;
                const dy = dyScreen / displayScale;
                const start = dragStartRect;
                const r = rects[selectedIndex];
                const MIN = 4;

                if (dragMode === 'move') {
                    r.x = clamp(start.x + dx, 0, naturalWidth - start.w);
                    r.y = clamp(start.y + dy, 0, naturalHeight - start.h);
                } else if (dragMode === 'resize' && dragHandle) {
                    let x = start.x, y = start.y, w = start.w, h = start.h;
                    if (dragHandle.indexOf('e') >= 0) w = clamp(start.w + dx, MIN, naturalWidth - start.x);
                    if (dragHandle.indexOf('s') >= 0) h = clamp(start.h + dy, MIN, naturalHeight - start.y);
                    if (dragHandle.indexOf('w') >= 0) {
                        const newX = clamp(start.x + dx, 0, start.x + start.w - MIN);
                        w = start.w + (start.x - newX);
                        x = newX;
                    }
                    if (dragHandle.indexOf('n') >= 0) {
                        const newY = clamp(start.y + dy, 0, start.y + start.h - MIN);
                        h = start.h + (start.y - newY);
                        y = newY;
                    }
                    r.x = x; r.y = y; r.w = w; r.h = h;
                }
                redraw();
            });

            window.addEventListener('mouseup', () => {
                if (dragMode === 'create') {
                    if (pendingRect && pendingRect.w >= 4 && pendingRect.h >= 4) {
                        pushUndo();
                        rects.push({ ...pendingRect });
                        selectedIndex = rects.length - 1;
                        log(`Đã tạo vùng mới #${selectedIndex}`);
                    }
                    pendingRect = null;
                    createAnchor = null;
                } else if (dragMode === 'move' && !dragMoved && selectedIndex >= 0) {
                    rects[selectedIndex].included = !rects[selectedIndex].included;
                }
                dragMode = 'none';
                dragHandle = null;
                dragStartRect = null;
                redraw();
            });

            $.btnExport.addEventListener('click', async () => {
                try {
                    if (!imagePath) { log('Chưa chọn ảnh.'); return; }
                    if (!outputPath) { log('Chưa chọn thư mục lưu.'); return; }
                    const prefix = val($.inPrefix) || 'sprite';
                    const included = rects.filter(r => r.included);
                    if (included.length === 0) { log('Không có vùng nào được chọn.'); return; }

                    mkdirSync(outputPath, { recursive: true });
                    const manifest: any[] = [];
                    for (let i = 0; i < included.length; i++) {
                        const r = included[i];
                        const fileName = `${prefix}_${String(i).padStart(2, '0')}.png`;
                        await sharp(imagePath).extract({
                            left: Math.round(r.x), top: Math.round(r.y),
                            width: Math.round(r.w), height: Math.round(r.h),
                        }).toFile(join(outputPath, fileName));
                        manifest.push({ index: i, file: fileName, x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.w), height: Math.round(r.h) });
                        log(`Đã lưu ${fileName}`);
                    }
                    writeFileSync(join(outputPath, 'manifest.json'), JSON.stringify(manifest, null, 2));
                    log(`Xong. Đã xuất ${included.length} file vào ${outputPath}`);
                } catch (err: any) {
                    log(`Lỗi xuất file: ${err.message || err}`);
                }
            });

            updateParamVisibility();
            window.addEventListener('resize', redraw);
            log('Sẵn sàng.');
        } catch (err: any) {
            console.error(err);
            log(`Lỗi khởi tạo panel: ${err.message || err}`);
        }
    },
});
