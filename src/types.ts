
export type KeyOf<T extends object> = Extract<keyof T, string>

export type LastKey<R extends object, P extends Path | string> =
	P extends Path
		? LastKeyArray<R, P>
		: P extends string
			? LastKeyString<R, P>
			: never

export type LastKeyArray<R extends object, P extends Path> =
	P extends readonly [...infer _, infer K]
		? K & KeyOf<SecondToLastObjectArray<R, P>>
		: never

export type LastKeyString<R extends object, P extends string> =
	P extends `${infer K}.${infer Rest}`
		? K extends keyof R
			? LastKeyString<ObjectOf<R[K]>, Rest>
			: never
		: P & KeyOf<R>

export type LastValue<R extends object, P extends Path | string> =
	P extends Path
		? LastValueArray<R, P>
		: P extends string
			? LastValueString<R, P>
			: never

export type LastValueArray<R extends object, P extends Path> =
	SecondToLastObjectArray<R, P> extends infer O extends object
		? LastKeyArray<R, P> extends keyof O
			? O[LastKeyArray<R, P>]
			: never
		: never

export type LastValueString<R extends object, P extends string> =
	P extends `${infer K}.${infer Rest}`
		? K extends keyof R
			? ObjectOf<R[K]> extends infer Next extends object
				? LastValueString<Next, Rest>
				: never
			: never
		: P extends keyof R
			? R[P]
			: never

type ObjectOf<T> =
	Extract<T, object>

type Path =
	readonly string[]

export type PropertyPath<R extends object> =
	PropertyPathArray<R> | PropertyPathString<R>

export type PropertyPathArray<R extends object> = {
	[K in KeyOf<R>]:
	| readonly [K]
	| (ObjectOf<R[K]> extends infer Next extends object
		? readonly [K, ...PropertyPathArray<Next>]
		: never)
}[KeyOf<R>]

export type PropertyPathString<R extends object> =
{
	[K in KeyOf<R>]:
	| K
	| (ObjectOf<R[K]> extends infer Next extends object
		? `${K}.${PropertyPathString<Next>}`
		: never)
}[KeyOf<R>]

export type SecondToLastKey<R extends object, P extends Path | string> =
	P extends Path
		? SecondToLastKeyArray<R, P>
		: P extends string
			? SecondToLastKeyString<R, P>
			: never

export type SecondToLastKeyArray<_R extends object, P extends Path> =
	P extends readonly [...infer _, infer K extends string, infer _Last]
		? K
		: never

export type SecondToLastKeyString<R extends object, P extends string> =
	Split<P> extends infer S extends Path
		? SecondToLastKeyArray<R, S>
		: never

export type SecondToLastObject<R extends object, P extends Path | string> =
	P extends Path
		? SecondToLastObjectArray<R, P>
		: P extends string
			? SecondToLastObjectString<R, P>
			: never

export type SecondToLastObjectArray<R extends object, P extends Path> =
	P extends readonly [infer _]
		? R
		: P extends readonly [infer K extends keyof R, ...infer Rest extends Path]
			? ObjectOf<R[K]> extends infer Next extends object
				? SecondToLastObjectArray<Next, Rest>
				: never
			: never

export type SecondToLastObjectString<R extends object, P extends string> =
	SecondToLastObjectArray<R, Split<P>>

type Split<S extends string> =
	S extends `${infer T}.${infer U}`
		? [T, ...Split<U>]
		: [S]
