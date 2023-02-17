import { Task } from "./task";
import { climb } from "./climb";
import { State } from "core/service/state";
import { AAUnion } from "core/math/polyBool/union/aaUnion";
import { expand } from "core/math/polyBool/expansion";

import type { ITreeNode } from "../context";
import type { TreeNode } from "../context/treeNode";

//=================================================================
/**
 * {@link roughContourTask} updates {@link TreeNode.$outerRoughContour}
 * and {@link TreeNode.$innerRoughContour}。
 */
//=================================================================
export const roughContourTask = new Task(roughContour);

const union = new AAUnion();

function roughContour(): void {
	climb(updater,
		State.$flapAABBChanged,
		State.$parentChanged,
		State.$childrenChanged,
		State.$lengthChanged
	);
}

function updater(tn: ITreeNode): boolean {
	const node = tn as TreeNode;
	if(!node.$parent) return false;
	if(node.$isLeaf) {
		const path = node.$AABB.$toPath();
		node.$outerRoughContour = [path];
		const contours = [{ outer: path }];
		State.$updateResult.graphics["f" + node.id] = { contours };
	} else {
		const components = [...node.$children].map(n => n.$outerRoughContour);
		const inner = union.$get(...components);
		node.$innerRoughContour = inner;
		const contours = expand(inner, node.$length);
		node.$outerRoughContour = contours.map(c => c.outer);
		State.$updateResult.graphics[node.$riverTag] = { contours };
	}
	return true;
}
