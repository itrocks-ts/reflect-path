import { KeyOf } from '@itrocks/class-type'

// --- Types pour manipuler ['property', 'path'] et le type de l'avant-dernière propriété

type ObjectOf<T> = Extract<T, object>
type Path        = readonly string[]

export type LastKey<R extends object, P extends Path> =
	P extends readonly [...infer _, infer K]
		? K & KeyOf<SecondToLastObject<R, P>>
		: never

export type LastValue<R extends object, P extends Path> =
	SecondToLastObject<R, P> extends infer O extends object
		? LastKey<R, P> extends keyof O
			? O[LastKey<R, P>]
			: never
		: never

export type PropertyPathArray<R extends object> = {
	[K in KeyOf<R>]:
	| readonly [K]
	| (ObjectOf<R[K]> extends infer Next extends object
		? readonly [K, ...PropertyPathArray<Next>]
		: never)
}[KeyOf<R>]

export type SecondToLastKey<_R extends object, P extends Path> =
	P extends readonly [...infer _, infer K extends string, infer _Last]
		? K
		: never

export type SecondToLastObject<R extends object, P extends Path> =
	P extends readonly [infer _]
		? R
		: P extends readonly [infer K extends KeyOf<R>, ...infer Rest extends Path]
			? ObjectOf<R[K]> extends infer Next extends object
				? SecondToLastObject<Next, Rest>
				: never
			: never
