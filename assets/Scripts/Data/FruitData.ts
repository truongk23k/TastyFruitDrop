import { _decorator, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('FruitData')
export class FruitData {
    @property(Number)
    id: number = 0;

    @property(SpriteFrame)
    icon: SpriteFrame = null;
}
