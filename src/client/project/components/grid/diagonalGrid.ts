import { shallowRef } from "client/shared/decorators";
import { GridType } from "shared/json/enum";
import { Direction } from "shared/types/direction";
import { drawPath } from "client/utils/contourUtil";

import type { Project } from "client/project/project";
import type { GraphicsLike } from "client/utils/contourUtil";
import type { Path } from "shared/types/geometry";
import type { JSheet } from "shared/json/components";
import type { IGrid } from "./iGrid";
import type { Sheet } from "../sheet";

const DEFAULT_SIZE = 16;
const MIN_SIZE = 6;

//=================================================================
/**
 * {@link DiagonalGrid} is the grid that places a square sheet diagonally.
 */
//=================================================================

export class DiagonalGrid implements IGrid {

	public readonly $tag: string;
	public readonly $project: Project;
	public readonly type = GridType.diagonal;
	private readonly _sheet: Sheet;

	private _testSize: number;
	private _testOffset: IPoint | undefined;

	@shallowRef private _size: number;

	constructor(sheet: Sheet, width?: number, height?: number) {
		this._sheet = sheet;
		this.$project = sheet.$project;
		this.$tag = sheet.$tag + ".g";
		width ??= DEFAULT_SIZE;
		height ??= DEFAULT_SIZE;
		this._testSize = this._size = Math.round((width + height) / 2);
		if(sheet.$project.history && !sheet.$project.history.$moving) this._initialFit();
	}

	public toJSON(): JSheet {
		return {
			type: this.type,
			height: this._size,
			width: this._size,
		};
	}

	/////////////////////////////////////////////////////////////////////////////////////////////////////
	// Proxy properties
	/////////////////////////////////////////////////////////////////////////////////////////////////////

	public get diameter(): number {
		return this._size;
	}

	public get size(): number {
		return this._size;
	}
	public set size(v: number) {
		if(this.$project.history.$moving) {
			this._testSize = this._size = v; // Skip all checks and effects
			return;
		}

		if(v < MIN_SIZE) return;
		const oldValue = this.size;
		this._testSize = v;
		const offset = (v % 2 ? Math.floor : Math.ceil)((v - oldValue) / 2);
		this._testOffset = { x: offset, y: offset };
		if(v < oldValue && !this._testFit()) {
			this._testSize = this._size;
			this._testOffset = undefined;
			return;
		}

		if(offset != 0) this._applyOffset();
		this._size = v;
		this.$project.history.$fieldChange(this, "size", oldValue, v);
	}

	/////////////////////////////////////////////////////////////////////////////////////////////////////
	// Public methods
	/////////////////////////////////////////////////////////////////////////////////////////////////////

	public $constrain(p: IPoint): IPoint {
		let { x, y } = p;
		const s = this._size, h = s % 2;
		const f = (s - h) / 2;
		const c = (s + h) / 2;

		if(x + y < f) {
			const d = f - x - y;
			x += Math.floor(d / 2);
			y += Math.ceil(d / 2);
		}

		if(y - x > c) {
			const d = y - x - c;
			x += Math.floor(d / 2);
			y -= Math.ceil(d / 2);
		}

		if(x - y > c) {
			const d = x - y - c;
			x -= Math.floor(d / 2);
			y += Math.ceil(d / 2);
		}

		if(x + y > c + s) {
			const d = x + y - c - s;
			x -= Math.floor(d / 2);
			y -= Math.ceil(d / 2);
		}

		if(x < 0) x = 0;
		if(x > s) x = s;

		return { x, y };
	}

	public $contains(p: IPoint): boolean {
		let { x, y } = p;
		const s = this._testSize, h = s % 2;
		const f = (s - h) / 2;
		const c = (s + h) / 2;
		const offset = this._testOffset || { x: 0, y: 0 };
		x += offset.x;
		y += offset.y;
		return x + y >= f && y - x <= c && x - y <= c && x + y <= c + s;
	}

