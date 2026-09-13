import { _decorator } from 'cc';
import { Singleton } from '../Core/Singleton';
import { FruitItem } from '../Fruit/FruitItem';
import { GameManager } from '../Core/GameManager';
const { ccclass, property } = _decorator;

@ccclass('SlotController')
export class SlotController extends Singleton {
    @property
    maxCapacity: number = 7;

    @property
    overflowCheckDelay: number = 0.3; // giây, thời gian chờ quả rơi tiếp + kịp chạm/match trước khi tính tràn

    private fruitsInSlot: FruitItem[] = [];

    onFruitEnteredSlot(fruit: FruitItem) {
        if (this.fruitsInSlot.includes(fruit)) {
            return;
        }
        this.fruitsInSlot.push(fruit);
        console.log(`Slot: +fruitId=${fruit.fruitId} (count=${this.fruitsInSlot.length})`);
        this.scheduleOverflowCheck();
    }

    onFruitsTouched(a: FruitItem, b: FruitItem) {
        if (!this.fruitsInSlot.includes(a) || !this.fruitsInSlot.includes(b)) {
            return;
        }
        this.fruitsInSlot = this.fruitsInSlot.filter(f => f !== a && f !== b);
        console.log(`Slot: match fruitId=${a.fruitId}, removed pair (count=${this.fruitsInSlot.length})`);
        a.node.destroy();
        b.node.destroy();
    }

    private scheduleOverflowCheck() {
        // Huỷ lịch cũ (nếu có) và đặt lại từ đầu — mỗi lần có quả mới vào Slot sẽ dời thời điểm check ra xa hơn,
        // đảm bảo chỉ check khi Slot đã yên (quả kịp rơi/chạm/match xong), không phải ngay khi vừa vào.
        this.unschedule(this.runOverflowCheck);
        this.scheduleOnce(this.runOverflowCheck, this.overflowCheckDelay);
    }

    private runOverflowCheck() {
        if (this.fruitsInSlot.length > this.maxCapacity) {
            GameManager.getInstance().setLose();
        }
    }
}
