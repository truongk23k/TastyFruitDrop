import { _decorator, Node, director } from 'cc';
import { Singleton } from '../Core/Singleton';
const { ccclass, property } = _decorator;

/**
 * Quản lý popup Win/Lose. Gắn vào node `Canvas` trong scene, gán 2 node con
 * (Win Panel / Lose Panel) — cả 2 nên để `active = false` sẵn trong Editor.
 * `GameManager.setWin()/setLose()` gọi thẳng qua `UIManager.getInstance()`
 * (theo đúng pattern gọi trực tiếp qua Singleton đã dùng trong cả project,
 * xem note "Đổi hướng thực tế" ở PLAN.md mục 2.3 — không dùng GameEvents).
 */
@ccclass('UIManager')
export class UIManager extends Singleton {
    @property(Node)
    winPanel: Node = null;

    @property(Node)
    losePanel: Node = null;

    protected onLoad(): void {
        super.onLoad();
        if (this.winPanel) {
            this.winPanel.active = false;
        }
        if (this.losePanel) {
            this.losePanel.active = false;
        }
    }

    showWin() {
        if (this.winPanel) {
            this.winPanel.active = true;
        }
    }

    showLose() {
        if (this.losePanel) {
            this.losePanel.active = true;
        }
    }

    /** Gắn hàm này vào Click Event của nút Retry trong Editor. */
    retry() {
        const scene = director.getScene();
        if (scene) {
            director.loadScene(scene.name);
        }
    }
}
