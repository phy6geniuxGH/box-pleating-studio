import { Pattern } from "../pattern/pattern";
import { Device } from "../pattern/device";

import type { Configuration } from "../configuration";
import type { JConfiguration, JDevice } from "shared/json";
import type { Partition } from "../partition";

//=================================================================
/**
 * {@link patternGenerator} takes the {@link JDevice}s generated by {@link Partition}s
 * and combine them into {@link Pattern}s.
 */
//=================================================================
export function* patternGenerator(config: Configuration, proto?: JConfiguration): Generator<Pattern> {

	let protoSignature: string | undefined;
	if(proto && proto.patterns && proto.patterns.length) {
		if(typeof proto.index == "number") {
			for(const pattern of proto.patterns) {
				yield new Pattern(config, pattern.devices, true);
			}
			return;
		}

		const pattern = new Pattern(config, proto.patterns[0].devices, true);
		if(pattern.$valid) {
			const devices = pattern.$devices.map(device => device.toJSON());
			protoSignature = Device.$getSignature(devices);
			yield pattern;
		}
	}

	// Search for patterns
	const buffer: JDevice[] = new Array(config.$partitions.length);
	for(const devices of recursiveDeviceGenerator(config.$partitions, 0, buffer)) {
		// Compare and skip prototype pattern
		if(protoSignature) {
			const signature = Device.$getSignature(devices);
			if(signature == protoSignature) {
				protoSignature = undefined; // No need to compare further
				continue;
			}
		}
		const pattern = new Pattern(config, devices);
		if(pattern.$valid) yield pattern;
	}
}

function* recursiveDeviceGenerator(
	partitions: readonly Partition[], depth: number, buffer: JDevice[]
): Generator<JDevice[]> {
	const partition = partitions[depth];
	for(const device of partition.$devices.$values()) {
		buffer[depth] = device;
		if(depth + 1 < partitions.length) {
			yield* recursiveDeviceGenerator(partitions, depth + 1, buffer);
		} else {
			yield buffer.concat();
		}
	}
}
