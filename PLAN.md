# PLAN — Clone game "Fruit Match Drop Puzzle" (dự án TastyFruitDrop)

> Trạng thái: **CHƯA CODE** — đây chỉ là tài liệu kế hoạch/thiết kế. Mọi mục bên dưới cần được bạn duyệt trước khi bắt đầu implement theo từng Phase.

---

## 0. Nghiên cứu & căn cứ xác nhận cơ chế

Đã đối chiếu 3 nguồn để chốt lại luật chơi:

1. Mô tả gameplay của bạn (người chơi thật).
2. Ảnh chụp màn hình thua hiện có trong `assets/Screenshot/ss.png` (đây rất có thể là asset lấy trực tiếp từ game gốc) — cho thấy rõ: một cụm quả xếp hình kim cương/pyramid ở nửa trên màn hình, phía dưới là hai vách dốc (tường đất/cỏ) tạo thành hình phễu, ở giữa có một khe hở thẳng đứng (Slot), có quả đang rơi trong khe, và banner "Keep Trying" (thua).
3. Tìm hiểu các game cùng thể loại (thể loại "drop-and-match funnel puzzle", gần với dòng game kiểu *Fruit Drop / Fruit Match funnel*): tap vào quả để nó rơi xuống phễu; phễu chỉ chứa được số lượng quả giới hạn; 2 quả cùng loại nằm cạnh nhau trong phễu sẽ nổ/biến mất; quả dồn ứ tới đỉnh (hoặc layout tụt quá thấp) thì thua.

➡️ Kết luận, luật chơi lõi (core loop) được chốt như sau:

- **Layout quả (trên):** một cụm quả được xếp cố định theo dạng lưới kim cương/hàng lệch (giống hình tam giác/kim cương trong ảnh). Toàn bộ quả trong layout đều **có thể tap được** (không bị che khuất theo chiều sâu — khác với game kiểu "Toy Blast" nơi quả bị chặn bởi quả phía trước).
- **Tap quả → quả rơi xuống Slot** (khe hở ở giữa 2 vách dốc), theo một hiệu ứng rơi (fall animation) đi từ vị trí gốc trong layout tới vị trí trống tiếp theo trong Slot.
- **Slot (phễu chứa):** có `maxCapacity` cố định (ví dụ 7 hoặc 9 — cần bạn xác nhận số thật từ game gốc, xem mục 6 "Giả định cần xác nhận"). Quả xếp vào Slot theo thứ tự rơi vào (giống hàng đợi/queue).
- **Điều kiện ăn quả (match):** khi 2 quả **cùng loại** nằm **kề nhau** trong Slot → cả 2 biến mất (hiệu ứng nổ dùng `generic_explosion_big_sheet.png`), các quả còn lại trong Slot dồn lại để lấp khoảng trống (giống cơ chế "collapse" của Candy Crush theo chiều ngang).
- **Layout tự tụt xuống (gravity của layout):** có 1 node/marker cố định tên **`BottomFruitLine`** đánh dấu điểm đáy mà hàng quả dưới cùng luôn neo/dừng vào đó. Mỗi khi hàng dưới cùng hiện tại bị dọn sạch, toàn bộ cụm quả phía trên dịch xuống 1 bước để hàng kế tiếp trở thành hàng dưới cùng mới, neo lại đúng vào `BottomFruitLine`. Nói cách khác: layout co lại dần theo chiều dọc, đẩy toàn bộ cụm quả trượt xuống gần phễu hơn qua thời gian chơi — `BottomFruitLine` chỉ là điểm neo/tham chiếu vị trí, không phải một "vạch nếu chạm là thua".
- **Điều kiện THUA:**
  1. Slot bị đầy vượt `maxCapacity` (không còn chỗ nhận quả mới mà không match được) → thua. (Đã xác nhận.)
  2. Có thể còn 1 điều kiện thua nữa liên quan đến layout quả (ví dụ: cụm quả không còn chỗ để dồn xuống mà vẫn còn quả phía trên, tràn lên đỉnh màn hình...) — **chưa chốt cơ chế chính xác**, xem mục 6 "Giả định cần xác nhận". Tạm thời code Phase 5/6 chỉ xử lý chắc chắn điều kiện (1); điều kiện (2) để ngỏ, bổ sung sau khi xác nhận thêm từ game gốc.
- **Điều kiện THẮNG:** layout quả trên được dọn sạch hoàn toàn (và Slot cũng được dọn sạch hết, không còn quả kẹt lại) → thắng.
- **Cơ chế mở rộng (theo bạn mô tả, sẽ có ở level sau):**
  - **Quả đóng băng (Ice):** quả bị bọc lớp đá (asset có sẵn `Ice_big.png`) — không rơi được ngay khi tap, cần điều kiện phụ để phá băng trước (ví dụ: tap N lần, hoặc quả cùng loại match cạnh nó, hoặc hết X lượt).
  - **Quả khóa (Lock):** quả bị khóa/xích — cần một điều kiện mở khóa riêng (ví dụ: dọn hết quả xung quanh, hoặc cần "chìa khóa" xuất hiện từ match khác).
  - Đây là các *modifier* gắn thêm vào một quả bình thường, không phải loại quả mới — thiết kế hệ thống cần cho phép gắn modifier vào bất kỳ ô layout nào (mục 2.4).