	public $getLabelDirection(x: number, y: number): Direction {
		const shift = this._size % 2, s = this._size + shift, h = s / 2;
		if(shift == 0) {
			if(x == 0 && y == h) return Direction.L;
			if(x == h && y == 0) return Direction.B;
			if(x == h && y == s) return Direction.T;
			if(x == s && y == h) return Direction.R;
		}
		if(x + y == h - shift) return Direction.LL;
		// eslint-disable-next-line @typescript-eslint/no-magic-numbers
		if(x + y == h * 3 - shift) return Direction.UR;
		if(x - y == h) return Direction.LR;
		if(y - x == h) return Direction.UL;
		return Direction.B;
	}

	public $drawBorder(border: GraphicsLike): void {
		drawPath(border, this.$getBorderPath());
	}

	public $getBorderPath(): Path {
		let full = this.$renderHeight, half = full / 2;
		const shift = this._size % 2 / 2;
		full -= shift;
		half -= shift;
		return [
			{ x: half, y: -shift },
			{ x: full, y: half },
			{ x: half, y: full },
			{ x: -shift, y: half },
		];
	}

	public $drawGrid(grid: GraphicsLike): void {
		const size = this._size;
		const shift = this._size % 2;
		for(let i = 1 - shift; i < size + shift; i++) {
			const offset = Math.abs(i - size / 2) - shift / 2;
			grid.moveTo(offset, i);
			grid.lineTo(size - offset, i);
			grid.moveTo(i, offset);
			grid.lineTo(i, size - offset);
		}
	}

	public $getTransformMatrix(size: number, reorient: boolean): number[] {
		const full = this.$renderWidth;
		const s = size / full;
		const shift = this._size % 2 / 2;
		if(reorient) {
			const offset = full - 2 * shift;
			return [s, s, s, -s, -s * offset, 0];
		} else {
			const offset = full / 2 - shift;
			return [s, 0, 0, -s, -s * offset, s * offset];
		}
	}

	public get $offset(): IPoint {
		const shift = this._size % 2 / 2;
		return { x: -shift, y: -shift };
	}

	public get $renderHeight(): number {
		return this._size + this._size % 2;
	}

	public get $renderWidth(): number {
		return this._size + this._size % 2;
	}

	/////////////////////////////////////////////////////////////////////////////////////////////////////
	// Private methods
	/////////////////////////////////////////////////////////////////////////////////////////////////////

	private _initialFit(): void {
		if(this._testFit()) return;

		const anchors = [...this._sheet.$independents].flatMap(c => c.$anchors());
		const xpy = anchors.map(p => p.x + p.y), ymx = anchors.map(p => p.y - p.x);
		const xpyMax = Math.max(...xpy), xpyMin = Math.min(...xpy);
		const ymxMax = Math.max(...ymx), ymxMin = Math.min(...ymx);
		this._testSize = Math.ceil(Math.max(xpyMax - xpyMin, ymxMax - ymxMin) / 2);

		const a = (xpyMax + xpyMin) / 2, b = (ymxMax + ymxMin) / 2;
		const x = Math.round((this._testSize - a + b) / 2);
		const y = Math.round((this._testSize - a - b) / 2);
		this._testOffset = { x, y };

		while(!this._testFit()) {
			this._testSize++;
			if(this._testSize % 2 == 0) {
				this._testOffset = { x: this._testOffset.x + 1, y: this._testOffset.y + 1 };
			}
		}
		this._size = this._testSize;
		this._applyOffset();
	}

	private _applyOffset(): void {
		if(!this._testOffset) return;
		for(const c of this._sheet.$independents) {
			c.$moveBy(this._testOffset);
		}
		this._testOffset = undefined;
	}

	private _testFit(): boolean {
		for(const c of this._sheet.$independents) {
			if(!c.$testGrid(this)) return false;
		}
		return true;
	}
}
