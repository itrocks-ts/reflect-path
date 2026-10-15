# Property path reflection contract

## Metadata descriptor

The public `resolvePropertyPath<R>(root: Type<R> | ReflectClass<R>, path: string | readonly string[])` returns a
`ResolvedPropertyPath<R>`. It validates the complete finite path without reading `ReflectProperty.value`, domain
getters or constructing records. It uses the public `reflect` relation facts and `property-type` metadata, without
parsing TypeScript syntax itself. An existing reflection context supplies its own metadata.

The readonly descriptor contains:

| Member               | Meaning                                                 |
| -------------------- | ------------------------------------------------------- |
| `optionalAncestors`  | Optional relationship prefixes before the final segment |
| `path`               | Canonical dot-separated path                            |
| `property`           | Final `ReflectProperty`, also the last segment          |
| `rootClass`          | The root `ReflectClass`                                 |
| `segments`           | Ordered `ReflectProperty` metadata at each level        |
| `target`             | The final relational class target, when known           |
| `targetMultiplicity` | Accumulated `one`, `many` or `unknown`                  |

Descriptor and array containers are frozen; reflection objects retain their normal public API. A `many` segment makes
its whole path `many`. Otherwise an unknown multiplicity makes it `unknown`; all singular segments produce `one`.
Opposite-end cardinality and inverse identities remain the unchanged relation facts, not inferred SQL mappings.

## Path validation

Strings and arrays agree exactly. Paths must be nonempty and all segments must be nonempty strings without dots.
Names are neither trimmed nor case-folded. Each segment must exist in the current reflected property-type metadata,
including inherited fields. Object prototype names alone do not establish metadata properties.

The final property belongs to the context reached after every preceding segment. Optional/nullable singular objects,
array elements and record elements are traversed by their unique declared target. No array index or first-element
fallback is used. A finite cyclic path is valid, and different paths to the same class retain different identities.
No graph expansion, search-cycle policy, authorisation, SQL or value projection occurs in this package.

`PropertyPathError extends Error` exposes `code: PropertyPathErrorCode`, `path` and the failing prefix `at`:

| Code                 | Meaning                                                 |
| -------------------- | ------------------------------------------------------- |
| `ambiguous-type`     | Relation has candidates but no unique compatible target |
| `invalid-path`       | Empty/malformed path or an unknown metadata property    |
| `terminal-traversal` | A scalar is followed by another segment                 |
| `unknown-target`     | An intermediate relationship target is unresolved       |

An unresolved final target is allowed with explicit uncertainty; an ambiguous relational final target rejects.
Unsupported type syntax remains owned by `property-type`/AST. In particular, `(Customer | null)[]` currently retains an
unknown element type: selecting its descriptor reports `many`, while traversing `name` raises `unknown-target`.
Readable declaration metadata is required; underlying filesystem/metadata loading errors retain their original error.

## Property reflection and values

`ReflectPropertyPath<R, P, T, K>` extends `ReflectProperty<T, K>` and accepts an object, class or `ReflectClass`.
The final owner's metadata is resolved on construction. `rootClass` preserves the root context; `path` is copied and
frozen. `name`, `type`, defaults and collection metadata describe the actual final property, including two-level paths.

Construction and metadata access do not read values. An explicit `object`, `class.object` or `value` access resolves
the final owner through singular values and remembers it on first access. Missing parents yield `undefined` and plural
parents have no singular owner. Subsequent changes to a remembered owner's fields remain visible; replacing an ancestor
does not redirect that reflection. Metadata always uses the declared target, independently of a record subtype.
Custom root reflection metadata is retained by the final property's type/default accessors.

## Type helpers and distribution

`PropertyPath`, `PropertyPathArray` and `PropertyPathString` enumerate nonempty string-key paths. `LastKey`,
`LastValue`, `SecondToLastKey` and `SecondToLastObject` compute the final key/value and owning context;
Optional values and collection or record elements are unwrapped for traversal. Literal tuple/string arguments preserve
the final property name.
Recursive context repetition widens the remaining suffix, preventing circular type expansion. Runtime validation still
checks every segment; no runtime depth limit is imposed. Numbers, symbols, array indices and expressions are excluded.

The package publishes its CommonJS facade and declarations under `cjs/`; Node ESM can import that public facade.
There are no browser modules, styles, HTML or icons. Source and tests are not published.
