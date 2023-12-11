import { Tree } from "core/design/context/tree";
import { heightTask } from "core/design/tasks/height";
import { Processor } from "core/service/processor";
import { State, fullReset } from "core/service/state";

import type { TreeNode } from "core/design/context/treeNode";
import type { JEdge, JFlap, NodeId } from "shared/json";

export const id0 = 0 as NodeId;
export const id1 = 1 as NodeId;
export const id2 = 2 as NodeId;
export const id3 = 3 as NodeId;
export const id4 = 4 as NodeId;
export const id6 = 6 as NodeId;

type Substitute<T, T1, T2> = {
	[k in keyof T]: T[k] extends T1 ? T2 : T[k];
};

export type NEdge = Substitute<JEdge, NodeId, number>;
export type NFlap = Substitute<JFlap, NodeId, number>;

export function createTree(edges: NEdge[], flaps?: NFlap[]): Tree {
	fullReset();
	const tree = new Tree(edges as JEdge[], flaps as JFlap[]);
	State.$tree = tree;
	Processor.$run(heightTask);
	return tree;
}

export function node(id: number): TreeNode | undefined {
	return State.$tree.$nodes[id as NodeId];
}
