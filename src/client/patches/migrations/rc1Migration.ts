import { CornerType } from "shared/json";

import type { JConfiguration, JCorner, JProject, JGadget, JOverlap, JPartition, JPattern, JStretch, Strategy, JLayout } from "shared/json";

/** Version rc1 adds {@link Partition} and {@link Device}. */
export default function $process(proj: Pseudo<JProject>): boolean {
	const st = (proj.layout as JLayout)?.stretches as Pseudo<JStretch>[];
	if(st) {
		for(const s of st.concat()) {
			const cf = s.configuration as Pseudo<JConfiguration>;
			if(cf) pattern(cf, s);
		}
	}
	return false;
}

function pattern(cf: Pseudo<JConfiguration>, s: Pseudo<JStretch>): void {
	s.configuration = {
		partitions: partition(cf.overlaps as JOverlap[], cf.strategy as Strategy),
	};
	const pt = s.pattern as Pseudo<JPattern>;
	if(pt) {
		const offsets = pt.offsets as number[] | undefined;
		// Patterns generated by rc0 only has two possibilities: single device,
		// or multiple devices having single gadget each.
		if(s.configuration.partitions!.length == 1) {
			s.pattern = {
				devices: [{
					gadgets: pt.gadgets as JGadget[],
					offset: offsets?.[0],
				}],
			};
		} else {
			s.pattern = {
				devices: (pt.gadgets as JGadget[]).map((g: JGadget, i: number) => ({
					gadgets: [g],
					offset: offsets?.[i],
				})),
			};
		}
	}
}

function cornerFilter(c: JCorner): boolean {
	return c.type == CornerType.$coincide;
}

function partition(overlaps: JOverlap[], strategy?: Strategy): JPartition[] {
	const partitions: JOverlap[][] = [];
	const partitionMap = new Map<number, number>();

	for(const [i, o] of overlaps.entries()) {
		// Skip those that are already added.
		if(partitionMap.has(i)) continue;

		// Find all coincide anchors.
		const coins = o.c.filter(cornerFilter);

		const coin = coins.find(c => partitionMap.has(-c.e! - 1));
		const j = partitions.length;

		if(coin) {
			// If any of the coincide anchors has already been added,
			// and this to the same group.
			const k = partitionMap.get(-coin.e! - 1)!;
			partitionMap.set(i, k);
			partitions[k].push(o);
		} else {
			// Otherwise this will be the first member of a new group
			partitionMap.set(i, j);
			partitions.push([o]);
		}

		// Add remaining coincided anchors to the group
		coins.forEach(c => {
			const e = -c.e! - 1;
			if(!partitionMap.has(e)) {
				partitionMap.set(e, j);
				partitions[j].push(overlaps[e]);
			}
		});
	}
	return partitions.map<JPartition>(p => ({ overlaps: p, strategy }));
}
