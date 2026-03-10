import { KeyOf }              from '@itrocks/class-type'
import { ObjectOrType }       from '@itrocks/class-type'
import { Type }               from '@itrocks/class-type'
import { TypeType }           from '@itrocks/property-type'
import { ReflectClass }       from '@itrocks/reflect'
import { ReflectProperty }    from '@itrocks/reflect'
import { PropertyPath }       from './types'
import { PropertyPathArray }  from './types'
import { SecondToLastObject } from './types'

export class ReflectPropertyPath<
	R extends object,
	P extends PropertyPath<R>,
	T extends SecondToLastObject<R, P>,
	K extends KeyOf<SecondToLastObject<R, P>>
>
	extends ReflectProperty<T, K>
{
	declare readonly name: K
	readonly path:      PropertyPathArray<R>
	readonly rootClass: ReflectClass<R>

	constructor(object: R | ReflectClass<R> | Type<R>, path: P)
	{
		const pathArray = ((typeof path === 'string') ? path.split('.') : path) as PropertyPathArray<R>
		const rootClass = (object instanceof ReflectClass) ? object : new ReflectClass(object)
		const lastKey   = pathArray.length - 1

		let property: ReflectProperty<any, any> = new ReflectProperty(rootClass, pathArray[0])
		let subObject = ((object instanceof ReflectClass) ? (object.object ?? object.type) : object) as ObjectOrType

		for (let key = 1; key < lastKey; key ++) {
			const propertyType = property.type
			if (!(propertyType instanceof TypeType)) {
				throw 'Bad property type for ' + property.name + ' in ' + rootClass.name + ':' + pathArray.join('.')
			}
			const value = property.value
			subObject   = (typeof value === 'object') ? (value as object) : (propertyType.type as Type)
			property    = new ReflectProperty(subObject, pathArray[key] as KeyOf<typeof subObject>)
		}

		super(subObject as T, pathArray[lastKey] as unknown as K)
		this.path      = pathArray
		this.rootClass = rootClass
	}

}

/*

// TESTS

class Country { name!:    string }
class City    { name!:    string; country!: Country }
class Address { address!: string; city!:    City    }
class Client  { name!:    string; address!: Address }
class Order   { amount!:  number; client!:  Client  }

const property = new ReflectProperty(Country, 'name')
console.log(property.class) // class is resolved as ReflectClass<Country> : this is perfect
console.log(property.name)  // name is resolved as "name" : this is perfect

const property1 = new ReflectPropertyPath(Order, 'client.address.city.country.name')
console.log(property1.rootClass) // rootClass is resolved as ReflectClass<Order> : this is perfect
console.log(property1.class)     // class is resolved as ReflectClass<Country> : this is perfect
console.log(property1.name)      // name is resolved as "name" : this is perfect
console.log(property1.path)      // path is resolved as "client.address.city.country.name" : this is perfect

const property2 = new ReflectPropertyPath(Order, ['client', 'address', 'city', 'country', 'name'])
console.log(property2.rootClass) // rootClass is resolved as ReflectClass<Order> : this is perfect
console.log(property2.class)     // class is resolved as ReflectClass<Country> : this is perfect
console.log(property2.name)      // name is resolved as "name" : this is perfect
console.log(property2.path)      // path is resolved as ['client', 'address', 'city', 'country', 'name'] : this is perfect

*/
