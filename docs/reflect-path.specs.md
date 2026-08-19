# Property-path reflection — specifications

## Purpose and status

This document defines the expected behavior of `@itrocks/reflect-path`, then separately describes the implementation
available today. The words “must” and “must not” define the functional contract; the “Implementation status” section
reports what the current source actually does.

The package has two related responsibilities:

- model a non-empty path to a nested property at compile time;
- expose the final property as an `@itrocks/reflect` `ReflectProperty` at runtime.

It does not evaluate arbitrary JavaScript expressions, read or write a whole path on demand, or serialize paths for
storage or transport.

## Functional specifications

### Type-safe paths

A property path must be accepted in either of these forms:

```ts
type StringPath = 'client.address.city.name'
type ArrayPath  = readonly ['client', 'address', 'city', 'name']
```

- `PropertyPathString<R>` represents dot-separated paths rooted at `R`.
- `PropertyPathArray<R>` represents the same paths as readonly tuples.
- `PropertyPath<R>` is the union of both representations.
- Each segment must be a string key known at that point in the object type. Empty paths and paths through primitive
  values must be rejected by TypeScript.
- Optional intermediate object properties remain traversable at type level: `undefined` is removed when computing the
  following object type.
- Array paths require literal tuple information. Callers should use `as const` or another readonly tuple type instead
  of a widened `string[]`.

The package exports the following type computations:

| Type utility                 | Result for `client.address.city.name`                  |
|------------------------------|--------------------------------------------------------|
| `LastKey<R, P>`              | `'name'`                                               |
| `LastValue<R, P>`            | The declared type of `name`                            |
| `SecondToLastKey<R, P>`      | `'city'`                                               |
| `SecondToLastObject<R, P>`   | The object type that owns `name`                       |

`SecondToLastKey<R, P>` returns `never` for a one-segment path, while `SecondToLastObject<R, P>` returns `R`.

### Runtime reflection

`ReflectPropertyPath` must accept a root object, a root class constructor, or an existing `ReflectClass`, together with
a valid string or tuple path.

For a path such as `client.address.city.name`, construction must:

1. preserve or create the root `ReflectClass` in `rootClass`;
2. normalize the path to a segment array in `path`;
3. resolve every intermediate segment in order;
4. expose `name` as the final segment and behave as a `ReflectProperty` owned by the object or class immediately before
   that segment.

When an intermediate runtime value is an object, traversal may continue from that concrete object so that its actual
class and final value remain available. When no object value is available, traversal must use the declared reflected
class type. A final primitive property is valid because its value is not traversed further.

Construction resolves intermediate owners once. Replacing an intermediate object afterwards does not retarget an
already-created `ReflectPropertyPath`; callers must construct a new reflection for the new object graph.

### Metadata and failure behavior

Every intermediate segment that has no usable runtime object must have class metadata compatible with
`@itrocks/property-type` `TypeType`. If an intermediate segment cannot be resolved, construction must fail explicitly
instead of returning a `ReflectProperty` for the wrong owner.

Compile-time path safety is not runtime validation. JavaScript callers, casts, mutable arrays, and deserialized values
can bypass the TypeScript constraints; malformed or stale paths must therefore be treated as untrusted input by an
application.

### Public API

The package root exports one runtime value:

```ts
class ReflectPropertyPath<
	R extends object,
	P extends PropertyPath<R>,
	T extends SecondToLastObject<R, P>,
	K extends Extract<keyof T, string>
> extends ReflectProperty<T, K>
```

It also exports these types from the package root:

```ts
LastKey<R, P>
LastValue<R, P>
PropertyPath<R>
PropertyPathArray<R>
PropertyPathString<R>
SecondToLastKey<R, P>
SecondToLastObject<R, P>
```

The inherited `ReflectProperty` API supplies `class`, `object`, `type`, `value`, `defaultValue`, and `collectionType`
for the resolved final property.

## Implementation status

The current implementation provides a working compile-time path model:

- valid string and readonly tuple paths are inferred recursively;
- invalid property names and traversal through primitive values are rejected;
- optional intermediate object properties are supported by the type computations;
- the exported last-key, last-value, second-to-last-key, and owner-object utilities resolve as specified;
- `name` and the inherited final-property API are inferred from the requested path.

The project compiles successfully with its current TypeScript configuration. It has no automated test suite, so these
results were established through source review and focused compile-time and runtime checks.

