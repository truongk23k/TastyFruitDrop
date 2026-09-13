import { _decorator, Component, SpriteRenderer, RigidBody2D, ERigidBody2DType, Collider2D, Contact2DType, IPhysics2DContact } from 'cc';
import { SlotZone } from '../Slot/SlotZone';
import { SlotController } from '../Slot/SlotController';
import { LayoutRowDescent } from '../Layout/LayoutRowDescent';
import { GameManager } from '../Core/GameManager';
const { ccclass, property } = _decorator;

@ccclass('FruitItem')
export class FruitItem extends Component {
    @property(SpriteRenderer)
    spriteRenderer: SpriteRenderer = null;

    @property(Number)
    fruitId: number = 0;

    private rigidBody: RigidBody2D = null;
    tapped = false;
    inSlot = false;

    onLoad() {
        this.rigidBody = this.getComponent(RigidBody2D);
        if (this.rigidBody) {
            this.rigidBody.bullet = true;
            this.rigidBody.enabledContactListener = true;
        }
        this.getComponents(Collider2D).forEach(collider => {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        });
    }

    start() {
        // start() (không phải onLoad()) để chắc chắn GameManager đã đăng ký xong Singleton trước khi tra cứu.
        const data = GameManager.getInstance()?.fruitDatabase?.getById(this.fruitId);
        if (data && this.spriteRenderer) {
            this.spriteRenderer.spriteFrame = data.icon;
        }
    }

    onTap() {
        if (this.tapped) {
            return;
        }
        this.tapped = true;
        if (this.rigidBody) {
            this.rigidBody.type = ERigidBody2DType.Dynamic;
        }
        LayoutRowDescent.getInstance().onFruitTapped(this);
    }

    private markInSlot() {
        if (this.inSlot) {
            return;
        }
        this.inSlot = true;
        SlotController.getInstance().onFruitEnteredSlot(this);
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        const zone = otherCollider.getComponent(SlotZone);
        if (zone) {
            this.markInSlot();
            return;
        }

        const otherFruit = otherCollider.getComponent(FruitItem);
        if (!otherFruit) {
            return;
        }

        if (otherFruit.inSlot) {
            this.markInSlot();
        }

        if (this.inSlot && otherFruit.inSlot && this.fruitId === otherFruit.fruitId) {
            SlotController.getInstance().onFruitsTouched(this, otherFruit);
        }
    }
}
