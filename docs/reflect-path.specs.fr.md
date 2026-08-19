# Réflexion des chemins de propriétés — spécifications

## Objet et statut

Ce document définit le comportement attendu de `@itrocks/reflect-path`, puis décrit séparément l'implémentation
disponible à ce jour. Les formulations « doit » et « ne doit pas » appartiennent au contrat fonctionnel ; la section
« État de l'implémentation » est un constat du code source actuel.

Le package remplit deux rôles liés :

- modéliser à la compilation un chemin non vide vers une propriété imbriquée ;
- exposer à l'exécution la propriété finale sous la forme d'un `ReflectProperty` de `@itrocks/reflect`.

Il n'évalue pas d'expressions JavaScript arbitraires, ne lit ni n'écrit un chemin complet à la demande et ne sérialise
pas les chemins pour leur stockage ou leur transport.

## Spécifications fonctionnelles

### Chemins typés

Un chemin de propriété doit être accepté sous l'une de ces deux formes :

```ts
type StringPath = 'client.address.city.name'
type ArrayPath  = readonly ['client', 'address', 'city', 'name']
```

- `PropertyPathString<R>` représente les chemins séparés par des points et ayant pour racine `R`.
- `PropertyPathArray<R>` représente les mêmes chemins sous forme de tuples readonly.
- `PropertyPath<R>` est l'union de ces deux représentations.
- Chaque segment doit être une clé chaîne de caractères connue à cet endroit du type objet. TypeScript doit refuser
  les chemins vides et ceux qui traversent une valeur primitive.
- Les propriétés objets intermédiaires optionnelles restent parcourables au niveau des types : `undefined` est retiré
  lors du calcul du type objet suivant.
- Les chemins tableaux nécessitent les informations littérales du tuple. Le code appelant doit utiliser `as const` ou
  un autre type de tuple readonly plutôt qu'un `string[]` élargi.

Le package exporte les calculs de types suivants :

| Type utilitaire                | Résultat pour `client.address.city.name`               |
|--------------------------------|--------------------------------------------------------|
| `LastKey<R, P>`                | `'name'`                                               |
| `LastValue<R, P>`              | Le type déclaré de `name`                              |
| `SecondToLastKey<R, P>`        | `'city'`                                               |
| `SecondToLastObject<R, P>`     | Le type objet qui possède `name`                       |

`SecondToLastKey<R, P>` retourne `never` pour un chemin d'un seul segment, tandis que
`SecondToLastObject<R, P>` retourne `R`.

### Réflexion à l'exécution

`ReflectPropertyPath` doit accepter un objet racine, un constructeur de classe racine ou un `ReflectClass` existant,
ainsi qu'un chemin chaîne ou tuple valide.

Pour un chemin tel que `client.address.city.name`, la construction doit :

1. conserver ou créer le `ReflectClass` racine dans `rootClass` ;
2. normaliser le chemin en tableau de segments dans `path` ;
3. résoudre dans l'ordre chaque segment intermédiaire ;
4. exposer dans `name` le dernier segment et se comporter comme un `ReflectProperty` appartenant à l'objet ou à la
   classe qui précède immédiatement ce segment.

Lorsqu'une valeur intermédiaire est un objet à l'exécution, le parcours peut continuer depuis cet objet concret afin
de conserver sa classe réelle et la valeur finale. En l'absence d'un objet utilisable, le parcours doit s'appuyer sur
le type de classe déclaré dans les métadonnées. Une propriété finale primitive reste valide, car sa valeur n'est pas
parcourue davantage.

La construction résout une seule fois les propriétaires intermédiaires. Remplacer ensuite un objet intermédiaire ne
redirige pas un `ReflectPropertyPath` déjà créé ; le code appelant doit construire une nouvelle réflexion pour le
nouveau graphe d'objets.

### Métadonnées et comportement en cas d'échec

Chaque segment intermédiaire qui ne fournit pas d'objet utilisable à l'exécution doit posséder une métadonnée de classe
compatible avec `TypeType` de `@itrocks/property-type`. Si un segment intermédiaire ne peut pas être résolu, la
construction doit échouer explicitement plutôt que de retourner un `ReflectProperty` associé au mauvais propriétaire.