Runtime support is currently incomplete:

- one-segment paths resolve against the root correctly;
- string paths are split into arrays, tuple paths are accepted, and `rootClass` is populated;
- every nested path of two or more segments resolves its final property against an owner one level too shallow. The
  traversal loop does not process the penultimate segment before calling the parent `ReflectProperty` constructor;
- because of this off-by-one defect, `name` retains the statically expected key but `class`, `object`, `value`, `type`,
  and defaults can describe the wrong property or be `undefined` at runtime;
- metadata validation is also skipped for the unprocessed segment and is skipped entirely for a two-segment path.

Nested runtime reflection must therefore be considered non-functional until the traversal defect is fixed and covered
by tests. Type-level acceptance alone does not make such a call safe at runtime.

## Known limitations and unsupported cases

### Path syntax and type modeling

- **String keys only**: numeric and symbol keys are excluded. Array indexes, tuple indexes, `Map` keys, and symbol
  properties are not modeled as path segments.
- **No escaping or expression syntax**: a dot always separates string segments. A property whose own name contains a
  dot cannot be addressed. Bracket notation, optional chaining, calls, wildcards, and predicates are unsupported.
- **Broad object recursion**: every TypeScript object type is considered traversable. This includes arrays, dates,
  functions with properties, and framework objects even when runtime reflection cannot traverse them meaningfully.
- **Collections and records**: the type model may offer paths into their object surface, but runtime traversal only
  accepts `TypeType`; `CollectionType`, `RecordType`, union, intersection, canonical, and unknown property types are not
  traversable.
- **Object unions**: TypeScript exposes only keys safe for the union. Variant-specific paths require narrowing before
  creating the path.
- **Recursive or very wide models**: self-referential types and large object graphs can cause circular type references,
  excessive instantiation depth, or very large path unions. No configurable depth limit is provided.
- **Widened input**: a general `string` or `string[]` is intentionally not accepted as a safe path without validation
  and narrowing by the caller.

### Runtime values and metadata

- **Nested traversal defect**: all paths longer than one segment currently bind the final key to the wrong owner.
- **Metadata dependency**: traversal depends on `@itrocks/reflect` and its ability to obtain property types from emitted
  declarations. Missing, stale, unsupported, or unavailable declaration metadata prevents reliable traversal.
- **Optional and nullable values**: `undefined` falls back to the declared type. `null` is currently treated as an
  object because the implementation only checks `typeof value === 'object'`, which can lead to a later exception or an
  invalid reflected class.
- **Union and polymorphic metadata**: a runtime object can preserve its concrete class, but the declared intermediate
  metadata is still required and must itself be a `TypeType`. A union containing a class is rejected before its value
  can be used.
- **Getters and proxies**: reading intermediate values can execute user getters or proxy traps. Their exceptions and
  side effects are not isolated.
- **Graph mutation**: owner resolution is a construction-time snapshot. Replacing an intermediate object does not
  update the reflection, and mutating a caller-supplied path array can desynchronize the public `path` from the bound
  property.
- **Malformed runtime paths**: empty strings, repeated dots, empty arrays, unknown names, and non-string array entries
  have no dedicated validation layer or stable error contract.
- **Error values**: the explicit bad-property-type branch throws a string instead of an `Error` instance.

### API precision, platform, and verification

- **Widened `path` property**: although the constructor infers the requested `P`, the public `path` property is declared
  as `PropertyPathArray<R>`. It does not retain the exact tuple type of the supplied path.
- **Readonly is compile-time only**: tuple paths are not cloned or frozen. JavaScript callers can mutate the same array
  after construction.
- **Node.js environment**: the package declares Node.js 24 or later and relies indirectly on reflection code that reads
  files. Browser and other filesystem-free runtimes are not supported targets.
- **CommonJS distribution**: the package currently exposes a single CommonJS build and no package subpaths.
- **Undeclared direct dependency**: runtime source imports `@itrocks/property-type`, but the package manifest does not
  declare it directly and currently relies on `@itrocks/reflect` to install it transitively. Dependency layouts that
  do not expose transitive packages to siblings can therefore fail to build or load the package.
- **No tests**: there are no runtime, declaration, integration, regression, or malformed-input tests. No compatibility
  guarantee has been established across class hierarchies, circular imports, TypeScript versions, or declaration
  emit configurations.

These cases must be rejected safely, documented as preconditions, or addressed by future changes before they are
advertised as supported.
