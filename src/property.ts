import { ReflectClass }    from '@itrocks/reflect'
import { ReflectProperty } from '@itrocks/reflect'
import { KeyOf }           from '@itrocks/class-type'
import { Type }            from '@itrocks/class-type'
import { isType }          from '@itrocks/property-type'
import { PathInput }       from './types'
import { PathValue }       from './types'
import { SplitPath }       from './types'

export class ReflectPropertyPath<R extends object, P extends PathInput<R>> extends ReflectProperty<PathValue<R, P>>
{
	rootClass: ReflectClass<R>
	path: P extends string ? SplitPath<P> : P

	constructor(object: R | ReflectClass<R> | Type<R>, name: P)
	{
		const path = (typeof name === 'string' ? name.split('.') : [...name]) as P extends string ? SplitPath<P> : P
		if (!path.length) {
			throw 'ReflectPropertyPath called with empty path'
		}
		const rootClass = new ReflectClass(object) as ReflectClass<R>
		let   property  = new ReflectProperty(rootClass as unknown as ReflectClass<object>, path[0] as KeyOf<object>)
		for (const propertyName of path.slice(1)) {
			const type = property.type
			if (!isType(type)) {
				throw 'Bad property ' + propertyName + ' into ' + rootClass.name + ': ' + path.join('.')
			}
			const value     = property.value
			const subObject = (typeof value === 'object') ? (value as object) : (type.type as Type)
			property        = new ReflectProperty(subObject, propertyName)
		}
		super(property.class, property.name)
		this.path      = path
		this.rootClass = rootClass
	}

}
