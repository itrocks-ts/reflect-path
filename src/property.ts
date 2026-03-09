import { KeyOf }              from '@itrocks/class-type'
import { isType }             from '@itrocks/class-type'
import { Type }               from '@itrocks/class-type'
import { ReflectClass }       from '@itrocks/reflect'
import { ReflectProperty }    from '@itrocks/reflect'
import { PropertyPath }       from './types'
import { PropertyPathArray }  from './types'
import { SecondToLastObject } from './types'

export class ReflectPropertyPath<R extends object, P extends PropertyPathArray<R>>
	extends ReflectProperty<SecondToLastObject<R, P>>
{
	path:      P
	rootClass: ReflectClass<R>

	constructor(object: R | ReflectClass<R> | Type<R>, path: PropertyPath<R>)
	{
		const pathArray = ((typeof path === 'string') ? path.split('.') : path) as P
		const rootClass = (object instanceof ReflectClass) ? object : new ReflectClass(object)
		const lastKey   = pathArray.length - 1

		let property  = new ReflectProperty(rootClass, pathArray[0]) as any as ReflectProperty<object | Type<object>>
		let subObject = (object instanceof ReflectClass ? (object.object ?? object.type) : object) as object | Type<object>

		for (let key = 1; key < lastKey; key ++) {
			const propertyName = pathArray[key] as KeyOf<typeof subObject>
			const type         = property.type
			if (!isType(type)) {
				throw 'Bad property ' + propertyName + ' into ' + rootClass.name + ': ' + pathArray.join('.')
			}
			const value = property.value
			subObject   = (typeof value === 'object') ? (value as object) : (type.type as Type)
			property    = new ReflectProperty(subObject, propertyName)
		}

		super(
			subObject as SecondToLastObject<R, P>,
			pathArray[lastKey]
		)
		this.path      = pathArray
		this.rootClass = rootClass
	}

}

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
console.log(property1.class)     // TODO is it possible to resolve class as ReflectClass<Country> ?
console.log(property1.name)      // TODO name should be resolved as "name", but is never: please fix it
console.log(property1.path)      // TODO is it possible to resolve path as ['client', 'address', 'city', 'country', 'name'] ?

const property2 = new ReflectPropertyPath(Order, ['client', 'address', 'city', 'country', 'name'])
console.log(property2.rootClass) // rootClass is resolved as ReflectClass<Order> : this is perfect
console.log(property2.class)     // TODO is it possible to resolve class as ReflectClass<Country> ?
console.log(property2.name)      // TODO name should be resolved as "name", but is never: please fix it
console.log(property2.path)      // TODO is it possible to resolve path as ['client', 'address', 'city', 'country', 'name'] ?
