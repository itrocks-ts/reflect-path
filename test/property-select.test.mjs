import assert            from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test              from 'node:test'

const require = createRequire(import.meta.url)
const { File } = require('@itrocks/class-file')
const { DeferredType, TypeType, UnknownType } = require('@itrocks/property-type')
const { ReflectClass, ReflectProperty, Relation } = require('@itrocks/reflect')
const { PropertyPathError, ReflectPropertyPath, resolvePropertyPath } = require('@itrocks/reflect-path')
const models = {}
for (const name of ['address', 'base-invoice', 'city', 'country', 'customer', 'invoice']) {
	const url = new URL(`./fixtures/${name}.js`, import.meta.url)
	for (const [name, type] of Object.entries(require(fileURLToPath(url)))) {
		File(fileURLToPath(url))(type)
		models[name] = type
	}
}
const { Address, City, Country, Customer, Invoice } = models
Relation({ cardinality: 'many-to-one', inverse: 'customer.invoices' })(Invoice.prototype, 'customer')
Relation({ cardinality: 'one-to-many', inverse: 'invoice.customer' })(Customer.prototype, 'invoices')
Relation({ cardinality: 'many-to-many', inverse: 'customer.invoices' })(Invoice.prototype, 'customerList')

function error(path, code, at)
{
	assert.throws(() => resolvePropertyPath(Invoice, path), actual => {
		assert.ok(actual instanceof Error)
		assert.ok(actual instanceof PropertyPathError)
		assert.equal(actual.code, code)
		assert.equal(actual.at, at)
		assert.equal(typeof actual.path, 'string')
		return true
	})
}

function signature(result)
{
	return {
		ancestors: result.optionalAncestors,
		classes: result.segments.map(property => property.class.type),
		multiplicity: result.targetMultiplicity,
		names: result.segments.map(property => property.name),
		path: result.path,
		target: result.target
	}
}

test('ambiguous terminal and intermediate targets reject without choosing a candidate', () => {
	for (const name of ['ambiguous', 'mixed']) {
		error(name, 'ambiguous-type', name)
		error(`${name}.name`, 'ambiguous-type', name)
	}
})

test('collections traverse logical elements and retain accumulated multiplicity', () => {
	for (const name of ['customerArray', 'customerList', 'customerMap']) {
		const result = resolvePropertyPath(Invoice, `${name}.address.city.country.code`)
		assert.equal(result.targetMultiplicity, 'many')
		assert.equal(result.property.class.type, Country)
		assert.equal(result.property.name, 'code')
		assert.equal(resolvePropertyPath(Invoice, name).target, Customer)
		assert.equal(resolvePropertyPath(Invoice, name).targetMultiplicity, 'many')
	}
	const inverse = resolvePropertyPath(Customer, 'invoices.customer.name')
	assert.equal(inverse.targetMultiplicity, 'many')
	assert.equal(inverse.property.class.type, Customer)
	assert.equal(inverse.segments[0].relation.cardinality, 'one-to-many')
	const plural = resolvePropertyPath(Invoice, 'customerList.name')
	assert.equal(plural.segments[0].relation.cardinality, 'many-to-many')
	assert.equal(resolvePropertyPath(Invoice, 'numbers').targetMultiplicity, 'many')
})

test('cyclic paths are finite inputs and distinct routes preserve full path identity', () => {
	const path = `${'parent.'.repeat(40)}name`
	const cyclic = resolvePropertyPath(Customer, path)
	assert.equal(cyclic.path, path)
	assert.equal(cyclic.segments.length, 41)
	assert.equal(cyclic.targetMultiplicity, 'one')
	assert.equal(cyclic.property.class.type, Customer)
	assert.equal(cyclic.optionalAncestors.length, 40)
	const left = resolvePropertyPath(Invoice, 'customer.address.city.name')
	const right = resolvePropertyPath(Invoice, 'deliveryAddress.city.name')
	assert.equal(left.property.class.type, right.property.class.type)
	assert.notEqual(left.path, right.path)
})

