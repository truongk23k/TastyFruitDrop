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
```

- Tất cả script quản lý (`GameManager`, `SlotController`, `LayoutRowDescent`) kế thừa `Singleton` → gọi qua `XxxManager.getInstance()`. **Không dùng Event Bus dù `GameEvents.ts` đã có sẵn file** — đây là lệch hướng có chủ đích so với thiết kế gốc ở PLAN.md mục 2.3/2.6, chấp nhận được vì core loop còn nhỏ. Nếu thêm nhiều UI/HUD lắng nghe nhiều sự kiện, cân nhắc chuyển sang `GameEvents` lúc đó thay vì thêm tham chiếu chéo trực tiếp.
- `FruitItem.fruitId` (số) là nguồn xác định loại quả — **không dùng enum `FruitType`**. Tra icon qua `GameManager.getInstance().fruitDatabase.getById(fruitId)` trong `start()` (dùng `start()` chứ không phải `onLoad()`, vì phải đảm bảo `GameManager` đã đăng ký Singleton xong).
- Layout không có khái niệm row/col trong data — `LayoutRowDescent` tự nhóm quả thành "hàng" dựa theo toạ độ Y thật lúc `start()` (ngưỡng `rowGroupThreshold`), không đọc từ level data.
- Level hiện tại **hard-code trong scene** (đặt tay từng `FruitItem` prefab trong Editor) — chưa data-driven (JSON) như PLAN.md mục 2.5/Phase 7 dự tính. Đừng giả định có `LevelData.ts`/loader JSON — chưa tồn tại.

## Việc KHÔNG nên tự ý làm

- Đừng tự quyết định "điều kiện thua thứ 2 liên quan layout" (PLAN.md mục 4, điểm 6) — vẫn đang mở, cần người dùng xác nhận từ game gốc trước khi code.
- Đừng thêm cơ chế Ice/Lock (Phase 9) hay Meta layer (Phase 10) trước khi core loop (Phase 3-6) được verify trong Editor — các Phase này phụ thuộc lẫn nhau theo thứ tự trong PLAN.md.
- Đừng sửa `assets/*.scene`/`*.prefab` bằng tay qua text editor trừ khi thật sự cần và đã hiểu rõ format JSON serialize của Cocos (tham chiếu `__id__` giữa các object theo index mảng) — dễ làm hỏng scene không mở lại được trong Editor. Ưu tiên sửa qua Cocos Creator Editor hoặc chỉ sửa phần `.ts`.

## Kiểm thử

Không có test tự động / CI. Verify chỉ có thể làm bằng cách mở **Cocos Creator Editor**, bấm Play, và quan sát log console (`GAME WIN`/`GAME LOSE`) + hành vi vật lý trực quan. Claude Code không tự chạy được Cocos Editor — khi cần verify runtime, báo lại cho người dùng tự bấm Play và mô tả kết quả.
