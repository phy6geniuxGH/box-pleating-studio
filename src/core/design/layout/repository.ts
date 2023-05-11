import { State } from "core/service/state";
import { Store } from "./store";
import { Point } from "core/math/geometry/point";
import { configGenerator } from "./generators/configGenerator";

import type { JRepository } from "core/service/updateModel";
import type { Pattern } from "./pattern/pattern";
import type { JStretch } from "shared/json";
import type { Configuration } from "./configuration";
import type { ValidJunction } from "./junction/validJunction";
import type { Stretch } from "./stretch";

//=================================================================
/**
 * {@link Repository} consists of several {@link Configuration}s for a {@link Stretch}.
 *
 * The motivation behind {@link Repository} is that when the structure of
 * a {@link Stretch} changes temporarily, or the {@link Stretch}
 * become temporarily inactive due to dragging,
 * a {@link Repository} helps memorizing the original combinations of {@link Pattern}s.
 */
//=================================================================
export class Repository implements ISerializable<JRepository | undefined> {

	public readonly $stretch: Stretch;
	public readonly $signature: string;

	/** Coefficient of transformation; same as the {@link ValidJunction.$f $f} of the first junction. */
	public readonly $f: ISignPoint;

	/**
	 * The reference point of the stretch,
	 * which is the {@link ValidJunction.$tip} of the first junction.
	 *
	 * When all flaps involved moved simultaneously,
	 * we can use this to move the {@link Pattern}.
	 */
	public $origin: Point;

	/** Quadrant codes involved (possibly duplicated). */
	public readonly $quadrants: number[];

	/** Node ids involved. */
	public readonly $nodeIds: number[];

	private readonly _configurations: Store<Configuration>;
	private _index: number = 0;

	constructor(stretch: Stretch, junctions: ValidJunction[], signature: string, prototype?: JStretch) {
		this.$stretch = stretch;
		this.$signature = signature;
		this.$f = junctions[0].$f;
		this.$origin = new Point(junctions[0].$tip);

		const quadrants: number[] = [];
		const ids = new Set<number>();
		for(const j of junctions) {
			quadrants.push(j.$q1, j.$q2);
			j.$path.forEach(id => ids.add(id));
		}
		this.$quadrants = quadrants;
		this.$nodeIds = Array.from(ids);

		State.$newRepositories.add(this);
		State.$repoUpdated.add(this);

		this._configurations = new Store(configGenerator(this, junctions, prototype));
	}

	public toJSON(): JRepository | undefined {
		if(!this._configurations.$done) return undefined;
		return {
			configCount: this.$configurations.length,
			configIndex: this._index,
			patternCount: this.$configuration!.$length!,
			patternIndex: this.$configuration!.$index,
		};
	}

	public set $index(v: number) {
		this._index = v;
		this.$configuration?.$tryUpdateOrigin();
	}

	public get $configuration(): Configuration | null {
		const configurations = this._configurations.$entries;
		if(configurations.length === 0) return null;
		return configurations[this._index];
	}

	public get $configurations(): readonly Configuration[] {
		return this._configurations.$entries;
	}

	public get $pattern(): Pattern | null {
		return this.$configuration?.$pattern ?? null;
	}

	/** Stop when the first {@link Pattern} is found. */
	public $init(): void {
		this._configurations.$next();
	}

	/** Find all {@link Pattern}s when there's free time. */
	public $complete(): void {
		this._configurations.$rest();
		for(const config of this._configurations.$entries) {
			config.$complete();
		}
	}

	/** Try to update {@link $origin}, and return if changes has been made. */
	public $tryUpdateOrigin(origin: IPoint): boolean {
		if(this.$origin.eq(origin)) return false;

		this.$origin = new Point(origin);
		this.$configurations.forEach(c => c.$originDirty = true);
		this.$configuration?.$tryUpdateOrigin();
		return true;
	}
}
