import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

type Ctor<T> = new (...args: any[]) => T;

/**
 * Base class for manager-style Components that should only ever have one
 * active instance in the scene. Usage:
 *   @ccclass('GameManager')
 *   export class GameManager extends Singleton {}
 * Then anywhere: GameManager.getInstance()
 */
@ccclass('Singleton')
export abstract class Singleton extends Component {
    private static _instances = new Map<Function, Component>();

    protected onLoad(): void {
        const ctor = this.constructor;
        const existing = Singleton._instances.get(ctor);
        if (existing && existing !== this) {
            this.destroy();
            return;
        }
        Singleton._instances.set(ctor, this);
    }

    protected onDestroy(): void {
        const ctor = this.constructor;
        if (Singleton._instances.get(ctor) === this) {
            Singleton._instances.delete(ctor);
        }
    }

    public static getInstance<T extends Component>(this: Ctor<T>): T | null {
        return (Singleton._instances.get(this) as T) ?? null;
    }
}
