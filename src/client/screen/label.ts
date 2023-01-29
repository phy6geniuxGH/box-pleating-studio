import { Container } from "@pixi/display";
import { Text } from "@pixi/text";

import { BLACK, DARK, LIGHT, WHITE } from "client/shared/constant";
import ProjectService, { MIN_SCALE } from "client/services/projectService";
import { Direction } from "client/types/enum";
import { PIXI } from "./inspector";
import { shallowRef } from "client/shared/decorators";
import { MARGIN_FIX } from "./constants";

import type { IDestroyOptions } from "@pixi/display";
import type { Rectangle } from "@pixi/math";
import type { Sheet } from "client/project/components/sheet";

const TIMEOUT = 10;
const SQRT = 2 / Math.sqrt(MIN_SCALE);

const TEXT_WIDTH_LIMIT = 50;
const SMOOTHNESS = 2;
const FONT_SIZE = 14;
const HALF = 0.5;

//=================================================================
/**
 * {@link Label} 類別繼承自 PIXI 的 {@link Container} 類別，是繪製文字標籤的基準。
 */
//=================================================================
export class Label extends Container {

	private readonly _sheet: Sheet;
	private readonly _label: Text = new Text();
	private readonly _glow: Text = new Text();
	@shallowRef private _labelWidth: number = 0;
	@shallowRef private _labelBounds: Rectangle = null!;

	private _contentCache: string = "";
	@shallowRef private _directionCache: Direction = Direction.none;
	@shallowRef private _xCache: number = 0;

	public $color?: number;
	public $distance: number = 1;

	private _timeout!: Timeout;

	constructor(sheet: Sheet) {
		super();
		this._sheet = sheet;
		sheet.$labels.add(this);

		this.addChild(this._glow);
		this.addChild(this._label);
		this._label.anchor.set(HALF);
		this._glow.anchor.set(HALF);

		if(DEBUG_ENABLED) {
			this._label.name = "Label";
			this._glow.name = "Glow";
		}
	}

	public override destroy(options?: boolean | IDestroyOptions | undefined): void {
		this._sheet.$labels.delete(this);
		super.destroy(options);
	}

	/**
	 * 繪製文字標籤
	 * @param text 要繪製的文字字串內容
	 * @param x 繪製的參考座標
	 * @param y 繪製的參考座標
	 * @param direction 繪製的方向（不指定的話則由格線決定）
	 */
	public $draw(text: string, x: number, y: number, direction?: Direction): void {
		// 設定文字
		text = text.trim();
		this.visible = Boolean(text);
		const dir = this.visible ? this._draw(text, x, y, direction) : Direction.none;

		if(this._contentCache != text || this._directionCache != dir || this._xCache != x) {
			this._contentCache = text;
			let width = text == "" ? 0 : Math.ceil(this._label.width) / SMOOTHNESS;
			if(directionalOffsets[dir].x === 0) width /= 2;
			const bounds = this._label.getLocalBounds().clone();

			// 延遲設定以避免循環參照
			clearTimeout(this._timeout);
			this._timeout = setTimeout(() => {
				this._directionCache = dir;
				this._labelWidth = width;
				this._labelBounds = bounds;
				this._xCache = x;
			}, TIMEOUT);
		}
	}

