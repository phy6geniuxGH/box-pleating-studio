
interface IDesignObject {
	readonly design: Design;
}

//////////////////////////////////////////////////////////////////
/**
 * `Design` 是包含了樹狀結構以及摺痕圖的一個完整專案單位。
 *
 * 這個檔案包含了 `Design` 的對外操作方法；其它核心程式碼整理在 `DesignBase` 之中。
 */
//////////////////////////////////////////////////////////////////

@shrewd class Design extends DesignBase implements ISerializable<JDesign>, IQueryable {

	@shrewd public fullscreen: boolean;

	@shrewd public mode: string;

	@action public description?: string;

	@action public title: string;

	public readonly LayoutSheet: Sheet;

	public readonly TreeSheet: Sheet;

	public readonly tree: Tree;

	public readonly junctions: DoubleMapping<Flap, Junction>;

	/** 管理 Design 的編輯歷史 */
	public readonly history: HistoryManager;

	constructor(studio: BPStudio, profile: RecursivePartial<JDesign>) {
		super(studio, profile);

		this.LayoutSheet = new Sheet(this, "layout", this.data.layout.sheet,
			() => this.flaps.values(),
			() => this.rivers.values(),
			() => this.stretches.values(),
			() => this.devices,
		);
		this.TreeSheet = new Sheet(this, "tree", this.data.tree.sheet,
			() => this.edges.values(),
			() => this.vertices.values()
		);
		this.title = this.data.title;;
		this.fullscreen = this.data.fullscreen;
		this.description = this.data.description;
		this.mode = this.data.mode;

		this.tree = new Tree(this, this.data.tree.edges);

		// 這個的初始化必須放在 Tree 的後面，不然會出錯
		this.junctions = new DoubleMapping<Flap, Junction>(
			() => this.flaps.values(),
			(f1, f2) => new Junction(this.LayoutSheet, f1, f2)
		);

		this.history = new HistoryManager(this, this.data.history);
	}

	@shrewd public get sheet(): Sheet {
		return this.mode == "layout" ? this.LayoutSheet : this.TreeSheet;
	}

	public readonly design = this;
	public readonly tag = "design";

	public get display(): Display {
		return (this.mountTarget as BPStudio).$display;
	}

	public toJSON(history: boolean = false): JDesign {
		let result!: JDesign;
		this.tree.withJID(() => {
			result = {
				title: this.title,
				description: this.description,
				fullscreen: this.fullscreen,
				version: Migration.current,
				mode: this.mode,
				layout: {
					sheet: this.LayoutSheet.toJSON(),
					flaps: this.flaps.toJSON(),
					stretches: this.stretches.toJSON()
				},
				tree: {
					sheet: this.TreeSheet.toJSON(),
					nodes: this.vertices.toJSON(),
					edges: this.sortJEdge()
				}
			};
			if(history) result.history = this.history.toJSON();
		});
		return result;
	}

	public deleteVertices(vertices: readonly Vertex[]) {
		let arr = vertices.concat().sort((a, b) => a.node.degree - b.node.degree);
		while(this.vertices.size > 3) {
			let v = arr.find(v => v.node.degree == 1);
			if(!v) break;
			v.node.dispose()
			arr.splice(arr.indexOf(v), 1);
			this.$studio?.update();
		}
	}

	public deleteFlaps(flaps: readonly Flap[]) {
		for(let f of flaps) {
			if(this.vertices.size == 3) break;
			f.node.dispose();
			this.$studio?.update();
		}
	}

	public clearCPSelection() {
		for(let c of this.LayoutSheet.controls) c.selected = false;
	}

	public clearTreeSelection() {
		for(let c of this.TreeSheet.controls) c.selected = false;
	}

	public flapToVertex(flaps: Flap[]) {
		this.clearTreeSelection();
		for(let f of flaps) {
			let v = this.vertices.get(f.node)
			if(v) v.selected = true;
		}
		this.mode = "tree";
	}

	public vertexToFlap(vertices: Vertex[]) {
		this.clearCPSelection();
		for(let v of vertices) {
			let f = this.flaps.get(v.node)
			if(f) f.selected = true;
		}
		this.mode = "layout";
	}

	public riverToEdge(river: River) {
		this.clearTreeSelection();
		let e = this.edges.get(river.edge);
		if(e) e.selected = true;
		this.mode = "tree";
	}

	public edgeToRiver(edge: Edge) {
		this.clearCPSelection();
		let te = edge.edge;
		if(te.isRiver) {
			let r = this.rivers.get(te);
			if(r) r.selected = true;
		} else {
			let n = te.n1.degree == 1 ? te.n1 : te.n2;
			let f = this.flaps.get(n);
			if(f) f.selected = true;
		}
		this.mode = "layout";
	}

	public selectAll() {
		this.$studio?.system.$clearSelection();
		if(this.mode == "layout") this.flaps.forEach(f => f.selected = true);
		if(this.mode == "tree") this.vertices.forEach(v => v.selected = true);
	}

	/** 根據 tag 來找出唯一的對應物件 */
	public query(tag: string): ITagObject | undefined {
		if(tag == "design") return this;
		if(tag == "layout") return this.LayoutSheet;
		if(tag == "tree") return this.TreeSheet;
		let m = tag.match(/^([a-z]+)(\d+(?:,\d+)*)(?:\.(.+))?$/);
		if(m) {
			let init = m[1], id = m[2], then = m[3];
			if(init == "s") return this.stretches.get(id);
			if(init == "r") return this.stretches.get(id)!.repository?.query(then);

			let t = this.tree;
			if(init == "e") return t.find(id);

			let n = t.node.get(Number(id))!;
			if(init == "n") return n;
			if(init == "f") return this.flaps.get(n);
			if(init == "v") return this.vertices.get(n);
		}
		return undefined;
	}
}
