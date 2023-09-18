import { AAUnion } from "core/math/polyBool/union/aaUnion";
import { ExChainer } from "core/math/polyBool/chainer/exChainer";
import { windingNumber } from "core/math/geometry/winding";
import { deduplicate } from "core/math/geometry/path";

import type { RoughContourContext } from "./roughContourContext";
import type { RoughContour } from "core/design/context";
import type { Path, PathEx, Polygon } from "shared/types/geometry";

const union = new AAUnion();
const expander = new AAUnion(true, new ExChainer());

/**
 * Expand the given AA polygon by given units, and generate contours matching outer and inner paths.
 */
export function expand(context: RoughContourContext): RoughContour[] {
	const inputPolygons: PathEx[] = union.$get(...context.$components);
	const expandedPolygons: PathEx[][] = inputPolygons.map(path => [expandPath(path, context.$node.$length)]);

	const result = expander.$get(...expandedPolygons).map(simplify);
	if(!context.$checkCriticalCorners(result)) return createRaw(expandedPolygons, inputPolygons);

	const pathRemain = new Set(Array.from({ length: expandedPolygons.length }, (_, i) => i));
	const contours: RoughContour[] = [];
	const newHoles: PathEx[] = [];
	for(const path of result) {
		const from = path.from!;
		let holeIndex = -1;
		const inner = from.map((n, i) => {
			pathRemain.delete(n);
			const input = inputPolygons[n];
			if(expandedPolygons[n][0].isHole) {
				holeIndex = i;
				input.isHole = true;
			}
			return input;
		});

		const isFromHole = holeIndex >= 0;
		if(!isFromHole && isClockwise(path)) {
			newHoles.push(path);
		} else if(isFromHole && span(path) > span(inner[holeIndex])) {
			// In this case a hole was over-shrunk and ended up even bigger.
			// We need to treat it as a simple filling.
			//TODO: why?
			// contours.push({ outer: inner[0].toReversed() });
		} else {
			contours.push({ $outer: path, $inner: inner, $leaves: [] });
		}
	}

	// Decide where the newly created holes should go
	for(const path of newHoles) {
		const contour = contours.find(c => windingNumber(path[0], c.$outer) != 0);
		if(contour) (contour.$inner ||= []).push(path);
	}

	// The remaining paths are the holes that vanishes after expansion.
	// We add those back.
	for(const n of pathRemain) {
		contours.push({ $outer: [], $inner: [inputPolygons[n]], $leaves: [] });
	}

	return contours;
}

/**
 * If some of the quadrant corners are missing in the union,
 * our tracing algorithm will likely go wrong,
 * so the best we can do in this case is not taking the union
 * but keeping the expanded path as they are.
 */
function createRaw(expandedPolygons: Polygon[], input: Polygon): RoughContour[] {
	const result: RoughContour[] = [];
	for(const [i, p] of expandedPolygons.entries()) {
		if(p.length == 0) continue;
		const paths = expander.$get(p).map(simplify);
		const outer = paths.length == 1 ? paths[0] : paths.find(path => !isClockwise(path))!;
		result.push({ $outer: outer, $inner: [input[i]], $raw: true, $leaves: [] });
	}
	return result;
}

/**
 * Expand a given {@link Path} by given units.
 * At the same time, determine if the path is a hole.
 *
 * The method of determining is simple:
 * if the point with the smallest x value shifts towards the right,
 * then then path is a hole.
 */
function expandPath(path: PathEx, units: number): PathEx {
	const l = path.length;
	const result: PathEx = [];
	let minX = Number.POSITIVE_INFINITY, minXDelta: number = 0;
	for(let i = 0, j = l - 1; i < l; j = i++) {
		// Decide the direction of shifting.
		// Here we assume that the polygon is non-degenerated.
		const p = path[i];
		const p1 = path[j], p2 = path[i + 1] || path[0];
		const dx = Math.sign(p2.y - p1.y) * units;
		const dy = Math.sign(p1.x - p2.x) * units;
		if(p.x < minX) {
			minX = p.x;
			minXDelta = dx;
		}
		result.push({ x: p.x + dx, y: p.y + dy });
	}
	if(minXDelta > 0) result.isHole = true;
	return result;
}

/** Returns the width span of a given {@link Path} */
function span(path: Path): number {
	const l = path.length;
	let minX = Number.POSITIVE_INFINITY, maxX = Number.NEGATIVE_INFINITY;
	for(let i = 0; i < l; i++) {
		const p = path[i];
		if(p.x < minX) minX = p.x;
		if(p.x > maxX) maxX = p.x;
	}
	return maxX - minX;
}

/**
 * In our use cases, it is often implicitly assumed that each vertex of a path
 * is actually a turning corner. This function removes the non-turning
 * vertices in the path, to prevent potential bugs in tracing logics.
 */
function simplify(path: PathEx): PathEx {
	if(!path) return [];
	// First we need to remove duplicate vertices,
	// or the next step won't work correctly.
	const deduplicated = deduplicate(path);

	// Then we can check the turning condition.
	const l = deduplicated.length;
	deduplicated.push(deduplicated[0]);
	const result: PathEx = [];
	for(let i = 0, j = l - 1; i < l; j = i++) {
		const prev = deduplicated[j];
		const next = deduplicated[i + 1];
		const dx = next.x - prev.x, dy = next.y - prev.y;
		if(dx != 0 && dy != 0) result.push(deduplicated[i]);
	}
	result.from = path.from;
	return result;
}

/**
 * The algorithm is much like {@link expandPath} but faster.
 */
function isClockwise(path: PathEx): boolean {
	const l = path.length;
	let minX = Number.POSITIVE_INFINITY, minXDelta: number = 0;
	for(let i = 0, j = l - 1; i < l; j = i++) {
		const p = path[i];
		if(p.x < minX) {
			minX = p.x;
			const p1 = path[j], p2 = path[i + 1] || path[0];
			const dx = p2.y - p1.y;
			minXDelta = dx;
		}
	}
	return minXDelta > 0;
}
