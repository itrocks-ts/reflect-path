import { KeyOf } from '@itrocks/class-type'

type NonNullish<T> = Exclude<T, null | undefined>

export type SplitPath<S extends string> =
	S extends `${infer Head}.${infer Tail}`
		? [Head, ...SplitPath<Tail>]
		: [S]

type TuplePath<T> =
	T extends object
		? {
			[K in KeyOf<T>]:
			| readonly [K]
			| (NonNullish<T[K]> extends object
			? readonly [K, ...TuplePath<NonNullish<T[K]>>]
			: readonly [K])
		}[KeyOf<T>]
		: never

type DotPath<T> =
	T extends object
		? {
			[K in KeyOf<T>]:
			| K
			| (NonNullish<T[K]> extends object
			? `${K}.${DotPath<NonNullish<T[K]>>}`
			: K)
		}[KeyOf<T>]
		: never

export type PathInput<T> =
	| DotPath<T>
	| TuplePath<T>

type PathValueFromTuple<T, P extends readonly string[]> =
	P extends readonly [infer Head extends KeyOf<T>, ...infer Tail extends readonly string[]]
		? Tail['length'] extends 0
			? T[Head]
			: PathValueFromTuple<NonNullish<T[Head]>, Tail>
		: never

export type PathValue<T, P extends PathInput<T>> =
	P extends string
		? PathValueFromTuple<T, SplitPath<P>>
		: P extends readonly string[]
			? PathValueFromTuple<T, P>
			: never
