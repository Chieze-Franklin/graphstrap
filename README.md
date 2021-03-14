# graphstrap

graphstrap allows you to bootstrap a GraphQL server by converting TypeScript types to GraphQL schema and their TypeScript resolvers.

You define your business models as TypeScript interfaces, and graphstrap will generate
the appropriate graphql schema along with their resolvers.

You can install graphstrap globally:
```bash
npm i -g graphstrap
```

Or per project
```bash
npm i -D graphstrap
```

### Configuring graphstrap

graphstrap works by taking in models (basically TypeScript types) and outputing schema and resolvers for a functioning GraphQL service.
To specify where the models can be found, as well as where the output files should be emitted to, create a `graphstrap.json` file in the
project's root directory.

An example is shown below:

```json
{
  "config": {
    "in": "./models/**/*.ts",
    "schema": {
      "outDir": "./generated/schema"
    },
    "resolvers": {
      "rootDir": "./generated/resolvers",
      "context": {
        "import": "Context",
        "from": "../../src/context"
      },
      "queries": {
        "templates": {
          "model": "./templates/model.template",
          "models": "./templates/models.template"
        }
      },
      "mutations": {
        "templates": {
          "createModel": "./templates/create-model.template",
          "deleteModel": "./templates/delete-model.template",
          "deleteManyModels": "./templates/delete-many-models.template",
          "updateModel": "./templates/update-model.template",
          "updateManyModels": "./templates/update-many-models.template",
          "upsertModel": "./templates/upsert-model.template"
        }
      }
    }
  }
}
```

- `config.in`: a glob pattern for the input model files
- `config.schema.outDir`: the directory into which the auto-generated schema will be emitted to. The name of the schema file will be `schema.graphql`.
- `config.resolvers.rootDir`: the root directory for all the auto-generated resolver files.
- `config.resolvers.context`: this tells graphstrap how to located the GraphQL context every resolver will have access to.
- `config.resolvers.queries.templates`: this is where template code for auto-generated query resolvers are found.
- `config.resolvers.mutations.templates`: this is where template code for auto-generated mutation resolvers are found.

**Note** that the file path specified in `config.resolvers.context.from` is relative to the root directory for resolvers (`config.resolvers.rootDir`).

### Creating Models

Let's create some models losely based on the popular Microsoft Northwind database.

We will have the following models:

- Employee
- Customer

Each model will have an identifier called `id`. To avoid repeating this in every model, we will create
this in a base interface called `Identifiable`.

```ts
// file: id.ts

/** @graphql ID */
export type Id = string;

export interface Identifiable {
  id: Id;
}
```

Each model may also have time stamps `createdAt` and `updatedAt`. To avoid repeating these in every model, we will create
them in a base interface called `TimeStamped`.

```ts
// file: timestamp.ts

export interface TimeStamped {
  createdAt?: Date;
  updatedAt?: Date;
}
```

Now, we create our models.

```ts
// file: models.ts

import { Identifiable } from "./id";
import { TimeStamped } from "./timestamp";

// Type aliases become 'GraphQL' scalars
export type Url = string;

export interface Employee extends Identifiable, TimeStamped {
  lastName: string;
  firstName: string;
  title?: string;
  birthDate?: Date;
  hireDate?: Date;
  address?: string;
}

export interface Customer extends Identifiable, TimeStamped {
  companyName: string;
  contactName: string;
  contactTitle?: string;
  address?: string;
  phone?: string;
}
```

### Declaring Your Models

To determine what TypeScript interfaces should be converted to GraphQL types, graphstrap looks for a *manifest*.

A manifest is a TypeScript interface that is decorated with the comment `/** @graphql manifest */`.
This interface is expected to contain fields, where each field references an interface that should be converted to a GraphQL type.
Note that it is enough to reference the major types; you do not need to reference input types, for instance.

```ts
// file: root.ts

import { Employee, Customer } from './models';

/** @graphql manifest */
export interface Manifest {
  employee: Employee;
  customer: Customer;
}
```

### Emitting Schema and Resolvers

With the `graphstrap.json` config file defined in the root directory of your project, and the input TypeScript models defined,
you can now run graphstrap to bootstrap your GraphQL server.

To run graphstrap globally, in your project's root directory run:
```bash
graphstrap
```

To run the graphstrap instance installed for a project, in the project's root directory run:
```bash
./node_modules/graphstrap/bin/graphstrap
```

### Decorations

##### /** @graphql manifest */

##### /** @graphql input */

##### /** @graphql directive */

### Templates