La sécurité du chemin à la compilation ne constitue pas une validation à l'exécution. Le JavaScript, les casts, les
tableaux mutables et les valeurs désérialisées peuvent contourner les contraintes TypeScript ; une application doit
donc considérer les chemins mal formés ou obsolètes comme des entrées non fiables.

### API publique

La racine du package exporte une seule valeur disponible à l'exécution :

```ts
class ReflectPropertyPath<
	R extends object,
	P extends PropertyPath<R>,
	T extends SecondToLastObject<R, P>,
	K extends Extract<keyof T, string>
> extends ReflectProperty<T, K>
```

Elle exporte également les types suivants :

```ts
LastKey<R, P>
LastValue<R, P>
PropertyPath<R>
PropertyPathArray<R>
PropertyPathString<R>
SecondToLastKey<R, P>
SecondToLastObject<R, P>
```

L'API héritée de `ReflectProperty` fournit `class`, `object`, `type`, `value`, `defaultValue` et `collectionType` pour
la propriété finale résolue.

## État de l'implémentation

L'implémentation actuelle fournit un modèle de chemins fonctionnel à la compilation :

- les chemins valides sous forme de chaîne et de tuple readonly sont inférés récursivement ;
- les noms de propriétés invalides et le parcours à travers les valeurs primitives sont refusés ;
- les propriétés objets intermédiaires optionnelles sont prises en charge par les calculs de types ;
- les utilitaires exportés de dernière clé, dernière valeur, avant-dernière clé et objet propriétaire se résolvent comme
  spécifié ;
- `name` et l'API héritée de la propriété finale sont inférés à partir du chemin demandé.

Le projet compile avec succès avec sa configuration TypeScript actuelle. Il ne possède aucune suite de tests
automatisés ; ces résultats proviennent donc de la lecture du code et de vérifications ciblées à la compilation et à
l'exécution.

La prise en charge à l'exécution est actuellement incomplète :

- les chemins d'un seul segment sont correctement résolus sur la racine ;
- les chemins chaînes sont découpés en tableaux, les tuples sont acceptés et `rootClass` est renseigné ;
- tout chemin imbriqué de deux segments ou plus résout sa propriété finale sur un propriétaire situé un niveau trop
  haut. La boucle de parcours ne traite pas l'avant-dernier segment avant d'appeler le constructeur parent de
  `ReflectProperty` ;
- en raison de ce décalage d'un niveau, `name` conserve la clé attendue statiquement, mais `class`, `object`, `value`,
  `type` et les valeurs par défaut peuvent décrire la mauvaise propriété ou valoir `undefined` à l'exécution ;
- la validation des métadonnées est également omise pour le segment non traité, et entièrement omise pour un chemin de
  deux segments.

La réflexion imbriquée à l'exécution doit donc être considérée comme non fonctionnelle tant que le défaut de parcours
n'est pas corrigé et couvert par des tests. L'acceptation au niveau des types ne suffit pas à sécuriser cet appel à
l'exécution.

## Limites connues et cas non pris en charge

### Syntaxe des chemins et modélisation des types

- **Clés chaînes uniquement** : les clés numériques et symboles sont exclues. Les index de tableaux ou de tuples, les
  clés de `Map` et les propriétés symboles ne sont pas modélisés sous forme de segments.
- **Ni échappement, ni syntaxe d'expression** : un point sépare toujours deux segments. Une propriété dont le nom
  contient lui-même un point ne peut pas être adressée. La notation entre crochets, le chaînage optionnel, les appels,
  les jokers et les prédicats ne sont pas pris en charge.
- **Récursion large sur les objets** : tout type objet TypeScript est considéré comme parcourable. Cela comprend les
  tableaux, dates, fonctions avec propriétés et objets de frameworks, même lorsque la réflexion ne sait pas les
  parcourir de manière pertinente à l'exécution.
- **Collections et records** : le modèle de types peut proposer des chemins dans leur surface objet, mais le parcours à
  l'exécution n'accepte que `TypeType` ; `CollectionType`, `RecordType`, les unions, intersections, types canoniques et
  inconnus ne sont pas parcourables.
