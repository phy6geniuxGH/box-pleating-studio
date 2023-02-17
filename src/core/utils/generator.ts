
//=================================================================
/**
 * Utility methods for {@link Generator}.
 */
//=================================================================

export namespace GeneratorUtil {

	/**
	 * Execute given {@link Generator}s in order,
	 * and once one of them yields something that passes the filter,
	 * remaining {@link Generator}s will not be execute further.
	 */
	export function* $first<T>(generators: Generator<T>[], filter: Predicate<T>): Generator<T> {
		for(const generator of generators) {
			let found = false;
			for(const value of generator) {
				if(filter(value)) {
					yield value;
					found = true;
				}
			}
			if(found) return;
		}
	}

	/** Filter the result of a {@link Generator} by the given predicate. */
	export function* $filter<T>(generator: Generator<T>, predicate: Predicate<T>): Generator<T> {
		for(const value of generator) if(predicate(value)) yield value;
	}
}
