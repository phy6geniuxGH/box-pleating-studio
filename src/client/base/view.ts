import { watchEffect } from "vue";

import ResumableEffectScope from "client/utils/resumableEffectScope";
import { ACTIVE, Mountable, MOUNTED } from "./mountable";

import type { Container } from "@pixi/display";

//=================================================================
/**
 * {@link View} is a component that draws on the screen.
 */
//=================================================================
export abstract class View extends Mountable {

	/** The top-level {@link Container}s of this component. */
	private readonly _rootContainers: Container[] = [];

	/** {@link ResumableEffectScope} of this {@link View}. */
	private _drawScope?: ResumableEffectScope;

	constructor(active: boolean = true) {
		super(active);

		this._onDispose(() => {
			this._drawScope?.stop();
			this._rootContainers.forEach(view => view.destroy({ children: true }));
		});

		this.addEventListener(ACTIVE, event => {
			// Visibilities of the top-level containers depend on the active state.
			this._rootContainers.forEach(view => view.visible = event.state);
		});

		this.addEventListener(MOUNTED, event => {
			// 反應作用域的啟用與否取決於掛載狀態。
			this._drawScope?.toggle(event.state);
		});
	}

	/**
	 * Add a top-level object.
	 * The implementation here assumes that the method is called only once for the same object.
	 *
	 * All top-level objects gets disposed as the {@link View} disposes.
	 */
	protected $addRootObject<T extends Container>(object: T, target?: Container): T {
		this._rootContainers.push(object);
		target?.addChild(object);
		return object;
	}

	/**
	 * Register a reactive drawing method.
	 * All passed-in methods will be bound to `this`.
	 *
	 * Note that this method should be called only once.
	 * If it is recalled, it overwrites the previous setups.
	 */
	protected $reactDraw(...actions: Action[]): void {
		this._drawScope ??= new ResumableEffectScope();
		this._drawScope.run(() => {
			for(const action of actions) watchEffect(action.bind(this));
		});
	}
}
