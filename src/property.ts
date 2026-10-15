import { Type }                from '@itrocks/class-type'
import { ReflectClass }        from '@itrocks/reflect'
import { ReflectProperty }     from '@itrocks/reflect'
import { resolvePropertyPath } from './resolve-property-path'
import { KeyOf }               from './types'
import { LastKey }             from './types'
import { PropertyPath }        from './types'
import { PropertyPathArray }   from './types'
import { SecondToLastObject }  from './types'

export class ReflectPropertyPath<
	R extends object,
	const P extends PropertyPath<R>,
	T extends SecondToLastObject<R, P> = SecondToLastObject<R, P>,
	K extends KeyOf<SecondToLastObject<R, P>> = LastKey<R, P> & KeyOf<SecondToLastObject<R, P>>
>
	extends ReflectProperty<T, K>
{

	declare readonly name: K
	readonly path:      PropertyPathArray<R>
	readonly rootClass: ReflectClass<R>

	constructor(object: R | ReflectClass<R> | Type<R>, path: P)
	{
		const rootClass = (object instanceof ReflectClass) ? object : new ReflectClass(object)
		const resolved  = resolvePropertyPath(rootClass, path)
		const names     = Object.freeze(resolved.segments.map(property => property.name as string))
		const owner     = new ReflectClass(resolved.property.class.type as Type<T>)
		Object.defineProperties(owner, {
			propertyDefaults: { get: () => resolved.property.class.propertyDefaults },
			propertyTypes:    { get: () => resolved.property.class.propertyTypes }
		})

		// Metadata access stays pure; explicit value access resolves a singular owner once.
		let loaded = false
		let value: T | undefined
		Object.defineProperty(owner, 'object', { get() {
			if (loaded) return value
			let current: any = rootClass.object
			for (let index = 0; index < names.length - 1; index ++) {
				if ((current === null) || (typeof current !== 'object')) break
				if (resolved.segments[index].relation?.targetMultiplicity !== 'one') {
					current = undefined
					break
				}
				current = current[names[index]]
			}
			value = ((current !== null) && (typeof current === 'object')) ? current : undefined
			loaded = true
			return value
		} })

		super(owner, names[names.length - 1] as K)
		this.path      = names as PropertyPathArray<R>
		this.rootClass = rootClass
	}

}