test('deferred and custom reflection contexts remain substitutable', () => {
	const module = { Customer: undefined }
	const type = new TypeType(new DeferredType(module, 'Customer'))
	class Context extends ReflectClass
	{

		get propertyTypes()
		{
			return { deferred: type }
		}

	}
	const context = new Context(Invoice)
	assert.throws(() => resolvePropertyPath(context, 'deferred.name'), { code: 'unknown-target', at: 'deferred' })
	const unknown = resolvePropertyPath(context, 'deferred')
	assert.equal(unknown.target, undefined)
	assert.equal(unknown.targetMultiplicity, 'unknown')
	module.Customer = Customer
	const result = resolvePropertyPath(context, 'deferred.name')
	assert.equal(result.rootClass, context)
	assert.equal(result.property.class.type, Customer)
	assert.equal(result.targetMultiplicity, 'one')
	assert.equal(new ReflectPropertyPath(context, 'deferred').type, type)
})

test('direct inherited and deep final properties use the correct metadata owner', () => {
	const direct = resolvePropertyPath(Invoice, 'number')
	assert.equal(direct.property.class.type, Invoice)
	assert.equal(direct.property.name, 'number')
	assert.equal(direct.property.defaultValue, 'inherited')
	assert.equal(direct.target, undefined)
	assert.equal(direct.targetMultiplicity, 'one')
	const two = resolvePropertyPath(Invoice, 'customer.name')
	assert.deepEqual(two.segments.map(property => property.class.type), [Invoice, Customer])
	assert.equal(two.property.defaultValue, 'Customer')
	const deep = resolvePropertyPath(Invoice, 'customer.address.city.country.name')
	assert.deepEqual(deep.segments.map(property => property.class.type), [Invoice, Customer, Address, City, Country])
	assert.equal(deep.property, deep.segments.at(-1))
	assert.equal(deep.property.defaultValue, 'France')
	assert.equal(deep.property.type.type, String)
	assert.deepEqual(deep.optionalAncestors, ['customer', 'customer.address', 'customer.address.city.country'])
})

test('metadata access executes no value getter and constructs no domain object', () => {
	const object = Object.create(Invoice.prototype)
	let reads = 0
	Object.defineProperty(object, 'customer', { get() {
		reads ++
		throw new Error('Unexpected value read')
	} })
	const context = new ReflectClass(object)
	const descriptor = Object.getOwnPropertyDescriptor(ReflectProperty.prototype, 'value')
	Object.defineProperty(ReflectProperty.prototype, 'value', { configurable: true, get() {
		throw new Error('Unexpected ReflectProperty.value access')
	} })
	try {
		assert.equal(resolvePropertyPath(context, 'customer.address.city.name').property.class.type, City)
		for (const root of [Invoice, context, object]) {
			const reflected = new ReflectPropertyPath(root, 'customer.address.city.country.name')
			assert.equal(reflected.class.type, Country)
			assert.equal(reflected.name, 'name')
			assert.equal(reflected.type.type, String)
			assert.equal(reflected.defaultValue, 'France')
		}
	}
	finally {
		Object.defineProperty(ReflectProperty.prototype, 'value', descriptor)
	}
	assert.equal(reads, 0)
	assert.throws(() => new Invoice(), /must not construct/)
	assert.throws(() => new Country(), /must not construct/)
})

test('missing and nullable values resolve through metadata without reading records', () => {
	for (const value of [null, undefined]) {
		const object = Object.assign(Object.create(Invoice.prototype), { customer: value, nullable: value })
		for (const key of ['customer', 'nullable']) {
			const reflected = new ReflectPropertyPath(object, `${key}.address.city.name`)
			assert.equal(reflected.class.type, City)
			assert.equal(reflected.object, undefined)
			assert.equal(reflected.value, undefined)
			assert.equal(reflected.defaultValue, 'Chartres')
			assert.deepEqual(resolvePropertyPath(Invoice, `${key}.name`).optionalAncestors, [key])
		}
	}
	const relation = resolvePropertyPath(Invoice, 'customer.address.city.country')
	assert.equal(relation.target, Country)
	assert.equal(relation.targetMultiplicity, 'one')
	assert.deepEqual(relation.optionalAncestors, ['customer', 'customer.address'])
})

