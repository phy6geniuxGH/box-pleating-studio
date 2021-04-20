
//////////////////////////////////////////////////////////////////
/**
 * `Workspace` 物件負責管理介於 `Viewport` 和 `Sheet` 之間的配置計算；
 * 我們把這個部份稱為工作區域，是一個可以被捲動的空間。
 */
//////////////////////////////////////////////////////////////////

@shrewd class Workspace {

	public $image: SheetImage;

	private readonly _studio: Studio;
	private readonly _viewport: Viewport;

	private _spaceHolder: HTMLDivElement;

	constructor(studio: Studio, viewport: Viewport) {
		this._studio = studio;
		this._viewport = viewport;

		// 加入一個填充空間、在 desktop 環境製造原生捲軸的 div
		studio.$el.appendChild(this._spaceHolder = document.createElement("div"));
		this._spaceHolder.style.zIndex = "-10"; // 修正 iPhone 6 的問題

		this.$image = new SheetImage(studio, viewport);
	}

	public $createImg() {
		let img = new Image();
		this._spaceHolder.appendChild(img);
		return img;
	}

	/** 目前工作區域的捲動偏移 */
	@shrewd public get $offset(): IPoint {
		let scroll = { x: this._scrollWidth, y: this._scrollHeight };
		let padding = this.$image.getPadding(scroll);
		return { x: padding.x - this._scroll.x, y: padding.y - this._scroll.y };
	}

	public $zoom(zoom: number, center: IPoint) {
		let sheet = this._design!.sheet;

		let offset = this.$offset, scale = this.$image.$scale;
		let cx = (center.x - offset.x) / scale, cy = (offset.y - center.y) / scale;

		sheet._zoom = zoom; // 執行完這行之後，再次存取 this.$image.$scale 和 this.$offset 會發生改變
		offset = this.$offset;
		scale = this.$image.$scale;

		this.$scrollTo(
			sheet.$scroll.x + cx * scale + offset.x - center.x,
			sheet.$scroll.y + offset.y - cy * scale - center.y
		);
	}

	public $scrollTo(x: number, y: number) {
		let w = this._scrollWidth - this._viewport.$width;
		let h = this._scrollHeight - this._viewport.$height;
		if(x < 0) x = 0;
		if(y < 0) y = 0;
		if(x > w) x = w;
		if(y > h) y = h;
		this._scroll.x = Math.round(x);
		this._scroll.y = Math.round(y);
	}

	/** 傳回全部（包括超出視界範圍的）要輸出的範圍 */
	public $getBound(): paper.Rectangle {
		let image = this.$image;
		let sw = this._scrollWidth;
		let sh = this._scrollHeight;
		let x = (sw - image.$width) / 2 - this._scroll.x;
		let y = (sh - image.$height) / 2 - this._scroll.y;
		return new paper.Rectangle(x, y, image.$width, image.$height);
	}

	@shrewd private _onSheetChange() {
		let sheet = this._design?.sheet;
		if(sheet) {
			this._spaceHolder.style.width = this._scrollWidth + "px";
			this._spaceHolder.style.height = this._scrollHeight + "px";
			this._studio.$system.$scroll.to(sheet.$scroll.x, sheet.$scroll.y);
		}
	}

	private get _design(): Design | null {
		return this._studio.$design;
	}

	public get _scroll(): IPoint {
		return this._design?.sheet.$scroll ?? { x: 0, y: 0 };
	}

	/** 全部的捲動寬度 */
	@shrewd private get _scrollWidth() { return Math.max(this.$image.$width, this._viewport.$width); }

	/** 全部的捲動高度 */
	@shrewd private get _scrollHeight() { return Math.max(this.$image.$height, this._viewport.$height); }
}