- **Unions d'objets** : TypeScript n'expose que les clés sûres pour l'union. Les chemins propres à une variante
  nécessitent un narrowing avant leur création.
- **Modèles récursifs ou très larges** : les types autoréférents et les grands graphes d'objets peuvent provoquer des
  références de types circulaires, une profondeur d'instanciation excessive ou de très grandes unions de chemins.
  Aucune profondeur maximale configurable n'est fournie.
- **Entrée élargie** : une valeur générale `string` ou `string[]` n'est volontairement pas acceptée comme chemin sûr
  sans validation ni narrowing par le code appelant.

### Valeurs d'exécution et métadonnées

- **Défaut de parcours imbriqué** : tous les chemins de plus d'un segment associent actuellement la clé finale au
  mauvais propriétaire.
- **Dépendance aux métadonnées** : le parcours dépend de `@itrocks/reflect` et de sa capacité à obtenir les types des
  propriétés depuis les déclarations générées. Une métadonnée absente, obsolète, non prise en charge ou indisponible
  empêche un parcours fiable.
- **Valeurs optionnelles et nullables** : `undefined` déclenche un repli sur le type déclaré. `null` est actuellement
  considéré comme un objet, car l'implémentation vérifie uniquement `typeof value === 'object'`, ce qui peut provoquer
  plus tard une exception ou produire une classe réfléchie invalide.
- **Métadonnées d'union et polymorphisme** : un objet disponible à l'exécution peut conserver sa classe concrète, mais
  la métadonnée intermédiaire déclarée reste obligatoire et doit elle-même être un `TypeType`. Une union contenant une
  classe est rejetée avant que sa valeur puisse être utilisée.
- **Getters et proxies** : la lecture des valeurs intermédiaires peut exécuter des getters ou des traps de proxy
  applicatifs. Leurs exceptions et leurs effets de bord ne sont pas isolés.
- **Mutation du graphe** : la résolution du propriétaire est un instantané réalisé à la construction. Le remplacement
  d'un objet intermédiaire ne met pas à jour la réflexion, et la mutation d'un tableau de chemin fourni par l'appelant
  peut désynchroniser le `path` public de la propriété associée.
- **Chemins mal formés à l'exécution** : les chaînes vides, points répétés, tableaux vides, noms inconnus et éléments de
  tableau qui ne sont pas des chaînes ne possèdent ni validation dédiée, ni contrat d'erreur stable.
- **Valeurs d'erreur** : la branche explicite de mauvais type de propriété lance une chaîne de caractères plutôt qu'une
  instance d'`Error`.

### Précision de l'API, plateforme et vérification

- **Propriété `path` élargie** : même si le constructeur infère le `P` demandé, la propriété publique `path` est
  déclarée comme `PropertyPathArray<R>`. Elle ne conserve pas le type tuple exact du chemin fourni.
- **Readonly limité à la compilation** : les chemins tuples ne sont ni copiés, ni gelés. Le code JavaScript peut
  modifier le même tableau après la construction.
- **Environnement Node.js** : le package déclare Node.js 24 ou ultérieur et dépend indirectement d'un code de réflexion
  qui lit des fichiers. Les navigateurs et autres environnements sans système de fichiers ne sont pas des cibles prises
  en charge.
- **Distribution CommonJS** : le package expose actuellement un unique build CommonJS et aucun sous-chemin de package.
- **Dépendance directe non déclarée** : le code source importe `@itrocks/property-type`, mais le manifeste ne le déclare
  pas directement et compte actuellement sur son installation transitive par `@itrocks/reflect`. Les organisations de
  dépendances qui n'exposent pas les packages transitifs aux packages voisins peuvent donc empêcher le build ou le
  chargement du package.
- **Absence de tests** : il n'existe aucun test d'exécution, de déclarations, d'intégration, de régression ou d'entrée
  mal formée. Aucune garantie de compatibilité n'a été établie entre les hiérarchies de classes, imports circulaires,
  versions de TypeScript ou configurations de génération des déclarations.

Ces cas doivent être refusés proprement, documentés comme préconditions ou faire l'objet d'une évolution avant d'être
annoncés comme pris en charge.
