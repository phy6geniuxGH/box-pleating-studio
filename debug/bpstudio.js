var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
if (typeof Shrewd != "object")
    throw new Error("BPStudio requires Shrewd.");
const { shrewd } = Shrewd;
Shrewd.option.autoCommit = false;
setInterval(() => Shrewd.commit(), 50);
let debug = false;
function nonEnumerable(target, name, desc) {
    if (desc) {
        desc.enumerable = false;
        return desc;
    }
    Object.defineProperty(target, name, {
        set(value) {
            Object.defineProperty(this, name, {
                value, writable: true, configurable: false,
            });
        },
        configurable: true,
    });
}
;
function action(target, name) {
    if (name === undefined)
        return (obj, name) => actionInner(obj, name, target);
    else
        actionInner(target, name, {});
}
function actionInner(target, name, option) {
    shrewd({
        validator(v) {
            var _a, _b;
            let record = actionMap.get(this);
            if (!record)
                actionMap.set(this, record = {});
            let result = (_b = (_a = option.validator) === null || _a === void 0 ? void 0 : _a.apply(this, [v])) !== null && _b !== void 0 ? _b : true;
            if (result) {
                if (name in record && record[name] != v) {
                    if (!('design' in this))
                        debugger;
                    this.design.history.fieldChange(this, name, record[name], v);
                }
                record[name] = v;
            }
            return result;
        }
    })(target, name);
}
const actionMap = new WeakMap();
function onDemand(target, name, desc) {
    let getter = desc.get;
    return {
        get() {
            let record = onDemandMap.get(this);
            if (!record)
                onDemandMap.set(this, record = {});
            if (name in record)
                return record[name];
            else
                return record[name] = getter.apply(this);
        },
        enumerable: false,
        configurable: false
    };
}
;
const onDemandMap = new WeakMap();
class Partitioner {
    constructor(config, data) {
        this.configuration = config;
        this.overlaps = data.overlaps;
        this.strategy = data.strategy;
    }
    static getMaxIntersectionDistance(tree, r1, r2, oriented) {
        let q = oriented ? 2 : 0;
        let n1 = tree.node.get(r1.c[q].e);
        let n2 = tree.node.get(r2.c[q].e);
        let n3 = tree.node.get(r1.c[2 - q].e);
        return tree.distTriple(n1, n2, n3).d3;
    }
    *generate() {
        let { strategy } = this;
        if (this.overlaps.length == 1) {
            let o = this.overlaps[0];
            let j = this.configuration.repository.structure[o.parent];
            if (strategy == Strategy.halfIntegral) {
                for (let g of this.halfKamiya(o, j.sx))
                    yield { gadgets: [g] };
            }
            if (strategy == Strategy.universal) {
                for (let g of this.universalGPS(o, j.sx))
                    yield { gadgets: [g] };
            }
            else {
                for (let p of Piece.gops(o, j.sx))
                    yield { gadgets: [{ pieces: [p] }] };
            }
        }
        if (this.overlaps.length == 2) {
            let joiner = this.configuration.repository.getJoiner(this.overlaps);
            if (strategy == Strategy.baseJoin) {
                yield* joiner.baseJoin();
            }
            else if (strategy == Strategy.standardJoin) {
                yield* joiner.standardJoin();
            }
            else {
                yield* joiner.simpleJoin(strategy);
            }
        }
    }
    *universalGPS(o, sx) {
        let d = 2, found = false;
        while (!found) {
            let bigO = clone(o);
            bigO.ox *= d;
            bigO.oy *= d;
            for (let p of Piece.gops(bigO, sx * d)) {
                let p1 = Piece.instantiate(p).shrink(d);
                if (!Number.isInteger(p1.v))
                    continue;
                let { ox, oy, u, v } = p1;
                let p2 = { ox, oy, u: v, v: u };
                let pt1 = { x: 0, y: 0 }, pt2 = { x: oy + u + v, y: ox + u + v };
                p1.detours = [[pt1, pt2]];
                p2.detours = [[pt2, pt1]];
                let sx = p1.oy + p1.u + p1.v, s = Math.ceil(sx) - sx;
                let g = new Gadget({ pieces: [p1, p2] });
                let gr = g.reverseGPS();
                yield g.addSlack(2, s);
                yield gr.addSlack(0, s);
                found = true;
            }
            d += 2;
        }
    }
    *halfKamiya(o, sx) {
        if (o.ox % 2 == 0 || o.oy % 2 == 0)
            return;
        let doubleO = clone(o);
        doubleO.ox <<= 1;
        doubleO.oy <<= 1;
        for (let p of Piece.gops(doubleO, sx * 2)) {
            let p1 = Piece.instantiate(p);
            if (p1.rank > 3)
                continue;
            let v_even = p1.v % 2 == 0;
            if (p1.ox == p1.oy && v_even)
                continue;
            let { ox, oy, u, v } = p1.shrink(2);
            let diff = Math.abs(ox - oy) / 2;
            if (!Number.isInteger(diff))
                debugger;
            let sm = Math.min(ox, oy);
            let p2;
            if (v_even && ox >= oy) {
                p1.detours = [[{ x: diff, y: 3 * diff }, { x: oy + u + v, y: ox + u + v }]];
                p2 = {
                    ox: sm, oy: sm, u: v, v: u - diff,
                    detours: [[{ x: sm + u + v - diff, y: sm + u + v - diff }, { x: 0, y: 0 }]],
                    shift: { x: diff, y: 3 * diff }
                };
            }
            else if (!v_even && oy >= ox) {
                p1.detours = [[{ x: oy + u + v, y: ox + u + v }, { x: diff * 3, y: diff }]];
                p2 = {
                    ox: sm, oy: sm, u: v - diff, v: u,
                    detours: [[{ x: 0, y: 0 }, { x: sm + u + v - diff, y: sm + u + v - diff }]],
                    shift: { x: diff * 3, y: diff }
                };
            }
            else
                continue;
            let g = new Gadget({ pieces: [p1, p2] });
            let gr = g.reverseGPS();
            yield g.addSlack(2, 0.5);
            yield gr.addSlack(0, 0.5);
        }
    }
}
class Region {
    get axisParallels() {
        let ref = this.shape.contour.find(p => p.isIntegral);
        let dir = this.direction;
        let step = dir.rotate90().normalize();
        let min = Number.POSITIVE_INFINITY, max = Number.NEGATIVE_INFINITY;
        for (let p of this.shape.contour) {
            let units = p.sub(ref).dot(step);
            if (units > max)
                max = units;
            if (units < min)
                min = units;
        }
        let ap = [];
        for (let i = Math.ceil(min); i <= Math.floor(max); i++) {
            let p = ref.add(step.scale(i));
            let intersections = [];
            for (let r of this.shape.ridges) {
                let j = r.intersection(p, dir);
                if (j && !j.eq(intersections[0]))
                    intersections.push(j);
                if (intersections.length == 2)
                    break;
            }
            if (intersections.length == 2) {
                ap.push(new Line(...intersections));
            }
        }
        return ap;
    }
}
__decorate([
    onDemand
], Region.prototype, "axisParallels", null);
let Disposable = class Disposable {
    constructor(parent) {
        this._disposed = false;
        this._disposeWith = parent;
    }
    _disposeEvent() {
        if (this.disposed) {
            Shrewd.terminate(this);
            this.onDispose();
        }
    }
    get shouldDispose() {
        return this._disposeWith ? this._disposeWith.disposed : false;
    }
    dispose() {
        this._disposed = true;
    }
    onDispose() {
        delete this._disposeWith;
    }
    get disposed() {
        return this._disposed;
    }
};
__decorate([
    shrewd({
        renderer(v) {
            return v || this.shouldDispose;
        }
    })
], Disposable.prototype, "_disposed", void 0);
__decorate([
    shrewd
], Disposable.prototype, "_disposeEvent", null);
__decorate([
    shrewd
], Disposable.prototype, "disposed", null);
Disposable = __decorate([
    shrewd
], Disposable);
class Piece extends Region {
    constructor(piece) {
        super();
        deepCopy(this, piece);
    }
    get _points() {
        let { ox, oy, u, v } = this;
        let result = [
            Point.ZERO,
            new Point(u, ox + u),
            new Point(oy + u + v, ox + u + v),
            new Point(oy + v, v),
        ];
        result.forEach(p => p.addBy(this._shift));
        return result;
    }
    get _shift() {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        return new Vector(((_b = (_a = this.shift) === null || _a === void 0 ? void 0 : _a.x) !== null && _b !== void 0 ? _b : 0) + ((_d = (_c = this._offset) === null || _c === void 0 ? void 0 : _c.x) !== null && _d !== void 0 ? _d : 0), ((_f = (_e = this.shift) === null || _e === void 0 ? void 0 : _e.y) !== null && _f !== void 0 ? _f : 0) + ((_h = (_g = this._offset) === null || _g === void 0 ? void 0 : _g.y) !== null && _h !== void 0 ? _h : 0));
    }
    get shape() {
        let contour = this._points.concat();
        let ridges = contour.map((p, i, c) => new Line(p, c[(i + 1) % c.length]));
        (this.detours || []).forEach(d => {
            let detour = d.map(p => new Point(p.x, p.y).addBy(this._shift));
            let start = detour[0], end = detour[detour.length - 1];
            let lines = [];
            for (let i = 0; i < detour.length - 1; i++) {
                lines.push(new Line(detour[i], detour[i + 1]));
            }
            let l = ridges.length;
            for (let i = 0; i < l; i++) {
                let eq = ridges[i].p1.eq(start);
                if (eq || ridges[i].contains(start)) {
                    for (let j = 1; j < l; j++) {
                        let k = (j + i) % l;
                        if (ridges[k].p1.eq(end) || ridges[k].contains(end)) {
                            let tail = k < i ? l - i : j + 1, head = j + 1 - tail;
                            let pts = detour.concat();
                            lines.push(new Line(end, ridges[k].p2));
                            if (!eq) {
                                pts.unshift(ridges[i].p1);
                                lines.unshift(new Line(ridges[i].p1, start));
                            }
                            contour.splice(i, tail, ...pts);
                            ridges.splice(i, tail, ...lines);
                            contour.splice(0, head);
                            ridges.splice(0, head);
                            return;
                        }
                    }
                    debugger;
                }
            }
        });
        return { contour, ridges };
    }
    get anchors() {
        let p = this._points;
        let { contour } = this.shape;
        return [
            contour.some(c => c.eq(p[0])) ? p[0] : null,
            contour.includes(p[1]) ? p[1] : null,
            contour.some(c => c.eq(p[2])) ? p[2] : null,
            contour.includes(p[3]) ? p[3] : null
        ];
    }
    get direction() {
        let { oy, v } = this;
        return new Vector(oy + v, v).doubleAngle();
    }
    get sx() {
        return this.oy + this.u + this.v;
    }
    get sy() {
        return this.ox + this.u + this.v;
    }
    get rank() {
        let r1 = MathUtil.reduce(this.oy + this.v, this.oy)[0];
        let r2 = MathUtil.reduce(this.ox + this.u, this.ox)[0];
        return Math.max(r1, r2);
    }
    reverse(tx, ty) {
        let { shift, detours, sx, sy } = this;
        shift = shift || { x: 0, y: 0 };
        let s = { x: tx - sx - shift.x, y: ty - sy - shift.y };
        if (s.x || s.y)
            this.shift = s;
        detours === null || detours === void 0 ? void 0 : detours.forEach(c => c.forEach(p => { p.x = sx - p.x; p.y = sy - p.y; }));
    }
    shrink(by = 2) {
        onDemandMap.delete(this);
        this.ox /= by;
        this.oy /= by;
        this.u /= by;
        this.v /= by;
        return this;
    }
    offset(o) {
        if (!o || this._offset && this._offset.x == o.x && this._offset.y == o.y)
            return;
        this._offset = o;
        onDemandMap.delete(this);
    }
    addDetour(detour) {
        detour = clone(detour);
        for (let i = 0; i < detour.length - 1; i++) {
            if (detour[i].x == detour[i + 1].x && detour[i].y == detour[i + 1].y)
                detour.splice(i--, 1);
        }
        if (detour.length == 1)
            return;
        this.detours = this.detours || [];
        this.detours.push(detour);
        onDemandMap.delete(this);
    }
    clearDetour() {
        var _a;
        if ((_a = this.detours) === null || _a === void 0 ? void 0 : _a.length) {
            this.detours = undefined;
            onDemandMap.delete(this);
        }
    }
    toJSON() {
        return clone(this);
    }
    static *gops(overlap, sx) {
        let { ox, oy } = overlap;
        if ([ox, oy].some(n => !Number.isSafeInteger(n)))
            return;
        if (ox % 2 && oy % 2)
            return;
        if (sx === undefined)
            sx = Number.POSITIVE_INFINITY;
        let ha = ox * oy / 2;
        for (let u = Math.floor(Math.sqrt(ha)), v; u > 0 && u + (v = ha / u) + oy <= sx; u--) {
            if (ha % u == 0) {
                if (u == v)
                    yield { ox, oy, u, v };
                if (u != v) {
                    let p1 = new Piece({ ox, oy, u, v });
                    let p2 = new Piece({ ox, oy, u: v, v: u });
                    let r1 = p1.rank, r2 = p2.rank;
                    if (r1 > r2) {
                        yield p2;
                        yield p1;
                    }
                    else {
                        yield p1;
                        yield p2;
                    }
                }
            }
        }
    }
    static instantiate(p, alwaysNew = false) {
        return p instanceof Piece && !alwaysNew ? p : new Piece(p);
    }
}
__decorate([
    onDemand
], Piece.prototype, "_points", null);
__decorate([
    nonEnumerable
], Piece.prototype, "_offset", void 0);
__decorate([
    onDemand
], Piece.prototype, "_shift", null);
__decorate([
    onDemand
], Piece.prototype, "shape", null);
__decorate([
    onDemand
], Piece.prototype, "anchors", null);
__decorate([
    onDemand
], Piece.prototype, "direction", null);
__decorate([
    onDemand
], Piece.prototype, "rank", null);
class AddOn extends Region {
    constructor(data) {
        super();
        this.contour = data.contour;
        this.dir = data.dir;
    }
    get shape() {
        let contour = this.contour.map(p => new Point(p));
        let ridges = contour.map((p, i, c) => new Line(p, c[(i + 1) % c.length]));
        return { contour, ridges };
    }
    get direction() {
        return new Vector(this.dir);
    }
    static instantiate(a) {
        return a instanceof AddOn ? a : new AddOn(a);
    }
}
__decorate([
    onDemand
], AddOn.prototype, "shape", null);
__decorate([
    onDemand
], AddOn.prototype, "direction", null);
let DoubleMap = class DoubleMap {
    constructor() {
        this._map = new Map();
        this._size = 0;
    }
    set(key1, key2, value) {
        if (!this.has(key1, key2)) {
            if (!this._map.has(key1))
                this._map.set(key1, new Map());
            if (!this._map.has(key2))
                this._map.set(key2, new Map());
            this._size++;
        }
        this._map.get(key1).set(key2, value);
        this._map.get(key2).set(key1, value);
        return this;
    }
    get [Symbol.toStringTag]() { return "DoubleMap"; }
    has(...args) {
        this._size;
        if (args.length == 1)
            return this._map.has(args[0]);
        else
            return this._map.has(args[0]) && this._map.get(args[0]).has(args[1]);
    }
    get(...args) {
        this._size;
        if (args.length == 1)
            return this._map.get(args[0]);
        else if (!this.has(args[0], args[1]))
            return undefined;
        else
            return this._map.get(args[0]).get(args[1]);
    }
    get size() {
        return this._size;
    }
    clear() {
        this._map.clear();
        this._size = 0;
    }
    forEach(callbackfn, thisArg) {
        if (!thisArg)
            thisArg = this;
        for (let [k1, k2, v] of this.entries())
            callbackfn.apply(thisArg, [v, k1, k2, this]);
    }
    delete(...args) {
        if (args.length == 1) {
            if (!this._map.has(args[0]))
                return false;
            this._size -= this._map.get(args[0]).size;
            this._map.delete(args[0]);
            for (let m of this._map.values())
                m.delete(args[0]);
            return true;
        }
        else {
            if (!this.has(args[0], args[1]))
                return false;
            this._map.get(args[0]).delete(args[1]);
            this._map.get(args[1]).delete(args[0]);
            this._size--;
            return true;
        }
    }
    [Symbol.iterator]() { return this.entries(); }
    *entries() {
        for (let [k1, k2] of this.keys())
            yield [k1, k2, this.get(k1, k2)];
    }
    *keys() {
        this._size;
        let temp = new Map();
        for (let k1 of this._map.keys()) {
            temp.set(k1, new Set());
            for (let k2 of this._map.get(k1).keys()) {
                if (temp.has(k2) && temp.get(k2).has(k1))
                    continue;
                temp.get(k1).add(k2);
                yield [k1, k2];
            }
        }
    }
    firstKeys() {
        this._size;
        return this._map.keys();
    }
    *values() {
        for (let [k1, k2] of this.keys())
            yield this.get(k1, k2);
    }
};
__decorate([
    shrewd
], DoubleMap.prototype, "_size", void 0);
DoubleMap = __decorate([
    shrewd
], DoubleMap);
class BaseMapping {
    constructor(source, keyGen, ctor, dtor) {
        this.source = source;
        this.keyGen = keyGen;
        this.ctor = ctor;
        this.dtor = dtor;
        this._map = new Map();
    }
    render() {
        for (let [key, value] of this._map) {
            if (this.dtor(key, value))
                this._map.delete(key);
        }
        for (let group of this.source()) {
            let key = this.keyGen(group);
            if (!this._map.has(key))
                this._map.set(key, this.ctor(group));
        }
        return new Map(this._map);
    }
    get(key) { return this.render().get(key); }
    has(key) { return this.render().has(key); }
    forEach(callbackfn, thisArg) {
        return this.render().forEach(callbackfn, thisArg);
    }
    get size() { return this.render().size; }
    [Symbol.iterator]() { return this.render()[Symbol.iterator](); }
    entries() { return this.render().entries(); }
    keys() { return this.render().keys(); }
    values() { return this.render().values(); }
    toJSON() {
        return Array.from(this.values()).map(v => v.toJSON());
    }
}
__decorate([
    shrewd
], BaseMapping.prototype, "render", null);
let DoubleMapping = class DoubleMapping {
    constructor(source, constructor) {
        this._source = source;
        this._constructor = constructor;
        this._map = new DoubleMap();
    }
    dispose() {
        Shrewd.terminate(this);
        Shrewd.terminate(this._map);
    }
    has(...args) { return this._map.has.apply(this._map, args); }
    get(...args) { return this._map.get.apply(this._map, args); }
    get size() { return this._map.size; }
    forEach(callbackfn, thisArg) {
        return this._map.forEach(callbackfn, thisArg);
    }
    [Symbol.iterator]() { return this._map[Symbol.iterator](); }
    entries() { return this._map.entries(); }
    keys() { return this._map.keys(); }
    firstKeys() { return this._map.firstKeys(); }
    values() { return this._map.values(); }
};
__decorate([
    shrewd({
        renderer(map) {
            for (let key of map.firstKeys()) {
                if (key.disposed)
                    map.delete(key);
            }
            let source = Array.from(this._source());
            if (source.length > 1 && map.size == 0) {
                map.set(source[0], source[1], this._constructor(source[0], source[1]));
            }
            for (let key of source) {
                if (!map.has(key)) {
                    let keys = Array.from(map.firstKeys());
                    for (let k of keys)
                        map.set(key, k, this._constructor(key, k));
                }
            }
            return map;
        }
    })
], DoubleMapping.prototype, "_map", void 0);
DoubleMapping = __decorate([
    shrewd
], DoubleMapping);
window.BigInt = window.BigInt || ((n) => n);
const BIG1 = BigInt(1);
class Fraction {
    constructor(n, d = 1) {
        if (n instanceof Fraction) {
            this._p = n._p;
            this._q = n._q * BigInt(d);
        }
        else if (typeof n == 'bigint' && typeof d == 'bigint') {
            this._p = n;
            this._q = d;
        }
        else if (typeof n == 'bigint' && d === 1) {
            this._p = n;
            this._q = BIG1;
        }
        else if (typeof n == 'number' && typeof d == 'number') {
            if (Number.isSafeInteger(n) && Number.isSafeInteger(d)) {
                this._p = BigInt(n);
                this._q = BigInt(d);
            }
            else if (!Number.isFinite(n / d)) {
                debugger;
                throw new Error("Parameters are not valid");
            }
            else {
                let f = Fraction.toFraction(n / d);
                this._p = f._p;
                this._q = f._q;
            }
        }
        else {
            debugger;
            throw new Error("Parameters are not valid");
        }
    }
    static toFraction(v, k2 = 1, k1 = 0, err = Fraction.ERROR) {
        let n = Math.floor(v), r = v - n, k0 = n * k1 + k2;
        if (r / k0 / ((1 - r) * k0 + k1) < err)
            return new Fraction(n);
        else
            return Fraction.toFraction(1 / r, k1, k0).i().a(n);
    }
    get $numerator() { return this._p; }
    get $denominator() { return this._q; }
    get value() { return Number(this._p) / Number(this._q); }
    toString() { this.smp(); return this._p + (this._q > 1 ? "/" + this._q : ""); }
    c() { return new Fraction(this._p, this._q); }
    smp() {
        [this._p, this._q] = MathUtil.reduce(this._p, this._q);
        return this._check();
    }
    n() { this._p = -this._p; return this; }
    i() { [this._p, this._q] = [this._q, this._p]; return this; }
    r() {
        this._p = BigInt(Math.round(this.value));
        this._q = BIG1;
        return this;
    }
    a(v) {
        if (v instanceof Fraction) {
            this._p = this._p * v._q + this._q * v._p;
            this._q *= v._q;
        }
        else if (Number.isInteger(v))
            this._p += BigInt(v) * this._q;
        else
            this.a(new Fraction(v));
        return this;
    }
    s(v) {
        if (v instanceof Fraction) {
            this._p = this._p * v._q - this._q * v._p;
            this._q *= v._q;
        }
        else if (Number.isInteger(v))
            this._p -= BigInt(v) * this._q;
        else
            this.s(new Fraction(v));
        return this;
    }
    m(v) {
        if (v instanceof Fraction) {
            this._p *= v._p;
            this._q *= v._q;
        }
        else if (Number.isInteger(v))
            this._p *= BigInt(v);
        else
            this.m(new Fraction(v));
        return this._check();
    }
    d(v) {
        if (v instanceof Fraction) {
            this._p *= v._q;
            this._q *= v._p;
        }
        else if (Number.isInteger(v))
            this._q *= BigInt(v);
        else
            this.d(new Fraction(v));
        return this._check();
    }
    _check() {
        if (this._q < 0) {
            this._q = -this._q;
            this._p = -this._p;
        }
        return this;
    }
    get neg() { return this.c().n(); }
    get inv() { return this.c().i(); }
    add(v) { return this.c().a(v); }
    sub(v) { return this.c().s(v); }
    mul(v) { return this.c().m(v); }
    div(v) { return this.c().d(v); }
    eq(v) {
        if (v instanceof Fraction)
            return this._p * v._q == this._q * v._p;
        else
            return this._p == this._q * BigInt(v);
    }
    ne(v) {
        if (v instanceof Fraction)
            return this._p * v._q != this._q * v._p;
        else if (Number.isSafeInteger(v))
            return this._p != this._q * BigInt(v);
        else
            return this.ne(new Fraction(v));
    }
    lt(v) {
        if (v instanceof Fraction)
            return this._p * v._q < this._q * v._p;
        else if (Number.isSafeInteger(v))
            return this._p < this._q * BigInt(v);
        else
            return this.lt(new Fraction(v));
    }
    gt(v) {
        if (v instanceof Fraction)
            return this._p * v._q > this._q * v._p;
        else if (Number.isSafeInteger(v))
            return this._p > this._q * BigInt(v);
        else
            return this.gt(new Fraction(v));
    }
    le(v) {
        if (v instanceof Fraction)
            return this._p * v._q <= this._q * v._p;
        else if (Number.isSafeInteger(v))
            return this._p <= this._q * BigInt(v);
        else
            return this.le(new Fraction(v));
    }
    ge(v) {
        if (v instanceof Fraction)
            return this._p * v._q >= this._q * v._p;
        else if (Number.isSafeInteger(v))
            return this._p >= this._q * BigInt(v);
        else
            return this.ge(new Fraction(v));
    }
    toJSON() {
        return this.toString();
    }
}
Fraction.ERROR = 1e-12;
class Partition extends Partitioner {
    constructor(config, data) {
        super(config, data);
        this.cornerMap = [];
        for (let [i, o] of data.overlaps.entries()) {
            for (let [j, c] of o.c.entries()) {
                this.cornerMap.push([c, i, j]);
            }
        }
    }
    get intersectionCorners() {
        return this.cornerMap.filter(m => {
            let type = m[0].type;
            return type == CornerType.side ||
                type == CornerType.intersection;
        });
    }
    get outCorners() {
        return this.intersectionCorners.concat(this.cornerMap.filter(m => m[0].type == CornerType.flap));
    }
    get constraints() {
        return this.cornerMap.filter(m => {
            let type = m[0].type;
            return type == CornerType.socket ||
                type == CornerType.internal ||
                type == CornerType.flap;
        });
    }
    getOriginalDisplacement(pattern) {
        let o = this.overlaps.find(o => o.c[0].type != CornerType.coincide);
        return pattern.getConnectionTarget(o.c[0])
            .sub(this.configuration.repository.stretch.origin);
    }
    get _sideConnectionTarget() {
        let result = new Map();
        let flaps = this.configuration.sheet.design.flapsById;
        for (let [c, o, q1] of this.intersectionCorners) {
            let ov = this.overlaps[o];
            let parent = this.getParent(ov);
            let [c1, c2] = [parent.c[0], parent.c[2]];
            let [f1, f2] = [flaps.get(c1.e), flaps.get(c2.e)];
            let quad1 = f1.quadrants[c1.q], d1 = 0;
            let quad2 = f2.quadrants[c2.q], d2 = 0;
            if (c.type == CornerType.intersection) {
                let oriented = ov.c[0].e < 0;
                let tree = this.configuration.sheet.design.tree;
                let n3 = tree.node.get(c.e);
                let t = tree.distTriple(f1.node, f2.node, n3);
                if (oriented)
                    d2 = t.d2 - f2.radius;
                else
                    d1 = t.d1 - f1.radius;
                if (isNaN(d1) || isNaN(d2))
                    debugger;
            }
            ov = this.getExposedOverlap(ov);
            let p1 = quad1.getOverlapCorner(ov, parent, q1, d1);
            let p2 = quad2.getOverlapCorner(ov, parent, opposite(q1), d2);
            result.set(c, [p1, p2]);
        }
        return result;
    }
    getExposedOverlap(ov) {
        var _a;
        if (this.overlaps.length == 1)
            return ov;
        let result = clone(ov), parent = this.getParent(ov);
        result.shift = (_a = result.shift) !== null && _a !== void 0 ? _a : { x: 0, y: 0 };
        for (let o of this.overlaps)
            if (o != ov) {
                let p = this.getParent(o);
                let w = result.ox + result.shift.x;
                let h = result.oy + result.shift.y;
                if (p.c[0].e == parent.c[0].e) {
                    if (p.ox < parent.ox)
                        result.ox = w - (result.shift.x = Math.max(result.shift.x, p.ox));
                    if (p.oy < parent.oy)
                        result.oy = h - (result.shift.y = Math.max(result.shift.y, p.oy));
                }
                if (p.c[2].e == parent.c[2].e) {
                    if (p.ox < parent.ox)
                        result.ox = parent.ox - Math.max(p.ox, parent.ox - w) - result.shift.x;
                    if (p.oy < parent.oy)
                        result.oy = parent.oy - Math.max(p.oy, parent.oy - h) - result.shift.y;
                }
            }
        return result;
    }
    getParent(ov) {
        return this.configuration.repository.structure[ov.parent];
    }
    getSideConnectionTarget(point, c, q) {
        let [p1, p2] = this._sideConnectionTarget.get(c);
        if (p1._x.gt(p2._x))
            [p1, p2] = [p2, p1];
        if (q === undefined) {
            if (point._x.le(p1._x))
                return p1;
            if (point._x.ge(p2._x))
                return p2;
            return null;
        }
        else {
            return q == 0 || q == 3 ? p1 : p2;
        }
    }
    toJSON() {
        let result = {
            overlaps: this.overlaps,
            strategy: this.strategy
        };
        let map = this.configuration.jidMap;
        if (map.size > 0) {
            result.overlaps = clone(result.overlaps);
            for (let o of result.overlaps) {
                for (let c of o.c)
                    if (c.e !== undefined && c.e >= 0)
                        c.e = map.get(c.e);
            }
        }
        return result;
    }
}
__decorate([
    onDemand
], Partition.prototype, "intersectionCorners", null);
__decorate([
    onDemand
], Partition.prototype, "outCorners", null);
__decorate([
    onDemand
], Partition.prototype, "constraints", null);
__decorate([
    shrewd
], Partition.prototype, "_sideConnectionTarget", null);
let Mapping = class Mapping extends BaseMapping {
    constructor(source, constructor) {
        super(source, k => k, constructor, (k, v) => v.disposed);
    }
};
Mapping = __decorate([
    shrewd
], Mapping);
let GroupMapping = class GroupMapping extends BaseMapping {
    constructor(source, keyGen, ctor) {
        super(source, keyGen, ctor, (k, v) => v.disposed);
    }
};
GroupMapping = __decorate([
    shrewd
], GroupMapping);
class Mountable extends Disposable {
    constructor(parent) {
        super();
        this._oldStudio = null;
        this.mountTarget = parent;
    }
    get shouldDispose() {
        return super.shouldDispose ||
            (this.mountTarget instanceof Mountable ? this.mountTarget.disposed : false);
    }
    get $studio() {
        if (this.disposed || !this.isActive)
            return null;
        else if (!(this.mountTarget instanceof Mountable))
            return this.mountTarget;
        else
            return this.mountTarget.$studio;
    }
    mountEvents() {
        if (this.$studio !== this._oldStudio) {
            if (this.$studio)
                this.onMount(this.$studio);
            if (this._oldStudio)
                this.onDismount(this._oldStudio);
            this._oldStudio = this.$studio;
        }
    }
    onDispose() {
        let self = this;
        if (this._oldStudio)
            this.onDismount(this._oldStudio);
        super.onDispose();
        delete self.mountTarget;
    }
    get isActive() { return true; }
    static isActive(m) { return m.isActive; }
    onMount(studio) { }
    onDismount(studio) { }
}
__decorate([
    shrewd
], Mountable.prototype, "$studio", null);
__decorate([
    shrewd
], Mountable.prototype, "mountEvents", null);
let Tree = class Tree extends Disposable {
    constructor(design, edges) {
        super(design);
        this.node = new Map();
        this.edge = new DoubleMap();
        this.path = new DoubleMapping(() => this.node.values(), (n1, n2) => new TreePath(n1, n2));
        this.nextId = 0;
        this.jidMap = new Map();
        this.design = design;
        while (edges === null || edges === void 0 ? void 0 : edges.length) {
            let remain = [], ok = false;
            for (let e of edges) {
                if (this.addEdge(e.n1, e.n2, e.length))
                    ok = true;
                else {
                    remain.push(e);
                }
            }
            if (!ok)
                break;
            edges = remain;
        }
    }
    onDispose() {
        Shrewd.terminate(this.edge);
        this.path.dispose();
    }
    get leaf() {
        var set = new Set();
        for (let node of this.node.values())
            if (node.degree == 1)
                set.add(node);
        return set;
    }
    generateJID() {
        let arr = Array.from(this.node.values()).sort((a, b) => a.id - b.id), i = 0;
        for (let n of arr)
            this.jidMap.set(n.id, n.jid = i++);
    }
    dist(n1, n2) {
        let path = this.path.get(n1, n2);
        return path ? path.length : NaN;
    }
    getOrAddNode(n) {
        let N;
        if (this.node.has(n))
            N = this.node.get(n);
        else {
            this.node.set(n, N = new TreeNode(this, n));
            if (n >= this.nextId)
                this.nextId = n + 1;
        }
        return N;
    }
    split(e) {
        let N = this.getOrAddNode(this.nextId);
        let { n1, n2 } = e;
        this.edge.delete(n1, n2);
        this.edge.set(N, n1, new TreeEdge(N, n1, Math.ceil(e.length / 2)));
        this.edge.set(N, n2, new TreeEdge(N, n2, Math.max(Math.floor(e.length / 2), 1)));
        e.dispose();
        return N;
    }
    deleteAndMerge(e) {
        let N = this.getOrAddNode(this.nextId);
        let { n1, n2, a1, a2 } = e;
        this.edge.delete(n1, n2);
        for (let edge of a1) {
            let n = edge.n(n1);
            this.edge.delete(n, n1);
            this.edge.set(N, n, new TreeEdge(N, n, edge.length));
        }
        for (let edge of a2) {
            let n = edge.n(n2);
            this.edge.delete(n, n2);
            this.edge.set(N, n, new TreeEdge(N, n, edge.length));
        }
        n1.dispose(true);
        n2.dispose(true);
        return N;
    }
    deleteAndJoin(n) {
        let edges = n.edges;
        if (edges.length != 2) {
            console.warn(`Incorrectly calling delete-and-join at [${n.id}].`);
            return;
        }
        let e1 = edges[0], e2 = edges[1];
        let N1 = e1.n(n), N2 = e2.n(n);
        let edge = new TreeEdge(N1, N2, e1.length + e2.length);
        this.edge.set(N1, N2, edge);
        n.dispose(true);
        return edge;
    }
    addLeafAt(n, length) {
        let id = this.nextId;
        this.addEdge(n, id, length);
        return this.node.get(id);
    }
    addEdge(n1, n2, length) {
        let has1 = this.node.has(n1), has2 = this.node.has(n2);
        if (this.node.size != 0 && !has1 && !has2) {
            console.warn(`Adding edge (${n1},${n2}) disconnects the graph.`);
            return false;
        }
        let N1 = this.getOrAddNode(n1), N2 = this.getOrAddNode(n2);
        if (this.edge.has(N1, N2)) {
            this.edge.get(N1, N2).length = length;
            return false;
        }
        else if (has1 && has2) {
            console.warn(`Adding edge (${n1},${n2}) will cause circuit.`);
            return false;
        }
        let edge = new TreeEdge(N1, N2, length);
        this.edge.set(N1, N2, edge);
        return true;
    }
    distTriple(n1, n2, n3) {
        let d12 = this.dist(n1, n2);
        let d13 = this.dist(n1, n3);
        let d23 = this.dist(n2, n3);
        let total = (d12 + d13 + d23) / 2;
        return {
            d1: total - d23,
            d2: total - d13,
            d3: total - d12
        };
    }
};
__decorate([
    shrewd({
        renderer(v) {
            for (let [id, node] of v)
                if (node.disposed)
                    v.delete(id);
            return v;
        }
    })
], Tree.prototype, "node", void 0);
__decorate([
    shrewd({
        renderer(v) {
            for (let node of v.firstKeys())
                if (node.disposed)
                    v.delete(node);
            return v;
        }
    })
], Tree.prototype, "edge", void 0);
__decorate([
    shrewd
], Tree.prototype, "leaf", null);
Tree = __decorate([
    shrewd
], Tree);
class Couple {
    constructor(...p) {
        if (p[1] === undefined)
            p = [p[0]._x, p[0]._y];
        this._x = new Fraction(p[0]);
        this._y = new Fraction(p[1]);
    }
    get x() { return this._x.value; }
    set x(v) { this._x = new Fraction(v); }
    get y() { return this._y.value; }
    set y(v) { this._y = new Fraction(v); }
    smp() {
        this._x.smp();
        this._y.smp();
        return this;
    }
    eq(c) {
        if (!c)
            return false;
        return this._x.eq(c._x) && this._y.eq(c._y);
    }
    clone() {
        return new this.constructor(this._x, this._y);
    }
    toString() { return "(" + this._x + ", " + this._y + ")"; }
    toJSON() {
        return this.toString();
    }
    set(x, y = 0) {
        if (x instanceof Couple) {
            this._x = new Fraction(x._x);
            this._y = new Fraction(x._y);
        }
        else {
            this._x = new Fraction(x);
            this._y = new Fraction(y);
        }
        ;
        return this;
    }
    add(v) {
        return new this.constructor(this._x.add(v._x), this._y.add(v._y)).smp();
    }
    addBy(v) {
        this._x.a(v._x);
        this._y.a(v._y);
        return this.smp();
    }
    round(scale = 1) {
        this._x.d(scale).r().m(scale);
        this._y.d(scale).r().m(scale);
        return this.smp();
    }
    range(min_X, max_X, min_Y, max_Y) {
        if (this._x.lt(min_X))
            this._x = new Fraction(min_X);
        if (this._x.gt(max_X))
            this._x = new Fraction(max_X);
        if (this._y.lt(min_Y))
            this._y = new Fraction(min_Y);
        if (this._y.gt(max_Y))
            this._y = new Fraction(max_Y);
        return this;
    }
    toIPoint() {
        return { x: this.x, y: this.y };
    }
}
class DesignBase extends Mountable {
    constructor(studio, profile) {
        super(studio);
        this.id = DesignBase._id++;
        this.dragging = false;
        this.edges = new Mapping(() => this.tree.edge.values(), e => new Edge(this.TreeSheet, this.vertices.get(e.n1), this.vertices.get(e.n2), e));
        this.rivers = new Mapping(() => [...this.tree.edge.values()].filter(e => e.isRiver), e => new River(this.LayoutSheet, e));
        this.vertices = new Mapping(() => this.tree.node.values(), n => new Vertex(this.TreeSheet, n));
        this.flaps = new Mapping(() => this.tree.leaf, l => new Flap(this.LayoutSheet, l));
        this.junctions = new DoubleMapping(() => this.flaps.values(), (f1, f2) => new Junction(this.LayoutSheet, f1, f2));
        this.stretches = new Mapping(() => this.teams.keys(), signature => new Stretch(this.LayoutSheet, signature));
        this.data = deepCopy(Migration.getSample(), profile);
        if (this.data.tree.nodes.length < 3)
            throw new Error("Invalid format.");
        this.options = new OptionManager(this.data);
        this.history = new HistoryManager(this);
    }
    sortJEdge() {
        let edges = this.edges.toJSON();
        if (edges.length == 0)
            return [];
        let nodes = new Set();
        let result = [];
        while (edges.length) {
            let e = edges.shift();
            if (nodes.size == 0 || nodes.has(e.n1) || nodes.has(e.n2)) {
                result.push(e);
                nodes.add(e.n1);
                nodes.add(e.n2);
            }
            else
                edges.push(e);
        }
        return result;
    }
    get isActive() {
        return (this instanceof Design) && this.mountTarget.design == this;
    }
    get patternNotFound() {
        return [...this.stretches.values()].some(s => s.isTotallyValid && s.pattern == null);
    }
    onDispose() {
        Shrewd.terminate(this.edges);
        Shrewd.terminate(this.vertices);
        Shrewd.terminate(this.rivers);
        Shrewd.terminate(this.flaps);
        Shrewd.terminate(this.stretches);
        this.junctions.dispose();
    }
    get validJunctions() {
        return [...this.junctions.values()].filter(j => j.isValid);
    }
    get teams() {
        let arr;
        let set = new Set(this.activeJunctions);
        let result = new Map();
        function add(junction) {
            if (!set.has(junction))
                return;
            arr.push(junction);
            set.delete(junction);
            for (let j of junction.neighbors)
                add(j);
        }
        while (set.size > 0) {
            arr = [];
            add(set.values().next().value);
            arr.sort(Junction.sort);
            result.set(Junction.createTeamId(arr, f => f.node.id), arr);
        }
        return result;
    }
    get devices() {
        let result = [];
        for (let s of this.stretches.values())
            result.push(...s.devices);
        return result;
    }
    get activeJunctions() {
        return this.validJunctions.filter(j => !j.isCovered);
    }
    get junctionsByQuadrant() {
        return DesignBase.ToQuadrantMap(this.junctions.values());
    }
    get activeJunctionsByQuadrant() {
        return DesignBase.ToQuadrantMap(this.activeJunctions);
    }
    static ToQuadrantMap(junctions) {
        let result = new Map();
        function add(q, j) {
            let arr = result.get(q);
            if (!arr)
                result.set(q, arr = []);
            arr.push(j);
        }
        for (let j of junctions) {
            add(j.q1, j);
            add(j.q2, j);
        }
        return result;
    }
    get stretchByQuadrant() {
        let result = new Map();
        for (let s of this.stretches.values())
            if (s.isActive) {
                for (let o of s.junctions) {
                    result.set(o.q1, s);
                    result.set(o.q2, s);
                }
            }
        return result;
    }
    getStretchByQuadrant(quadrant) {
        var _a;
        return (_a = this.stretchByQuadrant.get(quadrant)) !== null && _a !== void 0 ? _a : null;
    }
    get flapsById() {
        let result = new Map();
        for (let f of this.flaps.values())
            result.set(f.node.id, f);
        return result;
    }
    get openAnchors() {
        let result = new Map();
        for (let s of this.activeStretches) {
            let f = s.fx * s.fy;
            for (let d of s.pattern.devices) {
                for (let a of d.openAnchors) {
                    let key = f + "," + (a.x - f * a.y);
                    let arr = result.get(key);
                    if (!arr)
                        result.set(key, arr = []);
                    arr.push(a);
                }
            }
        }
        return result;
    }
    get activeStretches() {
        return [...this.stretches.values()].filter(s => s.isActive && !!s.pattern);
    }
}
DesignBase._id = 0;
__decorate([
    shrewd
], DesignBase.prototype, "dragging", void 0);
__decorate([
    shrewd
], DesignBase.prototype, "isActive", null);
__decorate([
    shrewd
], DesignBase.prototype, "patternNotFound", null);
__decorate([
    shrewd
], DesignBase.prototype, "validJunctions", null);
__decorate([
    shrewd
], DesignBase.prototype, "teams", null);
__decorate([
    shrewd
], DesignBase.prototype, "devices", null);
__decorate([
    shrewd
], DesignBase.prototype, "activeJunctions", null);
__decorate([
    shrewd
], DesignBase.prototype, "junctionsByQuadrant", null);
__decorate([
    shrewd
], DesignBase.prototype, "activeJunctionsByQuadrant", null);
__decorate([
    shrewd
], DesignBase.prototype, "stretchByQuadrant", null);
__decorate([
    shrewd
], DesignBase.prototype, "flapsById", null);
__decorate([
    shrewd
], DesignBase.prototype, "openAnchors", null);
__decorate([
    shrewd
], DesignBase.prototype, "activeStretches", null);
class SheetObject extends Mountable {
    constructor(sheet) {
        super(sheet);
        this.sheet = sheet;
    }
    get design() {
        return this.sheet.design;
    }
}
let Sheet = class Sheet extends Mountable {
    constructor(design, sheet, ...maps) {
        super(design);
        this._activeControlCache = [];
        this._independentRect = new Rectangle(Point.ZERO, Point.ZERO);
        this.margin = 0;
        this.scroll = { x: 0, y: 0 };
        this.width = sheet.width;
        this.height = sheet.height;
        this.scale = Math.max(sheet.scale, this.getMinScale());
        this._controlMaps = maps;
        this.view = new SheetView(this);
    }
    get controls() {
        var result = [];
        for (let map of this._controlMaps)
            result.push(...map());
        return result;
    }
    get activeControls() {
        if (!this.design.dragging) {
            this._activeControlCache = this.controls.filter(c => Mountable.isActive(c));
        }
        return this._activeControlCache;
    }
    constraint(v, p) {
        return v.range(-p.x, this.width - p.x, -p.y, this.height - p.y);
    }
    getMinScale() {
        var _a;
        return Math.ceil((_a = this.design.display.getAutoScale(this)) !== null && _a !== void 0 ? _a : 10);
    }
    get design() {
        return this.mountTarget;
    }
    get isActive() {
        return this.design.sheet == this;
    }
    get displayScale() {
        return this.$studio ? this.$studio.$display.scale : 1;
    }
    toJSON() {
        return { width: this.width, height: this.height, scale: this.scale };
    }
    get size() {
        return Math.max(this.width, this.height);
    }
    contains(p) {
        return 0 <= p.x && p.x <= this.width && 0 <= p.y && p.y <= this.height;
    }
    get independents() {
        return this.controls.filter((c) => c instanceof IndependentDraggable);
    }
    _getIndependentRect() {
        let x1 = Number.POSITIVE_INFINITY, y1 = Number.POSITIVE_INFINITY;
        let x2 = Number.NEGATIVE_INFINITY, y2 = Number.NEGATIVE_INFINITY;
        for (let i of this.independents) {
            let l = i.location;
            if (l.x < x1)
                x1 = l.x;
            if (l.x + i.width > x2)
                x2 = l.x + i.width;
            if (l.y < y1)
                y1 = l.y;
            if (l.y + i.height > y2)
                y2 = l.y + i.height;
        }
        this._independentRect = new Rectangle(new Point(x1, y1), new Point(x2, y2));
    }
    getMargin() {
        if (!this.isActive || !this.design.isActive)
            return;
        let controls = this.controls.filter((c) => c instanceof ViewedControl);
        let m = controls.length ? Math.max(...controls.map(c => c.view.overflow)) : 0;
        setTimeout(() => this.margin = m, 0);
    }
};
__decorate([
    shrewd
], Sheet.prototype, "controls", null);
__decorate([
    shrewd
], Sheet.prototype, "activeControls", null);
__decorate([
    action({
        validator(v) {
            let ok = v >= 8 && v >= this._independentRect.width;
            let d = v - this._independentRect.right;
            if (ok && d < 0)
                for (let i of this.independents)
                    i.location.x += d;
            return ok;
        }
    })
], Sheet.prototype, "width", void 0);
__decorate([
    action({
        validator(v) {
            let ok = v >= 8 && v >= this._independentRect.height;
            let d = v - this._independentRect.top;
            if (ok && d < 0)
                for (let i of this.independents)
                    i.location.y += d;
            return ok;
        }
    })
], Sheet.prototype, "height", void 0);
__decorate([
    action({
        validator(v) {
            return v >= Math.min(10, this.getMinScale());
        }
    })
], Sheet.prototype, "scale", void 0);
__decorate([
    shrewd
], Sheet.prototype, "isActive", null);
__decorate([
    shrewd
], Sheet.prototype, "displayScale", null);
__decorate([
    shrewd
], Sheet.prototype, "size", null);
__decorate([
    shrewd
], Sheet.prototype, "independents", null);
__decorate([
    shrewd
], Sheet.prototype, "_getIndependentRect", null);
__decorate([
    shrewd
], Sheet.prototype, "margin", void 0);
__decorate([
    shrewd
], Sheet.prototype, "getMargin", null);
__decorate([
    shrewd
], Sheet.prototype, "scroll", void 0);
Sheet = __decorate([
    shrewd
], Sheet);
class View extends Mountable {
    constructor() {
        super(...arguments);
        this._paths = [];
    }
    draw() {
        this.mountEvents();
        if (this.$studio) {
            this.$studio.$display.render();
            this.render();
        }
    }
    $addItem(layer, item) {
        this._paths.push([layer, item]);
    }
    onMount(studio) {
        for (let [l, p] of this._paths)
            studio.$display.project.layers[l].addChild(p);
    }
    onDismount(studio) {
        for (let [l, p] of this._paths)
            p.remove();
    }
    contains(point) {
        return false;
    }
}
__decorate([
    shrewd
], View.prototype, "draw", null);
let TreeNode = class TreeNode extends Disposable {
    constructor(tree, id) {
        super(tree);
        this.name = "";
        this.tree = tree;
        this.id = id;
    }
    get shouldDispose() {
        return super.shouldDispose || this.tree.disposed;
    }
    dispose(force = false) {
        if (force || this.degree == 1)
            super.dispose();
        else if (this.degree == 2)
            return this.tree.deleteAndJoin(this);
        else if (this.degree != 1)
            console.warn(`Node [${this.name ? this.name : this.id}] is not a leaf.`);
        return undefined;
    }
    addLeaf(length) {
        return this.tree.addLeafAt(this.id, length);
    }
    get design() { return this.tree.design; }
    get edges() {
        let e = this.tree.edge.get(this);
        return e ? Array.from(e.values()) : [];
    }
    get degree() {
        return this.edges.length;
    }
    get firstEdge() {
        return this.edges[0];
    }
    get radius() {
        return this.degree == 1 ? this.edges[0].length : NaN;
    }
};
__decorate([
    action
], TreeNode.prototype, "name", void 0);
__decorate([
    shrewd
], TreeNode.prototype, "edges", null);
__decorate([
    shrewd
], TreeNode.prototype, "degree", null);
__decorate([
    shrewd
], TreeNode.prototype, "firstEdge", null);
__decorate([
    shrewd
], TreeNode.prototype, "radius", null);
TreeNode = __decorate([
    shrewd
], TreeNode);
let TreeEdge = class TreeEdge extends Disposable {
    constructor(n1, n2, length) {
        super();
        this._n1 = n1;
        this._n2 = n2;
        this.length = length;
    }
    get design() { return this.n1.design; }
    get shouldDispose() {
        return super.shouldDispose || this._n1.disposed || this._n2.disposed;
    }
    get isRiver() {
        return this.g1.length > 1 && this.g2.length > 1;
    }
    adjacentEdges(n) { return n.edges.filter(e => e != this); }
    get a1() { return this.adjacentEdges(this._n1); }
    get a2() { return this.adjacentEdges(this._n2); }
    group(n, edges) {
        let result = [n];
        for (let edge of edges)
            result.push(...edge.g(n));
        return result;
    }
    get g1() { return this.group(this._n1, this.a1); }
    get g2() { return this.group(this._n2, this.a2); }
    g(n) { return n == this._n1 ? this.g2 : this.g1; }
    get l1() {
        return this.g1.filter(n => n.degree == 1);
    }
    get l2() {
        return this.g2.filter(n => n.degree == 1);
    }
    get t1() {
        return this.a1.map(e => e.t(this._n1) + e.length).reduce((n, x) => n + x, 0);
    }
    get t2() {
        return this.a2.map(e => e.t(this._n2) + e.length).reduce((n, x) => n + x, 0);
    }
    t(n) { return n == this._n1 ? this.t2 : this.t1; }
    get p1() {
        return Math.max(...this.l1.map(n => n.tree.dist(n, this.n1)));
    }
    get p2() {
        return Math.max(...this.l2.map(n => n.tree.dist(n, this.n2)));
    }
    get wrapSide() {
        if (!this.isRiver)
            return 0;
        if (this.p1 > this.p2)
            return 2;
        if (this.p1 < this.p2)
            return 1;
        if (this.t1 > this.t2)
            return 2;
        if (this.t1 < this.t2)
            return 1;
        if (this.g1.length > this.g2.length)
            return 1;
        if (this.g1.length < this.g2.length)
            return 2;
        return 0;
    }
    get n1() { return this._n1; }
    get n2() { return this._n2; }
    n(n) { return n == this._n1 ? this._n2 : this._n1; }
};
__decorate([
    action({ validator: (v) => v > 0 })
], TreeEdge.prototype, "length", void 0);
__decorate([
    shrewd
], TreeEdge.prototype, "isRiver", null);
__decorate([
    shrewd
], TreeEdge.prototype, "a1", null);
__decorate([
    shrewd
], TreeEdge.prototype, "a2", null);
__decorate([
    shrewd
], TreeEdge.prototype, "g1", null);
__decorate([
    shrewd
], TreeEdge.prototype, "g2", null);
__decorate([
    shrewd
], TreeEdge.prototype, "l1", null);
__decorate([
    shrewd
], TreeEdge.prototype, "l2", null);
__decorate([
    shrewd
], TreeEdge.prototype, "t1", null);
__decorate([
    shrewd
], TreeEdge.prototype, "t2", null);
__decorate([
    shrewd
], TreeEdge.prototype, "p1", null);
__decorate([
    shrewd
], TreeEdge.prototype, "p2", null);
__decorate([
    shrewd
], TreeEdge.prototype, "wrapSide", null);
TreeEdge = __decorate([
    shrewd
], TreeEdge);
let TreePath = class TreePath extends Disposable {
    constructor(n1, n2) {
        super();
        this._n1 = n1;
        this._n2 = n2;
    }
    get shouldDispose() {
        return super.shouldDispose || this._n1.disposed || this._n2.disposed;
    }
    get edges() {
        let result = [];
        let now = this._n1;
        let ok = true;
        while (now != this._n2 && ok) {
            ok = false;
            for (let e of now.edges) {
                if (e.g(now).includes(this._n2)) {
                    ok = true;
                    result.push(e);
                    now = e.n(now);
                    break;
                }
            }
        }
        return result;
    }
    get length() {
        return this.edges.reduce((l, e) => l + e.length, 0);
    }
};
__decorate([
    shrewd
], TreePath.prototype, "edges", null);
__decorate([
    shrewd
], TreePath.prototype, "length", null);
TreePath = __decorate([
    shrewd
], TreePath);
class Point extends Couple {
    static get ZERO() {
        return new Point(0, 0);
    }
    constructor(...p) {
        if (p[1] === undefined)
            super(p[0].x, p[0].y);
        else
            super(...p);
    }
    dist(p) {
        return this.sub(p).length;
    }
    paramDist(p) {
        return Math.max(Math.abs(p.x - this.x), Math.abs(p.y - this.y));
    }
    sub(c) {
        if (c instanceof Vector)
            return new Point(this._x.sub(c._x), this._y.sub(c._y)).smp();
        else if (c instanceof Point)
            return new Vector(this._x.sub(c._x), this._y.sub(c._y)).smp();
        else
            return new Vector(this._x.sub(c.x), this._y.sub(c.y)).smp();
    }
    subBy(v) {
        this._x.s(v.x);
        this._y.s(v.y);
        return this;
    }
    diagonalXRange(min_X, max_X, reversed) {
        if (this._x.lt(min_X))
            this.setDiagonalX(min_X, reversed);
        if (this._x.gt(max_X))
            this.setDiagonalX(max_X, reversed);
    }
    toPaper() {
        return new paper.Point(this.x, this.y);
    }
    setDiagonalX(x, reversed) {
        var s = this._x.sub(x);
        this._x.s(s);
        if (reversed)
            this._y.a(s);
        else
            this._y.s(s);
    }
    eq(p) {
        if (p instanceof Point || !p)
            return super.eq(p);
        return this.x == p.x && this.y == p.y;
    }
    get isIntegral() {
        return this._x.$denominator === BIG1 && this._y.$denominator === BIG1;
    }
    transform(fx, fy) {
        return new Point(this._x.mul(fx), this._y.mul(fy));
    }
}
class Vector extends Couple {
    static get ZERO() {
        return new Vector(0, 0);
    }
    constructor(...p) {
        if (p[1] === undefined)
            super(p[0].x, p[0].y);
        else
            super(...p);
    }
    get length() {
        return Math.sqrt(this.dot(this));
    }
    get slope() {
        return this._y.div(this._x);
    }
    rotate90() {
        return new Vector(this._y.neg, this._x);
    }
    normalize() {
        return this.scale(new Fraction(this.length).inv);
    }
    scale(x, y) {
        if (x instanceof Couple)
            return this.scale(x._x, x._y);
        if (!y)
            y = x;
        return new Vector(this._x.mul(x), this._y.mul(y)).smp();
    }
    dot(v) {
        return this._x.mul(v._x).a(this._y.mul(v._y)).value;
    }
    get neg() {
        return new Vector(this._x.neg, this._y.neg);
    }
    get angle() {
        return Math.atan2(this.y, this.x);
    }
    reduce() {
        let [nx, ny] = [this._x.$numerator, this._y.$numerator];
        let [dx, dy] = [this._x.$denominator, this._y.$denominator];
        let [x, y] = MathUtil.reduce(nx * dy, ny * dx);
        return new Vector(Number(x), Number(y));
    }
    doubleAngle(fx = 1) {
        let { x, y } = this.reduce();
        [x, y] = MathUtil.reduce(x * x - y * y, 2 * x * y);
        return new Vector(fx * x, fx * y);
    }
    parallel(v) {
        return this._x.mul(v._y).eq(this._y.mul(v._x));
    }
    static bisector(v1, v2) {
        let [x1, y1] = MathUtil.reduce(v1.x, v1.y);
        let [x2, y2] = MathUtil.reduce(v2.x, v2.y);
        let z1 = Math.sqrt(x1 * x1 + y1 * y1);
        let z2 = Math.sqrt(x2 * x2 + y2 * y2);
        return new Vector(x1 * z2 + x2 * z1, y1 * z2 + y2 * z1);
    }
}
let Design = class Design extends DesignBase {
    constructor(studio, profile) {
        super(studio, profile);
        this.LayoutSheet = new Sheet(this, this.data.layout.sheet, () => this.flaps.values(), () => this.rivers.values(), () => this.stretches.values(), () => this.devices);
        this.TreeSheet = new Sheet(this, this.data.tree.sheet, () => this.edges.values(), () => this.vertices.values());
        this.title = this.data.title;
        ;
        this.fullscreen = this.data.fullscreen;
        this.description = this.data.description;
        this.mode = this.data.mode;
        this.tree = new Tree(this, this.data.tree.edges);
    }
    get sheet() {
        return this.mode == "layout" ? this.LayoutSheet : this.TreeSheet;
    }
    get design() {
        return this;
    }
    get display() {
        return this.mountTarget.$display;
    }
    toJSON() {
        this.tree.generateJID();
        let result = {
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
        this.tree.jidMap.clear();
        return result;
    }
    deleteVertices(vertices) {
        this.history.takeAction(() => {
            let arr = vertices.concat().sort((a, b) => a.node.degree - b.node.degree);
            while (this.vertices.size > 3) {
                let v = arr.find(v => v.node.degree == 1);
                if (!v)
                    break;
                v.node.dispose();
                arr.splice(arr.indexOf(v), 1);
                Shrewd.commit();
            }
        });
    }
    deleteFlaps(flaps) {
        this.history.takeAction(() => {
            for (let f of flaps) {
                if (this.vertices.size == 3)
                    break;
                f.node.dispose();
                Shrewd.commit();
            }
        });
    }
    clearCPSelection() {
        for (let c of this.LayoutSheet.controls)
            c.selected = false;
    }
    clearTreeSelection() {
        for (let c of this.TreeSheet.controls)
            c.selected = false;
    }
    flapToVertex(flaps) {
        this.clearTreeSelection();
        for (let f of flaps) {
            let v = this.vertices.get(f.node);
            if (v)
                v.selected = true;
        }
        this.mode = "tree";
    }
    vertexToFlap(vertices) {
        this.clearCPSelection();
        for (let v of vertices) {
            let f = this.flaps.get(v.node);
            if (f)
                f.selected = true;
        }
        this.mode = "layout";
    }
    riverToEdge(river) {
        this.clearTreeSelection();
        let e = this.edges.get(river.edge);
        if (e)
            e.selected = true;
        this.mode = "tree";
    }
    edgeToRiver(edge) {
        this.clearCPSelection();
        let te = edge.edge;
        if (te.isRiver) {
            let r = this.rivers.get(te);
            if (r)
                r.selected = true;
        }
        else {
            let n = te.n1.degree == 1 ? te.n1 : te.n2;
            let f = this.flaps.get(n);
            if (f)
                f.selected = true;
        }
        this.mode = "layout";
    }
};
__decorate([
    shrewd
], Design.prototype, "fullscreen", void 0);
__decorate([
    shrewd
], Design.prototype, "mode", void 0);
__decorate([
    action
], Design.prototype, "description", void 0);
__decorate([
    action
], Design.prototype, "title", void 0);
__decorate([
    shrewd
], Design.prototype, "sheet", null);
Design = __decorate([
    shrewd
], Design);
class Control extends SheetObject {
    constructor() {
        super(...arguments);
        this.selected = false;
    }
    selectableWith(c) { return false; }
    get dragSelectAnchor() {
        return null;
    }
    toggle() {
        this.selected = !this.selected;
    }
    contains(point) {
        return false;
    }
    static isDragSelectable(c) {
        return c.dragSelectAnchor != null;
    }
}
__decorate([
    shrewd
], Control.prototype, "selected", void 0);
var Quadrant_1;
let Quadrant = Quadrant_1 = class Quadrant extends SheetObject {
    constructor(sheet, flap, q) {
        super(sheet);
        this.flap = flap;
        this.q = q;
        this.qv = Quadrant_1.QV[q];
        this.sv = Quadrant_1.SV[q];
        this.pv = Quadrant_1.SV[(q + 1) % 4];
        this.fx = this.q == 0 || this.q == 3 ? 1 : -1;
        this.fy = this.q == 0 || this.q == 1 ? 1 : -1;
    }
    getOverlapCorner(ov, parent, q, d) {
        var _a, _b, _c, _d;
        let r = this.flap.radius + d;
        let sx = (_b = (_a = ov.shift) === null || _a === void 0 ? void 0 : _a.x) !== null && _b !== void 0 ? _b : 0;
        let sy = (_d = (_c = ov.shift) === null || _c === void 0 ? void 0 : _c.y) !== null && _d !== void 0 ? _d : 0;
        if (this.flap.node.id != parent.c[0].e) {
            sx = parent.ox - (ov.ox + sx);
            sy = parent.oy - (ov.oy + sy);
        }
        return new Point(this.x(r - (q == 3 ? 0 : ov.ox) - sx), this.y(r - (q == 1 ? 0 : ov.oy) - sy));
    }
    makeContour(d) {
        let r = this.flap.radius + d;
        let v = this.sv.scale(r);
        let startPt = this.getStart(r);
        let endPt = this.point.add(v.rotate90());
        let pattern = this.pattern;
        let trace;
        if (!pattern) {
            trace = [startPt, this.point.add(this.qv.scale(r))];
        }
        else {
            let lines = pattern.linesForTracing[this.q].concat();
            let junctions = pattern.stretch.junctions;
            let end = this.findNextDelta(junctions, false);
            let inflections = new Set();
            let lead = this.findLead(junctions, r, lines, inflections);
            let start = lead ? this.findNextDelta(junctions, true) : undefined;
            trace = Trace.create(lines, lead !== null && lead !== void 0 ? lead : startPt, this.pv, inflections, end !== null && end !== void 0 ? end : new Line(endPt, this.pv), start);
            if (start && this.outside(trace[0], r, this.q % 2 != 1)) {
                trace.unshift(this.q % 2 ? start.yIntersection(this.y(r)) : start.xIntersection(this.x(r)));
            }
            if (end && this.outside(trace[trace.length - 1], r, this.q % 2 == 1)) {
                trace.push(this.q % 2 ? end.xIntersection(this.x(r)) : end.yIntersection(this.y(r)));
            }
        }
        return trace.map(p => p.toPaper());
    }
    outside(p, r, x) {
        return x ? p.x * this.fx > this.x(r) * this.fx : p.y * this.fy > this.y(r) * this.fy;
    }
    getStart(d) {
        return this.point.add(this.sv.scale(d));
    }
    y(d) {
        return this.point.y + this.fy * d;
    }
    x(d) {
        return this.point.x + this.fx * d;
    }
    findNextDelta(junctions, cw) {
        let find = this.findJoinNextQ(junctions, cw, true);
        if (!find)
            return undefined;
        let { joinQ, nextQ, mode } = find;
        let { d1, d2 } = this.design.tree.distTriple(this.flap.node, nextQ.flap.node, joinQ.flap.node);
        let int = mode ? new Point(nextQ.x(d2), this.y(d1)) : new Point(this.x(d1), nextQ.y(d2));
        return new Line(int, this.qv);
    }
    findJoinNextQ(junctions, cw, next) {
        if (junctions.length == 1)
            return undefined;
        let mode = !!(this.q % 2) == cw;
        let key = mode ? "oy" : "ox";
        let minJ = Junction.findMinMax(junctions.filter(j => j.q1 == this || j.q2 == this), key, -1);
        let joinQ = minJ.q1 == this ? minJ.q2 : minJ.q1;
        if (joinQ.activeJunctions.length == 1)
            return undefined;
        let nextJ;
        if (next) {
            let sort = joinQ.activeJunctions.concat().sort((a, b) => a[key] - b[key]);
            nextJ = sort[sort.indexOf(minJ) + 1];
            if (!nextJ)
                return undefined;
        }
        else {
            nextJ = Junction.findMinMax(joinQ.activeJunctions, key, 1);
            if (nextJ == minJ)
                return undefined;
        }
        let nextQ = nextJ.q1 == joinQ ? nextJ.q2 : nextJ.q1;
        return { joinQ, nextQ, mode };
    }
    findLead(junctions, d, lines, inflections) {
        var _a;
        let find = this.findJoinNextQ(junctions, true, false);
        if (!find)
            return undefined;
        let { joinQ, nextQ } = find;
        let ok = this.design.junctions.get(this.flap, nextQ.flap).status == JunctionStatus.tooFar;
        let dist = this.design.tree.distTriple(this.flap.node, nextQ.flap.node, joinQ.flap.node);
        if (d <= dist.d1 && (ok || d != dist.d1))
            return undefined;
        let d2 = d - dist.d1 + dist.d2;
        let inflection = this.q % 2 ? new Point(nextQ.x(d2), this.y(d)) : new Point(this.x(d), nextQ.y(d2));
        inflections.add(inflection.toString());
        return (_a = nextQ.findLead(junctions, d2, lines, inflections)) !== null && _a !== void 0 ? _a : nextQ.getStart(d2);
    }
    getOverriddenPath(d) {
        let result = [];
        if (this.pattern)
            return result;
        let r = this.flap.radius + d;
        for (let [j, pts] of this.coveredJunctions) {
            let { ox, oy } = j;
            let p = this.point.add(this.qv.scale(r));
            for (let pt of pts) {
                let diff = pt.sub(p);
                ox = Math.min(-diff.x * this.fx, ox);
                oy = Math.min(-diff.y * this.fy, oy);
            }
            let v = new Vector(ox * this.fx, oy * this.fy);
            result.push(new paper.Path.Rectangle(p.toPaper(), p.sub(v).toPaper()));
        }
        return result;
    }
    get pattern() {
        let stretch = this.design.getStretchByQuadrant(this);
        return stretch ? stretch.pattern : null;
    }
    get corner() {
        let r = this.flap.radius;
        return this.point.add(this.qv.scale(r));
    }
    get junctions() {
        var _a;
        return (_a = this.design.junctionsByQuadrant.get(this)) !== null && _a !== void 0 ? _a : [];
    }
    get coveredJunctions() {
        return this.junctions
            .filter(j => j.isValid && j.isCovered)
            .map(j => {
            let q3 = j.q1 == this ? j.q2 : j.q1;
            return [j, j.coveredBy.map(c => c.q1 == q3 ? c.q2.point : c.q1.point)];
        });
    }
    get point() {
        return this.flap.points[this.q];
    }
    get activeJunctions() {
        let result = this.design.activeJunctionsByQuadrant.get(this);
        return result ? result : [];
    }
    static transform(dir, fx, fy) {
        if (fx < 0)
            dir += dir % 2 ? 3 : 1;
        if (fy < 0)
            dir += dir % 2 ? 1 : 3;
        return dir % 4;
    }
    getBaseRectangle(j) {
        let r = this.flap.radius;
        return new Rectangle(new Point(this.x(r), this.y(r)), new Point(this.x(r - j.ox), this.y(r - j.oy)));
    }
    debug(d = 0) {
        debug = true;
        console.log(this.makeContour(d).map(p => p.toString()));
        debug = false;
    }
};
Quadrant.QV = [
    new Vector(1, 1),
    new Vector(-1, 1),
    new Vector(-1, -1),
    new Vector(1, -1)
];
Quadrant.SV = [
    new Vector(1, 0),
    new Vector(0, 1),
    new Vector(-1, 0),
    new Vector(0, -1)
];
__decorate([
    shrewd
], Quadrant.prototype, "pattern", null);
__decorate([
    shrewd
], Quadrant.prototype, "corner", null);
__decorate([
    shrewd
], Quadrant.prototype, "junctions", null);
__decorate([
    shrewd
], Quadrant.prototype, "coveredJunctions", null);
__decorate([
    shrewd
], Quadrant.prototype, "point", null);
__decorate([
    shrewd
], Quadrant.prototype, "activeJunctions", null);
Quadrant = Quadrant_1 = __decorate([
    shrewd
], Quadrant);
let Stretch = class Stretch extends Control {
    constructor(sheet, signature) {
        super(sheet);
        this._repoCache = new Map();
        this.signature = signature;
    }
    get type() { return "Stretch"; }
    get junctions() {
        var _a;
        let result = (_a = this.design.teams.get(this.signature)) !== null && _a !== void 0 ? _a : [];
        if (this.junctionCache && this.junctionCache.length == result.length) {
            for (let i in result)
                if (result[i] != this.junctionCache[i]) {
                    return this.junctionCache = result;
                }
            return this.junctionCache;
        }
        else
            return this.junctionCache = result;
    }
    get flaps() {
        let s = new Set();
        for (let j of this.junctions) {
            s.add(j.f1);
            s.add(j.f2);
        }
        return Array.from(s);
    }
    get origin() {
        var _a, _b, _c;
        return (_c = (_b = (_a = this.junctions[0]) === null || _a === void 0 ? void 0 : _a.q1) === null || _b === void 0 ? void 0 : _b.point) !== null && _c !== void 0 ? _c : Point.ZERO;
    }
    get repository() {
        if (!this.isValid)
            return null;
        let structure = this.structureSignature;
        let result;
        if (this._repoCache.has(structure))
            result = this._repoCache.get(structure);
        else {
            let option = this.design.options.get("stretch", this.signature);
            result = new Repository(this, structure, option);
        }
        if (!this.design.dragging)
            this._repoCache.clear();
        this._repoCache.set(structure, result);
        return result;
    }
    get fx() { var _a, _b; return (_b = (_a = this.junctions[0]) === null || _a === void 0 ? void 0 : _a.fx) !== null && _b !== void 0 ? _b : 1; }
    get fy() { var _a, _b; return (_b = (_a = this.junctions[0]) === null || _a === void 0 ? void 0 : _a.fy) !== null && _b !== void 0 ? _b : 1; }
    get shouldDispose() {
        return super.shouldDispose || !this.isActive && !this.design.dragging;
    }
    get isActive() {
        return this.design.teams.has(this.signature);
    }
    get pattern() {
        var _a, _b, _c;
        return (_c = (_b = (_a = this.repository) === null || _a === void 0 ? void 0 : _a.entry) === null || _b === void 0 ? void 0 : _b.entry) !== null && _c !== void 0 ? _c : null;
    }
    get isValid() {
        return this.junctions.every(j => j.status == JunctionStatus.overlap);
    }
    get isTotallyValid() {
        if (!this.isActive)
            return false;
        for (let i = 0; i < this.flaps.length; i++) {
            for (let j = i + 1; j < this.flaps.length; j++) {
                let jn = this.design.junctions.get(this.flaps[i], this.flaps[j]);
                if (jn.status == JunctionStatus.tooClose)
                    return false;
            }
        }
        return true;
    }
    get structureSignature() {
        return this.isValid ? JSON.stringify(this.junctions.map(j => {
            let result = j.toJSON(), c = result.c;
            if (j.fx != this.fx)
                result.c = [c[2], c[3], c[0], c[1]];
            return result;
        })) : "";
    }
    get devices() {
        if (!this.pattern)
            return [];
        else
            return this.pattern.devices;
    }
    toJSON() {
        var _a, _b, _c, _d;
        return {
            id: Junction.createTeamId(this.junctions, f => f.node.jid),
            configuration: (_b = (_a = this.pattern) === null || _a === void 0 ? void 0 : _a.configuration.toJSON()) !== null && _b !== void 0 ? _b : undefined,
            pattern: (_d = (_c = this.pattern) === null || _c === void 0 ? void 0 : _c.toJSON()) !== null && _d !== void 0 ? _d : undefined
        };
    }
};
__decorate([
    shrewd
], Stretch.prototype, "junctions", null);
__decorate([
    shrewd
], Stretch.prototype, "flaps", null);
__decorate([
    shrewd
], Stretch.prototype, "repository", null);
__decorate([
    shrewd
], Stretch.prototype, "isActive", null);
__decorate([
    shrewd
], Stretch.prototype, "pattern", null);
__decorate([
    shrewd
], Stretch.prototype, "isValid", null);
__decorate([
    shrewd
], Stretch.prototype, "isTotallyValid", null);
__decorate([
    shrewd
], Stretch.prototype, "structureSignature", null);
Stretch = __decorate([
    shrewd
], Stretch);
let Pattern = class Pattern extends SheetObject {
    constructor(configuration, pattern) {
        super(configuration.sheet);
        this.configuration = configuration;
        this.devices = pattern.devices.map((d, i) => new Device(this, configuration.partitions[i], d));
        this.gadgets = this.devices.reduce((arr, d) => arr.concat(d.gadgets), []);
        this.signature = JSON.stringify(pattern);
    }
    static getSignature(pattern) {
        let d = pattern.devices;
        pattern.devices = pattern.devices.map(d => {
            d = clone(d);
            d.gadgets.forEach(g => Gadget.simplify(g));
            d.offset = undefined;
            return d;
        });
        let result = JSON.stringify(pattern);
        pattern.devices = d;
        return result;
    }
    get shouldDispose() {
        return super.shouldDispose || this.configuration.disposed;
    }
    get isActive() {
        return this.configuration.isActive && this.configuration.entry == this;
    }
    get linesForTracing() {
        if (!this.isActive)
            return MakePerQuadrant(i => []);
        let dir = this.configuration.repository.stretch.junctions[0].direction;
        let { fx, fy } = this.stretch;
        return MakePerQuadrant(q => {
            let lines = [];
            if (dir % 2 != q % 2)
                return lines;
            for (let d of this.devices) {
                let qv = Quadrant.QV[q];
                let vector = qv.scale(this.design.sheet.size);
                lines.push(...d.ridges);
                lines.push(...d.getConnectionRidges(true));
                for (let [c, o, cq] of d.partition.outCorners) {
                    let anchor = d.anchors[o][cq];
                    if (c.type == CornerType.side ||
                        c.type == CornerType.flap && q != Quadrant.transform(cq, fx, fy) ||
                        c.type == CornerType.internal && q != Quadrant.transform(c.q, fx, fy)) {
                        lines.push(new Line(anchor, anchor.add(vector)));
                    }
                    else {
                        if (c.type == CornerType.intersection) {
                            let q = d.partition.overlaps[o].c.find(m => m.type == CornerType.flap).q;
                            let to = d.partition.getSideConnectionTarget(anchor, c, q);
                            if (to)
                                lines.push(new Line(anchor, to));
                        }
                        else {
                            lines.push(new Line(anchor, this.getConnectionTarget(c)));
                        }
                    }
                }
            }
            return Line.distinct(lines);
        });
    }
    toJSON() {
        return { devices: this.devices.map(d => d.toJSON()) };
    }
    get selected() {
        return this.devices.some(d => d.selected);
    }
    get stretch() {
        return this.configuration.repository.stretch;
    }
    getConnectionTarget(c) {
        if (c.e >= 0)
            return this.design.flapsById.get(c.e).points[c.q];
        else {
            let [i, j] = this.configuration.overlapMap.get(c.e);
            return this.devices[i].anchors[j][c.q];
        }
    }
};
__decorate([
    shrewd
], Pattern.prototype, "isActive", null);
__decorate([
    shrewd
], Pattern.prototype, "linesForTracing", null);
Pattern = __decorate([
    shrewd
], Pattern);
class Store extends SheetObject {
    constructor() {
        super(...arguments);
        this.index = 0;
        this._prototypeCache = [];
        this._cache = [];
    }
    get _prototypes() {
        if (!this.generator)
            return this._prototypeCache;
        if (this.design.dragging) {
            this.buildFirst();
            return this._prototypeCache.concat();
        }
        else {
            if (this._cache.length == 0)
                this.buildFirst();
            for (let entry of this.generator)
                this._prototypeCache.push(entry);
            delete this.generator;
            return this._prototypeCache;
        }
    }
    buildFirst() {
        let entry = this.generator.next();
        if (!entry.done) {
            try {
                this._cache[0] = this.builder(entry.value);
                this._prototypeCache.push(entry.value);
            }
            catch (e) {
                console.log("Incompatible old version.");
            }
        }
    }
    get entry() {
        let e = this._prototypes, i = this.index;
        if (e.length == 0)
            return null;
        return this._cache[i] = this._cache[i] || this.builder(e[i]);
    }
    move(by = 1) {
        let from = this.index, l = this._prototypes.length;
        this.index = (this.index + by + l) % l;
        this.onMove(this.index, from);
        Shrewd.commit();
    }
    get size() {
        return this._prototypes.length;
    }
}
__decorate([
    action
], Store.prototype, "index", void 0);
__decorate([
    shrewd
], Store.prototype, "_prototypes", null);
__decorate([
    shrewd
], Store.prototype, "entry", null);
class ControlView extends View {
    constructor(control) {
        super(control);
        this.control = control;
    }
    drawSelection() {
        this.renderSelection(this.control.selected);
    }
    get overflow() { return 0; }
}
__decorate([
    shrewd
], ControlView.prototype, "drawSelection", null);
let DragSelectView = class DragSelectView extends View {
    constructor(studio) {
        super(studio);
        this.visible = false;
        this.$addItem(Layer.drag, this._rectangle = new paper.Path.Rectangle(Style.selection));
    }
    contains(point) {
        return this._rectangle.contains(point);
    }
    render() {
        if (this._rectangle.visible = this.visible) {
            let r = new paper.Path.Rectangle({
                from: this.down,
                to: this.now
            });
            this._rectangle.set({ segments: r.segments });
        }
    }
};
__decorate([
    shrewd
], DragSelectView.prototype, "visible", void 0);
__decorate([
    shrewd
], DragSelectView.prototype, "down", void 0);
__decorate([
    shrewd
], DragSelectView.prototype, "now", void 0);
DragSelectView = __decorate([
    shrewd
], DragSelectView);
let SheetView = class SheetView extends View {
    constructor(sheet) {
        super(sheet);
        this._sheet = sheet;
        this._border = new paper.Path.Rectangle({
            point: [0, 0],
            size: [0, 0],
            strokeWidth: 3,
        });
        this.$addItem(Layer.sheet, this._border);
        this._grid = new paper.CompoundPath(Style.sheet);
        this.$addItem(Layer.sheet, this._grid);
    }
    contains(point) {
        return this._border.contains(point);
    }
    render() {
        var _a;
        if (!this.$studio)
            return;
        let width = this._sheet.width;
        let height = this._sheet.height;
        PaperUtil.setRectangleSize(this._border, width, height);
        this._grid.visible = (_a = this.$studio) === null || _a === void 0 ? void 0 : _a.$display.settings.showGrid;
        this._grid.removeChildren();
        for (let i = 1; i < height; i++) {
            PaperUtil.addLine(this._grid, new paper.Point(0, i), new paper.Point(width, i));
        }
        for (let i = 1; i < width; i++) {
            PaperUtil.addLine(this._grid, new paper.Point(i, 0), new paper.Point(i, height));
        }
    }
};
SheetView = __decorate([
    shrewd
], SheetView);
class ViewedControl extends Control {
    contains(point) {
        this.view.draw();
        return this.view.contains(point);
    }
}
let Configuration = class Configuration extends Store {
    constructor(set, config, seed) {
        super(set.sheet);
        this.repository = set;
        this.seed = seed;
        if (seed)
            this.seedSignature = Pattern.getSignature(seed);
        let overlaps = [];
        let overlapMap = new Map();
        let k = -1;
        for (let [i, p] of config.partitions.entries()) {
            for (let [j, o] of p.overlaps.entries()) {
                overlaps.push(o);
                overlapMap.set(k--, [i, j]);
            }
        }
        this.overlaps = overlaps;
        this.overlapMap = overlapMap;
        this.partitions = config.partitions.map(p => new Partition(this, p));
        this.generator = this.generate();
    }
    get isActive() {
        return this.repository.isActive && this.repository.entry == this;
    }
    builder(prototype) {
        return new Pattern(this, prototype);
    }
    *generate() {
        if (this.seed)
            yield this.seed;
        let filter = (pattern) => !this.seedSignature || this.seedSignature != Pattern.getSignature(pattern);
        yield* GeneratorUtil.filter(this.search([]), filter);
    }
    *search(devices, depth = 0) {
        if (depth == this.partitions.length) {
            let p = this.makePattern(clone(devices));
            if (p)
                yield p;
        }
        else {
            for (let d of this.partitions[depth].generate()) {
                devices.push(d);
                yield* this.search(devices, depth + 1);
                devices.pop();
            }
        }
    }
    makePattern(prototypes) {
        prototypes.forEach(d => d.gadgets = d.gadgets.map(g => Gadget.instantiate(g)));
        let devices = prototypes;
        let junctions = this.repository.structure;
        if (junctions.length == 1) {
            let sx = junctions[0].sx;
            if (devices.length == 1) {
                devices[0].offset = Math.floor((sx - devices[0].gadgets[0].sx) / 2);
                return { devices };
            }
            if (devices.length == 2) {
                let [g1, g2] = devices.map(d => d.gadgets[0]);
                let c1 = this.overlaps[0].c[2];
                let c2 = this.overlaps[1].c[0];
                let tx1 = g1.sx + g2.rx(c1.q, 2);
                let tx2 = g2.sx + g1.rx(c2.q, 0);
                if (tx1 > sx || tx2 > sx)
                    return null;
                devices[1].offset = sx - tx2;
                return { devices };
            }
        }
        if (junctions.length == 2 && this.partitions.length == 1) {
            let [o1, o2] = this.overlaps;
            let [j1, j2] = [o1, o2].map(o => this.repository.structure[o.parent]);
            let oriented = j1.c[0].e == j2.c[0].e;
            let gadgets = devices[0].gadgets;
            if (gadgets[0].sx > j1.sx || gadgets[1].sx > j2.sx)
                return null;
            if (!oriented)
                devices[0].offset = j1.sx - gadgets[0].sx;
            return { devices };
        }
        if (junctions.length == 2 && this.partitions.length == 2) {
            let [g1, g2] = devices.map(d => d.gadgets[0]);
            let [o1, o2] = this.overlaps;
            let reversed = o1.c[0].e >= 0 && o1.c[2].e >= 0;
            if (reversed) {
                [g1, g2] = [g2, g1];
                [o1, o2] = [o2, o1];
            }
            let [j1, j2] = [o1, o2].map(o => this.repository.structure[o.parent]);
            let oriented = o1.c[0].e < 0;
            let q = oriented ? 0 : 2, tq = o1.c[q].q;
            let sx = j1.sx, tx = g1.sx;
            let s = g1.setupConnectionSlack(g2, q, tq);
            sx -= Math.ceil(g2.rx(tq, q)) + s;
            let offsets = oriented ? [s !== null && s !== void 0 ? s : 0, 0] : [sx - tx, j2.sx - g2.sx];
            if (reversed)
                offsets.reverse();
            if (tx > sx)
                return null;
            if (g2.contains(this.getRelativeDelta(j1, j2, g2)))
                return null;
            devices.forEach((d, i) => d.offset = offsets[i]);
            return { devices };
        }
        return null;
    }
    getRelativeDelta(j1, j2, g) {
        let oriented = j1.c[0].e == j2.c[0].e;
        let r = Partitioner.getMaxIntersectionDistance(this.design.tree, j1, j2, oriented);
        if (j2.ox > j1.ox)
            [j1, j2] = [j2, j1];
        let p = { x: r - j2.ox, y: r - j1.oy };
        if (!oriented) {
            p.x = g.sx - p.x;
            p.y = g.sy - p.y;
        }
        return new Point(p);
    }
    onMove() {
        this.repository.stretch.selected = !(this.entry.selected);
    }
    toJSON() {
        return { partitions: this.partitions.map(p => p.toJSON()) };
    }
    get jidMap() {
        return this.design.tree.jidMap;
    }
};
__decorate([
    shrewd
], Configuration.prototype, "isActive", null);
Configuration = __decorate([
    shrewd
], Configuration);
class LabeledView extends ControlView {
    get overflow() {
        if (!this.$studio)
            return 0;
        this.render();
        let result = 0, b = this._label.bounds;
        let w = this.$studio.$display.scale * this.control.sheet.width;
        let left = b.x, right = b.x + b.width;
        if (left < 0)
            result = -left;
        if (right > w)
            result = Math.max(result, right - w);
        return Math.ceil(result);
    }
}
__decorate([
    shrewd
], LabeledView.prototype, "overflow", null);
var JunctionView_1;
let JunctionView = JunctionView_1 = class JunctionView extends View {
    constructor(junction) {
        super(junction);
        this._junction = junction;
        this.$addItem(Layer.junction, this._shade = new paper.CompoundPath(Style.junction));
    }
    render() {
        if (this._shade.visible = this._junction.status == JunctionStatus.tooClose) {
            let f1 = this._junction.f1, f2 = this._junction.f2;
            this._shade.removeChildren();
            let d = this._junction.$treeDistance - (f1.radius + f2.radius);
            if (d == 0) {
                this._shade.addChild(f1.view.circle.intersect(f2.view.circle));
                this._shade.strokeWidth = JunctionView_1.widthForArea(this._shade.area);
            }
            else {
                let c1 = f1.view.makeRectangle(d), c2 = f2.view.makeRectangle(d);
                this._shade.addChild(f1.view.circle.intersect(c2));
                this._shade.addChild(f2.view.circle.intersect(c1));
                this._shade.strokeWidth = JunctionView_1.widthForArea(this._shade.area);
            }
        }
    }
    static widthForArea(a) {
        return a < 0.25 ? 4 : a < 0.5 ? 3 : a < 1 ? 2 : 1;
    }
};
JunctionView = JunctionView_1 = __decorate([
    shrewd
], JunctionView);
let RiverView = class RiverView extends ControlView {
    constructor(river) {
        super(river);
        this.components = new Mapping(() => this.info.components, key => new RiverComponent(this, key));
        this.$addItem(Layer.shade, this._shade = new paper.CompoundPath(Style.shade));
        this.$addItem(Layer.hinge, this._hinge = new paper.CompoundPath(Style.hinge));
        this.$addItem(Layer.ridge, this._ridge = new paper.CompoundPath(Style.ridge));
        this.boundary = new paper.CompoundPath({});
    }
    contains(point) {
        return this.control.sheet.view.contains(point) && this._shade.contains(point);
    }
    get info() {
        if (this.disposed)
            return { adjacent: [], length: 0, components: [] };
        let edge = this.control.edge;
        let a;
        let c;
        if (edge.wrapSide == 0) {
            c = this.toComponents(edge.l1, edge.n1).concat(this.toComponents(edge.l2, edge.n2));
            a = edge.a1.concat(edge.a2);
        }
        else if (edge.wrapSide == 2) {
            c = this.toComponents(edge.l2, edge.n2);
            a = edge.a2;
        }
        else {
            c = this.toComponents(edge.l1, edge.n1);
            a = edge.a1;
        }
        return { adjacent: a, length: edge.length, components: c };
    }
    toComponents(l, n) {
        return l.map(l => l.id + "," + n.id);
    }
    get design() {
        return this.control.sheet.design;
    }
    onDispose() {
        Shrewd.terminate(this.components);
        super.onDispose();
    }
    get closure() {
        let path = new paper.PathItem();
        if (this.disposed)
            return path;
        for (let component of this.components.values()) {
            let c = component.contour;
            if (path.isEmpty())
                path = c;
            else {
                path = path.unite(c, { insert: false });
            }
        }
        return path;
    }
    get actualPath() {
        var _a;
        let { adjacent } = this.info;
        let design = this.control.sheet.design;
        let path = this.closure;
        if (this.disposed)
            return path;
        for (let e of adjacent) {
            if (e.isRiver) {
                let r = design.rivers.get(e);
                for (let item of (_a = r.view.closure.children) !== null && _a !== void 0 ? _a : [r.view.closure]) {
                    path = path.subtract(item, { insert: false });
                }
            }
            else {
                let f = design.flaps.get(e.n1.degree == 1 ? e.n1 : e.n2);
                f.view.renderHinge();
                path = path.subtract(f.view.hinge, { insert: false });
            }
        }
        return path.reorient(false, true);
    }
    render() {
        PaperUtil.replaceContent(this.boundary, this.closure, true);
        PaperUtil.replaceContent(this._shade, this.actualPath, false);
        PaperUtil.replaceContent(this._hinge, this.actualPath, false);
        this.renderRidge();
    }
    get corners() {
        var _a;
        if (this.disposed)
            return [];
        let path = this.actualPath;
        let p_paths = ((_a = path.children) !== null && _a !== void 0 ? _a : [path]);
        let r_paths = p_paths.map(path => path.segments.map(p => new Point(p.point)));
        if (r_paths[0].length == 0)
            return [];
        let { paths, map } = PathUtil.collect(r_paths);
        let result = [];
        for (let p of paths) {
            let l = p.length;
            let prev = p[l - 1];
            let now = p[0];
            let v_in = now.sub(prev);
            for (let i = 0; i < l; i++) {
                let next = p[(i + 1) % l];
                let v_out = next.sub(now);
                if (v_in.dot(v_out) == 0 && v_in.rotate90().dot(v_out) > 0) {
                    let v = new Vector(Math.sign(v_out.x) - Math.sign(v_in.x), Math.sign(v_out.y) - Math.sign(v_in.y)).scale(this.control.length);
                    let target = now.add(v);
                    result.push([now, target, map.has(target.toString())]);
                }
                prev = now;
                now = next;
                v_in = v_out;
            }
        }
        return result;
    }
    renderRidge() {
        var _a;
        this._ridge.removeChildren();
        for (let [from, to, self] of this.corners) {
            let line = new Line(from, to);
            let f = line.slope.value, key = f + "," + (from.x - f * from.y);
            let arr = (_a = this.control.sheet.design.openAnchors.get(key)) !== null && _a !== void 0 ? _a : [];
            let p = arr.find(p => line.contains(p, true));
            if (p)
                PaperUtil.addLine(this._ridge, from, p);
            else if (self) {
                PaperUtil.addLine(this._ridge, from, to);
            }
        }
    }
    renderSelection(selected) {
        this._shade.visible = selected;
    }
};
__decorate([
    shrewd
], RiverView.prototype, "info", null);
__decorate([
    shrewd
], RiverView.prototype, "closure", null);
__decorate([
    shrewd
], RiverView.prototype, "actualPath", null);
__decorate([
    shrewd
], RiverView.prototype, "corners", null);
RiverView = __decorate([
    shrewd
], RiverView);
let RiverComponent = class RiverComponent extends Disposable {
    constructor(view, key) {
        super(view);
        this.view = view;
        this.key = key;
        let [f, n] = key.split(',').map(v => Number(v));
        this.flap = view.design.flapsById.get(f);
        this.node = view.design.tree.node.get(n);
    }
    get shouldDispose() {
        return super.shouldDispose || this.flap.disposed ||
            !this.view.info.components.some(c => c == this.key);
    }
    onDispose() {
        let self = this;
        delete self.flap;
        delete self.node;
    }
    get distance() {
        if (this.disposed)
            return 0;
        let { design, info } = this.view, flap = this.flap;
        let dis = design.tree.dist(flap.node, this.node);
        return dis - flap.radius + info.length;
    }
    get contour() {
        this.flap.view.draw();
        return this.flap.view.makeContour(this.distance);
    }
};
__decorate([
    shrewd
], RiverComponent.prototype, "distance", null);
__decorate([
    shrewd
], RiverComponent.prototype, "contour", null);
RiverComponent = __decorate([
    shrewd
], RiverComponent);
class Draggable extends ViewedControl {
    constructor() {
        super(...arguments);
        this.location = { x: 0, y: 0 };
    }
    dragStart(cursor) {
        this._dragOffset = cursor.sub(this.location);
    }
    dragConstraint(by) {
        if (by instanceof Vector) {
            return this.constraint(by, this.location);
        }
        else {
            let l = new Point(this.location);
            let v = this.constraint(by.sub(this._dragOffset).sub(l), l);
            return l.add(v).add(this._dragOffset);
        }
    }
    drag(by) {
        if (by instanceof Point) {
            by = by.sub(this._dragOffset);
            if (!by.eq(this.location))
                this.design.history.takeAction(() => {
                    this.location.x = by.x;
                    this.location.y = by.y;
                    this.onDragged();
                });
        }
        else {
            if (!by.eq(Vector.ZERO))
                this.design.history.takeAction(() => {
                    this.location.x += by.x;
                    this.location.y += by.y;
                    this.onDragged();
                });
        }
    }
    onDragged() { }
    constraint(v, location) {
        return Vector.ZERO;
    }
    static relocate(source, target) {
        if (!source || !target)
            return;
        let ss = source.sheet, ts = target.sheet;
        target.location.x = Math.round(source.location.x / ss.width * ts.width);
        target.location.y = Math.round(source.location.y / ss.height * ts.height);
    }
}
__decorate([
    shrewd
], Draggable.prototype, "location", void 0);
class IndependentDraggable extends Draggable {
    constructor() {
        super(...arguments);
        this._isNew = true;
    }
    get isNew() { return this._isNew; }
    set isNew(v) { if (!v)
        this._isNew = v; }
    watchIsNew() {
        if (this._isNew && this.sheet != this.design.sheet)
            this._isNew = false;
    }
}
__decorate([
    shrewd
], IndependentDraggable.prototype, "watchIsNew", null);
let FlapView = class FlapView extends LabeledView {
    constructor(flap) {
        super(flap);
        this.$addItem(Layer.shade, this._shade = new paper.Path.Rectangle(Style.shade));
        this.$addItem(Layer.hinge, this.hinge = new paper.Path.Rectangle(Style.hinge));
        this.$addItem(Layer.shade, this._circle = new paper.Path(Style.circle));
        this._dots = MakePerQuadrant(i => {
            let d = new paper.Path.Circle(Style.dot);
            this.$addItem(Layer.dot, d);
            return d;
        });
        this.$addItem(Layer.ridge, this._innerRidges = new paper.CompoundPath(Style.ridge));
        this.$addItem(Layer.ridge, this._outerRidges = new paper.CompoundPath(Style.ridge));
        this.$addItem(Layer.label, this._glow = new paper.PointText(Style.glow));
        this.$addItem(Layer.label, this._label = new paper.PointText(Style.label));
    }
    contains(point) {
        return this.control.sheet.view.contains(point) &&
            (this.hinge.contains(point) || this.hinge.hitTest(point) != null);
    }
    get circle() {
        return this.makeRectangle(0);
    }
    makeRectangle(d) {
        let p = this.control.points, r = this.control.node.radius + d;
        return new paper.Path.Rectangle({
            from: [p[2].x - r, p[2].y - r],
            to: [p[0].x + r, p[0].y + r],
            radius: r
        });
        ;
    }
    makeContour(d) {
        let path = new paper.Path({ closed: true });
        this.control.quadrants.forEach(q => path.add(...q.makeContour(d)));
        let item = path;
        for (let q of this.control.quadrants) {
            for (let p of q.getOverriddenPath(d))
                item = item.subtract(p, { insert: false });
        }
        return item;
    }
    renderHinge() {
        var _a, _b;
        this._circle.visible = (_b = (_a = this.$studio) === null || _a === void 0 ? void 0 : _a.$display.settings.showHinge) !== null && _b !== void 0 ? _b : false;
        this.hinge.removeSegments();
        this.control.quadrants.forEach(q => this.hinge.add(...q.makeContour(0)));
    }
    render() {
        let ds = this.control.sheet.displayScale;
        let w = this.control.width, h = this.control.height;
        this._circle.copyContent(this.circle);
        this.renderHinge();
        let fix = (p) => [p.x * ds, -p.y * ds];
        let p = MakePerQuadrant(i => {
            let pt = this.control.points[i].toPaper();
            this._dots[i].position.set(fix(pt));
            return pt;
        });
        this._dots[2].visible = w > 0 || h > 0;
        this._dots[1].visible = this._dots[3].visible = w > 0 && h > 0;
        this._innerRidges.removeChildren();
        this._innerRidges.moveTo(p[3]);
        p.forEach(p => this._innerRidges.lineTo(p));
        this._innerRidges.visible = w > 0 || h > 0;
        this._outerRidges.removeChildren();
        this.control.quadrants.forEach((q, i) => {
            if (q.pattern == null)
                PaperUtil.addLine(this._outerRidges, p[i], q.corner);
        });
        this._label.content = this.control.node.name;
        LabelUtil.setLabel(this.control.sheet, this._label, this._glow, this.control.dragSelectAnchor, this._dots[0]);
        this._shade.copyContent(this.hinge);
    }
    renderSelection(selected) {
        this._shade.visible = selected;
    }
};
__decorate([
    shrewd
], FlapView.prototype, "circle", null);
__decorate([
    shrewd
], FlapView.prototype, "renderHinge", null);
FlapView = __decorate([
    shrewd
], FlapView);
let EdgeView = class EdgeView extends LabeledView {
    constructor(edge) {
        super(edge);
        this.$addItem(Layer.ridge, this.line = new paper.Path.Line(Style.edge));
        this.$addItem(Layer.label, this._glow = new paper.PointText(Style.glow));
        this.$addItem(Layer.label, this._label = new paper.PointText(Style.label));
        this._lineRegion = new paper.Path.Line({ strokeWidth: 15 });
    }
    contains(point) {
        return (this._lineRegion.hitTest(point) != null ||
            this._glow.hitTest(point.transform(this._glow.layer.matrix.inverted())) != null)
            && !this.control.v1.view.contains(point)
            && !this.control.v2.view.contains(point);
    }
    render() {
        let l1 = this.control.v1.location, l2 = this.control.v2.location;
        let center = { x: (l1.x + l2.x) / 2, y: (l1.y + l2.y) / 2 };
        this._lineRegion.segments[0].point.set([l1.x, l1.y]);
        this._lineRegion.segments[1].point.set([l2.x, l2.y]);
        this.line.copyContent(this._lineRegion);
        this._label.content = this.control.length.toString();
        LabelUtil.setLabel(this.control.sheet, this._label, this._glow, center, this.line);
    }
    renderSelection(selected) {
        let color = selected ? PaperUtil.Red() : PaperUtil.Black();
        this._label.fillColor = this._label.strokeColor = this.line.strokeColor = color;
        this.line.strokeWidth = selected ? 3 : 2;
    }
};
EdgeView = __decorate([
    shrewd
], EdgeView);
let VertexView = class VertexView extends LabeledView {
    constructor(vertex) {
        super(vertex);
        let option = Object.assign({}, Style.dot, { radius: 4 });
        this.$addItem(Layer.dot, this._dot = new paper.Path.Circle(option));
        this.$addItem(Layer.label, this._glow = new paper.PointText(Style.glow));
        this.$addItem(Layer.label, this._label = new paper.PointText(Style.label));
        this._circle = new paper.Path.Circle({ radius: 0.4 });
    }
    contains(point) {
        return this._circle.contains(point) ||
            this._glow.hitTest(point.transform(this._glow.layer.matrix.inverted())) != null;
    }
    render() {
        let ds = this.control.sheet.displayScale;
        let x = this.control.location.x, y = this.control.location.y;
        this._circle.position.set([x, y]);
        this._dot.position.set([x * ds, -y * ds]);
        let lines = this.control.node.edges.map(e => {
            let edgeView = this.control.sheet.design.edges.get(e).view;
            edgeView.draw();
            return edgeView.line;
        });
        this._label.content = this.control.node.name;
        LabelUtil.setLabel(this.control.sheet, this._label, this._glow, { x, y }, this._dot, ...lines);
    }
    renderSelection(selected) {
        this._dot.set(selected ? Style.dotSelected : Style.dot);
    }
};
VertexView = __decorate([
    shrewd
], VertexView);
var Flap_1;
let Flap = Flap_1 = class Flap extends IndependentDraggable {
    constructor(sheet, node) {
        super(sheet);
        this.width = 0;
        this.height = 0;
        this.node = node;
        let design = sheet.design;
        let option = design.options.get("flap", node.id);
        if (option) {
            this.location.x = option.x;
            this.location.y = option.y;
            this.width = option.width;
            this.height = option.height;
            this.isNew = false;
        }
        else {
            Draggable.relocate(design.vertices.get(this.node), this);
        }
        this.quadrants = MakePerQuadrant(i => new Quadrant(sheet, this, i));
        this.view = new FlapView(this);
    }
    get type() { return "Flap"; }
    selectableWith(c) { return c instanceof Flap_1; }
    get dragSelectAnchor() {
        return { x: this.location.x + this.width / 2, y: this.location.y + this.height / 2 };
    }
    get points() {
        let x = this.location.x, y = this.location.y;
        let w = this.width, h = this.height;
        return [
            new Point(x + w, y + h),
            new Point(x, y + h),
            new Point(x, y),
            new Point(x + w, y)
        ];
    }
    get name() { return this.node.name; }
    set name(n) { this.node.name = n; }
    get radius() {
        var _a, _b;
        return (_b = (_a = this.node.firstEdge) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
    }
    set radius(r) { this.node.firstEdge.length = r; }
    onDragged() {
        if (this.isNew)
            Draggable.relocate(this, this.design.vertices.get(this.node));
    }
    get shouldDispose() {
        return super.shouldDispose || this.node.disposed || this.node.degree != 1;
    }
    toJSON() {
        return {
            id: this.node.jid,
            width: this.width,
            height: this.height,
            x: this.location.x,
            y: this.location.y
        };
    }
    constraint(v, location) {
        this.sheet.constraint(v, location);
        this.sheet.constraint(v, {
            x: location.x + this.width,
            y: location.y + this.height
        });
        return v;
    }
    debug(d = 0) {
        console.log(this.view.makeContour(d).exportJSON());
    }
};
__decorate([
    action({
        validator(v) {
            let ok = v >= 0 && v <= this.sheet.width;
            let d = this.location.x + v - this.sheet.width;
            if (d > 0)
                this.location.x -= d;
            return ok;
        }
    })
], Flap.prototype, "width", void 0);
__decorate([
    action({
        validator(v) {
            let ok = v >= 0 && v <= this.sheet.height;
            let d = this.location.y + v - this.sheet.height;
            if (d > 0)
                this.location.y -= d;
            return ok;
        }
    })
], Flap.prototype, "height", void 0);
__decorate([
    shrewd
], Flap.prototype, "dragSelectAnchor", null);
__decorate([
    shrewd
], Flap.prototype, "points", null);
Flap = Flap_1 = __decorate([
    shrewd
], Flap);
var Vertex_1;
let Vertex = Vertex_1 = class Vertex extends IndependentDraggable {
    constructor(sheet, node) {
        super(sheet);
        this.height = 0;
        this.width = 0;
        this.node = node;
        let option = sheet.design.options.get("vertex", this.node.id);
        if (option) {
            if (option.name != undefined)
                this.node.name = option.name;
            this.location.x = option.x;
            this.location.y = option.y;
            this.isNew = !!option.isNew;
        }
        this.view = new VertexView(this);
    }
    get type() { return "Vertex"; }
    get name() { return this.node.name; }
    set name(n) { this.node.name = n; }
    get degree() { return this.node.degree; }
    selectableWith(c) { return c instanceof Vertex_1; }
    get dragSelectAnchor() {
        return this.location;
    }
    onDragged() {
        if (this.isNew)
            Draggable.relocate(this, this.design.flaps.get(this.node));
    }
    addLeaf(length = 1) {
        this.design.history.takeAction(() => {
            let v = [...this.design.vertices.values()];
            let node = this.node.addLeaf(length);
            let p = this.findClosestEmptyPoint(v);
            this.design.options.set("vertex", node.id, {
                id: node.id,
                name: node.name,
                x: p.x,
                y: p.y,
                isNew: true
            });
        });
    }
    findClosestEmptyPoint(vertices) {
        let { x, y } = this.location;
        let ref = new Point(x + 0.125, y + 0.0625);
        let arr = [];
        let occupied = new Set();
        for (let v of vertices)
            occupied.add(v.location.x + "," + v.location.y);
        let r = 5;
        for (let i = x - r; i <= x + r; i++)
            for (let j = y - r; j <= y + r; j++) {
                if (!occupied.has(i + "," + j)) {
                    let p = new Point(i, j);
                    arr.push([p, p.dist(ref)]);
                }
            }
        arr.sort((a, b) => a[1] - b[1]);
        return arr[0][0];
    }
    deleteAndJoin() {
        if (this.node.degree != 2)
            return;
        this.design.history.takeAction(() => {
            let edge = this.node.dispose();
            Shrewd.commit();
            this.design.edges.get(edge).selected = true;
        });
    }
    get shouldDispose() {
        return super.shouldDispose || this.node.disposed;
    }
    toJSON() {
        return {
            id: this.node.jid,
            name: this.name,
            x: this.location.x,
            y: this.location.y
        };
    }
    constraint(v, location) {
        this.sheet.constraint(v, location);
        return v;
    }
};
Vertex = Vertex_1 = __decorate([
    shrewd
], Vertex);
let BPStudio = class BPStudio {
    constructor(selector) {
        this.designMap = new Map();
        this.design = null;
        if (typeof paper != "object")
            throw new Error("BPStudio requires paper.js.");
        let el = document.querySelector(selector);
        if (el == null || !(el instanceof HTMLElement)) {
            throw new Error("selector is not valid");
        }
        this.$el = el;
        this.$paper = new paper.PaperScope();
        this.$display = new Display(this);
        this.system = new System(this);
    }
    load(json) {
        if (typeof json == "string")
            json = JSON.parse(json);
        return this.tryLoad(Migration.process(json, this.onDeprecate));
    }
    create(json) {
        Object.assign(json, {
            version: Migration.current,
            tree: {
                nodes: [
                    { id: 0, name: "", x: 10, y: 7 },
                    { id: 1, name: "", x: 10, y: 10 },
                    { id: 2, name: "", x: 10, y: 13 }
                ],
                edges: [
                    { n1: 0, n2: 1, length: 1 },
                    { n1: 2, n2: 1, length: 1 }
                ]
            }
        });
        return this.restore(json);
    }
    restore(json) {
        let design = new Design(this, Migration.process(json, this.onDeprecate));
        this.designMap.set(design.id, design);
        return design;
    }
    select(id) {
        if (id != null) {
            let d = this.designMap.get(id);
            if (d)
                this.design = d;
        }
        else
            this.design = null;
    }
    close(id) {
        let d = this.designMap.get(id);
        if (d) {
            this.designMap.delete(id);
            d.dispose();
        }
    }
    closeAll() {
        this.design = null;
        for (let d of this.designMap.values())
            d.dispose();
        this.designMap.clear();
    }
    tryLoad(design) {
        this.design = new Design(this, design);
        this.designMap.set(this.design.id, this.design);
        Shrewd.commit();
        return this.design;
    }
    toBPS() {
        if (!this.design)
            return "";
        let json = this.design.toJSON();
        delete json.history;
        let bps = JSON.stringify(json);
        let blob = new Blob([bps], { type: "application/octet-stream" });
        return URL.createObjectURL(blob);
    }
    get TreeMaker() { return TreeMaker; }
};
__decorate([
    shrewd
], BPStudio.prototype, "design", void 0);
BPStudio = __decorate([
    shrewd
], BPStudio);
let Edge = class Edge extends ViewedControl {
    constructor(sheet, v1, v2, edge) {
        super(sheet);
        this.v1 = v1;
        this.v2 = v2;
        this.edge = edge;
        this.view = new EdgeView(this);
    }
    get type() { return "Edge"; }
    get shouldDispose() {
        return super.shouldDispose || this.edge.disposed;
    }
    split() {
        this.design.history.takeAction(() => this.toVertex(Tree.prototype.split));
    }
    deleteAndMerge() {
        this.design.history.takeAction(() => this.toVertex(Tree.prototype.deleteAndMerge));
    }
    toVertex(action) {
        let l1 = this.v1.location, l2 = this.v2.location;
        let x = Math.round((l1.x + l2.x) / 2), y = Math.round((l1.y + l2.y) / 2);
        let node = action.apply(this.design.tree, [this.edge]);
        this.design.options.set("vertex", node.id, { id: node.id, name: node.name, x, y });
        Shrewd.commit();
        this.design.vertices.get(node).selected = true;
    }
    get length() { return this.edge.length; }
    ;
    set length(v) { this.edge.length = v; }
    toJSON() {
        return {
            n1: this.v1.node.jid,
            n2: this.v2.node.jid,
            length: this.edge.length
        };
    }
};
Edge = __decorate([
    shrewd
], Edge);
let Junction = class Junction extends SheetObject {
    constructor(sheet, f1, f2) {
        super(sheet);
        if (f1.node.id > f2.node.id)
            [f1, f2] = [f2, f1];
        this.f1 = f1;
        this.f2 = f2;
        this.id = f1.node.id + ":" + f2.node.id;
        new JunctionView(this);
    }
    static createTeamId(arr, idFactory) {
        let set = new Set();
        arr.forEach(o => {
            set.add(idFactory(o.f1));
            set.add(idFactory(o.f2));
        });
        return Array.from(set).sort((a, b) => a - b).join(",");
    }
    static sort(j1, j2) {
        let d = j1.f1.node.id - j2.f1.node.id;
        if (d != 0)
            return d;
        else
            return j1.f2.node.id - j2.f2.node.id;
    }
    get shouldDispose() {
        return super.shouldDispose || this.f1.disposed || this.f2.disposed;
    }
    get baseRectangle() {
        if (!this.isValid)
            return undefined;
        let q = this.sx > 0 ? this.q2 : this.q1;
        return q === null || q === void 0 ? void 0 : q.getBaseRectangle(this);
    }
    isCoveredBy(o) {
        if (this == o || this.direction % 2 != o.direction % 2)
            return false;
        let [r1, r2] = [o.baseRectangle, this.baseRectangle];
        if (!r1 || !r2 || !r1.contains(r2))
            return false;
        if (r1.equals(r2)) {
            return Math.abs(o.sx) < Math.abs(this.sx) || Math.abs(o.sy) < Math.abs(this.sy);
        }
        return true;
    }
    get coveredBy() {
        if (!this.isValid)
            return [];
        return this.sheet.design.validJunctions.filter(j => this.isCoveredBy(j));
    }
    get isCovered() {
        return this.coveredBy.some(j => j.coveredBy.length == 0);
    }
    toJSON() {
        return {
            c: [
                { type: CornerType.flap, e: this.f1.node.id, q: this.q1.q },
                { type: CornerType.side },
                { type: CornerType.flap, e: this.f2.node.id, q: this.q2.q },
                { type: CornerType.side }
            ],
            ox: this.ox,
            oy: this.oy,
            sx: this.sx < 0 ? -this.sx : this.sx
        };
    }
    get neighbors() {
        if (this.direction > 3)
            return [];
        let a1 = this.q1.activeJunctions.concat();
        let a2 = this.q2.activeJunctions.concat();
        a1.splice(a1.indexOf(this), 1);
        a2.splice(a2.indexOf(this), 1);
        return a1.concat(a2);
    }
    get q1() {
        return isQuadrant(this.direction) ? this.f1.quadrants[this.direction] : null;
    }
    get q2() {
        return isQuadrant(this.direction) ? this.f2.quadrants[opposite(this.direction)] : null;
    }
    get $treeDistance() {
        return this.design.tree.dist(this.f1.node, this.f2.node);
    }
    get status() {
        if (this._flapDistance < this.$treeDistance)
            return JunctionStatus.tooClose;
        else if (this.ox && this.oy)
            return JunctionStatus.overlap;
        else
            return JunctionStatus.tooFar;
    }
    get fx() {
        return -Math.sign(this.sx);
    }
    get fy() {
        return -Math.sign(this.sy);
    }
    get ox() {
        let x = this.$treeDistance - Math.abs(this.sx);
        return x > 0 ? x : NaN;
    }
    get oy() {
        let y = this.$treeDistance - Math.abs(this.sy);
        return y > 0 ? y : NaN;
    }
    get sx() {
        let x1 = this.f1.location.x, x2 = this.f2.location.x;
        let w1 = this.f1.width, w2 = this.f2.width;
        let sx = x1 - x2 - w2;
        if (sx >= 0)
            return sx;
        sx = x1 + w1 - x2;
        if (sx <= 0)
            return sx;
        return NaN;
    }
    get sy() {
        let y1 = this.f1.location.y, y2 = this.f2.location.y;
        let h1 = this.f1.height, h2 = this.f2.height;
        let sy = y1 - y2 - h2;
        if (sy >= 0)
            return sy;
        sy = y1 + h1 - y2;
        if (sy <= 0)
            return sy;
        return NaN;
    }
    get direction() {
        let x = this.sx, y = this.sy;
        if (x < 0 && y < 0)
            return Direction.UR;
        if (x > 0 && y < 0)
            return Direction.UL;
        if (x > 0 && y > 0)
            return Direction.LL;
        if (x < 0 && y > 0)
            return Direction.LR;
        if (x < 0)
            return Direction.R;
        if (x > 0)
            return Direction.L;
        if (y < 0)
            return Direction.T;
        if (y > 0)
            return Direction.B;
        return Direction.none;
    }
    get _flapDistance() {
        let x = this.sx, y = this.sy;
        let vx = x != 0 && !isNaN(x), vy = y != 0 && !isNaN(y);
        if (vx && vy)
            return Math.sqrt(x * x + y * y);
        if (vx)
            return Math.abs(x);
        if (vy)
            return Math.abs(y);
        return 0;
    }
    get isValid() {
        return this.status == JunctionStatus.overlap;
    }
    static findMinMax(junctions, key, f) {
        let value = junctions[0][key];
        let result = junctions[0];
        for (let j = 1; j < junctions.length; j++)
            if (junctions[j][key] * f > value * f) {
                result = junctions[j];
                value = junctions[j][key];
            }
        return result;
    }
};
__decorate([
    shrewd
], Junction.prototype, "baseRectangle", null);
__decorate([
    shrewd
], Junction.prototype, "coveredBy", null);
__decorate([
    shrewd
], Junction.prototype, "isCovered", null);
__decorate([
    shrewd
], Junction.prototype, "neighbors", null);
__decorate([
    shrewd
], Junction.prototype, "q1", null);
__decorate([
    shrewd
], Junction.prototype, "q2", null);
__decorate([
    shrewd
], Junction.prototype, "$treeDistance", null);
__decorate([
    shrewd
], Junction.prototype, "status", null);
__decorate([
    shrewd
], Junction.prototype, "fx", null);
__decorate([
    shrewd
], Junction.prototype, "fy", null);
__decorate([
    shrewd
], Junction.prototype, "ox", null);
__decorate([
    shrewd
], Junction.prototype, "oy", null);
__decorate([
    shrewd
], Junction.prototype, "sx", null);
__decorate([
    shrewd
], Junction.prototype, "sy", null);
__decorate([
    shrewd
], Junction.prototype, "direction", null);
__decorate([
    shrewd
], Junction.prototype, "_flapDistance", null);
__decorate([
    shrewd
], Junction.prototype, "isValid", null);
Junction = __decorate([
    shrewd
], Junction);
let River = class River extends ViewedControl {
    constructor(sheet, edge) {
        super(sheet);
        this.edge = edge;
        this.view = new RiverView(this);
    }
    get type() { return "River"; }
    get shouldDispose() {
        return super.shouldDispose || this.edge.disposed || !this.edge.isRiver;
    }
    delete() {
        this.design.edges.get(this.edge).deleteAndMerge();
    }
    get length() { return this.edge.length; }
    ;
    set length(v) { this.edge.length = v; }
};
River = __decorate([
    shrewd
], River);
let Display = class Display {
    constructor(studio) {
        this.MARGIN = 30;
        this.lockViewport = false;
        this.settings = {
            showAxialParallel: true,
            showGrid: true,
            showHinge: true,
            showRidge: true,
            showLabel: true,
            showDot: true,
            includeHiddenElement: false,
        };
        this._printing = false;
        this._studio = studio;
        studio.$el.appendChild(this.spaceHolder = document.createElement("div"));
        studio.$el.addEventListener("scroll", this.onScroll.bind(this));
        this.spaceHolder.style.zIndex = "-10";
        this._canvas = document.createElement("canvas");
        studio.$el.appendChild(this._canvas);
        window.addEventListener("resize", this.setSize.bind(this));
        this.setSize();
        setTimeout(() => this.setSize(), 10);
        window.addEventListener("beforeprint", this.beforePrint.bind(this));
        window.addEventListener("afterprint", this.afterPrint.bind(this));
        let isTouch = matchMedia("(hover: none), (pointer: coarse)").matches;
        document.addEventListener("focusin", e => {
            if (isTouch && (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
                this.lockViewport = true;
            }
        });
        document.addEventListener("focusout", e => this.lockViewport = false);
        studio.$paper.setup(this._canvas);
        studio.$paper.settings.insertItems = false;
        this.project = studio.$paper.project;
        this.project.currentStyle.strokeColor = PaperUtil.Black();
        this.project.currentStyle.strokeScaling = false;
        for (let l of Enum.values(Layer)) {
            this.project.addLayer(new paper.Layer({ name: Layer[l] }));
        }
        this.boundary = new paper.Path.Rectangle({
            from: [0, 0],
            to: [0, 0]
        });
        for (let l of Enum.values(Layer)) {
            if (LayerOptions[l].clipped) {
                this.project.layers[l].addChild(this.boundary.clone());
                this.project.layers[l].clipped = true;
            }
        }
    }
    setSize() {
        if (this.lockViewport)
            return;
        this.viewWidth = this._studio.$el.clientWidth;
        this.viewHeight = this._studio.$el.clientHeight;
    }
    toSVG() {
        let cw = Math.max(this.sheetWidth, this.viewWidth);
        let ch = Math.max(this.sheetHeight, this.viewHeight);
        let x = (cw - this.sheetWidth) / 2 - this.scroll.x;
        let y = (ch - this.sheetHeight) / 2 - this.scroll.y;
        let rect = new paper.Rectangle(x, y, this.sheetWidth, this.sheetHeight);
        let svg = this._studio.$paper.project.exportSVG({
            bounds: rect,
            matrix: this.project.view.matrix
        });
        if (!this.settings.includeHiddenElement)
            this.removeHidden(svg);
        let blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
        return URL.createObjectURL(blob);
    }
    removeHidden(node) {
        let children = Array.from(node.children);
        for (let c of children) {
            if (c.getAttribute('visibility') == 'hidden')
                node.removeChild(c);
            else
                this.removeHidden(c);
        }
    }
    get img() {
        if (!this._img)
            this.spaceHolder.appendChild(this._img = new Image());
        return this._img;
    }
    createPNG() {
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        let img = this.img;
        return new Promise(resolve => {
            img.addEventListener("load", () => {
                canvas.width = img.clientWidth;
                canvas.height = img.clientHeight;
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, img.clientWidth, img.clientHeight);
                this._printing = false;
                canvas.toBlob(blob => resolve(blob));
            }, { once: true });
            this.beforePrint();
        });
    }
    toPNG() {
        return this.createPNG().then(blob => URL.createObjectURL(blob));
    }
    copyPNG() {
        return this.createPNG().then(blob => navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]));
    }
    beforePrint() {
        clearTimeout(this._debounce);
        if (!this._printing &&
            document.visibilityState == 'visible') {
            let old = this.img.src;
            setTimeout(() => URL.revokeObjectURL(old), 5000);
            this.img.src = this.toSVG();
            this._printing = true;
        }
    }
    afterPrint() {
        this._debounce = setTimeout(() => {
            this._printing = false;
            this._debounce = NaN;
        }, 1000);
    }
    onScroll() {
        var _a;
        let sheet = (_a = this._studio.design) === null || _a === void 0 ? void 0 : _a.sheet;
        if (sheet) {
            sheet.scroll.x = this._studio.$el.scrollLeft;
            sheet.scroll.y = this._studio.$el.scrollTop;
        }
    }
    get scroll() {
        var _a, _b;
        return (_b = (_a = this._studio.design) === null || _a === void 0 ? void 0 : _a.sheet.scroll) !== null && _b !== void 0 ? _b : { x: 0, y: 0 };
    }
    get scale() {
        if (this._studio.design && this._studio.design.sheet) {
            if (this._studio.design.fullscreen) {
                let ws = (this.viewWidth - this.horMargin * 2) / this._studio.design.sheet.width;
                let wh = (this.viewHeight - this.MARGIN * 2) / this._studio.design.sheet.height;
                return Math.min(ws, wh);
            }
            else {
                return this._studio.design.sheet.scale;
            }
        }
        else {
            return 1;
        }
    }
    get horMargin() {
        var _a, _b;
        return Math.max(((_b = (_a = this._studio.design) === null || _a === void 0 ? void 0 : _a.sheet.margin) !== null && _b !== void 0 ? _b : 0) + 10, this.MARGIN);
    }
    ;
    get sheetWidth() {
        var _a, _b, _c;
        return ((_c = (_b = (_a = this._studio.design) === null || _a === void 0 ? void 0 : _a.sheet) === null || _b === void 0 ? void 0 : _b.width) !== null && _c !== void 0 ? _c : 0) * this.scale + this.horMargin * 2;
    }
    get sheetHeight() {
        var _a, _b, _c;
        return ((_c = (_b = (_a = this._studio.design) === null || _a === void 0 ? void 0 : _a.sheet) === null || _b === void 0 ? void 0 : _b.height) !== null && _c !== void 0 ? _c : 0) * this.scale + this.MARGIN * 2;
    }
    get isXScrollable() {
        return this.sheetWidth > this.viewWidth + 1;
    }
    get isYScrollable() {
        return this.sheetHeight > this.viewHeight + 1;
    }
    getAutoScale(sheet) {
        var _a, _b, _c;
        sheet = sheet || ((_a = this._studio.design) === null || _a === void 0 ? void 0 : _a.sheet);
        let ws = (this.viewWidth - this.horMargin * 2) / ((_b = sheet === null || sheet === void 0 ? void 0 : sheet.width) !== null && _b !== void 0 ? _b : 1);
        let hs = (this.viewHeight - this.MARGIN * 2) / ((_c = sheet === null || sheet === void 0 ? void 0 : sheet.height) !== null && _c !== void 0 ? _c : 1);
        return Math.min(ws, hs);
    }
    isScrollable() {
        this._studio.$el.classList.toggle("scroll-x", this.isXScrollable);
        this._studio.$el.classList.toggle("scroll-y", this.isYScrollable);
        return this.isXScrollable || this.isYScrollable;
    }
    renderSetting() {
        var _a, _b;
        let notLayout = ((_b = ((_a = this._studio.design) === null || _a === void 0 ? void 0 : _a.mode) != "layout") !== null && _b !== void 0 ? _b : false);
        this.project.layers[Layer.hinge].visible = this.settings.showHinge;
        this.project.layers[Layer.ridge].visible = this.settings.showRidge || notLayout;
        this.project.layers[Layer.axisParallel].visible = this.settings.showAxialParallel;
        this.project.layers[Layer.label].visible = this.settings.showLabel;
        this.project.layers[Layer.dot].visible = this.settings.showDot || notLayout;
    }
    onSheetChange() {
        var _a;
        let sheet = (_a = this._studio.design) === null || _a === void 0 ? void 0 : _a.sheet;
        if (sheet) {
            this._studio.$el.scrollLeft = sheet.scroll.x;
            this._studio.$el.scrollTop = sheet.scroll.y;
        }
    }
    render() {
        let width = 0, height = 0, s = this.scale;
        if (this._studio.design && this._studio.design.sheet) {
            ({ width, height } = this._studio.design.sheet);
        }
        let cw = Math.max(this.sheetWidth, this.viewWidth);
        let ch = Math.max(this.sheetHeight, this.viewHeight);
        this.spaceHolder.style.width = cw + "px";
        this.spaceHolder.style.height = ch + "px";
        PaperUtil.setRectangleSize(this.boundary, width, height);
        let el = this._studio.$el;
        let mw = (cw - this.sheetWidth) / 2 + this.horMargin, mh = (ch + this.sheetHeight) / 2 - this.MARGIN;
        if (this.lockViewport)
            this.project.view.viewSize.set(this.viewWidth, this.viewHeight);
        else
            this.project.view.viewSize.set(el.clientWidth, el.clientHeight);
        this.project.view.matrix.set(s, 0, 0, -s, mw - this.scroll.x, mh - this.scroll.y);
        for (let l of Enum.values(Layer)) {
            let layer = this.project.layers[l];
            if (LayerOptions[l].clipped) {
                layer.children[0].set({
                    segments: this.boundary.segments
                });
            }
            if (!LayerOptions[l].scaled) {
                layer.applyMatrix = false;
                layer.matrix.set(1 / s, 0, 0, -1 / s, 0, 0);
            }
        }
    }
};
__decorate([
    shrewd
], Display.prototype, "viewWidth", void 0);
__decorate([
    shrewd
], Display.prototype, "viewHeight", void 0);
__decorate([
    shrewd
], Display.prototype, "settings", void 0);
__decorate([
    shrewd
], Display.prototype, "scale", null);
__decorate([
    shrewd
], Display.prototype, "horMargin", null);
__decorate([
    shrewd
], Display.prototype, "sheetWidth", null);
__decorate([
    shrewd
], Display.prototype, "sheetHeight", null);
__decorate([
    shrewd
], Display.prototype, "isXScrollable", null);
__decorate([
    shrewd
], Display.prototype, "isYScrollable", null);
__decorate([
    shrewd
], Display.prototype, "isScrollable", null);
__decorate([
    shrewd
], Display.prototype, "renderSetting", null);
__decorate([
    shrewd
], Display.prototype, "onSheetChange", null);
__decorate([
    shrewd
], Display.prototype, "render", null);
Display = __decorate([
    shrewd
], Display);
class HistoryManager {
    constructor(design) {
        this._modified = false;
        this.design = design;
    }
    get modified() {
        return this._modified;
    }
    notifySave() {
        this._modified = false;
    }
    takeAction(action) {
        this._modified = true;
        action();
    }
    fieldChange(obj, prop, oldValue, newValue) {
        this._modified = true;
    }
}
var Migration;
(function (Migration) {
    Migration.current = "0";
    function getSample() {
        return {
            title: "",
            version: Migration.current,
            fullscreen: true,
            mode: "layout",
            history: {
                index: 0,
                modified: false,
                actions: []
            },
            layout: {
                sheet: { width: 16, height: 16, scale: 20 },
                flaps: [],
                stretches: [],
            },
            tree: {
                sheet: { width: 20, height: 20, scale: 16 },
                nodes: [],
                edges: []
            }
        };
    }
    Migration.getSample = getSample;
    function process(design, onDeprecated) {
        var _a;
        let deprecate = false;
        if (!('version' in design)) {
            if (design.mode == "cp")
                design.mode = "layout";
            design.layout = design.cp;
            delete design.cp;
            design.version = "beta";
            delete design.layout.stretches;
            deprecate = true;
        }
        if (design.version == "beta") {
            design.version = "rc0";
            let st = design.layout.stretches;
            if (st)
                for (let s of st.concat()) {
                    let cf = s.configuration;
                    if (cf && (!cf.overlaps || cf.overlaps.some((o) => o.c.some((c) => c.type == CornerType.intersection && c.e === undefined)))) {
                        st.splice(st.indexOf(s), 1);
                        deprecate = true;
                    }
                }
        }
        if (design.version == "rc0") {
            design.version = "rc1";
            let st = design.layout.stretches;
            if (st)
                for (let s of st.concat()) {
                    let cf = s.configuration;
                    if (cf) {
                        s.configuration = {
                            partitions: toPartition(s.configuration.overlaps, s.configuration.strategy)
                        };
                        let pt = s.pattern;
                        if (pt) {
                            if (s.configuration.partitions.length == 1) {
                                s.pattern = {
                                    devices: [{
                                            gadgets: s.pattern.gadgets,
                                            offset: (_a = s.pattern.offsets) === null || _a === void 0 ? void 0 : _a[0]
                                        }]
                                };
                            }
                            else {
                                s.pattern = {
                                    devices: s.pattern.gadgets.map((g, i) => {
                                        var _a;
                                        return ({
                                            gadgets: [g],
                                            offset: (_a = s.pattern.offsets) === null || _a === void 0 ? void 0 : _a[i]
                                        });
                                    })
                                };
                            }
                        }
                    }
                }
        }
        if (design.version == "rc1")
            design.version = "0";
        if (deprecate && onDeprecated)
            onDeprecated(design.title);
        return design;
    }
    Migration.process = process;
    function toPartition(overlaps, strategy) {
        let partitions = [];
        let partitionMap = new Map();
        for (let [i, o] of overlaps.entries()) {
            if (partitionMap.has(i))
                continue;
            let coin = o.c.filter(c => c.type == CornerType.coincide);
            let c = coin.find(c => partitionMap.has(-c.e - 1));
            let j = partitions.length;
            if (c) {
                let j = partitionMap.get(-c.e - 1);
                partitionMap.set(i, j);
                partitions[j].push(o);
            }
            else {
                partitionMap.set(i, j);
                partitions.push([o]);
            }
            coin.forEach(c => {
                i = -c.e - 1;
                if (!partitionMap.has(i)) {
                    partitionMap.set(i, j);
                    partitions[j].push(overlaps[i]);
                }
            });
        }
        return partitions.map(p => ({ overlaps: p, strategy }));
    }
})(Migration || (Migration = {}));
class OptionManager {
    constructor(design) {
        this.options = new Map();
        for (let n of design.tree.nodes)
            this.set("vertex", n.id, n);
        for (let f of design.layout.flaps)
            this.set("flap", f.id, f);
        for (let s of design.layout.stretches)
            this.set("stretch", s.id, s);
    }
    get(type, id) {
        id = type + id;
        let option = this.options.get(id);
        this.options.delete(id);
        return option;
    }
    set(type, id, option) {
        this.options.set(type + id, option);
    }
}
var System_1;
const TOUCH_SUPPORT = typeof TouchEvent != 'undefined';
let System = System_1 = class System {
    constructor(studio) {
        this.dragging = false;
        this._spaceDown = false;
        this._touchScaling = [0, 0];
        this._scrolled = false;
        this._possiblyReselect = false;
        this._studio = studio;
        let canvas = studio.$paper.view.element;
        let tool = studio.$paper.tool = new paper.Tool();
        tool.onKeyDown = this._canvasKeydown.bind(this);
        tool.onKeyUp = this._canvasKeyup.bind(this);
        tool.onMouseDown = this._canvasMousedown.bind(this);
        tool.onMouseDrag = this._canvasMouseDrag.bind(this);
        tool.onMouseUp = this._canvasMouseup.bind(this);
        canvas.addEventListener("wheel", this._canvasWheel.bind(this));
        canvas.addEventListener("touchstart", this._canvasTouch.bind(this));
        document.addEventListener("mousemove", this._bodyMousemove.bind(this));
        document.addEventListener("touchmove", this._bodyMousemove.bind(this));
        document.addEventListener("mouseup", this._bodyMouseup.bind(this));
        document.addEventListener("touchend", this._bodyMouseup.bind(this));
        document.addEventListener("contextmenu", this._bodyMenu.bind(this));
        this._dragSelectView = new DragSelectView(studio);
    }
    static controlPriority(c) {
        if (c instanceof Device || c instanceof Vertex)
            return 1;
        if (c instanceof Flap || c instanceof Edge)
            return 2;
        return 3;
    }
    get _controls() {
        let c = this._studio.design ? this._studio.design.sheet.activeControls.concat() : [];
        c.sort((a, b) => System_1.controlPriority(a) - System_1.controlPriority(b));
        this._dragSelectables = c.filter(Control.isDragSelectable);
        if (!c.length)
            this._ctrl = [null, null];
        return c;
    }
    get selections() {
        return this._controls.filter(c => c.selected);
    }
    draggableSelections() {
        return this.selections.filter((o) => o instanceof Draggable);
    }
    get _canvas() { return this._studio.$paper.view.element; }
    _processSelection(point, ctrlKey) {
        var firstCtrl = null;
        var nowCtrl = null;
        var nextCtrl = null;
        var controls = this._controls.filter(o => o.contains(point));
        for (let o of controls) {
            if (!firstCtrl)
                firstCtrl = o;
            if (o.selected)
                nowCtrl = o;
            else if (nowCtrl && !nextCtrl)
                nextCtrl = o;
        }
        if (!nextCtrl && firstCtrl && !firstCtrl.selected)
            nextCtrl = firstCtrl;
        if (nowCtrl) {
            let p = System_1.controlPriority(nowCtrl);
            if (controls.some(c => System_1.controlPriority(c) < p)) {
                this._possiblyReselect = true;
            }
        }
        if (!ctrlKey) {
            if (!nowCtrl)
                this._clearSelection();
            if (!nowCtrl && nextCtrl)
                this._select(nextCtrl);
        }
        else {
            if (nowCtrl && !nextCtrl)
                nowCtrl.toggle();
            if (nextCtrl)
                this._select(nextCtrl);
        }
        this._ctrl = [nowCtrl, nextCtrl];
    }
    _processNextSelection() {
        var [nowCtrl, nextCtrl] = this._ctrl;
        if (this._studio.design && !this._studio.design.dragging) {
            if (nowCtrl && nextCtrl)
                this._clearSelection();
            if (nowCtrl && !nextCtrl)
                this._clearSelection(nowCtrl);
            if (nextCtrl)
                this._select(nextCtrl);
        }
    }
    _select(c) {
        if (!c.selected && (this.selections.length == 0 || this.selections[0].selectableWith(c))) {
            c.selected = true;
        }
    }
    _clearSelection(c = null) {
        this._dragSelectView.visible = false;
        for (let control of this.selections)
            if (control != c)
                control.selected = false;
    }
    _checkEvent(event) {
        if (this.isTouch(event) && event.touches.length > 1)
            return false;
        if (event instanceof MouseEvent && event.button != 0)
            return false;
        return true;
    }
    _canvasKeydown(event) {
        let active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)
            return true;
        return this.key(event.key, event.modifiers.control);
    }
    key(key, ctrl = false) {
        let v = new Vector(0, 0);
        switch (key) {
            case "space":
                if (this._studio.$display.isScrollable()) {
                    this._canvas.style.cursor = "grab";
                    this._spaceDown = true;
                }
                return false;
            case "delete":
                let s = this.selections[0];
                if (s instanceof Flap)
                    this._studio.design.deleteFlaps(this.selections);
                if (s instanceof Vertex)
                    this._studio.design.deleteVertices(this.selections);
                return false;
            case "a":
                let d = this._studio.design;
                if (ctrl && d) {
                    this._clearSelection();
                    if (d.mode == "layout")
                        d.flaps.forEach(f => f.selected = true);
                    if (d.mode == "tree")
                        d.vertices.forEach(v => v.selected = true);
                }
                return false;
            case "up":
                v.set(0, 1);
                break;
            case "down":
                v.set(0, -1);
                break;
            case "left":
                v.set(-1, 0);
                break;
            case "right":
                v.set(1, 0);
                break;
            default: return true;
        }
        let sel = this.draggableSelections();
        if (sel.length == 0)
            return true;
        if (sel[0] instanceof Device)
            v = v.scale(2);
        for (let o of sel)
            v = o.dragConstraint(v);
        for (let o of sel)
            o.drag(v);
        return false;
    }
    _canvasKeyup() {
        this._canvas.style.cursor = "unset";
        this._spaceDown = false;
    }
    _canvasMousedown(event) {
        if (event.event instanceof MouseEvent && (this._spaceDown || event.event.button == 2)) {
            console.log(event.point.round().toString());
            this._setScroll(event.event);
            return;
        }
        let el = document.activeElement;
        if (el instanceof HTMLElement)
            el.blur();
        if (!this._checkEvent(event.event) || this._scrollStart)
            return;
        let point = event.point;
        this._processSelection(point, event.modifiers.control);
        if (this.selections.length == 1 && this.isTouch(event.event)) {
            this._longPressTimeout = window.setTimeout(() => {
                this.onLongPress();
            }, 750);
        }
        if (this.draggableSelections().length) {
            this._lastKnownCursorLocation = new Point(event.downPoint).round();
            for (let o of this.draggableSelections())
                o.dragStart(this._lastKnownCursorLocation);
            this.dragging = true;
        }
    }
    _canvasMouseup(event) {
        this._dragSelectView.visible = false;
        if (!this._checkEvent(event.event))
            return;
        if (this._scrollStart) {
            if (event.event instanceof MouseEvent) {
                this._scrollStart = null;
            }
            return;
        }
        if (!event.modifiers.control)
            this._processNextSelection();
    }
    _reselect(event) {
        this._clearSelection();
        this._processSelection(event.point, false);
        Shrewd.commit();
        for (let o of this.draggableSelections())
            o.dragStart(this._lastKnownCursorLocation);
        this._possiblyReselect = false;
    }
    _canvasMouseDrag(event) {
        var _a;
        if (this._scrollStart)
            return;
        if (this._possiblyReselect) {
            this._reselect(event);
            this.dragging = true;
        }
        if (this.dragging) {
            let pt = new Point(event.point).round();
            if (this._lastKnownCursorLocation.eq(pt))
                return;
            window.clearTimeout(this._longPressTimeout);
            (_a = this.onDrag) === null || _a === void 0 ? void 0 : _a.apply(null);
            this._lastKnownCursorLocation.set(pt);
            for (let o of this.draggableSelections())
                pt = o.dragConstraint(pt);
            for (let o of this.draggableSelections())
                o.drag(pt);
            this._studio.design.dragging = true;
        }
        else if (this._dragSelectables.length) {
            if (!this._dragSelectView.visible) {
                if (this.isTouch(event.event) && event.downPoint.getDistance(event.point) < 1)
                    return;
                this._clearSelection();
                this._dragSelectView.visible = true;
                this._dragSelectView.down = event.downPoint;
                Shrewd.commit();
            }
            this._dragSelectView.now = event.point;
            this._dragSelectView.draw();
            for (let c of this._dragSelectables) {
                c.selected = this._dragSelectView.contains(new paper.Point(c.dragSelectAnchor));
            }
        }
    }
    _canvasWheel(event) {
        if (event.ctrlKey) {
            event.preventDefault();
            let d = this._studio.design;
            if (d) {
                if (d.fullscreen) {
                    d.sheet.scale = Math.round(this._studio.$display.scale);
                    d.fullscreen = false;
                }
                d.sheet.scale -= Math.round(event.deltaY / 100);
            }
        }
    }
    _canvasTouch(event) {
        if (event.touches.length > 1) {
            this._clearSelection();
            this._setScroll(event);
            this._touchScaling = [this.getTouchDistance(event), this._studio.$display.scale];
        }
    }
    getTouchDistance(event) {
        let t = event.touches, dx = t[1].screenX - t[0].screenX, dy = t[1].screenY - t[0].screenY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    _bodyMousemove(event) {
        var _a;
        if (this._scrollStart && (event instanceof MouseEvent || event.touches.length >= 2)) {
            let e = this.isTouch(event) ? event.touches[0] : event;
            let pt = new Point(e.screenX, e.screenY);
            let diff = pt.sub(this._lastKnownCursorLocation);
            let el = this._studio.$el;
            if (this._studio.$display.isXScrollable)
                el.scrollLeft = this._scrollStart.x - diff.x;
            if (this._studio.$display.isYScrollable)
                el.scrollTop = this._scrollStart.y - diff.y;
            if (this.isTouch(event)) {
                let sheet = (_a = this._studio.design) === null || _a === void 0 ? void 0 : _a.sheet;
                if (sheet) {
                    let s = (this.getTouchDistance(event) - this._touchScaling[0]) / 30;
                    let auto = this._studio.$display.getAutoScale();
                    s = Math.round(s + this._touchScaling[1]);
                    if (s <= auto) {
                        sheet.scale = Math.ceil(auto);
                        sheet.design.fullscreen = true;
                    }
                    else {
                        sheet.scale = Math.ceil(s);
                        sheet.design.fullscreen = false;
                    }
                }
            }
            this._scrolled = true;
        }
    }
    _setScroll(event) {
        let el = this._studio.$el;
        let e = this.isTouch(event) ? event.touches[0] : event;
        window.clearTimeout(this._longPressTimeout);
        this._scrollStart = new Point(el.scrollLeft, el.scrollTop);
        this._scrolled = false;
        this._lastKnownCursorLocation = new Point(e.screenX, e.screenY);
    }
    _bodyMouseup(event) {
        this._dragEnd();
        window.clearTimeout(this._longPressTimeout);
        if (this.isTouch(event) && event.touches.length == 0) {
            this._scrollStart = null;
        }
    }
    _dragEnd() {
        this.dragging = false;
        if (this._studio.design)
            this._studio.design.dragging = false;
    }
    _bodyMenu(event) {
        event.preventDefault();
        this._scrollStart = null;
    }
    isTouch(event) {
        return TOUCH_SUPPORT && event instanceof TouchEvent;
    }
};
__decorate([
    shrewd
], System.prototype, "_controls", null);
__decorate([
    shrewd
], System.prototype, "selections", null);
__decorate([
    shrewd
], System.prototype, "draggableSelections", null);
__decorate([
    shrewd
], System.prototype, "dragging", void 0);
System = System_1 = __decorate([
    shrewd
], System);
var Enum;
(function (Enum) {
    function values(e) {
        return Object.values(e).filter(a => !isNaN(Number(a)));
    }
    Enum.values = values;
})(Enum || (Enum = {}));
var JunctionStatus;
(function (JunctionStatus) {
    JunctionStatus[JunctionStatus["tooClose"] = 0] = "tooClose";
    JunctionStatus[JunctionStatus["overlap"] = 1] = "overlap";
    JunctionStatus[JunctionStatus["tooFar"] = 2] = "tooFar";
})(JunctionStatus || (JunctionStatus = {}));
var Direction;
(function (Direction) {
    Direction[Direction["UR"] = 0] = "UR";
    Direction[Direction["UL"] = 1] = "UL";
    Direction[Direction["LL"] = 2] = "LL";
    Direction[Direction["LR"] = 3] = "LR";
    Direction[Direction["R"] = 4] = "R";
    Direction[Direction["T"] = 5] = "T";
    Direction[Direction["L"] = 6] = "L";
    Direction[Direction["B"] = 7] = "B";
    Direction[Direction["none"] = 8] = "none";
})(Direction || (Direction = {}));
var Layer;
(function (Layer) {
    Layer[Layer["sheet"] = 0] = "sheet";
    Layer[Layer["shade"] = 1] = "shade";
    Layer[Layer["hinge"] = 2] = "hinge";
    Layer[Layer["ridge"] = 3] = "ridge";
    Layer[Layer["axisParallel"] = 4] = "axisParallel";
    Layer[Layer["junction"] = 5] = "junction";
    Layer[Layer["dot"] = 6] = "dot";
    Layer[Layer["label"] = 7] = "label";
    Layer[Layer["drag"] = 8] = "drag";
})(Layer || (Layer = {}));
var CornerType;
(function (CornerType) {
    CornerType[CornerType["socket"] = 0] = "socket";
    CornerType[CornerType["internal"] = 1] = "internal";
    CornerType[CornerType["side"] = 2] = "side";
    CornerType[CornerType["intersection"] = 3] = "intersection";
    CornerType[CornerType["flap"] = 4] = "flap";
    CornerType[CornerType["coincide"] = 5] = "coincide";
})(CornerType || (CornerType = {}));
;
const LayerOptions = {
    [Layer.sheet]: { clipped: false, scaled: true },
    [Layer.shade]: { clipped: true, scaled: true },
    [Layer.hinge]: { clipped: true, scaled: true },
    [Layer.ridge]: { clipped: true, scaled: true },
    [Layer.axisParallel]: { clipped: true, scaled: true },
    [Layer.junction]: { clipped: true, scaled: true },
    [Layer.dot]: { clipped: false, scaled: false },
    [Layer.label]: { clipped: false, scaled: false },
    [Layer.drag]: { clipped: false, scaled: true },
};
var Style;
(function (Style) {
    Style.circle = {
        strokeWidth: 1,
        strokeColor: "#69F"
    };
    Style.dot = {
        fillColor: "#69F",
        strokeWidth: 1,
        strokeColor: "#000",
        radius: 3
    };
    Style.dotSelected = {
        strokeWidth: 3,
        strokeColor: "red",
    };
    Style.hinge = {
        strokeColor: '#69F',
        strokeWidth: 3,
    };
    Style.sheet = {
        strokeWidth: 0.25,
        strokeColor: "#000"
    };
    Style.label = {
        point: [0, 0],
        fillColor: 'black',
        fontWeight: 'normal',
        strokeWidth: 0.5,
        fontSize: 14
    };
    Style.glow = {
        point: [0, 0],
        fontWeight: 'normal',
        strokeWidth: 2.5,
        strokeColor: 'white',
        fontSize: 14
    };
    Style.edge = {};
    Style.ridge = {
        strokeWidth: 1.25,
        strokeColor: "red"
    };
    Style.selection = {
        strokeColor: "#69f",
        fillColor: "rgba(102, 153, 255, 0.2)"
    };
    Style.shade = {
        fillColor: '#69F',
        opacity: 0.3,
        strokeWidth: 0,
    };
    Style.junction = {
        strokeColor: "red",
        fillColor: "red",
        opacity: 0.3,
    };
    Style.axisParallel = {
        strokeWidth: 1,
        strokeColor: "green"
    };
    Style.top = {};
})(Style || (Style = {}));
const quadrants = [0, 1, 2, 3];
function MakePerQuadrant(factory) {
    return quadrants.map(factory);
}
function isQuadrant(direction) {
    return direction < 4;
}
function opposite(direction) {
    return (direction + 2) % 4;
}
class Line {
    constructor(p, c) {
        if (c instanceof Vector)
            c = p.add(c);
        this.p1 = p;
        this.p2 = c;
    }
    toString() { return [this.p1, this.p2].sort().toString(); }
    get isDegenerated() { return this.p1.eq(this.p2); }
    eq(l) { return this.p1.eq(l.p1) && this.p2.eq(l.p2) || this.p1.eq(l.p2) && this.p2.eq(l.p1); }
    contains(point, includeEndpoints = false) {
        let p = point instanceof Point ? point : new Point(point);
        if (includeEndpoints && (p.eq(this.p1) || p.eq(this.p2)))
            return true;
        var v1 = p.sub(this.p1), v2 = p.sub(this.p2);
        return v1._x.mul(v2._y).eq(v2._x.mul(v1._y)) && v1.dot(v2) < 0;
    }
    lineContains(p) {
        return this.vector.parallel(p.sub(this.p1));
    }
    intersection(...t) {
        if (t[1] === undefined)
            return this.intersection(t[0].p1, t[0].p2.sub(t[0].p1));
        let [p, v, isRay] = t;
        var v1 = this.p2.sub(this.p1);
        var m = (new Matrix(v1._x, v._x, v1._y, v._y)).inverse;
        if (m == null)
            return null;
        var r = m.multiply(new Point(p.sub(this.p1)));
        var a = r._x, b = r._y.neg;
        if (a.lt(0) || a.gt(1))
            return null;
        if (isRay && b.lt(0))
            return null;
        return p.add(v.scale(b));
    }
    transform(fx, fy) {
        return new Line(this.p1.transform(fx, fy), this.p2.transform(fx, fy));
    }
    shift(v) {
        return new Line(this.p1.add(v), this.p2.add(v));
    }
    static distinct(lines) {
        let signatures = new Set();
        return lines.filter(l => {
            let signature = l.toString(), ok = !signatures.has(signature);
            if (ok)
                signatures.add(signature);
            return ok;
        });
    }
    static subtract(l1, l2) {
        let result = [];
        let slopeMap = new Map();
        for (let l of l2) {
            let slope = l.slope.toString();
            let arr = slopeMap.get(slope);
            if (!arr)
                slopeMap.set(slope, arr = []);
            arr.push(l);
        }
        for (let l of l1) {
            let slope = l.slope.toString();
            if (!slopeMap.has(slope))
                result.push(l);
            else
                result.push(...l.cancel(slopeMap.get(slope)));
        }
        return result;
    }
    cancel(set) {
        let result = [this];
        for (let l2 of set) {
            let next = [];
            for (let l1 of result)
                next.push(...l1._cancel(l2));
            result = next;
        }
        return result;
    }
    *_cancel(l) {
        let a = this.contains(l.p1, true), b = this.contains(l.p2, true);
        let c = l.contains(this.p1, true), d = l.contains(this.p2, true);
        if (c && d)
            return;
        if (!a && !b || !c && !d)
            yield this;
        else if (a && b) {
            let l11 = new Line(this.p1, l.p1), l12 = new Line(this.p1, l.p2);
            let l21 = new Line(this.p2, l.p1), l22 = new Line(this.p2, l.p2);
            if (l11.isDegenerated)
                yield l22;
            else if (l12.isDegenerated)
                yield l21;
            else if (l21.isDegenerated)
                yield l12;
            else if (l22.isDegenerated)
                yield l11;
            else if (l11.contains(l.p2)) {
                yield l12;
                yield l21;
            }
            else {
                yield l11;
                yield l22;
            }
        }
        else {
            let p1 = a ? l.p1 : l.p2;
            let p2 = d ? this.p1 : this.p2;
            if (!p1.eq(p2))
                yield new Line(p1, p2);
        }
    }
    get slope() {
        return this.p1._x.sub(this.p2._x).d(this.p1._y.sub(this.p2._y));
    }
    xOrient() {
        if (this.p1._x.gt(this.p2._x))
            return [this.p2, this.p1];
        return [this.p1, this.p2];
    }
    *gridPoints() {
        let { p1, p2 } = this;
        let dx = p2.x - p1.x, dy = p2.y - p1.y;
        if (Math.abs(dx) < Math.abs(dy)) {
            let f = Math.sign(dx);
            for (let x = MathUtil.int(p1.x, f); x * f <= p2.x * f; x += f) {
                let p = this.xIntersection(x);
                if (p.isIntegral)
                    yield p;
            }
        }
        else {
            let f = Math.sign(dy);
            for (let y = MathUtil.int(p1.y, f); y * f <= p2.y * f; y += f) {
                let p = this.yIntersection(y);
                if (p.isIntegral)
                    yield p;
            }
        }
    }
    xIntersection(x) {
        let v = this.p2.sub(this.p1);
        return new Point(x, this.p1._y.sub(v.slope.mul(this.p1._x.sub(x))).smp());
    }
    yIntersection(y) {
        let v = this.p2.sub(this.p1);
        return new Point(this.p1._x.sub(this.p1._y.sub(y).div(v.slope)).smp(), y);
    }
    reflect(v) {
        v = v.neg;
        var m = new Matrix(v._x, v._y.neg, v._y, v._x);
        var mi = m.inverse;
        v = mi.multiply(this.p2.sub(this.p1));
        v = v.doubleAngle();
        return m.multiply(v).reduce();
    }
    perpendicular(v) {
        return this.vector.dot(v) == 0;
    }
    get vector() {
        return this.p1.sub(this.p2);
    }
}
class Matrix {
    constructor(a, b, c, d, det) {
        this.a = new Fraction(a);
        this.b = new Fraction(b);
        this.c = new Fraction(c);
        this.d = new Fraction(d);
        if (det)
            this.det = det;
        else
            this.det = this.a.mul(this.d).s(this.b.mul(this.c)).smp();
    }
    toString() { return [this.a, this.b, this.c, this.d].toString(); }
    smp() {
        this.a.smp();
        this.b.smp();
        this.c.smp();
        this.d.smp();
        return this;
    }
    get determinant() { return this.det.value; }
    get inverse() {
        if (this.det.eq(0))
            return null;
        return new Matrix(this.d.div(this.det), this.b.neg.d(this.det), this.c.neg.d(this.det), this.a.div(this.det), this.det.inv).smp();
    }
    multiply(that) {
        return new that.constructor(this.a.mul(that._x).a(this.b.mul(that._y)), this.c.mul(that._x).a(this.d.mul(that._y))).smp();
    }
    static getTransformMatrix(from, to) {
        if (from.eq(Vector.ZERO))
            throw new Error("Cannot transform zero vector.");
        let M = new Matrix(from._x, from._y.neg, from._y, from._x);
        let { _x: a, _y: b } = M.inverse.multiply(to);
        return new Matrix(a, b.neg, b, a);
    }
}
var PathUtil;
(function (PathUtil) {
    function triangleTransform(triangle, to) {
        let [p1, p2, p3] = triangle;
        let [v1, v2, v3] = [to, p2, p3].map(p => p.sub(p1));
        let m = Matrix.getTransformMatrix(v2, v1);
        return p1.add(m.multiply(v3));
    }
    PathUtil.triangleTransform = triangleTransform;
    function collect(paths) {
        let result = [], map = new Map(), i = 0;
        for (let path of paths) {
            let merged = false;
            for (let [j, p] of path.entries()) {
                let s = p.toString(), k = map.get(s);
                if (k) {
                    if (!result[k[0]])
                        continue;
                    result[k[0]].splice(k[1], 0, ...rotate(path, j));
                    for (let [i, p] of result[k[0]].entries())
                        map.set(p.toString(), [k[0], i]);
                    merged = true;
                    break;
                }
                else
                    map.set(s, [i, j]);
            }
            if (!merged) {
                result.push(path);
                i++;
            }
        }
        return { paths: result, map };
    }
    PathUtil.collect = collect;
    function join(p1, p2) {
        p1 = p1.concat();
        p2 = p2.concat();
        for (let i = 0; i < p1.length; i++) {
            for (let j = 0; j < p2.length; j++) {
                if (p1[i].eq(p2[j])) {
                    rotate(p2, j);
                    p1.splice(i, 2, ...p2);
                    return p1;
                }
            }
        }
        return p1;
    }
    PathUtil.join = join;
    function shift(path, v) {
        return path.map(p => p.add(v));
    }
    PathUtil.shift = shift;
    function polygonIntersect(p1, p2) {
        let l1 = pathToLines(p1), l2 = pathToLines(p2);
        return p1.some(p => pointInPolygon(p, l2)) || p2.some(p => pointInPolygon(p, l1));
    }
    PathUtil.polygonIntersect = polygonIntersect;
    function lineInsidePath(l, path) {
        let lines = pathToLines(path);
        return pointInPolygon(l.p1, lines, true) && pointInPolygon(l.p2, lines, true);
    }
    PathUtil.lineInsidePath = lineInsidePath;
    function pointInsidePath(p, path) {
        return pointInPolygon(p, pathToLines(path));
    }
    PathUtil.pointInsidePath = pointInsidePath;
    function pathToLines(p) {
        let result = [];
        for (let i = 0; i < p.length; i++) {
            let [p1, p2] = [p[i], p[(i + 1) % p.length]];
            if (!p1.eq(p2))
                result.push(new Line(p1, p2));
        }
        return result;
    }
    function pointInPolygon(p, lines, boundary = false) {
        if (lines.length <= 2)
            return boundary && lines[0].contains(p, true);
        let n = 0, v = new Vector(1, 0);
        for (let l of lines) {
            if (l.p1.eq(p) || l.p2.eq(p))
                return boundary;
            let int = l.intersection(p, v, true);
            if (!int)
                continue;
            if (int.eq(p))
                return boundary;
            let e1 = int.eq(l.p1), e2 = int.eq(l.p2);
            if (!e1 && !e2 || e1 && l.p2._y.lt(p._y) || e2 && l.p1._y.lt(p._y))
                n++;
        }
        return n % 2 == 1;
    }
    function rotate(p, j) {
        p.push(...p.splice(0, j));
        return p;
    }
})(PathUtil || (PathUtil = {}));
class Rectangle {
    constructor(p1, p2) {
        if (p1._x.gt(p2._x))
            [p1, p2] = [p2, p1];
        if (p1._y.gt(p2._y))
            [p1, p2] = [new Point(p1._x, p2._y), new Point(p2._x, p1._y)];
        [this.p1, this.p2] = [p1, p2];
    }
    contains(rec) {
        return this.p1._x.le(rec.p1._x) && this.p1._y.le(rec.p1._y) &&
            this.p2._x.ge(rec.p2._x) && this.p2._y.ge(rec.p2._y);
    }
    equals(rec) {
        return this.p1.eq(rec.p1) && this.p2.eq(rec.p2);
    }
    get width() { return this.p2._x.sub(this.p1._x).value; }
    get height() { return this.p2._y.sub(this.p1._y).value; }
    get top() { return this.p2.y; }
    get right() { return this.p2.x; }
}
var Trace;
(function (Trace) {
    function create(lines, startPt, sv, inflections, end, start) {
        let history = [];
        let trace = [];
        let x;
        let v = sv;
        let p = startPt;
        let shift;
        let line;
        let record = new Set();
        let candidates = new Set(lines);
        if (debug)
            console.log([...inflections].toString());
        do {
            x = null;
            for (let l of candidates) {
                let r = getIntersection(l, p, v);
                if (r) {
                    let ang = shift ? getAngle(v, shift) : undefined;
                    let f = inflections.has(r.point.toString()) ? -1 : 1;
                    if (!isSideTouchable(l, p, v, f, ang))
                        continue;
                    if (debug)
                        console.log([JSON.stringify(r), l.toString()]);
                    if (intersectionCloser(r, x, f)) {
                        x = r;
                        line = l;
                    }
                }
            }
            if (x) {
                let pt = x.point;
                let l = new Line(p, pt);
                if (start) {
                    let p = l.intersection(start);
                    if (p) {
                        trace.push(p);
                        start = undefined;
                    }
                }
                let goal = l.intersection(end);
                if (goal) {
                    trace.push(goal);
                    break;
                }
                let sg = pt.toString();
                if (record.has(sg))
                    processLoop(history, pt, candidates);
                else
                    record.add(sg);
                history.push(pt);
                if (!start) {
                    if (!trace.length || !trace[trace.length - 1].eq(pt))
                        trace.push(pt);
                }
                shift = line.vector;
                v = line.reflect(v);
                if (debug)
                    console.log([pt.toString(), line.toString(), v.toString(), shift.toString()]);
                p = pt;
                candidates.delete(line);
            }
        } while (x != null);
        return trace;
    }
    Trace.create = create;
    function processLoop(trace, pt, candidates) {
        let path = [], i = trace.length - 1;
        do {
            path.push(trace[i]);
        } while (!trace[i--].eq(pt));
        if (path.length <= 2)
            return;
        for (let l of candidates)
            if (PathUtil.lineInsidePath(l, path))
                candidates.delete(l);
    }
    function intersectionCloser(r, x, f) {
        return r != null && (x == null || r.dist.lt(x.dist) || r.dist.eq(x.dist) && r.angle * f < x.angle * f);
    }
    function getIntersection(l, p, v) {
        var v1 = l.p2.sub(l.p1);
        var m = (new Matrix(v1._x, v._x, v1._y, v._y)).inverse;
        if (m == null)
            return null;
        var r = m.multiply(new Point(p.sub(l.p1)));
        var a = r._x, b = r._y.neg;
        if (a.lt(0) || a.gt(1) || b.lt(0))
            return null;
        return {
            point: p.add(v.scale(b)),
            dist: b,
            angle: getAngle(v, v1)
        };
    }
    function getAngle(v1, v2) {
        var ang = v1.angle - v2.angle;
        while (ang < 0)
            ang += Math.PI;
        while (ang > Math.PI)
            ang -= Math.PI;
        return ang;
    }
    function isSideTouchable(l, p, v, f, ang) {
        let rv = v.rotate90();
        let v1 = l.p1.sub(p), v2 = l.p2.sub(p);
        let r1 = v1.dot(rv), r2 = v2.dot(rv);
        let d1 = v1.dot(v), d2 = v2.dot(v);
        let result = (r1 * f > 0 || r2 * f > 0)
            &&
                (d1 > 0 || d2 > 0
                    || !!ang && getAngle(v, l.vector) * f > ang * f);
        return result;
    }
})(Trace || (Trace = {}));
var ConfigUtil;
(function (ConfigUtil) {
    function joinOverlaps(o1, o2, i1, i2, oriented, reverse = false) {
        if (reverse) {
            [o1, o2] = [o2, o1];
            [i1, i2] = [i2, i1];
        }
        let c = oriented ? 0 : 2;
        let q = ((o2.ox > o1.ox ? 3 : 1) + c) % 4;
        o2.c[c] = { type: CornerType.coincide, e: i1, q: c };
        o2.c[q] = { type: CornerType.intersection, e: o1.c[opposite(c)].e };
        o1.c[opposite(q)] = { type: CornerType.coincide, e: i2, q: q };
        return o2;
    }
    ConfigUtil.joinOverlaps = joinOverlaps;
    function cut(j, index, id, x, y) {
        let o1 = toOverlap(j, index), o2 = toOverlap(j, index);
        if (x > 0) {
            o1.c[2] = { type: CornerType.internal, e: id - 1, q: 3 };
            o1.c[1] = { type: CornerType.socket, e: id - 1, q: 0 };
            o1.ox = x;
            o2.c[3] = { type: CornerType.socket, e: id, q: 2 };
            o2.c[0] = { type: CornerType.internal, e: id, q: 1 };
            o2.ox = j.ox - x;
            o2.shift = { x, y: 0 };
        }
        else {
            o1.c[2] = { type: CornerType.internal, e: id - 1, q: 1 };
            o1.c[3] = { type: CornerType.socket, e: id - 1, q: 0 };
            o1.oy = y;
            o2.c[1] = { type: CornerType.socket, e: id, q: 2 };
            o2.c[0] = { type: CornerType.internal, e: id, q: 3 };
            o2.oy = j.oy - y;
            o2.shift = { x: 0, y };
        }
        return [{ overlaps: [o1] }, { overlaps: [o2] }];
    }
    ConfigUtil.cut = cut;
    function toOverlap(j, index) {
        return {
            c: clone(j.c),
            ox: j.ox,
            oy: j.oy,
            parent: index
        };
    }
    ConfigUtil.toOverlap = toOverlap;
})(ConfigUtil || (ConfigUtil = {}));
var Strategy;
(function (Strategy) {
    Strategy["halfIntegral"] = "HALFINTEGRAL";
    Strategy["universal"] = "UNIVERSAL";
    Strategy["baseJoin"] = "BASE_JOIN";
    Strategy["standardJoin"] = "STANDARD_JOIN";
    Strategy["perfect"] = "PERFECT";
})(Strategy || (Strategy = {}));
class Configurator {
    constructor(repo, option) {
        this.repo = repo;
        this.seed = option === null || option === void 0 ? void 0 : option.configuration;
        this.seedSignature = JSON.stringify(this.seed);
        this.pattern = option === null || option === void 0 ? void 0 : option.pattern;
    }
    *generate(callback) {
        if (this.seed && this.pattern) {
            try {
                let c = new Configuration(this.repo, this.seed, this.pattern);
                if (!c.entry)
                    throw true;
                yield c;
            }
            catch (e) {
                this.seedSignature = undefined;
                console.log("Incompatible old version.");
            }
        }
        let filter = (config) => !this.seedSignature || this.seedSignature != JSON.stringify(config);
        yield* GeneratorUtil.filter(this.search(), filter);
        callback();
    }
    *search() {
        const structure = this.repo.structure;
        const filter = (config) => config.entry != null;
        if (structure.length == 1) {
            let [j] = structure;
            yield* GeneratorUtil.first([
                this.searchSingleGadget(j),
                this.searchDoubleRelay(j, 0),
                this.searchSingleGadget(j, Strategy.halfIntegral),
                this.searchSingleGadget(j, Strategy.universal),
            ], filter);
        }
        if (structure.length == 2) {
            let layout = structure;
            yield* GeneratorUtil.first([
                this.searchThreeFlapJoin(layout, Strategy.perfect),
                this.searchThreeFlapRelay(layout),
                this.searchThreeFlapJoin(layout),
                this.searchThreeFlapRelayJoin(layout),
                this.searchThreeFlapJoin(layout, Strategy.baseJoin),
                this.searchThreeFlapRelayJoin(layout, Strategy.baseJoin),
                this.searchThreeFlapJoin(layout, Strategy.standardJoin),
                this.searchThreeFlapRelayJoin(layout, Strategy.standardJoin),
                this.searchThreeFlapRelay(layout, Strategy.halfIntegral),
            ], filter);
        }
    }
    *searchSingleGadget(j, strategy) {
        yield new Configuration(this.repo, {
            partitions: [{
                    overlaps: [ConfigUtil.toOverlap(j, 0)],
                    strategy: strategy
                }]
        });
    }
    *searchDoubleRelay(j, index) {
        if ((j.ox * j.oy) % 2)
            return;
        if (j.ox < j.oy) {
            for (let y = 1; y <= j.oy / 2; y++) {
                let c = new Configuration(this.repo, { partitions: ConfigUtil.cut(j, index, -1, 0, y) });
                if (c.entry) {
                    yield c;
                    yield new Configuration(this.repo, { partitions: ConfigUtil.cut(j, index, -1, 0, j.oy - y) });
                }
            }
        }
        else {
            for (let x = 1; x <= j.ox / 2; x++) {
                let c = new Configuration(this.repo, { partitions: ConfigUtil.cut(j, index, -1, x, 0) });
                if (c.entry) {
                    yield c;
                    yield new Configuration(this.repo, { partitions: ConfigUtil.cut(j, index, -1, j.ox - x, 0) });
                }
            }
        }
    }
    *searchThreeFlapRelay(junctions, strategy) {
        let [o1, o2] = junctions.map((j, i) => ConfigUtil.toOverlap(j, i));
        let oriented = o1.c[2].e == o2.c[2].e;
        if (o1.ox > o2.ox)
            [o1, o2] = [o2, o1];
        let [o1p, o2p] = clone([o1, o2]);
        o2p.ox -= o1.ox;
        o1p.oy -= o2.oy;
        let [a, b, c, d] = oriented ? [0, 1, 2, 3] : [2, 3, 0, 1];
        o2p.c[c] = { type: CornerType.internal, e: -1, q: d };
        o2p.c[b] = { type: CornerType.intersection, e: o1.c[a].e };
        o1.c[d] = { type: CornerType.socket, e: -2, q: c };
        o1p.c[c] = { type: CornerType.internal, e: -2, q: b };
        o1p.c[d] = { type: CornerType.intersection, e: o2.c[a].e };
        o2.c[b] = { type: CornerType.socket, e: -1, q: c };
        if (!oriented) {
            o2p.shift = { x: o1.ox, y: 0 };
            o1p.shift = { x: 0, y: o2.oy };
        }
        yield new Configuration(this.repo, {
            partitions: [
                { overlaps: [o1], strategy: strategy },
                { overlaps: [o2p], strategy: strategy }
            ]
        });
        yield new Configuration(this.repo, {
            partitions: [
                { overlaps: [o1p], strategy: strategy },
                { overlaps: [o2], strategy: strategy }
            ]
        });
    }
    *searchThreeFlapJoin(junctions, strategy) {
        let [o1, o2] = junctions.map((j, i) => ConfigUtil.toOverlap(j, i));
        ConfigUtil.joinOverlaps(o1, o2, -1, -2, o1.c[0].e == o2.c[0].e);
        yield new Configuration(this.repo, {
            partitions: [{
                    overlaps: [o1, o2],
                    strategy: strategy
                }]
        });
    }
    *searchThreeFlapRelayJoin(junctions, strategy) {
        let [o1, o2] = junctions.map((j, i) => ConfigUtil.toOverlap(j, i));
        let oriented = o1.c[0].e == o2.c[0].e;
        let o1x = o2.ox > o1.ox;
        let x = (o1x ? o1 : o2).ox, y = (o1x ? o2 : o1).oy;
        for (let n = 1; n < x; n++) {
            let [o1p, o2p] = clone([o1, o2]);
            let o = ConfigUtil.joinOverlaps(o1p, o2p, -1, -2, oriented, !o1x);
            o.ox -= n;
            if (oriented)
                o.shift = { x: n, y: 0 };
            yield new Configuration(this.repo, {
                partitions: [{
                        overlaps: [o1p, o2p],
                        strategy: strategy
                    }]
            });
        }
        for (let n = 1; n < y; n++) {
            let [o1p, o2p] = clone([o1, o2]);
            let o = ConfigUtil.joinOverlaps(o1p, o2p, -1, -2, oriented, o1x);
            o.oy -= n;
            if (oriented)
                o.shift = { x: 0, y: n };
            yield new Configuration(this.repo, {
                partitions: [{
                        overlaps: [o1p, o2p],
                        strategy: strategy
                    }]
            });
        }
    }
}
let Device = class Device extends Draggable {
    constructor(pattern, partition, data) {
        var _a, _b, _c;
        super(pattern.sheet);
        this.pattern = pattern;
        this.partition = partition;
        let { fx, fy } = pattern.stretch;
        this.gadgets = data.gadgets.map(g => Gadget.instantiate(g));
        this.addOns = (_b = (_a = data.addOns) === null || _a === void 0 ? void 0 : _a.map(a => AddOn.instantiate(a))) !== null && _b !== void 0 ? _b : [];
        let offset = (_c = data.offset) !== null && _c !== void 0 ? _c : 0;
        this.location = { x: offset * fx, y: offset * fy };
        this.view = new DeviceView(this);
    }
    get type() { return "Device"; }
    toJSON() {
        return {
            gadgets: this.gadgets.map(g => g.toJSON()),
            offset: this.offset,
            addOns: this.addOns.length ? this.addOns : undefined
        };
    }
    get _origin() {
        this._originalDisplacement || (this._originalDisplacement = this.partition.getOriginalDisplacement(this.pattern));
        return this.pattern.stretch.origin.add(this._originalDisplacement);
    }
    get shouldDispose() {
        return super.shouldDispose || this.pattern.disposed;
    }
    get isActive() { return this.pattern.isActive; }
    get anchors() {
        let result = [];
        let { fx, fy } = this.pattern.stretch;
        for (let g of this.gadgets) {
            result.push(g.anchorMap.map(m => {
                if (!m[0])
                    debugger;
                return m[0].transform(fx, fy).add(this.delta);
            }));
        }
        return result;
    }
    get delta() {
        return this._origin.add(new Vector(this.location)).sub(Point.ZERO);
    }
    get regions() {
        let result = [];
        for (let g of this.gadgets)
            result.push(...g.pieces);
        result.push(...this.addOns);
        return result;
    }
    get regionRidges() {
        let map = new Map();
        for (let r of this.regions) {
            let s = this.regions
                .filter(q => q != r && q.direction.parallel(r.direction))
                .reduce((arr, q) => (arr.push(...q.shape.ridges.filter(r => !r.perpendicular(q.direction))), arr), []);
            map.set(r, Line.subtract(r.shape.ridges, s));
        }
        return map;
    }
    get rawRidges() {
        let { fx, fy } = this.pattern.stretch;
        let result = [];
        let map = this.regionRidges;
        for (let r of this.regions) {
            result.push(...map.get(r).map(r => r.transform(fx, fy).shift(this.delta)));
        }
        return Line.distinct(result);
    }
    get ridges() {
        return Line.subtract(this.rawRidges, this.neighbors.reduce((arr, g) => (arr.push(...g.rawRidges), arr), []));
    }
    get axisParallels() {
        let { fx, fy } = this.pattern.stretch;
        let result = [];
        for (let r of this.regions) {
            for (let ap of r.axisParallels) {
                result.push(ap.transform(fx, fy).shift(this.delta));
            }
        }
        return result;
    }
    get outerRidges() {
        if (!this.isActive)
            return [];
        let result = this.getConnectionRidges();
        for (let [from, to] of this.intersectionMap)
            if (to)
                result.push(new Line(from, to));
        return Line.distinct(result);
    }
    get intersectionMap() {
        let result = [];
        if (!this.isActive)
            return result;
        for (let [c, o, q] of this.partition.intersectionCorners) {
            let from = this.anchors[o][q];
            let to = this.partition.getSideConnectionTarget(from, c);
            result.push([from, to]);
        }
        return result;
    }
    get openAnchors() {
        return this.intersectionMap.filter(m => !m[1] || m[0].eq(m[1])).map(m => m[0]);
    }
    getConnectionRidges(internalOnly = false) {
        let result = [];
        for (let [i, ov] of this.partition.overlaps.entries()) {
            for (let [q, c] of ov.c.entries()) {
                if (c.type == CornerType.flap && !internalOnly || c.type == CornerType.internal) {
                    result.push(new Line(this.anchors[i][q], this.pattern.getConnectionTarget(c)));
                }
            }
        }
        return result;
    }
    constraint(v, location) {
        let { fx, fy } = this.pattern.stretch, f = fx * fy;
        let x = Math.round((v.x + f * v.y) / 2);
        for (let [c, o, q] of this.partition.constraints) {
            x = this.fix(x, c, o, q);
        }
        return new Vector(x, f * x);
    }
    get neighbors() {
        let result = new Set();
        for (let o of this.partition.overlaps) {
            for (let c of o.c)
                if (c.type == CornerType.socket || c.type == CornerType.internal) {
                    let [i] = this.partition.configuration.overlapMap.get(c.e);
                    result.add(this.pattern.devices[i]);
                }
        }
        return Array.from(result);
    }
    fix(dx, c, o, q) {
        let out = c.type != CornerType.socket;
        let f = this.pattern.stretch.fx * ((out ? q : opposite(c.q)) == 0 ? -1 : 1);
        let target = this.pattern.getConnectionTarget(c);
        let slack = out ? this.gadgets[o].slacks[q] : this.pattern.gadgets[-c.e - 1].slacks[c.q];
        let bound = target.x - this.anchors[o][q].x - slack * f;
        if (dx * f > bound * f)
            dx = bound;
        return dx;
    }
    get offset() {
        let dx = this.partition.getOriginalDisplacement(this.pattern).x;
        dx -= this._originalDisplacement.x;
        return (this.location.x - dx) * this.pattern.stretch.fx;
    }
};
__decorate([
    shrewd
], Device.prototype, "isActive", null);
__decorate([
    shrewd
], Device.prototype, "anchors", null);
__decorate([
    shrewd
], Device.prototype, "delta", null);
__decorate([
    onDemand
], Device.prototype, "regions", null);
__decorate([
    onDemand
], Device.prototype, "regionRidges", null);
__decorate([
    shrewd
], Device.prototype, "rawRidges", null);
__decorate([
    shrewd
], Device.prototype, "ridges", null);
__decorate([
    shrewd
], Device.prototype, "axisParallels", null);
__decorate([
    shrewd
], Device.prototype, "outerRidges", null);
__decorate([
    shrewd
], Device.prototype, "intersectionMap", null);
__decorate([
    shrewd
], Device.prototype, "openAnchors", null);
__decorate([
    shrewd
], Device.prototype, "neighbors", null);
Device = __decorate([
    shrewd
], Device);
class Gadget {
    constructor(gadget) {
        this.pieces = gadget.pieces.map(p => Piece.instantiate(p));
        this.offset = gadget.offset;
        this.pieces.forEach(p => p.offset(this.offset));
        this.anchors = gadget.anchors;
    }
    toJSON() {
        return clone(this);
    }
    get anchorMap() {
        return MakePerQuadrant(q => {
            var _a, _b;
            if ((_b = (_a = this.anchors) === null || _a === void 0 ? void 0 : _a[q]) === null || _b === void 0 ? void 0 : _b.location) {
                let p = new Point(this.anchors[q].location);
                if (this.offset)
                    p.addBy(new Vector(this.offset));
                return [p, null];
            }
            else {
                if (this.pieces.length == 1)
                    return [this.pieces[0].anchors[q], 0];
                for (let [i, p] of this.pieces.entries()) {
                    if (p.anchors[q])
                        return [p.anchors[q], i];
                }
                debugger;
                throw new Error();
            }
        });
    }
    _getSlack(q) {
        var _a, _b, _c;
        return (_c = (_b = (_a = this.anchors) === null || _a === void 0 ? void 0 : _a[q]) === null || _b === void 0 ? void 0 : _b.slack) !== null && _c !== void 0 ? _c : 0;
    }
    get slacks() {
        return MakePerQuadrant(q => this._getSlack(q));
    }
    get sx() {
        return Math.ceil(this.anchorMap[2][0].x - this.anchorMap[0][0].x);
    }
    get sy() {
        return Math.ceil(this.anchorMap[2][0].y - this.anchorMap[0][0].y);
    }
    reverseGPS() {
        let g = Gadget.instantiate(this.toJSON());
        let [p1, p2] = g.pieces;
        let sx = Math.ceil(Math.max(p1.sx, p2.sx));
        let sy = Math.ceil(Math.max(p1.sy, p2.sy));
        p1.reverse(sx, sy);
        p2.reverse(sx, sy);
        return g;
    }
    addSlack(q, slack) {
        var _a;
        this.anchors = this.anchors || [];
        this.anchors[q] = this.anchors[q] || {};
        this.anchors[q].slack = ((_a = this.anchors[q].slack) !== null && _a !== void 0 ? _a : 0) + slack;
        return this;
    }
    setupConnectionSlack(g, q1, q2) {
        let c1 = this.contour, c2 = g.contour;
        let f = q1 == 0 ? 1 : -1;
        let step = new Vector(f, f);
        let v = g.anchorMap[q2][0].sub(Point.ZERO).addBy(step.scale(this._getSlack(q1)));
        c1 = PathUtil.shift(c1, q1 == 0 ? v : v.add(Point.ZERO.sub(this.anchorMap[2][0])));
        let s = 0;
        while (PathUtil.polygonIntersect(c1, c2)) {
            c1 = PathUtil.shift(c1, step);
            s++;
        }
        this.addSlack(q1, s);
        return s;
    }
    get contour() {
        let p = this.pieces, contour = p[0].shape.contour;
        for (let i = 1; i < p.length; i++)
            contour = PathUtil.join(contour, p[i].shape.contour);
        return contour;
    }
    rx(q1, q2) {
        return Math.abs(this.anchorMap[q1][0].x - this.anchorMap[q2][0].x);
    }
    ry(q1, q2) {
        return Math.abs(this.anchorMap[q1][0].y - this.anchorMap[q2][0].y);
    }
    contains(p) {
        return this.pieces.some(pc => PathUtil.pointInsidePath(p, pc.shape.contour));
    }
    static instantiate(g) {
        if (g instanceof Gadget)
            return g;
        else
            return new Gadget(g);
    }
    static simplify(g) {
        if (g.offset && g.offset.x == 0 && g.offset.y == 0)
            delete g.offset;
        if (g.anchors) {
            for (let [i, a] of g.anchors.entries()) {
                if (!a)
                    continue;
                if (a.slack === 0)
                    delete a.slack;
                if (Object.keys(a).length == 0)
                    delete g.anchors[i];
            }
            if (!g.anchors.some(a => !!a))
                delete g.anchors;
        }
        return g;
    }
}
__decorate([
    onDemand
], Gadget.prototype, "anchorMap", null);
__decorate([
    onDemand
], Gadget.prototype, "slacks", null);
__decorate([
    onDemand
], Gadget.prototype, "sx", null);
__decorate([
    onDemand
], Gadget.prototype, "sy", null);
__decorate([
    onDemand
], Gadget.prototype, "contour", null);
class Joiner {
    constructor(overlaps, repo) {
        let junctions = [];
        let [o1, o2] = overlaps;
        if (o1.ox == o2.ox || o1.oy == o2.oy)
            return;
        [this.g1, this.g2] = overlaps.map(o => {
            let j = repo.structure[o.parent];
            junctions.push(j);
            return Array.from(Piece.gops(o, j.sx));
        });
        let [j1, j2] = junctions;
        this.oriented = j1.c[0].e == j2.c[0].e;
        this.cw = o1.ox > o2.ox;
        this.q = this.oriented ? 0 : 2;
        [this.q1, this.q2] = this.oriented ? (this.cw ? [2, 1] : [1, 2]) : (this.cw ? [0, 3] : [3, 0]);
        this.intDist = Partitioner.getMaxIntersectionDistance(repo.sheet.design.tree, j1, j2, this.oriented);
        [this.s1, this.s2] = this.oriented ?
            [o1.shift, o2.shift] :
            [this.getReverseShift(o1, j1), this.getReverseShift(o2, j2)];
    }
    *join(generator, precondition) {
        let { g1, g2 } = this;
        let result = [];
        if (!g1)
            return;
        for (let p1 of g1) {
            for (let p2 of g2) {
                let P1 = Piece.instantiate(p1, true);
                let P2 = Piece.instantiate(p2, true);
                if (precondition && !precondition(P1, P2))
                    continue;
                result.push(...generator(new JoinerCore(this, P1, P2)));
            }
        }
        result.sort((a, b) => a[1] - b[1]);
        for (let [j] of result)
            yield j;
    }
    *simpleJoin(strategy) {
        let { s1, s2 } = this;
        yield* this.join(j => j.simpleJoin(), (P1, P2) => {
            let parallel = P1.direction.parallel(P2.direction);
            if (strategy == Strategy.perfect && !parallel)
                return false;
            if ((s1 || s2) && parallel)
                return false;
            return true;
        });
    }
    *baseJoin() {
        yield* this.join(j => j.baseJoin());
    }
    *standardJoin() {
        let { s1, s2 } = this, shift = !!s1 || !!s2;
        let counter = 0;
        yield* this.join(j => j.standardJoin(), (P1, P2) => {
            return shift || counter++ == 0;
        });
    }
    getReverseShift(o, j) {
        var _a, _b, _c, _d;
        let x = o.ox + ((_b = (_a = o.shift) === null || _a === void 0 ? void 0 : _a.x) !== null && _b !== void 0 ? _b : 0), y = o.oy + ((_d = (_c = o.shift) === null || _c === void 0 ? void 0 : _c.y) !== null && _d !== void 0 ? _d : 0);
        if (x == j.ox && y == j.oy)
            return undefined;
        return { x: x - j.ox, y: y - j.oy };
    }
    getRelayJoinIntersection(p, s, n) {
        let testVector = this.oriented ? new Vector(1, 1) : new Vector(-1, -1);
        let pt = p.anchors[this.q].sub(new Vector(s));
        return p.shape.ridges[n].intersection(pt, testVector);
    }
}
class JoinerCore {
    constructor(joiner, p1, p2) {
        let { oriented, s1, s2, q1, q2, q } = this.joiner = joiner;
        let a1 = [], a2 = [];
        let size = p1.sx + p2.sx;
        let off1 = { x: 0, y: 0 }, off2 = { x: 0, y: 0 };
        if (s1) {
            let int = joiner.getRelayJoinIntersection(p2, s1, (q1 + 2) % 4);
            if (!int || !int.isIntegral)
                return;
            if (oriented) {
                p1.offset(off1 = int.toIPoint());
                size += off1.x;
                a1[q] = { location: { x: -off1.x, y: -off1.y } };
            }
            else {
                p2.offset(off2 = { x: p2.sx - int.x, y: p2.sy - int.y });
                size += off2.x;
                a1[q] = { location: { x: p1.sx + off2.x, y: p1.sy + off2.y } };
            }
        }
        if (s2) {
            let int = joiner.getRelayJoinIntersection(p1, s2, (q2 + 2) % 4);
            if (!int || !int.isIntegral)
                return;
            if (oriented) {
                p2.offset(off2 = int.toIPoint());
                size += off2.x;
                a2[q] = { location: { x: -off2.x, y: -off2.y } };
            }
            else {
                p2.offset(off2 = { x: int.x - p1.sx, y: int.y - p1.sy });
                size -= off2.x;
                a2[q] = { location: { x: p2.sx - off2.x, y: p2.sy - off2.y } };
            }
        }
        let offset, o = Vector.ZERO;
        if (!oriented) {
            offset = { x: p1.sx - p2.sx, y: p1.sy - p2.sy };
            o = new Vector(offset);
        }
        let v1 = new Vector(off1).neg, v2 = new Vector(off2).addBy(o).neg;
        let pt = (s1 ? p1.anchors[q] : p2.anchors[q].add(o));
        let pt1 = pt.add(v1).toIPoint(), pt2 = pt.add(v2).toIPoint();
        let e1 = p1.shape.ridges[q1], e2 = p2.shape.ridges[q2].shift(o);
        let bv = Vector.bisector(p1.direction, p2.direction);
        let org = oriented ? Point.ZERO : s1 ? new Point(a1[q].location) : p1.anchors[q];
        let f = oriented ? 1 : -1;
        this.data = { p1, p2, v1, v2, a1, a2, off1, off2, offset, size, pt, pt1, pt2, e1, e2, bv, org, f };
    }
    *simpleJoin() {
        if (!this.data)
            return;
        let { e1, e2, p1, p2, pt, bv } = this.data;
        let int = e1.intersection(e2);
        if (!int)
            return;
        if (!p1.direction.parallel(p2.direction) && !int.sub(pt).parallel(bv))
            return;
        if (!this.setupAnchor(int))
            return;
        this.setupDetour([int], [int]);
        yield this.result();
    }
    get deltaPt() {
        let { org, p1, p2, f } = this.data;
        let { cw, intDist } = this.joiner;
        return new Point(org.x + (intDist - (cw ? p2 : p1).ox) * f, org.y + (intDist - (cw ? p1 : p2).oy) * f);
    }
    baseJoinIntersections() {
        let { bv, e1, e2, pt } = this.data;
        let delta = new Line(this.deltaPt, Quadrant.QV[0]), beta = new Line(pt, bv);
        let D1 = e1.intersection(delta), D2 = e2.intersection(delta);
        let B1 = e1.intersection(beta), B2 = e2.intersection(beta);
        return { D1, D2, B1, B2, delta };
    }
    *baseJoin() {
        if (!this.data)
            return;
        let { D1, D2, B1, B2 } = this.baseJoinIntersections();
        if ((B1 === null || B1 === void 0 ? void 0 : B1.isIntegral) && (D2 === null || D2 === void 0 ? void 0 : D2.isIntegral) && !B1.eq(D2)) {
            if (!this.setupAnchor(D2))
                return;
            this.setupDetour([B1], [D2, B1]);
            yield this.result(true);
        }
        if ((B2 === null || B2 === void 0 ? void 0 : B2.isIntegral) && (D1 === null || D1 === void 0 ? void 0 : D1.isIntegral) && !B2.eq(D1)) {
            if (!this.setupAnchor(D1))
                return;
            this.setupDetour([D1, B2], [B2]);
            yield this.result();
        }
    }
    substituteEnd(e, p) {
        let [p1, p2] = e.xOrient();
        return new Line(p, this.joiner.oriented ? p2 : p1);
    }
    closestGridPoint(e, p) {
        let r, d = Number.POSITIVE_INFINITY;
        for (let i of e.gridPoints()) {
            let dist = i.dist(p);
            if (dist < d) {
                d = dist;
                r = i;
            }
        }
        return r;
    }
    *standardJoin() {
        if (!this.data)
            return;
        let { D1, D2, B1, B2, delta } = this.baseJoinIntersections();
        let { f } = this.data;
        if (B1 && D2 && !B1.eq(D2)) {
            if (D2.x * f > B1.x * f)
                yield* this.obtuseStandardJoin(B1, D2, 0);
            else
                yield* this.acuteStandardJoin(B1, D2, 1, delta);
        }
        if (B2 && D1 && !B2.eq(D1)) {
            if (D1.x * f > B2.x * f)
                yield* this.obtuseStandardJoin(B2, D1, 1);
            else
                yield* this.acuteStandardJoin(B2, D1, 0, delta);
        }
    }
    *obtuseStandardJoin(B, D, i) {
        if (B.isIntegral)
            return;
        let { e1, e2, p1, p2, pt, f } = this.data;
        let { cw } = this.joiner;
        let e = [e1, e2][i], p = [p1, p2][i];
        if (cw != (p1.direction.slope.gt(p2.direction.slope)))
            return;
        if (!this.setupAnchor(D))
            return;
        let P = D.sub(B).slope.gt(1) ? e.xIntersection(D.x) : e.yIntersection(D.y);
        let T = this.closestGridPoint(this.substituteEnd(e, B), D);
        if (T.eq(e.p1) || T.eq(e.p2))
            return;
        let R = PathUtil.triangleTransform([D, P, B], T);
        if (R.x * f < pt.x * f)
            return;
        this.data.addOns = [{
                contour: [D, T, R].map(p => p.toIPoint()),
                dir: new Line(T, R).reflect(p.direction).toIPoint()
            }];
        this.setupDetour([i == 0 ? T : D, R], [i == 0 ? D : T, R]);
        yield this.result(true, R.dist(T));
    }
    *acuteStandardJoin(B, D, i, delta) {
        if (D.isIntegral)
            return;
        let { e1, e2, p1, p2 } = this.data;
        let e = [e1, e2][i], p = [p1, p2][i];
        let T = this.closestGridPoint(this.substituteEnd(e, D), B);
        if (T.eq(e.p1) || T.eq(e.p2))
            return;
        let P = D.sub(B).slope.gt(1) ? delta.yIntersection(T.y) : delta.xIntersection(T.x);
        let R = PathUtil.triangleTransform([T, D, P], B);
        if (!this.setupAnchor(R))
            return;
        this.data.addOns = [{
                contour: [B, T, R].map(p => p.toIPoint()),
                dir: new Line(T, B).reflect(p.direction).toIPoint()
            }];
        this.setupDetour(i == 0 ? [T, B] : [B], i == 0 ? [B] : [T, B]);
        yield this.result(true, B.dist(T));
    }
    setupDetour(dt1, dt2) {
        let { p1, p2, v1, v2, pt1, pt2 } = this.data;
        let d1 = dt1.map(p => p.add(v1).toIPoint());
        d1.push(pt1);
        let d2 = dt2.map(p => p.add(v2).toIPoint());
        d2.push(pt2);
        (this.joiner.cw ? d2 : d1).reverse();
        p1.clearDetour();
        p1.addDetour(d1);
        p2.clearDetour();
        p2.addDetour(d2);
    }
    setupAnchor(a) {
        let { a1, a2, v1, v2, f } = this.data;
        let { oriented, cw } = this.joiner;
        if (a.x * f > this.deltaPt.x * f)
            return false;
        let left = oriented == cw;
        a1[left ? 3 : 1] = { location: a.add(v1).toIPoint() };
        a2[left ? 1 : 3] = { location: a.add(v2).toIPoint() };
        return true;
    }
    result(json = false, extraSize) {
        let { p1, p2, a1, a2, off1, off2, offset, size, addOns } = this.data;
        this.data.addOns = undefined;
        if (offset)
            off2 = { x: off2.x + offset.x, y: off2.y + offset.y };
        return [{
                gadgets: [
                    { pieces: [json ? p1.toJSON() : p1], offset: this.simplifyIPoint(off1), anchors: a1.concat() },
                    { pieces: [json ? p2.toJSON() : p2], offset: this.simplifyIPoint(off2), anchors: a2.concat() }
                ],
                addOns
            }, size + (extraSize !== null && extraSize !== void 0 ? extraSize : 0) * 10];
    }
    simplifyIPoint(p) {
        return p && p.x == 0 && p.y == 0 ? undefined : p;
    }
}
__decorate([
    onDemand
], JoinerCore.prototype, "deltaPt", null);
let Repository = class Repository extends Store {
    constructor(stretch, signature, option) {
        super(stretch.sheet);
        this.joinerCache = new Map();
        this.stretch = stretch;
        this.signature = signature;
        this.structure = JSON.parse(signature);
        this.generator = new Configurator(this, option).generate(() => this.joinerCache.clear());
    }
    builder(prototype) {
        return prototype;
    }
    get isActive() {
        return this.stretch.isActive && this.stretch.repository == this;
    }
    onMove() {
        this.stretch.selected = !(this.entry.entry.selected);
    }
    getJoiner(overlaps) {
        let key = JSON.stringify(overlaps);
        let j = this.joinerCache.get(key);
        if (!j)
            this.joinerCache.set(key, j = new Joiner(overlaps, this));
        return j;
    }
};
__decorate([
    shrewd
], Repository.prototype, "isActive", null);
Repository = __decorate([
    shrewd
], Repository);
var TreeMaker;
(function (TreeMaker) {
    function parse(title, data) {
        try {
            let v = new TreeMakerVisitor(data);
            let { result } = new TreeMakerParser(v);
            result.title = title;
            return result;
        }
        catch (e) {
            if (typeof e == "string")
                throw new Error(e);
            else
                throw new Error("plugin.TreeMaker.invalid");
        }
    }
    TreeMaker.parse = parse;
    class TreeMakerVisitor {
        constructor(data) {
            this.lines = data.split('\n').values();
        }
        get next() { return this.lines.next().value.trim(); }
        get int() { return parseInt(this.next); }
        get float() { return parseFloat(this.next); }
        get bool() { return this.next == "true"; }
        skip(n) { for (let i = 0; i < n; i++)
            this.lines.next(); }
        skipArray() { this.skip(this.int); }
    }
    class TreeMakerParser {
        constructor(v) {
            this.result = Migration.getSample();
            this.set = new Set();
            this._visitor = v;
            if (v.next != "tree" || v.next != "5.0")
                throw "plugin.TreeMaker.not5";
            let width = v.float, height = v.float;
            let scale = 1 / v.float;
            v.skip(11);
            let numNode = v.int, numEdge = v.int;
            v.skip(6);
            for (let i = 0; i < numNode; i++)
                this.parseNode();
            for (let i = 0; i < numEdge; i++)
                this.parseEdge();
            let fix = MathUtil.LCM(Array.from(this.set));
            let sw = Math.ceil(width * scale * fix - 0.25);
            let sh = Math.ceil(height * scale * fix - 0.25);
            if (sw < 8 || sh < 8)
                throw "plugin.TreeMaker.size8";
            let fx = sw / width;
            let fy = sh / height;
            for (let f of this.result.layout.flaps) {
                f.x = Math.round(f.x * fx);
                f.y = Math.round(f.y * fy);
            }
            for (let n of this.result.tree.nodes) {
                n.x = Math.round(n.x * fx);
                n.y = Math.round(n.y * fy);
            }
            for (let e of this.result.tree.edges) {
                e.length = Math.max(Math.round(e.length * fix), 1);
            }
            let sheet = { width: sw, height: sh, scale: 20 };
            this.result.layout.sheet = sheet;
            this.result.tree.sheet = sheet;
        }
        parseNode() {
            let v = this._visitor;
            if (v.next != "node")
                throw new Error();
            let vertex = {
                id: v.int,
                name: v.next,
                x: v.float,
                y: v.float,
            };
            v.skip(2);
            if (v.bool) {
                this.result.layout.flaps.push({
                    id: vertex.id,
                    x: vertex.x,
                    y: vertex.y,
                    height: 0,
                    width: 0
                });
            }
            this.result.tree.nodes.push(vertex);
            v.skip(6);
            v.skipArray();
            v.skipArray();
            v.skipArray();
            if (v.next == "1")
                v.next;
        }
        parseEdge() {
            let v = this._visitor;
            if (v.next != "edge")
                throw new Error();
            v.skip(2);
            let length = v.float;
            this.set.add(Number(Fraction.toFraction(length, 1, 0, 0.1).$denominator));
            this.result.tree.edges.push({
                length: length * (1 + v.float),
                n1: (v.skip(4), v.int),
                n2: v.int
            });
        }
    }
})(TreeMaker || (TreeMaker = {}));
function deepCopy(target, ...sources) {
    for (let s of sources)
        if (s instanceof Object) {
            let keys = Object.keys(s);
            for (let k of keys) {
                let v = s[k];
                if (v instanceof Object) {
                    if (target[k] instanceof Object &&
                        target[k] != v) {
                        target[k] = deepCopy(target[k], v);
                    }
                    else
                        target[k] = clone(v);
                }
                else {
                    target[k] = v;
                }
            }
        }
    return target;
}
function clone(source) {
    let r = source instanceof Array ? [] : {};
    return deepCopy(r, source);
}
var GeneratorUtil;
(function (GeneratorUtil) {
    function* first(generators, filter) {
        for (let generator of generators) {
            let found = false;
            for (let value of generator)
                if (filter(value)) {
                    yield value;
                    found = true;
                }
            if (found)
                return;
        }
    }
    GeneratorUtil.first = first;
    function* filter(generator, predicate) {
        for (let value of generator)
            if (predicate(value))
                yield value;
    }
    GeneratorUtil.filter = filter;
})(GeneratorUtil || (GeneratorUtil = {}));
var LabelUtil;
(function (LabelUtil) {
    let cache = new WeakMap();
    function offsetLabel(label, lx, ly, lh, dx, dy) {
        label.justification = dx == 0 ? "center" : dx == 1 ? "left" : "right";
        let oy = dy == 0 ? -lh / 5 : dy == -1 ? -lh / 2 : 0;
        let l = Math.sqrt(dx * dx + dy * dy);
        let d = l == 0 ? 0 : lh / 2 / l;
        label.point.set(lx + dx * d, ly - dy * d - oy);
    }
    function setLabel(sheet, label, glow, pt, ...avoid) {
        glow.content = label.content;
        if (!label.content)
            return;
        let x = pt.x, y = pt.y;
        let ss = sheet.displayScale, sw = sheet.width, sh = sheet.height;
        let lh = label.bounds.height;
        let lx = x * ss, ly = -y * ss;
        if (x == 0 || y == 0 || x == sw || y == sh) {
            let dx = x == 0 ? -1 : x == sw ? 1 : 0;
            let dy = y == 0 ? -1 : y == sh ? 1 : 0;
            offsetLabel(label, lx, ly, lh, dx, dy);
        }
        else {
            slowLabel(label, lx, ly, lh, avoid);
        }
        syncLabel(label, glow);
    }
    LabelUtil.setLabel = setLabel;
    function syncLabel(label, glow) {
        glow.point.set(label.point);
        glow.justification = label.justification;
    }
    function slowLabel(label, lx, ly, lh, avoid) {
        let arr = [[0, 0], [0, -1], [-1, 0], [0, 1], [1, 0], [-1, -1], [-1, 1], [1, 1], [1, -1]];
        let clone = avoid.map(a => {
            let c = a.clone({ insert: false });
            if (a.layer)
                c.transform(a.layer.matrix);
            return c;
        });
        let dx = 0, dy = 0;
        for ([dx, dy] of arr) {
            offsetLabel(label, lx, ly, lh, dx, dy);
            let rec = new paper.Path.Rectangle(label.bounds);
            if (label.layer)
                rec.transform(label.layer.matrix);
            let ok = clone.every(c => {
                let i1 = rec.intersect(c, { insert: false }).isEmpty();
                let i2 = !rec.intersects(c);
                return i1 && i2;
            });
            if (ok)
                break;
        }
        cache.set(label, {
            dx, dy, timeout: undefined
        });
    }
})(LabelUtil || (LabelUtil = {}));
var MathUtil;
(function (MathUtil) {
    function GCD(a, b) {
        if (typeof a == 'number' && !Number.isSafeInteger(a))
            throw new Error("Not a safe integer: " + a);
        if (typeof b == 'number' && !Number.isSafeInteger(b))
            throw new Error("Not a safe integer: " + b);
        if (a == 0 && b == 0)
            throw new Error("Input cannot be both zero");
        if (a < 0)
            a = -a;
        if (b < 0)
            b = -b;
        while (a && b) {
            a %= b;
            if (a)
                b %= a;
        }
        return a ? a : b;
    }
    MathUtil.GCD = GCD;
    function LCM(list) {
        let lcm = list[0];
        for (let i = 1; i < list.length; i++) {
            let gcd = GCD(lcm, list[i]);
            lcm = lcm * list[i] / gcd;
        }
        return lcm;
    }
    MathUtil.LCM = LCM;
    function reduce(a, b) {
        if (typeof a == 'number' && !Number.isInteger(a) || typeof b == 'number' && !Number.isInteger(b)) {
            let af = new Fraction(a), bf = new Fraction(b);
            a = Number(af.$numerator * bf.$denominator);
            b = Number(af.$denominator * bf.$numerator);
        }
        let gcd = this.GCD(a, b);
        return [a / gcd, b / gcd];
    }
    MathUtil.reduce = reduce;
    function int(x, f) {
        return f > 0 ? Math.ceil(x) : Math.floor(x);
    }
    MathUtil.int = int;
})(MathUtil || (MathUtil = {}));
var PaperUtil;
(function (PaperUtil) {
    function replaceContent(target, source, clone) {
        target.removeChildren();
        if (source instanceof paper.CompoundPath)
            target.copyContent(source);
        else {
            if (clone)
                source = source.clone({ insert: false });
            target.addChild(source);
        }
    }
    PaperUtil.replaceContent = replaceContent;
    function setRectangleSize(rect, width, height) {
        rect.segments[1].point.set(width, 0);
        rect.segments[2].point.set(width, height);
        rect.segments[3].point.set(0, height);
    }
    PaperUtil.setRectangleSize = setRectangleSize;
    function addLine(path, p1, p2) {
        if (p1 instanceof Point)
            p1 = p1.toPaper();
        if (p2 instanceof Point)
            p2 = p2.toPaper();
        path.moveTo(p1);
        path.lineTo(p2);
    }
    PaperUtil.addLine = addLine;
    function setLines(path, ...lines) {
        path.removeChildren();
        for (let set of lines)
            for (let l of set)
                PaperUtil.addLine(path, l.p1, l.p2);
    }
    PaperUtil.setLines = setLines;
    let black, red;
    function Black() { return (black = black || new paper.Color('black')); }
    PaperUtil.Black = Black;
    function Red() { return (red = red || new paper.Color('red')); }
    PaperUtil.Red = Red;
})(PaperUtil || (PaperUtil = {}));
let DeviceView = class DeviceView extends ControlView {
    constructor(device) {
        super(device);
        this.$addItem(Layer.axisParallel, this._axisParallels = new paper.CompoundPath(Style.axisParallel));
        this.$addItem(Layer.ridge, this._ridges = new paper.CompoundPath(Style.ridge));
        this.$addItem(Layer.shade, this._shade = new paper.CompoundPath(Style.shade));
    }
    contains(point) {
        return this._shade.contains(point);
    }
    render() {
        let path = null;
        for (let r of this.control.regions) {
            let cPath = this.contourToPath(r.shape.contour);
            if (!path)
                path = cPath;
            else
                path = path.unite(cPath, { insert: false });
        }
        PaperUtil.replaceContent(this._shade, path, false);
        PaperUtil.setLines(this._ridges, this.control.ridges, this.control.outerRidges);
        PaperUtil.setLines(this._axisParallels, this.control.axisParallels);
    }
    contourToPath(contour) {
        let path = new paper.Path({ closed: true });
        let { fx, fy } = this.control.pattern.stretch;
        let delta = this.control.delta;
        contour.forEach(c => path.add(c.transform(fx, fy).add(delta).toPaper()));
        return path;
    }
    renderSelection(selected) {
        this._shade.visible = selected || this.control.pattern.configuration.repository.stretch.selected;
    }
};
DeviceView = __decorate([
    shrewd
], DeviceView);

//# sourceMappingURL=bpstudio.js.map
