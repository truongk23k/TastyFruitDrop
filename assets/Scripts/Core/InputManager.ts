import { _decorator, Component, input, Input, EventTouch, Camera, PhysicsSystem2D, Vec2, Vec3 } from 'cc';
import { FruitItem } from '../Fruit/FruitItem';
import { GameManager } from './GameManager';
import { GameState } from './GameEnums';
const { ccclass, property } = _decorator;

@ccclass('InputManager')
export class InputManager extends Component {
    @property(Camera)
    camera: Camera = null;

    onLoad() {
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
    }

    private onTouchStart(event: EventTouch) {
        if (GameManager.getInstance().state !== GameState.Playing) {
            return;
        }
        const screenPos = event.getLocation();
        const worldPos = this.camera.screenToWorld(new Vec3(screenPos.x, screenPos.y, 0));
        const colliders = PhysicsSystem2D.instance.testPoint(new Vec2(worldPos.x, worldPos.y));

        for (const collider of colliders) {
            const fruitItem = collider.node.getComponent(FruitItem);
            if (fruitItem) {
                fruitItem.onTap();
                break;
            }
        }
    }
}