- **Lớp Meta ngoài gameplay** (suy ra từ asset đã có sẵn trong `assets/Texture`): màn Home có bản đồ level dạng world-map (`sactx-...map_0_0...`), hệ thống mạng/tim (lives, `lose_heart-1.png`), leaderboard/rank (`sactx-...rank-...`), hộp sự kiện đếm giờ (`home_menu_timebox.png`), màn hình loading riêng (`sactx-...loading-...`). Các phần này **không phải core loop** nhưng cần được lên kế hoạch làm ở Phase sau vì asset đã tồn tại sẵn trong dự án.

---

## 1. Tổng quan kiến trúc dự án hiện tại

Đã kiểm tra dự án — đây là **Cocos Creator 3.8.8** (TypeScript), project đã được khởi tạo (`.creator/`, `package.json`, `tsconfig.json`) và đã có sẵn:

```
assets/
  AudioClip/                     (rỗng, để nhạc/SFX)
  Screenshot/ss.png              (ảnh màn hình thua — dùng làm reference)
  Scripts/
    FruitItem.ts                 (stub rỗng)
    GameEnums.ts                 (stub rỗng — hiện đang extends Component, SAI, xem mục 3.5)
    GameEvents.ts                (stub rỗng — hiện đang extends Component, SAI, xem mục 3.5)
    GameManager.ts                (stub rỗng)
  Texture/
    Fruits/ (thư mục con — chưa xem chi tiết từng sprite)
    FruitAtlas (sactx-0-1024x1024-ASTC 8x8-FruitAtlas-...)
    GamePlayAtlas (2 file 2048x2048 — UI/hiệu ứng trong màn chơi)
    map_0_0 atlas                 (bản đồ chọn level)
    rank atlas                    (leaderboard)
    loading atlas
    Ice_big.png                   (overlay quả đóng băng)
    lose_heart-1.png, lose_basket_empty.png (UI màn thua / lives)
    home_menu_btn.png, home_menu_timebox.png (UI màn Home)
    Gamepplay_Wall_L.png / _R.png  (2 vách phễu trái/phải)
    generic_explosion_big_sheet.png (spritesheet hiệu ứng nổ khi match)
    btn_blue.png, btn_green.png    (nút bấm chung)
```

**Quan trọng:** `GameEnums.ts` và `GameEvents.ts` hiện đang được sinh ra từ template mặc định của Cocos Creator (`extends Component`), điều này **sai bản chất** — Enum và Event definitions không nên là Component gắn vào Node. Việc sửa lại 2 file này là việc đầu tiên cần làm ở Phase 1 (chỉ sửa cấu trúc file, chưa viết logic).

---

## 2. Thiết kế hệ thống chi tiết (Game Design → Technical Design)

### 2.1. Hệ tọa độ & dữ liệu Layout quả

- Layout quả được mô hình hóa như một **lưới hàng lệch (staggered grid)** — giống bố cục bi-a/hình lục giác: hàng chẵn và hàng lẻ lệch nhau nửa ô theo trục X. Nhìn vào ảnh chụp màn hình: 7 hàng, số quả mỗi hàng dạng kim cương: 4-4-4-4-4-4-4 lệch dần tạo hình tròn/kim cương (số lượng quả mỗi hàng cần đo lại chính xác từ ảnh gốc ở Phase 2 khi build layout đầu tiên).
- Đề xuất dữ liệu: mỗi ô layout là 1 record:
  ```
  FruitCell {
    row: number
    col: number
    fruitType: FruitType        // enum: Peach, Banana, Strawberry, DragonFruit, ...
    modifiers: FruitModifier[]  // [] | [Ice] | [Lock] | [Ice, Lock] (thiết kế mở, xem 2.4)
    isCleared: boolean
  }
  ```
- **Row descent (tụt hàng):** không tụt icon riêng lẻ, mà toàn bộ layout dịch chuyển xuống 1 "bước" (step) mỗi khi số hàng còn quả giảm xuống dưới một ngưỡng hiển thị cố định (ví dụ: luôn giữ tối đa 7 hàng hiển thị trong khung nhìn; khi hàng dưới cùng bị dọn sạch hoàn toàn, toàn bộ cụm dịch xuống để hàng kế tiếp trở thành hàng "dưới cùng mới"). Cách này khớp với mô tả của bạn: "layout trên giảm pos xuống" + "quả dưới cùng của layout luôn dừng ở 1 chỗ".
- **`BottomFruitLine`:** 1 Node/marker cố định trong Gameplay scene (đặt ngay phía trên khe hở 2 vách phễu) đánh dấu điểm đáy mà hàng quả dưới cùng luôn neo vào. Sau mỗi lần dịch layout xuống, hàng dưới cùng mới được căn cho khớp Y của node này. Đây thuần là điểm neo vị trí, không dùng để tự kích hoạt thua (xem mục 6 về điều kiện thua liên quan tới layout còn để ngỏ).

