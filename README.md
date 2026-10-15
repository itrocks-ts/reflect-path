[![npm version](https://img.shields.io/npm/v/@itrocks/reflect-path?logo=npm)](https://www.npmjs.org/package/@itrocks/reflect-path)
[![npm downloads](https://img.shields.io/npm/dm/@itrocks/reflect-path)](https://www.npmjs.org/package/@itrocks/reflect-path)
[![GitHub](https://img.shields.io/github/last-commit/itrocks-ts/reflect-path?color=2dba4e&label=commit&logo=github)](https://github.com/itrocks-ts/reflect-path)
[![issues](https://img.shields.io/github/issues/itrocks-ts/reflect-path)](https://github.com/itrocks-ts/reflect-path/issues)
[![discord](https://img.shields.io/discord/1314141024020467782?color=7289da&label=discord&logo=discord&logoColor=white)](https://25.re/ditr)

# reflect-path

Reflect typed property paths from class metadata.

Requires Node.js 24 or later and the readable declaration/source files used by
[`@itrocks/reflect`](https://github.com/itrocks-ts/reflect). Complete reflection composition before resolving paths.

## Installation

```sh
npm i @itrocks/reflect-path
```

## Resolve metadata

```ts
import { resolvePropertyPath } from '@itrocks/reflect-path'
import { Invoice }             from './invoice'

const resolved = resolvePropertyPath(Invoice, 'customer.address.city.name')
// Equivalent input: ['customer', 'address', 'city', 'name']
console.log(resolved.path)                     // customer.address.city.name
console.log(resolved.property.class.type.name) // City
console.log(resolved.property.name)            // name
console.log(resolved.targetMultiplicity)       // one, many or unknown
```

`resolvePropertyPath(rootType, path)` accepts a class or existing `ReflectClass` and a nonempty string/segment path.
It validates every segment using property metadata, without constructing records or reading domain values/getters.
The descriptor contains the canonical `path`, ordered reflected `segments`, final `property`, `rootClass`, optional
ancestor paths, relational `target` when known and accumulated `targetMultiplicity`. Descriptor containers are frozen.
Collections traverse their logical element type; inverse and N-N declarations remain available on each segment.
A finite path can revisit a class. Path resolution does not choose automatic search-cycle rules.

`PropertyPathError` provides `code`, canonical `path` and failing prefix `at`. Codes are `invalid-path`,
`terminal-traversal`, `unknown-target` and `ambiguous-type`. Empty root paths are invalid; providers handle root
context.
Unresolved final metadata retains an unknown target; traversal through it rejects. Multi-target or mixed object unions
reject even as a final segment. `(Customer | null)[]` currently has an unknown element target in `property-type`, so
`complex.name` rejects explicitly while `complex` retains known `many` multiplicity.

## Reflect a final property

`new ReflectPropertyPath(root, path)` accepts a class, object or `ReflectClass` and remains a `ReflectProperty`.
Its `class`, `name`, `type`, `defaultValue` and `collectionType` describe the final metadata owner. `rootClass` keeps the
root context; `path` is a copied, frozen segment array.

Construction and metadata access read no domain values. Explicit `object`, `class.object` or `value` access resolves
and remembers the final singular owner on first access. Missing parents return `undefined`; collection traversal has
no singular value owner and never chooses an element. Declared metadata determines the property class independently
of the concrete record. Use the descriptor's multiplicity before consuming a path as a scalar value.

## Path types and checks

The public types `PropertyPath`, `PropertyPathArray`, `PropertyPathString`, `LastKey`, `LastValue`,
`SecondToLastKey` and `SecondToLastObject` describe string/readonly tuple paths and their final owner/value.
Array and record paths address element properties. Recursive type expansion widens the suffix when a context type
repeats, leaving complete validation to `resolvePropertyPath`; arbitrary runtime strings are accepted by that function.
Numeric/symbol keys, array indices, expression syntax and property names containing dots are unsupported.

Read the [public contract](docs/reflect-path.specs.md) and [runtime examples](docs/reflect-path.specs.fr.md).
Build and run the owner checks from its repository, using the already installed tools:

```sh
npm run build
npm run build:test
node --test --test-isolation=none "$PWD/test/property-select.test.mjs"
```