test('normalisation copies segments and exposes stable readonly descriptor containers', () => {
	const names = ['customer', 'address', 'city', 'name']
	const array = resolvePropertyPath(Invoice, names)
	const string = resolvePropertyPath(Invoice, names.join('.'))
	const reflected = new ReflectPropertyPath(Invoice, names)
	assert.deepEqual(signature(array), signature(string))
	names.splice(0, names.length, 'number')
	assert.equal(array.path, 'customer.address.city.name')
	assert.deepEqual(reflected.path, ['customer', 'address', 'city', 'name'])
	for (const value of [array, array.optionalAncestors, array.segments, reflected.path]) {
		assert.ok(Object.isFrozen(value))
	}
	assert.throws(() => array.segments.pop(), TypeError)
})

test('public require and import expose descriptors errors and legacy reflection', async () => {
	const imported = await import('@itrocks/reflect-path')
	for (const name of ['PropertyPathError', 'ReflectPropertyPath', 'resolvePropertyPath']) {
		assert.equal(typeof imported[name], 'function')
		assert.equal(imported[name], require('@itrocks/reflect-path')[name])
	}
	assert.equal(imported.resolvePropertyPath(Invoice, 'customer.name').property.class.type, Customer)
})

test('runtime validation rejects malformed paths unknown names and terminal traversal', () => {
	for (const path of ['', [], '.', 'customer.', '.customer', 'customer..name', ['customer.name'],
		['customer', ''], ['customer', 42], [Symbol('name')], null, {}, [' customer'], 'Customer',
		'customer.missing', 'constructor', '__proto__', 'toString', 'customer.address.city.missing']) {
		assert.throws(() => resolvePropertyPath(Invoice, path), { code: 'invalid-path' })
	}
	error('number.name', 'terminal-traversal', 'number')
	error('customer.name.length', 'terminal-traversal', 'customer.name')
	error('customerList.0.name', 'invalid-path', 'customerList.0')
	error('customerList.length', 'invalid-path', 'customerList.length')
})

test('singular explicit value access keeps the final owner and snapshots on first access', () => {
	const country = Object.assign(Object.create(Country.prototype), { name: 'France' })
	const city = Object.assign(Object.create(City.prototype), { country, name: 'Chartres' })
	const address = Object.assign(Object.create(Address.prototype), { city })
	const customer = Object.assign(Object.create(Customer.prototype), { address, name: 'Alice' })
	const object = Object.assign(Object.create(Invoice.prototype), { customer, number: 'invoice' })
	const reflected = new ReflectPropertyPath(object, 'customer.address.city.country.name')
	assert.ok(reflected instanceof ReflectProperty)
	assert.equal(reflected.object, country)
	assert.equal(reflected.class.object, country)
	assert.equal(reflected.value, 'France')
	city.country = Object.assign(Object.create(Country.prototype), { name: 'Other' })
	assert.equal(reflected.value, 'France')
	assert.equal(new ReflectPropertyPath(object, 'number').value, 'invoice')
	assert.equal(new ReflectPropertyPath(new ReflectClass(object), 'customer.name').value, 'Alice')
	Object.defineProperty(object, 'customerList', { get() { throw new Error('Must not choose first element') } })
	assert.equal(new ReflectPropertyPath(object, 'customerList.name').value, undefined)
})

test('unresolved composed syntax is explicit without a duplicate type parser', () => {
	const element = new ReflectProperty(Invoice, 'complex').collectionType.elementType
	assert.ok(element instanceof UnknownType)
	assert.equal(element.raw, '(Customer | null)')
	assert.equal(resolvePropertyPath(Invoice, 'complex').targetMultiplicity, 'many')
	assert.equal(resolvePropertyPath(Invoice, 'complex').target, undefined)
	error('complex.name', 'unknown-target', 'complex')
	error('unknown.name', 'unknown-target', 'unknown')
	assert.equal(resolvePropertyPath(Invoice, 'unknown').targetMultiplicity, 'unknown')
})