### 2.2. Slot / Phễu chứa

- Slot là một **hàng ngang (queue)** với `maxCapacity` cố định, hiển thị ở khe giữa 2 vách (`Gamepplay_Wall_L/R`).
- Khi quả rơi vào Slot: thêm vào cuối queue → chạy animation rơi → check match ngay lập tức:
  - Nếu quả mới thêm vào có ít nhất 1 quả **liền kề cùng loại** (bên trái hoặc phải trong queue) → cả 2 bị xóa, chạy hiệu ứng nổ, các phần tử còn lại dồn lại (shift), animate slide.
  - Việc match cần chạy theo kiểu vòng lặp/chain: sau khi xóa 1 cặp và dồn lại, phải kiểm tra lại xem có cặp liền kề mới nào được tạo ra không (hiếm khi xảy ra ở game 2-quả-1-cặp, nhưng cần xử lý an toàn).
- Nếu queue đã đầy `maxCapacity` và có quả mới cần thêm vào mà không tạo được match ngay → **Lose**.

### 2.3. State Machine tổng thể ván chơi

```
GameState: Loading → Playing → (Win | Lose) → (Retry | NextLevel | BackToHome)
```

- `Playing`: nhận input tap, xử lý rơi quả, xử lý match, xử lý descent, check thua/thắng sau mỗi hành động.
- Toàn bộ transition nên phát qua `GameEvents` (Event Bus) để tách rời UI khỏi logic (UI chỉ lắng nghe sự kiện `GameWin`, `GameLose`, `SlotUpdated`, `LayoutRowCleared`, ... không tự biết luật chơi).

> **Đổi hướng thực tế (cập nhật 2026-09-14):** code hiện tại (Phase 3-6) **chưa dùng Event Bus** — `GameEvents.ts` vẫn rỗng. Các Controller gọi thẳng nhau qua `Singleton.getInstance()` (vd. `FruitItem` gọi thẳng `SlotController.getInstance().onFruitEnteredSlot()`, `LayoutRowDescent.getInstance().onFruitTapped()`, `GameManager.getInstance().setWin()/setLose()`). Cách này đơn giản hơn và chạy đúng cho core loop hiện tại, nhưng lệch khỏi thiết kế gốc ở mục này (tách rời qua pub/sub). Chưa cần sửa ngay vì core loop nhỏ, số lượng tham chiếu chéo còn ít — nhưng nếu Phase 8+ (UI, popup Win/Lose, HUD) cần lắng nghe nhiều sự kiện từ nhiều Controller, nên quay lại dùng `GameEvents` lúc đó thay vì tiếp tục thêm tham chiếu chéo trực tiếp.

### 2.4. Hệ thống Modifier cho quả đặc biệt (Ice / Lock / mở rộng sau)

- Thiết kế theo hướng **Decorator/Component nhỏ gắn thêm**, không tạo enum loại quả riêng cho "quả đóng băng" (tránh nhân bản N loại quả × M modifier = N×M enum).
- Interface gợi ý:
  ```
  interface IFruitModifier {
    canBeTapped(cell: FruitCell): boolean       // Ice chưa phá thì false
    onNeighborCleared(cell, neighborCell): void  // dùng cho Lock: mở khi xung quanh sạch
    onTapAttempt(cell): void                     // dùng cho Ice: mỗi lần tap làm giảm độ dày băng
  }
  ```
- `FruitItem` sở hữu 1 danh sách modifier, mỗi modifier tự quyết định quả có tap được không, và tự vẽ overlay riêng (ví dụ Ice vẽ thêm sprite `Ice_big.png` đè lên quả, số lớp băng giảm dần qua overlay khác nhau).
- Việc này để Phase 5 (sau khi core loop hoàn chỉnh) mới cài đặt, nhưng thiết kế `FruitItem`/`FruitCell` ngay từ Phase 2 phải có chỗ trống (`modifiers: []`) để không phải sửa lại kiến trúc dữ liệu về sau.

### 2.5. Level Data (thiết kế hướng dữ liệu — data-driven)

> **Đã huỷ (2026-09-14, xem Phase 7):** mục này giữ lại làm tài liệu lịch sử, KHÔNG còn là hướng đang triển khai. Bạn quyết định layout tiếp tục xếp tay trực tiếp trên map trong Editor (giống Phase 2), không dùng JSON/generator nữa.

Toàn bộ level nên định nghĩa bằng file JSON, KHÔNG hard-code trong code, để sau này dễ thêm level mới không cần sửa logic:

```json
{
  "levelId": 1,
  "slotMaxCapacity": 7,
  "fruitIdsUsed": [0, 1, 2, 3],
  "layout": [
    { "row": 0, "col": 1, "fruitId": 0 },
    { "row": 0, "col": 2, "fruitId": 0 }
  ]
}
```

