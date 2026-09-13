# TastyFruitDrop

Clone của game "Fruit Match Drop Puzzle" (drop-and-match funnel puzzle), viết bằng **Cocos Creator 3.8.8 + TypeScript**.

**Tài liệu thiết kế đầy đủ nằm ở [`PLAN.md`](./PLAN.md) — luôn đọc file đó trước khi làm việc trong repo này.** File này (`CLAUDE.md`) chỉ tóm tắt để định hướng nhanh; mọi chi tiết luật chơi, giả định cần xác nhận, và checklist theo Phase đều ở `PLAN.md`. Khi hoàn thành một hạng mục trong `PLAN.md`, cập nhật checkbox `[x]` ở đó — đừng để tài liệu bị lệch khỏi code thật (đã từng xảy ra: xem note "Sửa 2026-09-14" trong Phase 2).

## Core loop (tóm tắt, xem PLAN.md mục 0 để đầy đủ)

- Một cụm quả xếp cố định phía trên (`FruitLayoutRoot`), đặt tay trong Editor (không sinh bằng công thức).
- Tap 1 quả → vật lý thật (Box2D, `RigidBody2D` Static→Dynamic) kéo nó rơi xuống khe giữa 2 vách (`WallLeft`/`WallRight`) vào `SlotRoot` (phễu, sức chứa `maxCapacity`).
- 2 quả cùng `fruitId` **chạm nhau thật** (Box2D contact) trong Slot → cả 2 biến mất.
- Slot vượt `maxCapacity` → **Lose**. Layout dọn sạch hết các hàng (tự tụt dần, neo vào node `BottomFruitLine`) → **Win**.
- Mở rộng sau (Phase 9, chưa code): quả Ice/Lock qua hệ modifier gắn thêm, không tạo loại quả riêng.

## Vật lý — điều bắt buộc phải biết trước khi sửa collider

- Backend phải là **Box2D** (Builtin không hỗ trợ `RigidBody2D`).
- Box2D chỉ hỗ trợ polygon **lồi (convex)**. Polygon lõm (chuối, chùm nho...) bị Box2D tự tách + phình to hơn hình vẽ khi chạy thật (đứng yên nhìn đúng, chạy vật lý mới lộ bug).
  → **Mọi quả dùng `CircleCollider2D`**, không dùng `PolygonCollider2D` cho quả. Vách (`WallLeft`/`WallRight`) dùng `PolygonCollider2D` (chấp nhận được vì hình thang đơn giản, lồi). Sàn/`SlotZone` dùng `BoxCollider2D`.
- Node không gắn `RigidBody2D` vẫn tự là static body — không cần gắn `RigidBody2D` cho vách/sàn/`SlotZone`.

## Kiến trúc code (`assets/Scripts/`)

```
Core/       GameManager (state Win/Lose, giữ FruitDatabase), GameEnums (GameState),
            InputManager (tap → testPoint), Singleton (base class .getInstance())
Data/       FruitData (id + icon), FruitDatabase (Component, @property([FruitData]))
Events/     GameEvents.ts — HIỆN ĐANG RỖNG, chưa dùng (xem note dưới)
Fruit/      FruitItem — component gắn trên từng quả: tap, rơi, contact-match, tự gán sprite theo fruitId ở start()
Layout/     LayoutRowDescent — tự nhóm hàng theo toạ độ Y (không có row/col tường minh), tụt xuống neo BottomFruitLine, gọi Win khi hết hàng
Slot/       SlotController (đếm quả trong Slot, xoá cặp match, check overflow → Lose), SlotZone (marker, gắn trên collider vùng Slot)
UI/         UIManager (Singleton, show/hide WinPanel/LosePanel + retry() load lại scene) — gắn vào node Canvas
```

- Tất cả script quản lý (`GameManager`, `SlotController`, `LayoutRowDescent`, `UIManager`) kế thừa `Singleton` → gọi qua `XxxManager.getInstance()`. **Không dùng Event Bus dù `GameEvents.ts` đã có sẵn file** — đây là lệch hướng có chủ đích so với thiết kế gốc ở PLAN.md mục 2.3/2.6, chấp nhận được vì core loop còn nhỏ. Nếu thêm nhiều UI/HUD lắng nghe nhiều sự kiện, cân nhắc chuyển sang `GameEvents` lúc đó thay vì thêm tham chiếu chéo trực tiếp.
- `FruitItem.fruitId` (số) là nguồn xác định loại quả — **không dùng enum `FruitType`**. Tra icon qua `GameManager.getInstance().fruitDatabase.getById(fruitId)` trong `start()` (dùng `start()` chứ không phải `onLoad()`, vì phải đảm bảo `GameManager` đã đăng ký Singleton xong).
- Layout không có khái niệm row/col trong data — `LayoutRowDescent` tự nhóm quả thành "hàng" dựa theo toạ độ Y thật lúc `start()` (ngưỡng `rowGroupThreshold`), không đọc từ level data.
- Level luôn **xếp tay trực tiếp trên map trong Editor** (đặt từng `FruitItem` prefab, kéo vị trí + gõ `Fruit Id` tay) — đã thử hướng data-driven (JSON + generator ngẫu nhiên, Phase 7) rồi **huỷ theo quyết định của bạn (2026-09-14)**, không dùng nữa. Đừng tự ý viết lại `LevelData`/`LevelGenerator`/`LevelLoader`/`LevelController` trừ khi được yêu cầu lại — xem PLAN.md Phase 7 để biết lý do đã huỷ.
- Prefab `FruitItem-000`…`FruitItem-010` chỉ khác `fruitId` baked sẵn (để tiện kéo-thả đúng loại quả tay), cùng 1 cấu trúc collider (1 `CircleCollider2D` sensor để tap + 1 solid).

