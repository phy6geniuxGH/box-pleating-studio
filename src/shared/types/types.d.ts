
export type DirectionKey = "up" | "down" | "left" | "right";

/**
 * {@link Comparator} is a function that defines a total-order.
 *
 * It returns a positive value if `a > b`, a negative value if `a < b`, and zero if `a == b`.
 */
export type Comparator<T> = (a: T, b: T) => number;
