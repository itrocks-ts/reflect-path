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

export type SecondToLastKey<R extends object, P extends Path> =
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

// --- Classe de reflection

export class ReflectPropertyPath<
	R extends object,
	P extends Path
>
{
	name:   LastKey<R, P>
	object: SecondToLastObject<R, P>
	root:   R
	path:   P

	constructor(root: R, propertyPath: P)
	{
		this.path  = propertyPath
		this.root  = root

		const lastKeyIndex = propertyPath.length - 1
		this.name = propertyPath[lastKeyIndex] as any

		let object: object = root
		for (let i = 0; i < lastKeyIndex; i++) {
			object = (object as Record<string, object>)[propertyPath[i]]
		}
		this.object = object as SecondToLastObject<R, P>
	}

}

// --- Tests

class Country { name!:    string }
class City    { name!:    string; country!: Country }
class Address { address!: string; city!:    City    }
class Client  { name!:    string; address!: Address }
class Order   { amount!:  number; client!:  Client  }

const path1: PropertyPathArray<Order> = ['client', 'address']
const path2: PropertyPathArray<Order> = ['client', 'address', 'city', 'country', 'name']
// @ts-expect-error - 'invalid' is not a property of Order
const path3: PropertyPathArray<Order> = ['invalid']

const fullPath = ['client', 'address', 'city', 'country', 'name'] as const

let lastKey: LastKey<Order, typeof fullPath>
lastKey = 'name' // Only 'name' should be accepted

let lastValue: LastValue<Order, typeof fullPath>
lastValue = 'any country name' // Any string should be accepted

let secondToLastKey: SecondToLastKey<Order, typeof fullPath>
secondToLastKey = 'country' // Only 'country' should be accepted

let secondToLastObject: SecondToLastObject<Order, typeof fullPath>
secondToLastObject = new Country // Only a Country object should be accepted

console.log(path1)
console.log(path2)
console.log(path3)

console.log(fullPath)           // => ['client', 'address', 'city', 'country', 'name']
console.log(lastKey)            // => 'name'
console.log(lastValue)          // => 'any country name'
console.log(secondToLastKey)    // => 'country'
console.log(secondToLastObject) // => the empty Country object

const order: Order = Object.assign(Object.create(Order), {
	amount: 100,
	client: Object.assign(Object.create(Client), {
		name: 'client',
		address: Object.assign(Object.create(Address), {
			address: 'address',
			city: Object.assign(Object.create(City), {
				name: 'city',
				country: Object.assign(Object.create(Country), {
					name: 'country'
				})
			})
		})
	})
})

const property = new ReflectPropertyPath(order, ['client', 'address', 'city', 'country'] as const)

// L'auto-complétion de type de property devrait donner ReflectPropertyPath<Order, City>, dans l'idéal
// L'auto-complétion de property.object devrait donner un City
// L'auto-complétion de property.root devrait donner un Order

console.log(property.name)   // => 'country'
console.log(property.object) // => the City object
console.log(property.root)   // => the Order object
console.log(property.path)   // => ['client', 'address', 'city', 'country']
