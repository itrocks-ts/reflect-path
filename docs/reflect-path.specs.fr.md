# Runtime path validation examples

These examples use the [public contract](reflect-path.specs.md) and synthetic classes with readable metadata.
They exercise metadata independently of any database, record availability or presentation adapter.

## Final owners and equivalent inputs

For `Invoice.customer?: Customer`, `Customer.address?: Address`, `Address.city: City` and `City.name: string`,
`resolvePropertyPath(Invoice, 'customer.name')` resolves a final property owned by `Customer`.
`resolvePropertyPath(Invoice, ['customer', 'address', 'city', 'name'])` resolves a final property owned by `City`.
The corresponding string returns the same ordered metadata, canonical path and optional ancestor prefixes.
The descriptor remains available when no invoice exists or both optional relationships are absent.

## Collections and cycles

For `Invoice.customers?: Customer[]`, `customers.address.city.name` has accumulated multiplicity `many`.
The final class is `City`; the path contains no technical collection index. Singular value access through this path
returns `undefined`, because a `ReflectPropertyPath` does not pick a customer.

For `Customer.parent?: Customer`, `parent.parent.name` traverses two declared relationships and resolves
`Customer.name`.
The resolver follows exactly the input segments; it neither expands neighbouring relations nor suppresses a cycle.
Automatic search-return decisions belong to the selector.

## Explicit errors

An empty path, `customer..name`, a segment containing a dot and an unknown metadata name raise `invalid-path`.
`customer.name.length` raises `terminal-traversal` at `customer.name`.
A property declared `Customer | Address` raises `ambiguous-type`; a runtime customer value does not disambiguate it.
A property with unresolved target metadata raises `unknown-target` when followed by another segment.

The existing type parser retains `(Customer | null)[]` as a collection of unknown elements. Its final descriptor has
multiplicity `many` and no target; appending `.name` raises `unknown-target`. No path resolver duplicates that parser.

## Explicit value access

Constructing `ReflectPropertyPath(invoice, 'customer.address.city.name')` reads no domain getter.
Its `class.type`, `name`, `type` and `defaultValue` resolve from metadata. Reading `object` or `value` explicitly then
walks singular values and remembers the final owner. An absent relationship produces `undefined`.
The owner tests cover a throwing getter and constructor, inherited fields, optional values, collections, cycles,
unknown and ambiguous targets, custom reflection contexts, public imports and readonly descriptor containers.
