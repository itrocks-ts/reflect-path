import { Type }               from '@itrocks/class-type'
import { CanonicalType }      from '@itrocks/property-type'
import { CollectionType }     from '@itrocks/property-type'
import { LiteralType }        from '@itrocks/property-type'
import { PropertyType }       from '@itrocks/property-type'
import { RecordType }         from '@itrocks/property-type'
import { TypeType }           from '@itrocks/property-type'
import { UnionType }          from '@itrocks/property-type'
import { ReflectClass }       from '@itrocks/reflect'
import { ReflectProperty }    from '@itrocks/reflect'
import { TargetMultiplicity } from '@itrocks/reflect'

export type PropertyPathErrorCode = 'ambiguous-type' | 'invalid-path' | 'terminal-traversal' | 'unknown-target'

export type ResolvedPropertyPath<R extends object = object> = {
	readonly optionalAncestors:  readonly string[]
	readonly path:               string
	readonly property:           ReflectProperty<any, any>
	readonly rootClass:          ReflectClass<R>
	readonly segments:           readonly ReflectProperty<any, any>[]
	readonly target?:            Type
	readonly targetMultiplicity: TargetMultiplicity
}

function multiplicityOf(type: PropertyType | undefined): TargetMultiplicity
{
	if ((type instanceof CollectionType) || (type instanceof RecordType)) return 'many'
	if (type instanceof TypeType) return (type.lead === Array) ? 'many' : 'unknown'
	if ((type instanceof CanonicalType) || (type instanceof LiteralType)) return 'one'
	if (type instanceof UnionType) {
		const members = type.types.filter(member =>
			!((member instanceof LiteralType) && ((member.value === null) || (member.value === undefined)))
		)
		const multiplicities = members.map(multiplicityOf)
		return multiplicities.length && multiplicities.every(value => value === multiplicities[0])
			? multiplicities[0] : 'unknown'
	}
	return 'unknown'
}

export function resolvePropertyPath<R extends object>(
	root: ReflectClass<R> | Type<R>, path: string | readonly string[]
): ResolvedPropertyPath<R>
{
	const names = (typeof path === 'string') ? path.split('.') : Array.isArray(path) ? [...path] : []
	const canonical = names.filter(name => typeof name === 'string').join('.')
	if (!names.length || names.some(name => (typeof name !== 'string') || !name.length || name.includes('.'))) {
		throw new PropertyPathError('invalid-path', canonical, '')
	}
	const rootClass = (root instanceof ReflectClass) ? root : new ReflectClass(root)
	const ancestors: string[] = []
	const segments: ReflectProperty<any, any>[] = []
	let context: ReflectClass<any> = rootClass
	let multiplicity: TargetMultiplicity = 'one'
	let target: Type | undefined

	for (let index = 0; index < names.length; index ++) {
		const name = names[index]
		const at = names.slice(0, index + 1).join('.')
		if (!Object.hasOwn(context.propertyTypes, name)) {
			throw new PropertyPathError('invalid-path', canonical, at)
		}
		const property = new ReflectProperty(context, name)
		const relation = property.relation
		if (relation && !relation.target && relation.targets.length) {
			throw new PropertyPathError('ambiguous-type', canonical, at)
		}
		segments.push(property)
		target = relation?.target
		const current = relation?.targetMultiplicity ?? multiplicityOf(property.type)
		multiplicity = ((multiplicity === 'many') || (current === 'many')) ? 'many'
			: ((multiplicity === 'unknown') || (current === 'unknown')) ? 'unknown' : 'one'
		if (index === names.length - 1) continue
		if (!target) {
			const code = relation || (current !== 'one') ? 'unknown-target' : 'terminal-traversal'
			throw new PropertyPathError(code, canonical, at)
		}
		if (relation?.optional) ancestors.push(at)
		context = new ReflectClass(target)
	}
	return Object.freeze({
		optionalAncestors: Object.freeze(ancestors),
		path: canonical,
		property: segments[segments.length - 1],
		rootClass,
		segments: Object.freeze(segments),
		target,
		targetMultiplicity: multiplicity
	})
}

export class PropertyPathError extends Error
{

	constructor(readonly code: PropertyPathErrorCode, readonly path: string, readonly at: string)
	{
		super(`${code}: ${path || '(empty)'} at ${at || '(root)'}`)
		this.name = 'PropertyPathError'
	}

}
