import { _decorator, Node, tween, Vec3 } from 'cc';
import { Singleton } from '../Core/Singleton';
import { FruitItem } from '../Fruit/FruitItem';
import { GameManager } from '../Core/GameManager';
const { ccclass, property } = _decorator;

interface Row {
    fruits: FruitItem[];
}

@ccclass('LayoutRowDescent')
export class LayoutRowDescent extends Singleton {
    @property(Node)
    bottomFruitLine: Node = null;

    @property
    rowGroupThreshold: number = 0.6;

    @property
    descendSpeed: number = 3; // world unit / giây

    private rows: Row[] = []; // rows[0] = hàng dưới cùng
    private bottomIndex = 0;

    start() {
        const fruits = this.getComponentsInChildren(FruitItem);
        const sorted = [...fruits].sort((a, b) => a.node.worldPosition.y - b.node.worldPosition.y);

        sorted.forEach(fruit => {
            const y = fruit.node.worldPosition.y;
            const lastRow = this.rows[this.rows.length - 1];
            if (lastRow) {
                const lastY = lastRow.fruits[0].node.worldPosition.y;
                if (Math.abs(y - lastY) <= this.rowGroupThreshold) {
                    lastRow.fruits.push(fruit);
                    return;
                }
            }
            this.rows.push({ fruits: [fruit] });
        });

        console.log(`LayoutRowDescent: phát hiện ${this.rows.length} hàng, tổng ${fruits.length} quả.`);
    }

    onFruitTapped(fruit: FruitItem) {
        this.tryDescend();
    }

    private tryDescend() {
        let advanced = false;
        while (this.bottomIndex < this.rows.length) {
            const row = this.rows[this.bottomIndex];
            const stillHasFruit = row.fruits.some(f => !f.tapped);
            if (stillHasFruit) {
                break;
            }
            this.bottomIndex++;
            advanced = true;
            if (this.bottomIndex >= this.rows.length) {
                GameManager.getInstance().setWin();
                return;
            }
        }
        if (advanced) {
            this.shiftToBottomLine();
        }
    }

    private shiftToBottomLine() {
        if (!this.bottomFruitLine) {
            console.warn('LayoutRowDescent: chưa gán Bottom Fruit Line trong Inspector, bỏ qua tụt hàng.');
            return;
        }
        const newBottomRow = this.rows[this.bottomIndex];
        const validFruits = newBottomRow.fruits.filter(f => f.node && f.node.isValid);
        if (validFruits.length === 0) {
            console.log('Layout: hàng kế tiếp không còn quả nào (đã bị match hết trước đó), bỏ qua tính offset.');
            return;
        }
        const avgY = validFruits.reduce((sum, f) => sum + f.node.worldPosition.y, 0) / validFruits.length;
        const targetY = this.bottomFruitLine.worldPosition.y;
        const deltaY = Math.min(targetY - avgY, 0); // layout chỉ được tụt xuống, không bao giờ đi lên

        if (deltaY === 0) {
            console.log('Layout: hàng kế tiếp đã ở dưới hoặc ngang Bottom Fruit Line, bỏ qua dịch chuyển.');
            return;
        }

        const pos = this.node.position;
        const targetPos = new Vec3(pos.x, pos.y + deltaY, pos.z);
        const duration = Math.abs(deltaY) / this.descendSpeed;

        tween(this.node)
            .to(duration, { position: targetPos })
            .start();

        console.log(`Layout: tụt xuống (delta=${deltaY.toFixed(2)}, ${duration.toFixed(2)}s), còn ${this.rows.length - this.bottomIndex} hàng.`);
    }
}
