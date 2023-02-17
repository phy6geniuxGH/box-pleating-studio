import { HeapSet } from "shared/data/heap/heapSet";

import type { ITreeNode } from "../context";
import type { distanceTask } from "./distance";
import type { heightTask } from "./height";

/**
 * A subroutine for updating the tree bottom-up.
 *
 * In principle, all tasks that uses this subroutine should depend
 * on {@link distanceTask}, since it relies on the updated {@link TreeNode.$dist}
 * to perform the sorting of nodes; but one exception is {@link heightTask},
 * which uses the {@link TreeNode.$dist} before updating instead.
 *
 * @param set The initial set of nodes for updating.
 * @param updater A function that returns boolean value
 * indicating whether to further process the parent node.
 */
export function climb<T extends ITreeNode>(updater: Predicate<T>, ...sets: ReadonlySet<T>[]): void {
	const total = sets.reduce((v, s) => v + s.size, 0);
	if(total === 0) return;
	if(total === 1) {
		// Single thread updating
		let n = sets.find(s => s.size === 1)!.values().next().value;
		while(updater(n) && n.$parent) n = n.$parent as T;
	} else {
		// Initializing
		const heap = new HeapSet<T>((a, b) => b.$dist - a.$dist);
		for(const set of sets) {
			for(const n of set) heap.$insert(n);
		}

		// Climb the tree
		while(!heap.$isEmpty) {
			const n = heap.$pop()!;
			if(updater(n) && n.$parent) heap.$insert(n.$parent as T);
		}
	}
}