- Cần viết 1 "Level Editor" đơn giản sau này (không bắt buộc ở bản đầu) hoặc tạm thời generate ngẫu nhiên layout theo rule (số lượng mỗi loại quả phải chia hết cho 2, để đảm bảo level luôn có thể giải được).
- **Ràng buộc solvability quan trọng:** vì cơ chế là "tap để rơi, ăn theo cặp trong slot", một level chỉ chắc chắn giải được nếu số lượng quả của mỗi `fruitId` là **số chẵn**. Đây là rule bắt buộc khi sinh level (kể cả random) — nếu không sẽ tạo ra level không thể thắng.

### 2.6. Kiến trúc code / phân chia Component (map với Cocos Creator)

Đề xuất cấu trúc thư mục `assets/Scripts/`:

```
Scripts/
  Core/
    GameManager.ts        // điều phối state machine tổng, đã có sẵn stub — sẽ là bộ não chính
    GameState.ts          // enum trạng thái ván chơi
  Events/
    GameEvents.ts         // định nghĩa danh sách sự kiện (EventTarget wrapper hoặc dùng cc.director.on)
  Data/
    FruitData.ts          // đã có sẵn — data quả (id + icon), thay cho enum FruitType
    FruitDatabase.ts       // đã có sẵn — danh sách FruitData, tra cứu theo id
    LevelData.ts          // interface/schema level JSON + loader
    FruitCell.ts           // interface ô layout
  Layout/
    FruitLayoutController.ts  // build/dịch chuyển/xóa layout quả từ LevelData
    LayoutRowDescent.ts       // logic tính khi nào tụt hàng, neo hàng dưới cùng vào BottomFruitLine
  Slot/
    SlotController.ts      // quản lý queue, insert, match, collapse
    SlotSlotView.ts        // hiển thị/animate các ô slot (có thể gộp vào SlotController nếu nhỏ)
  Fruit/
    FruitItem.ts           // đã có sẵn stub — component gắn trên từng node quả, xử lý input tap + animation rơi
    FruitModifier/
      IFruitModifier.ts
      IceModifier.ts
      LockModifier.ts
  UI/
    HudController.ts        // hiển thị số quả còn lại, nút pause...
    WinPopup.ts / LosePopup.ts
  Meta/ (Phase sau — Home/level map/lives/rank)
    HomeController.ts
    LevelMapController.ts
    LivesManager.ts
  Utils/
    ObjectPool.ts           // pooling cho FruitItem node (tránh instantiate/destroy liên tục)
```

- Giao tiếp giữa các Controller: qua `GameEvents` (pub/sub), tránh tham chiếu chéo trực tiếp giữa `FruitLayoutController` ↔ `SlotController` để dễ test và mở rộng.
- `GameManager` là nơi duy nhất biết luật thắng/thua, các Controller con chỉ báo cáo sự kiện (`OnFruitEnteredSlot`, `OnLayoutRowCleared`, ...) và **không tự quyết định thua/thắng**.

### 2.7. Animation / Tween

- Dùng module `tween` có sẵn của Cocos Creator (`import { tween } from 'cc'`), không cần thư viện ngoài.
- 3 nhóm animation chính: (1) quả rơi từ layout → slot, (2) 2 quả match nổ (dùng spritesheet `generic_explosion_big_sheet.png` qua `Animation`/`SpriteFrame` array), (3) slot dồn lại sau khi xóa cặp, (4) toàn bộ layout dịch xuống khi descent.

### 2.8. Object Pooling

- Vì quả được tạo/xóa liên tục, dùng `NodePool` của Cocos (`cc.NodePool` / `NodePool` trong `cc`) cho `FruitItem`, tránh instantiate/destroy trực tiếp gây giật khi chơi nhiều level.

---

## 3. Lộ trình triển khai theo Phase

> Mỗi Phase có mục tiêu rõ ràng + checklist để bạn (đang tập code) verify được là đã xong trước khi qua Phase kế — không đi tiếp khi Phase trước còn lỗi.

### Phase 0 — Dọn nền tảng (chưa liên quan gameplay)
- [x] Sửa `GameEnums.ts` thành file thuần chứa enum (bỏ `extends Component`) — hiện tại rỗng, sẽ điền `GameState` khi tới Phase 6.
- [x] Sửa `GameEvents.ts` thành file thuần (bỏ `extends Component`) — hiện tại rỗng, sẽ điền tên sự kiện dần theo từng Phase (3+).
- [x] Tạo cấu trúc thư mục con: `Core/` (`GameManager.ts`, `GameEnums.ts`, `Singleton.ts`), `Events/` (`GameEvents.ts`), `Data/` (`FruitData.ts`), `Fruit/` (`FruitItem.ts`).
- [x] Thêm `Core/Singleton.ts` — base class cho các Component kiểu manager (dùng `MyManager.getInstance()`), tùy chọn áp dụng cho script nào cần (không ép `GameManager` phải dùng ngay).
- [x] Thêm `Data/FruitData.ts` + `Data/FruitDatabase.ts` — thay cho việc dùng enum `FruitType` cứng. **Lưu ý:** Cocos Creator KHÔNG tự thêm class `extends Asset` vào menu Create (khác Unity ScriptableObject) — muốn vậy phải viết Editor Extension riêng. Nên hướng đã chọn: `FruitData` là 1 class dữ liệu thuần (`id: number`, `icon: SpriteFrame`), gắn `FruitDatabase` (Component chứa `@property([FruitData])`) vào 1 Node trong scene/prefab — Inspector hiện ra dạng danh sách, bấm `+` để thêm từng loại quả, mỗi dòng có ô nhập `id` và kéo-thả sprite vào `icon`. Tra cứu bằng `FruitDatabase.getById(id)`.
- [x] Import 1 vài sprite mẫu từ `Fruits/` để dùng test — đã có 26 sprite (`sprite_00.png` → `sprite_25.png`) + `manifest.json`.