	/** 繪製文字標籤的核心方法 */
	private _draw(text: string, x: number, y: number, direction?: Direction): Direction {
		this._label.text = text;
		this._glow.text = text;

		// 粗略定位
		const s = ProjectService.scale.value;
		this.scale = { x: 1 / s / SMOOTHNESS, y: -1 / s / SMOOTHNESS };
		this.x = x;
		this.y = y;
		const factor = Math.sqrt(ProjectService.shrink.value);
		this._label.scale.set(factor);
		this._glow.scale.set(factor);

		// 這邊 Label 本身是一個讓 _glow 和 _label 可以對齊中心的外部容器，
		// 但是在定位的時候我們要的是對齊 _label 而不是較大的外框，
		// 因此這邊我們需要計算修正的大小
		const outerBounds = this.getLocalBounds();
		const innerBounds = this._label.getLocalBounds();
		const innerWidth = innerBounds.width * factor;
		const xFix = (outerBounds.width - innerWidth) / 2;
		const yFix = (outerBounds.height - innerBounds.height * factor) / 2;

		// 決定位置
		direction ??= this._sheet.grid.$getLabelDirection(x, y);
		if(direction != Direction.T && direction != Direction.none && innerWidth > TEXT_WIDTH_LIMIT) {
			// 實在太長的文字不允許往兩邊擺放
			direction = Direction.B;
		}
		const offset = directionalOffsets[direction];
		this.pivot.set(
			-(Math.sign(offset.x) * (innerWidth / 2 - xFix) + offset.x * this.$distance),
			Math.sign(offset.y) * (FONT_SIZE * SMOOTHNESS - yFix) + offset.y * this.$distance
		);

		// 決定繪製的顏色
		const dark = app.isDark.value;
		const fill = this.$color ?? (dark ? LIGHT : BLACK);
		const stroke = dark ? DARK : WHITE;
		this._label.style = {
			fill,
			fontSize: FONT_SIZE * SMOOTHNESS,
			stroke: fill,
			strokeThickness: 1,
		};
		this._glow.style = {
			fill: stroke,
			fontSize: FONT_SIZE * SMOOTHNESS,
			stroke,
			strokeThickness: 6,
			lineJoin: "bevel",
		};

		return direction;
	}

	/** 一個標籤的橫向溢出大小，單位是像素；由實際渲染結果決定 */
	public get $overflow(): number {
		const bounds = this._labelBounds;
		if(!bounds || !this.visible) return 0;

		let result = 0;
		const x = this._xCache;
		const sheetWidth = this._sheet.grid.$width;
		const scale = ProjectService.scale.value;
		const factor = Math.sqrt(ProjectService.shrink.value);
		const left = x * scale + (bounds.left * factor - this.pivot.x) / SMOOTHNESS;
		const right = (x - sheetWidth) * scale + (bounds.right * factor - this.pivot.x) / SMOOTHNESS;

		if(left < 0) result = -left;
		if(right > 0) result = Math.max(result, right);

		return Math.ceil(result) + MARGIN_FIX;
	}

	/** 透過解方程式來逆推考量到當前的標籤之下應該採用何種自動尺度 */
	public $inferHorizontalScale(sheetWidth: number, fullWidth: number): number {
		const labelWidth = this._labelWidth;
		if(labelWidth == 0) return NaN;
		fullWidth -= Math.abs(directionalOffsets[this._directionCache].x) * 2 / SMOOTHNESS;
		const size = Math.abs(2 * this._xCache - sheetWidth);
		let result = solveEq(-fullWidth, labelWidth * SQRT, size);
		if(result > MIN_SCALE) {
			if(size != 0) result = (fullWidth - 2 * labelWidth) / size;
			else result = fullWidth / sheetWidth;
		}
		return result;
	}
}

/** 解型如 o * x + s * Math.sqrt(x) + z == 0 的二次方程 */
function solveEq(z: number, s: number, o: number): number {
	if(o == 0) return z * z / (s * s); // 退化情況
	const f = 2 * o * z, b = s * s - f;
	const det = b * b - f * f;
	return (b - Math.sqrt(det)) / (2 * o * o);
}

/**
 * 各種方位上的文字偏移量；這是透過經驗法則決定出來的。
 */
const directionalOffsets: Record<Direction, IPoint> = {
	[Direction.UR]: { x: 12, y: 5 },
	[Direction.UL]: { x: -12, y: 5 },
	[Direction.LL]: { x: -12, y: -5 },
	[Direction.LR]: { x: 12, y: -5 },
	[Direction.T]: { x: 0, y: 7 },
	[Direction.L]: { x: -20, y: 0 },
	[Direction.B]: { x: 0, y: -7 },
	[Direction.R]: { x: 20, y: 0 },
	[Direction.none]: { x: 0, y: 0 },
};

if(DEBUG_ENABLED) PIXI.Label = Label;
