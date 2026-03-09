import { KeyOf } from '@itrocks/class-type'

// --- Types pour manipuler ['property', 'path'] et le type de l'avant-dernière propriété

type ObjectOf<T> = Extract<T, object>
type Path        = readonly string[]

export type LastKey<R extends object, P extends Path> =
	P extends readonly [...infer _, infer K]
		? K & KeyOf<SecondToLastObject<R, P>>
		: never

export type LastValue<R extends object, P extends Path> =
	SecondToLastObject<R, P>[LastKey<R, P>]

export type PropertyPathArray<R extends object, T extends object = object> = {
	[K in KeyOf<R>]:
	| (R extends T ? readonly [K] : never)
	| (ObjectOf<R[K]> extends never ? never : readonly [K, ...PropertyPathArray<ObjectOf<R[K]>, T>])
}[KeyOf<R>]

export type SecondToLastKey<R extends object, P extends Path> =
	P extends readonly [...infer _, infer K extends string, infer _Last extends string]
		? K
		: never

export type SecondToLastObject<R extends object, P extends Path> =
	P extends readonly [infer K extends KeyOf<R>]
		? R
		: P extends readonly [infer K extends KeyOf<R>, ...infer Rest extends Path]
			? ObjectOf<R[K]> extends infer Next extends object
				? SecondToLastObject<Next, Rest>
				: never
			: never

// --- Classe de reflection

class ReflectPropertyPath<
	R extends object,
	P extends PropertyPathArray<R, P>,
	O extends object = SecondToLastObject<R, P>,
	K extends KeyOf<O> = LastKey<R, P>
>
{
	name:   K
	object: O
	root:   R
	path:   P

	constructor(root: R, propertyPath: P)
	{
		this.name  = propertyPath[propertyPath.length - 1] as K
		this.path  = propertyPath
		this.root  = root
		let object: object = root
		for (const propertyName of propertyPath.slice(0, -1) as Path) {
			object = (object as Record<string, object>)[propertyName]
		}
		this.object = object as O
	}

}

// --- Tests

class Country { name!:    string }
class City    { name!:    string; country!: Country }
class Address { address!: string; city!:    City    }
class Client  { name!:    string; address!: Address }
class Order   { amount!:  number; client!:  Client  }

const propertyPath: PropertyPathArray<Order> = ['client', 'address', 'city', 'country', 'name']

let lastKey: LastKey<Order, typeof propertyPath>
lastKey = 'name' // Only 'name' should be accepted

let lastValue: LastValue<Order, typeof propertyPath>
lastValue = 'any country name' // Any string should be accepted

let secondToLastKey: SecondToLastKey<Order, typeof propertyPath>
secondToLastKey = 'country' // Only 'country' should be accepted

let secondToLastObject: SecondToLastObject<Order, typeof propertyPath>
secondToLastObject = new Country // Only a Country object should be accepted

console.log(propertyPath)       // => ['client', 'address', 'city', 'country', 'name']
console.log(lastKey)            // => 'name'
console.log(lastValue)          // => 'any country name'
console.log(secondToLastKey)    // => 'country'
console.log(secondToLastObject) // => the empty Country object

const order = Object.assign(Object.create(Order), {
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

const property = new ReflectPropertyPath(order, ['client', 'address', 'city', 'country'])

// L'auto-complétion de type de property devrait donner ReflectPropertyPath<Order, City>, dans l'idéal
// L'auto-complétion de property.object devrait donner un City
// L'auto-complétion de property.root devrait donner un Order

console.log(property.name)   // => 'country'
console.log(property.object) // => the City object
console.log(property.root)   // => the Order object
console.log(property.path)   // => ['client', 'address', 'city', 'country']