> **Lưu ý thay đổi so với thiết kế gốc ở mục 2.6:** không còn dùng `enum FruitType` + `Data/FruitType.ts` nữa. Nhận diện loại quả giờ dựa trên `FruitData.id` (số, do bạn tự tạo asset và gán id), linh hoạt hơn vì thêm loại quả mới không cần sửa code.

### Phase 1 — Dựng Scene tĩnh (không logic) ✅ Hoàn tất
- [x] Tạo Prefab `FruitItem` (SpriteRenderer + `FruitItem.ts` component, chưa xử lý tap thật).
- [x] Tạo Gameplay Scene: 2 node `WallLeft`/`WallRight` dùng sprite `Gamepplay_Wall_L/R` (trong nhóm `Bottom`), node trống `FruitLayoutRoot` (chứa layout quả), node trống `SlotRoot` (chứa Slot, trong nhóm `Bottom`). Background bỏ qua (tuỳ chọn).
- [x] Đặt Node marker **`BottomFruitLine`** — điểm neo mà hàng quả dưới cùng của layout luôn trượt xuống tới đó.

### Phase 2 — Layout quả tĩnh (đặt tay trong Editor, không sinh bằng công thức)
> **Đổi hướng so với bản đầu:** ban đầu định để code tự tính vị trí theo lưới hàng/cột (row/col), nhưng bạn muốn layout có cảm giác rải tự nhiên/ngẫu nhiên như ảnh gốc (`ss.png` cũng không phải lưới đều tăm tắp — có mấy quả lệch ra ngoài rìa) chứ không phải lưới đều do công thức sinh ra. Nên bỏ hướng "grid formula", chuyển sang **đặt tay từng quả trực tiếp trong Scene**.
- [x] Bỏ `FruitLayoutController.ts` + `FruitCell.ts` (không cần grid row/col nữa).
- [x] Sửa `FruitItem.ts`: thêm `@property(Number) fruitId` — hiện ra ô nhập số trong Inspector; ở `start()` tự tra `GameManager.getInstance().fruitDatabase.getById(fruitId)` rồi tự gán sprite cho chính nó. **(Sửa 2026-09-14: logic này đã bị thiếu trong code dù mục này từng đánh dấu xong — đã bổ sung lại `start()` trong `FruitItem.ts` để khớp đúng thiết kế.)**
- [x] **Cần bạn làm trong Editor:** kéo nhiều bản `FruitItem.prefab` thả vào `FruitLayoutRoot` — đã có 18 instance đặt tay trong `FruitLayoutRoot` (kiểm tra trực tiếp từ `scene.scene`).
- [x] Lưu ý: vì không còn tra icon lúc edit-time (chỉ tra lúc Play, tránh phức tạp hoá Singleton chạy trong Editor), nên trong Scene view lúc kéo thả sẽ tạm thời chưa thấy đúng icon từng quả — bấm Play mới thấy đúng sprite theo `Fruit Id` đã gán. Đây là đánh đổi có chủ đích cho đơn giản; nếu sau này thấy bất tiện có thể quay lại thêm preview edit-mode.
- [ ] Verify: bấm Play, mỗi quả hiện đúng sprite theo `Fruit Id` đã gán tay. **(Chỉ bạn xác nhận được — cần mở Cocos Creator Editor và bấm Play.)**
- [ ] Lưu ý cho Phase 5 (row descent): vì layout giờ không còn khái niệm "row" tường minh trong code, cần bàn lại cách nhóm quả theo hàng để biết khi nào 1 "hàng" đã sạch và tụt xuống — có thể thêm 1 field `row`/`tier` riêng (không ảnh hưởng vị trí X/Y tự do) để logic dồn hàng vẫn hoạt động. Để ngỏ tới Phase 5.

