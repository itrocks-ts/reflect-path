import { Type }                   from '@itrocks/class-type'
import { LastKey }                from '@itrocks/reflect-path'
import { LastValue }              from '@itrocks/reflect-path'
import { PropertyPath }           from '@itrocks/reflect-path'
import { PropertyPathArray }      from '@itrocks/reflect-path'
import { PropertyPathError }      from '@itrocks/reflect-path'
import { PropertyPathErrorCode }  from '@itrocks/reflect-path'
import { PropertyPathString }     from '@itrocks/reflect-path'
import { ReflectPropertyPath }    from '@itrocks/reflect-path'
import { ResolvedPropertyPath }   from '@itrocks/reflect-path'
import { resolvePropertyPath }    from '@itrocks/reflect-path'
import { SecondToLastKey }        from '@itrocks/reflect-path'
import { SecondToLastObject }     from '@itrocks/reflect-path'
import { TargetMultiplicity }     from '@itrocks/reflect'
import { City }                   from './fixtures/city.js'
import { Customer }               from './fixtures/customer.js'
import { Invoice }                from './fixtures/invoice.js'

const path = 'customer.address.city.country.name' as const satisfies PropertyPath<Invoice>
const array: PropertyPathArray<Invoice> = ['customerList', 'address', 'city', 'name']
const string: PropertyPathString<Invoice> = 'customerMap.address.city.name'
const cycle: PropertyPath<Customer> = 'parent.parent.parent.name'
const deepCycle: PropertyPath<Customer> = 'parent.parent.parent.parent.parent.parent.parent.parent.parent.name'
const key: LastKey<Invoice, typeof path> = 'name'
const value: LastValue<Invoice, typeof path> = 'France'
const arrayValue: LastValue<Invoice, readonly ['customerList', 'name']> = 'Customer'
const parentKey: SecondToLastKey<Invoice, 'customer.address.city.name'> = 'city'
const owner: SecondToLastObject<Invoice, 'customer.address.city.name'> = {} as City
const reflected = new ReflectPropertyPath(Invoice, ['customer', 'address', 'city', 'name'])
const exactName: 'name' = reflected.name
const exactValue: string | undefined = reflected.value
const stringReflected = new ReflectPropertyPath(Invoice, 'customer.name')
const stringName: 'name' = stringReflected.name
const described: ResolvedPropertyPath<Invoice> = resolvePropertyPath(Invoice, array)
const multiplicity: TargetMultiplicity = described.targetMultiplicity
const target: Type | undefined = described.target
const code: PropertyPathErrorCode = new PropertyPathError('invalid-path', '', '').code

// @ts-expect-error Unknown root property.
const invalid: PropertyPath<Invoice> = 'missing.name'
// @ts-expect-error Scalars have no child properties.
const scalar: PropertyPath<Invoice> = 'number.name'
// @ts-expect-error Collections traverse elements, not array methods.
const arrayMethod: PropertyPath<Invoice> = 'customerList.push'
// @ts-expect-error Collections do not expose numeric index segments.
const index: PropertyPath<Invoice> = 'customerList.0.name'
// @ts-expect-error The root is not a property.
const empty: PropertyPath<Invoice> = ''
// @ts-expect-error A tuple path must be nonempty.
const emptyArray: PropertyPath<Invoice> = []
// @ts-expect-error Exact final keys are preserved.
const wrongKey: LastKey<Invoice, typeof path> = 'code'
// @ts-expect-error The descriptor is readonly.
described.path = ''
// @ts-expect-error Ancestors are readonly.
described.optionalAncestors.push('customer')
// @ts-expect-error Ordered metadata segments are readonly.
described.segments.pop()
// @ts-expect-error Last values retain their scalar type.
const wrongValue: LastValue<Invoice, typeof path> = 42

void [path, array, string, cycle, deepCycle, key, value, arrayValue, parentKey, owner, reflected, exactName, exactValue]
void [stringReflected, stringName, described, multiplicity, target, code]
void [invalid, scalar, arrayMethod, index, empty, emptyArray, wrongKey, wrongValue]

const datePath: PropertyPath<Invoice> = 'nullableDate'
const dateValue: LastValue<Invoice, 'date'> = new Date()
// @ts-expect-error Native Date methods are not business paths.
const dateMethod: PropertyPathString<Invoice> = 'date.getTime'
// @ts-expect-error Nullable dates remain scalar.
const nullableDateMethod: PropertyPathArray<Invoice> = ['nullableDate', 'getTime']
// @ts-expect-error Optional dates remain scalar.
const optionalDateMethod: PropertyPath<Invoice> = 'optionalDate.getTime'
// @ts-expect-error Date collection elements remain scalar.
const collectionDateMethod: PropertyPath<Invoice> = 'dateArray.getTime'
// @ts-expect-error Generic Date collection elements remain scalar.
const genericDateMethod: PropertyPath<Invoice> = 'genericDates.getTime'
// @ts-expect-error Record Date elements remain scalar.
const recordDateMethod: PropertyPath<Invoice> = 'dateMap.getTime'
void [datePath, dateValue, dateMethod, nullableDateMethod, optionalDateMethod]
void [collectionDateMethod, genericDateMethod, recordDateMethod]
