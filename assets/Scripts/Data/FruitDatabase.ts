import { _decorator, Component } from 'cc';
import { FruitData } from './FruitData';
const { ccclass, property } = _decorator;

@ccclass('FruitDatabase')
export class FruitDatabase extends Component {
    @property({ type: [FruitData] })
    fruits: FruitData[] = [];

    getById(id: number): FruitData | undefined {
        return this.fruits.find(f => f.id === id);
    }
}