### Phase 3 — Input & rơi quả vào Slot (chưa match)
> **Đổi hướng so với thiết kế gốc:** ban đầu định "tap → animate/tween bay tới vị trí slot", nhưng quả có `RigidBody2D` thật (0 ma sát, 0 nảy) nên rơi bằng **vật lý thật** (gravity + va chạm), không phải tween.
- [x] `FruitItem.onTap()` — chuyển `RigidBody2D.type` từ `Static` → `Dynamic` (có chặn double-tap), để vật lý bắt đầu tác động.
- [x] `Core/InputManager.ts` — bắt touch toàn cục, quy đổi screen→world qua Camera (Orthographic, xác nhận đúng), dùng `PhysicsSystem2D.instance.testPoint()` tìm đúng `FruitItem` bị tap.
- [x] Xác nhận: Collider2D không có `RigidBody2D` vẫn tự là static body (không cần gắn `RigidBody2D` cho `WallLeft`/`WallRight`/sàn Slot) — miễn dùng backend **Box2D** (Builtin không hỗ trợ RigidBody2D).
- [x] **Quyết định về loại collider:** ban đầu định dùng `PolygonCollider2D` vẽ tay sát hình từng loại quả, nhưng phát hiện bug: Box2D chỉ hỗ trợ polygon **lồi (convex)** — polygon lõm (rất dễ gặp ở quả hình chuối/chùm nho/gai) bị Box2D tự tách thành nhiều mảnh lồi và "phình" to hơn hình vẽ lúc chạy thật (đứng yên nhìn thì đúng, chạy vật lý mới lộ ra to hơn). Đã xác nhận qua test: đổi sang `CircleCollider2D` thì không bị lỗi này (circle luôn lồi sẵn). → **Chốt dùng `CircleCollider2D` cho tất cả quả** (cả collider vật lý solid lẫn collider tap sensor), chấp nhận độ khít kém hơn polygon với quả không tròn, đổi lại đơn giản và không dính bug.
- [x] Vách (`WallLeft`/`WallRight`) + sàn `SlotFloor`: đã có collider (không cần `RigidBody2D`) — kiểm tra `scene.scene` xác nhận `SlotFloor`/`SlotZone` dùng `BoxCollider2D`, còn `WallLeft`/`WallRight` dùng `PolygonCollider2D` (hợp lý hơn Box vì vách là hình thang dốc, và polygon lồi đơn giản của vách không dính bug lõm như quả).
- [ ] Verify: tap quả bất kỳ → rơi bằng vật lý, va chạm đúng kích thước với vách/quả khác (không bị phồng to). **(Chỉ bạn xác nhận được trong Editor.)**

### Phase 4 — Match & Collapse trong Slot ✅
> **Đổi hướng:** không dùng "2 phần tử cuối mảng" để đoán match nữa (sai — 2 quả có thể cùng ở Slot nhưng không thật sự chạm nhau). Match giờ dựa đúng theo va chạm vật lý thật.
- [x] `SlotController` giữ danh sách quả đang ở trong Slot (để đếm `maxCapacity`), không giữ thứ tự để suy match.
- [x] `FruitItem.onBeginContact` — khi 2 quả **thực sự chạm nhau** (Box2D contact) và cả 2 đều `inSlot` và cùng `fruitId` → gọi `SlotController.onFruitsTouched()` xoá cả 2.
- [x] Chain tự nhiên nhờ vật lý (quả mới rơi chạm quả cũ → tự trigger tiếp), không cần vòng lặp chain-check thủ công như dự tính ban đầu.
- [ ] Verify: tap 2 quả cùng loại cho chạm nhau trong Slot → biến mất; slot đầy quá `maxCapacity` → thua. **(Chỉ bạn xác nhận được trong Editor. Lưu ý: `maxCapacity` trong scene hiện để `3` — có vẻ là giá trị test, cần đổi lại giá trị thật của level trước khi verify diện rộng.)**

### Phase 5 — Row Descent (neo vào BottomFruitLine) ✅
> Vì layout đặt tay (không grid), **không gán tay số hàng** — `LayoutRowDescent` tự nhóm quả thành hàng dựa theo toạ độ Y thật (quả nào Y gần nhau trong ngưỡng `rowGroupThreshold` thì cùng 1 hàng), và tự tính khoảng cách tụt xuống dựa theo đúng vị trí node `BottomFruitLine` — không cần đoán `rowStepY` cố định.
- [x] `Layout/LayoutRowDescent.ts` — tự nhóm hàng theo Y lúc `start()`, kiểm tra quả `tapped` trong từng hàng; khi hàng dưới cùng hiện tại hết quả chưa tap → tính offset để hàng kế tiếp khớp đúng Y của `BottomFruitLine`, dịch `FruitLayoutRoot`, cascade nếu hàng sau cũng đã sạch sẵn.
- [x] Khi tụt hết tất cả các hàng (không còn hàng nào) → tự gọi `GameManager.setWin()` — khép kín điều kiện thắng còn bỏ ngỏ ở Phase 6.
- [x] **Cần bạn làm trong Editor:** gắn component `LayoutRowDescent` vào chính node `FruitLayoutRoot`, kéo node `BottomFruitLine` vào ô `Bottom Fruit Line` — đã xác nhận trong `scene.scene` (`LayoutRowDescent` gắn trên `FruitLayoutRoot`, `bottomFruitLine` trỏ đúng tới node `BottomFruitLine`). Chỉnh `Row Group Threshold` (đang để `0.6`) nếu tự nhóm hàng bị sai.
- [ ] Verify: tap sạch 1 hàng dưới cùng → thấy cả cụm quả tụt xuống đúng khớp `BottomFruitLine`; tap sạch tất cả → thấy log `GAME WIN`. **(Chỉ bạn xác nhận được trong Editor.)**

