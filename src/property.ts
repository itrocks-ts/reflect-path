import { ReflectClass }       from '@itrocks/reflect'
import { ReflectProperty }    from '@itrocks/reflect'
import { LastKey }            from './types'
import { PropertyPathArray }  from './types'
import { SecondToLastObject } from './types'

export class ReflectPropertyPath<R extends object, P extends PropertyPathArray<R>>
	extends ReflectProperty<SecondToLastObject<R, P>>
{
	path:      P
	rootClass: ReflectClass<R>

	constructor(object: R /* | ReflectClass<R> | Type<R> */, path: P)
	{
		const lastKeyIndex      = path.length - 1
		let   subObject: object = object
		for (let key = 0; key < lastKeyIndex; key++) {
			subObject = (subObject as Record<string, object>)[path[key]]
		}
		super(
			subObject          as SecondToLastObject<R, P>,
			path[lastKeyIndex] as any as LastKey<R, P>
		)
		this.path      = path
		this.rootClass = new ReflectClass(object)
	}

}