## Cocos Editor MCP (`cocos-code-mode`, quan trọng — đọc trước khi định hand-edit `.scene`/`.prefab`)

Project có cài extension `extensions/cocos-code-mode/`, expose ra các tool MCP `CocosEditor.*` (namespace `mcp__code-mode__*`) cho phép thao tác **trực tiếp lên Cocos Editor đang chạy thật** — không phải giả lập, không phải sửa file JSON tay:

- `nodeGetTree` / `nodeGetAtPath` — đọc hierarchy scene hiện đang mở trong Editor.
- `nodeCreate` / `nodeComponentAdd` / `nodeOperate` (move/copy/delete/prefab...) — tạo node, gắn component.
- `inspectorGetInstanceProperties` / `inspectorSetInstanceProperties` — đọc/ghi property của Node, Component, Asset (dùng `propertyPaths` dạng `['a.b']`, không hỗ trợ chạy code).
- `editorGetScenePreview` — chụp ảnh Scene view thật (dùng để tự kiểm tra trực quan sau khi sửa, thay vì đoán mò).
- `editorOperate` — `save_scene_or_prefab`, `refresh`, `play_preview`/`pause`/`step`/`stop`.
- **Lưu ý đã gặp:** `nodeGetAvailableComponentTypes` KHÔNG liệt kê custom script (`FruitItem`, `GameManager`, `UIManager`...) dù chúng đã compile xong và gọi `nodeComponentAdd` với đúng tên class vẫn hoạt động bình thường — đừng dùng tool đó để "kiểm tra xem script đã sẵn sàng chưa", cứ gọi thẳng `nodeComponentAdd`.
- Sau khi sửa xong nhớ gọi `editorOperate({operation:'save_scene_or_prefab'})` để lưu, và có thể `editorGetScenePreview` để tự chụp xác nhận không vỡ layout trước khi báo xong việc.
- **Giới hạn đã biết:** không có tool giả lập input (tap/click) trong Play mode — không thể tự động test hành vi runtime thật (rơi/match/thắng-thua), chỉ verify được cấu trúc scene tĩnh + ảnh chụp Scene view. Phần test tương tác thật vẫn cần người dùng tự bấm Play.

→ Vì vậy: khi cần thêm node/component vào scene (Canvas, UI, v.v.), **ưu tiên dùng các tool `CocosEditor.*` này thay vì hand-edit `.scene`/`.prefab` bằng Read/Edit** — an toàn hơn nhiều (Editor tự validate, có thể đọc lại ngay để xác nhận, chụp ảnh kiểm tra).

## Việc KHÔNG nên tự ý làm

- Đừng tự quyết định "điều kiện thua thứ 2 liên quan layout" (PLAN.md mục 4, điểm 6) — vẫn đang mở, cần người dùng xác nhận từ game gốc trước khi code.
- Đừng thêm cơ chế Ice/Lock (Phase 9) hay Meta layer (Phase 10) trước khi core loop (Phase 3-6) được verify trong Editor — các Phase này phụ thuộc lẫn nhau theo thứ tự trong PLAN.md.
- Vẫn tránh hand-edit trực tiếp nội dung JSON của `.scene`/`.prefab` qua Read/Edit khi có thể dùng `CocosEditor.*` MCP tools thay thế (xem mục trên) — chỉ hand-edit khi Editor không chạy/tool MCP không khả dụng và đã hiểu rõ format (tham chiếu `__id__` theo index mảng).

## Kiểm thử

Không có test tự động / CI. Có thể tự kiểm tra cấu trúc scene (node/component/property) và chụp ảnh Scene view qua `CocosEditor.*` MCP tools (xem mục trên) — nhưng hành vi runtime thật (tap, rơi, match, thắng/thua) vẫn cần người dùng tự bấm Play trong Editor và quan sát log console (`GAME WIN`/`GAME LOSE`) vì chưa có cách giả lập input.