### Phase 6 — Điều kiện Thắng / Thua
- [x] `Core/GameEnums.ts` — `GameState { Playing, Win, Lose }`.
- [x] `GameManager` giữ `state: GameState`, có `setLose()`/`setWin()` (chặn gọi lại nếu đã Win/Lose); ngoài `console.log` giờ gọi thêm `UIManager.getInstance()?.showWin()/showLose()` (xem mục Popup bên dưới).
- [x] `InputManager` chặn xử lý tap nếu `state !== Playing`.
- [x] `SlotController` gọi `GameManager.setLose()` khi vượt `maxCapacity` (điều kiện thua đã chắc chắn).
- [ ] Điều kiện thua thứ 2 liên quan tới layout (nếu có) — **vẫn đang mở**, cần bạn xác nhận cơ chế chính xác từ game gốc trước khi code (xem mục 6). Chưa có thông tin mới nên chưa code phần này.
- [x] `setWin()` đã có sẵn — **giờ đã có người gọi**: `LayoutRowDescent.tryDescend()` gọi `GameManager.getInstance().setWin()` khi hàng cuối cùng bị dọn sạch (Phase 5 đã khép kín phần này).
- [x] Popup Win/Lose (2026-09-14) — `UI/UIManager.ts` (Singleton, cùng pattern gọi trực tiếp như các Manager khác — không đặt riêng `WinPopup.ts`/`LosePopup.ts` như dự tính gốc ở mục 2.6 vì logic show/hide quá đơn giản, tách 2 class là thừa). `GameManager.setWin()/setLose()` gọi `UIManager.getInstance()?.showWin()/showLose()`. Có sẵn `retry()` (load lại scene hiện tại) để gắn vào Click Event của nút Retry.
- [x] **Canvas đã dựng sẵn trong scene (2026-09-14, làm qua Cocos Editor MCP — `cocos-code-mode` extension, không phải hand-edit `.scene`):**
  - Node `Canvas` (root scene) — `UITransform` + `Canvas` (đã gán `cameraComponent` = camera gameplay hiện có, camera này vốn đã bật sẵn layer `UI_2D` trong visibility mask nên không cần tạo thêm camera riêng) + component `UIManager`.
  - 2 node con `Canvas/WinPanel`, `Canvas/LosePanel` — mỗi node có `UITransform` (contentSize 1280×720, phủ kín màn hình), layer `UI_2D`, **`active = false`** sẵn (ẩn mặc định).
  - `UIManager.winPanel`/`losePanel` đã trỏ đúng 2 node trên. Đã lưu scene (`save_scene_or_prefab`) và chụp `editorGetScenePreview` xác nhận scene không vỡ (layout quả/vách vẫn hiển thị đúng).
- [ ] **Cần bạn làm trong Editor (phần thiết kế — mình không tự vẽ UI thay bạn):** vào 2 node `WinPanel`/`LosePanel` (đang ẩn, bật tạm `active=true` lúc chỉnh sửa rồi tắt lại), thêm con bên trong: `Sprite`/`Graphics` làm nền dim, `Label` hiển thị "You Win!"/"Keep Trying", nút Retry (`Button` + ảnh `btn_blue.png`/`btn_green.png`) → Click Event trỏ Node `Canvas` → Component `UIManager` → method `retry`.
- [ ] Verify: bấm Play, cố tình để slot đầy → thấy log `GAME LOSE` + `LosePanel` hiện lên + không tap được quả nào nữa; dọn sạch layout → `WinPanel` hiện lên. **(Chỉ bạn xác nhận được vì cần bấm Play — MCP hiện chưa có cách giả lập thao tác tap trong Play mode.)**

### Phase 7 — Data-driven Level: ĐÃ THỬ VÀ HUỶ (2026-09-14), quyết định giữ layout đặt tay
> Đã từng viết thử hạ tầng data-driven (`Data/LevelData.ts`, `Data/LevelGenerator.ts`, `Data/LevelLoader.ts`, `Level/LevelController.ts`, `resources/Levels/test_level_01.json`) dưới dạng tính năng tùy chọn song song, không đụng level 1 đặt tay. Sau khi thử nghiệm, bạn quyết định **không cần hướng data-driven/generator này** — toàn bộ layout sẽ tiếp tục **xếp tay trực tiếp trên map trong Editor** (đúng như Phase 2 đã chốt). Đã xoá sạch các file trên khỏi `assets/Scripts/Data/`, `assets/Scripts/Level/`, `assets/resources/`.
> Phase 7 coi như **không triển khai** — bỏ qua, chuyển thẳng sang Phase 8 khi cần polish core loop. Nếu sau này thật sự cần nhiều level khác nhau, quay lại cân nhắc hướng này (hoặc đơn giản hơn: mỗi level là 1 scene riêng, không cần JSON).

