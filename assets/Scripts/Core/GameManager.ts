import { _decorator, PhysicsSystem2D, Vec2 } from 'cc';
import { Singleton } from './Singleton';
import { FruitDatabase } from '../Data/FruitDatabase';
import { GameState } from './GameEnums';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Singleton {
    @property(FruitDatabase)
    fruitDatabase: FruitDatabase = null;

    @property
    gravityY: number = -10;

    state: GameState = GameState.Playing;

    protected onLoad(): void {
        super.onLoad();
        PhysicsSystem2D.instance.gravity = new Vec2(0, this.gravityY);
    }

    setLose() {
        if (this.state !== GameState.Playing) {
            return;
        }
        this.state = GameState.Lose;
        console.log('GAME LOSE');
    }

    setWin() {
        if (this.state !== GameState.Playing) {
            return;
        }
        this.state = GameState.Win;
        console.log('GAME WIN');
    }
}