### Phase 8 — Polish core loop
- [ ] Object Pooling cho `FruitItem`.
- [ ] SFX (dùng `AudioClip/`), particle/explosion timing chỉnh cho khớp cảm giác game gốc.
- [ ] HUD: đếm số quả còn lại, hiển thị level hiện tại.

### Phase 9 — Special Fruits (Ice / Lock)
- [ ] Implement `IFruitModifier`, `IceModifier`, `LockModifier` như mục 2.4.
- [ ] Overlay hình ảnh Ice dùng `Ice_big.png` có sẵn.
- [ ] Verify từng modifier độc lập trước khi kết hợp nhiều modifier trên 1 quả.

### Phase 10 — Meta layer (Home / Level Map / Lives / Rank)
- [ ] Home scene dùng asset `map_0_0` atlas làm bản đồ chọn level dạng world-map.
- [ ] `LivesManager`: hệ thống tim/mạng (`lose_heart-1.png`), hồi tim theo thời gian hoặc quảng cáo (tùy scope bạn muốn clone tới đâu).
- [ ] Leaderboard/Rank cơ bản (asset `rank` atlas) — có thể để cuối cùng vì không phải core.
- [ ] Timebox sự kiện (`home_menu_timebox.png`) — countdown sự kiện, có thể để cuối vì đây là tính năng LiveOps, không ảnh hưởng core loop.

---

## 4. Giả định cần bạn xác nhận lại (chưa chốt được 100% chỉ từ mô tả + 1 ảnh)

Vì mới chỉ có 1 ảnh màn hình thua và mô tả bằng lời, các con số/luật sau là **giả định hợp lý** — cần bạn chơi thêm game gốc để xác nhận hoặc chỉnh trong `LevelData` (đằng nào cũng data-driven nên sửa số không ảnh hưởng kiến trúc):

1. `slotMaxCapacity` chính xác là bao nhiêu (game tương tự thường dùng 4–9 — cần đếm lại từ game gốc).
2. Quả trong Slot có xếp theo đúng **thứ tự rơi vào** (queue thuần) hay có logic sắp xếp lại theo loại (ví dụ tự động dồn quả cùng loại gần nhau)? Giả định hiện tại: **thứ tự rơi vào (FIFO)**, không tự sắp xếp lại.
3. Match trong Slot có bắt buộc phải **liền kề trực tiếp**, hay chỉ cần "cùng có mặt trong Slot" là ăn (không quan tâm vị trí)? Giả định hiện tại: **phải liền kề trực tiếp** (theo mô tả "2 quả chạm nhau").
4. Cơ chế Ice/Lock: cách phá băng/mở khóa chính xác trong game gốc (số lần tap? cần match cạnh nó?) — Phase 9 mới cần chốt, không phải bây giờ.
5. Layout ban đầu của từng level (số hàng, số quả mỗi hàng, hình dạng cụ thể ngoài hình kim cương) — sẽ đo từ ảnh gốc + chơi thêm để đối chiếu ở Phase 2/7.
6. **Điều kiện thua thứ 2 liên quan đến layout quả:** đã bỏ giả định "vượt qua vạch tối thiểu là thua" (DangerLine) vì bạn xác nhận layout chỉ đơn giản là tự trượt xuống neo vào `BottomFruitLine`, không phải một ngưỡng cảnh báo. Hiện tại **chưa rõ** có cơ chế thua nào khác liên quan đến layout không (ví dụ: hết lượt/hết thời gian, hay chỉ có duy nhất điều kiện Slot đầy là cách thua duy nhất). Cần bạn chơi lại game gốc để xác nhận trước khi code Phase 6 phần này — Phase 6 tạm thời chỉ chắc chắn code lose-by-slot-overflow.

Những điểm này **không chặn việc bắt đầu code** — vì kiến trúc data-driven ở mục 2.5/2.6 cho phép chỉnh sau mà không phải sửa lại logic lõi. Chỉ cần bạn xác nhận trước khi bắt đầu Phase 7 (chuyển sang nhiều level thật).

---

## 5. Nguồn tham khảo

- [Drop Fruits: Fun Matching Game – Google Play](https://play.google.com/store/apps/details?id=com.qxgame.fruit&hl=en_GB) — mô tả cơ chế funnel/slot giới hạn 4 ô, quả có thể bị "kẹt" phía trên nếu quả dưới chưa được dọn.
- [Fruit Drop Puzzle – Google Play](https://play.google.com/store/apps/details?id=fun.rgpd.fruitdroppuzzle&hl=en_US) — cơ chế tap-to-drop, match khi 2 quả cùng loại chạm nhau, thua khi dồn tới đỉnh.
- Ảnh `assets/Screenshot/ss.png` trong chính dự án — dùng làm reference trực quan chính cho layout kim cương + phễu 2 vách + khe Slot ở giữa.

---

## 6. Bước tiếp theo

Khi bạn duyệt xong plan này, báo tôi để bắt đầu **Phase 0** (chỉ dọn file, chưa viết logic thật) rồi đi tuần tự từng Phase — mỗi Phase xong sẽ dừng lại để bạn tự chạy thử trong Cocos Creator Editor trước khi sang Phase kế tiếp.
