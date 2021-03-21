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

- Customer
- Product
- Order
- Supplier

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

// Type aliases become 'GraphQL' scalars.
export type Url = string;

export enum Region {
  East,
  North,
  South,
  West
}

export interface Customer extends Identifiable, TimeStamped {
  companyName: string;
  contactName: string;
  contactTitle?: string;
  address?: string;
  phone?: string;
  region?: Region;
}

export interface Product extends Identifiable, TimeStamped {
  name: string;
  quantityPerUnit: number;
  unitPrice: number;
  unitsInStock: number;
}

export interface Order extends Identifiable, TimeStamped {
  customer: Customer;
  product: Product;
  orderDate: Date;
  requiredDate?: Date;
  shippedDate?: Date;
  shipRegion?: Region;
}

export interface Supplier extends Identifiable, TimeStamped {
  companyName: string;
  contactName?: string;
  address: string;
  region?: Region;
  phone?: string;
  homePage?: Url;
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
  customer: Customer;
  product: Product;
  order: Order;
  supplier: Supplier;
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

The processed and output files should be printed on the terminal.

![code4](https://user-images.githubusercontent.com/6097630/111146064-4df75280-8589-11eb-87b4-d5fef03dcda9.png)

##### Generated Schema

graphstrap will generate a `schema.graphql` file in the schema output directory specified in the `graphstrap.config` file.
Below are the generated queries and mutations from the models specified above.

```gql
type Query {
  customer(id: ID!): Customer!
  customers(where: CustomerWhereInput, orderBy: CustomerOrderByInput, skip: Int, after: String, before: String, first: Int, last: Int): [Customer!]!
  product(id: ID!): Product!
  products(where: ProductWhereInput, orderBy: ProductOrderByInput, skip: Int, after: String, before: String, first: Int, last: Int): [Product!]!
  order(id: ID!): Order!
  orders(where: OrderWhereInput, orderBy: OrderOrderByInput, skip: Int, after: String, before: String, first: Int, last: Int): [Order!]!
  supplier(id: ID!): Supplier!
  suppliers(where: SupplierWhereInput, orderBy: SupplierOrderByInput, skip: Int, after: String, before: String, first: Int, last: Int): [Supplier!]!
}
type Mutation {
  createCustomer(data: CustomerCreateInput!): Customer!
  deleteCustomer(id: ID!): Customer!
  deleteManyCustomers(where: CustomerWhereInput): [Customer!]!
  updateCustomer(id: ID!, data: CustomerUpdateInput!): Customer
  updateManyCustomers(data: CustomerUpdateManyMutationInput!, where: CustomerWhereInput): [Customer!]!
  upsertCustomer(id: ID!, create: CustomerCreateInput!, update: CustomerUpdateInput!): Customer!
  createProduct(data: ProductCreateInput!): Product!
  deleteProduct(id: ID!): Product!
  deleteManyProducts(where: ProductWhereInput): [Product!]!
  updateProduct(id: ID!, data: ProductUpdateInput!): Product
  updateManyProducts(data: ProductUpdateManyMutationInput!, where: ProductWhereInput): [Product!]!
  upsertProduct(id: ID!, create: ProductCreateInput!, update: ProductUpdateInput!): Product!
  createOrder(data: OrderCreateInput!): Order!
  deleteOrder(id: ID!): Order!
  deleteManyOrders(where: OrderWhereInput): [Order!]!
  updateOrder(id: ID!, data: OrderUpdateInput!): Order
  updateManyOrders(data: OrderUpdateManyMutationInput!, where: OrderWhereInput): [Order!]!
  upsertOrder(id: ID!, create: OrderCreateInput!, update: OrderUpdateInput!): Order!
  createSupplier(data: SupplierCreateInput!): Supplier!
  deleteSupplier(id: ID!): Supplier!
  deleteManySuppliers(where: SupplierWhereInput): [Supplier!]!
  updateSupplier(id: ID!, data: SupplierUpdateInput!): Supplier
  updateManySuppliers(data: SupplierUpdateManyMutationInput!, where: SupplierWhereInput): [Supplier!]!
  upsertSupplier(id: ID!, create: SupplierCreateInput!, update: SupplierUpdateInput!): Supplier!
}
```

Not only does graphstrap generate the root queries and mutations, it also generates the appropriate input types,
including input types for filtering and ordering.
Below is the ordering input (`CustomerOrderByInput`) for the `Customer` model.

```gql
enum CustomerOrderByInput {
  address_ASC
  address_DESC
  companyName_ASC
  companyName_DESC
  contactName_ASC
  contactName_DESC
  contactTitle_ASC
  contactTitle_DESC
  createdAt_ASC
  createdAt_DESC
  id_ASC
  id_DESC
  phone_ASC
  phone_DESC
  region_ASC
  region_DESC
  updatedAt_ASC
  updatedAt_DESC
}
```

##### Generated Resolvers

graphstrap will generate a `resolvers.ts` file in the resolvers root directory specified in the `graphstrap.config` file.
This file contains the interfaces your query and mutation resolvers need to implement.

```ts
export interface QueryResolvers {
  customer: __Resolver<{}, CustomerFindOneQueryArgs, Customer>;
  customers: __Resolver<{}, CustomerFindManyQueryArgs, Customer[]>;
  product: __Resolver<{}, ProductFindOneQueryArgs, Product>;
  products: __Resolver<{}, ProductFindManyQueryArgs, Product[]>;
  order: __Resolver<{}, OrderFindOneQueryArgs, Order>;
  orders: __Resolver<{}, OrderFindManyQueryArgs, Order[]>;
  supplier: __Resolver<{}, SupplierFindOneQueryArgs, Supplier>;
  suppliers: __Resolver<{}, SupplierFindManyQueryArgs, Supplier[]>;
}

export interface MutationResolvers {
  createCustomer: __Resolver<{}, CustomerCreateOneMutationArgs, Customer>;
  deleteCustomer: __Resolver<{}, CustomerFindOneQueryArgs, Customer>;
  deleteManyCustomers: __Resolver<{}, CustomerDeleteManyMutationArgs, Customer[]>;
  updateCustomer: __Resolver<{}, CustomerUpdateOneMutationArgs, Customer>;
  updateManyCustomers: __Resolver<{}, CustomerUpdateManyMutationArgs, Customer[]>;
  upsertCustomer: __Resolver<{}, CustomerUpsertOneMutationArgs, Customer>;
  createProduct: __Resolver<{}, ProductCreateOneMutationArgs, Product>;
  deleteProduct: __Resolver<{}, ProductFindOneQueryArgs, Product>;
  deleteManyProducts: __Resolver<{}, ProductDeleteManyMutationArgs, Product[]>;
  updateProduct: __Resolver<{}, ProductUpdateOneMutationArgs, Product>;
  updateManyProducts: __Resolver<{}, ProductUpdateManyMutationArgs, Product[]>;
  upsertProduct: __Resolver<{}, ProductUpsertOneMutationArgs, Product>;
  createOrder: __Resolver<{}, OrderCreateOneMutationArgs, Order>;
  deleteOrder: __Resolver<{}, OrderFindOneQueryArgs, Order>;
  deleteManyOrders: __Resolver<{}, OrderDeleteManyMutationArgs, Order[]>;
  updateOrder: __Resolver<{}, OrderUpdateOneMutationArgs, Order>;
  updateManyOrders: __Resolver<{}, OrderUpdateManyMutationArgs, Order[]>;
  upsertOrder: __Resolver<{}, OrderUpsertOneMutationArgs, Order>;
  createSupplier: __Resolver<{}, SupplierCreateOneMutationArgs, Supplier>;
  deleteSupplier: __Resolver<{}, SupplierFindOneQueryArgs, Supplier>;
  deleteManySuppliers: __Resolver<{}, SupplierDeleteManyMutationArgs, Supplier[]>;
  updateSupplier: __Resolver<{}, SupplierUpdateOneMutationArgs, Supplier>;
  updateManySuppliers: __Resolver<{}, SupplierUpdateManyMutationArgs, Supplier[]>;
  upsertSupplier: __Resolver<{}, SupplierUpsertOneMutationArgs, Supplier>;
}

export interface Resolvers {
  Query: QueryResolvers;
  Mutation: MutationResolvers;
}
```

All necessary input types are also generated. For instance, below are the definitions for `CustomerFindManyQueryArgs`
and `CustomerOrderByInput`.

```ts
export interface CustomerFindManyQueryArgs {
  where?: CustomerWhereInput | null | undefined;
  orderBy?: CustomerOrderByInput | null | undefined;
  skip?: number;
  after?: string;
  before?: string;
  first?: number;
  last?: number;
}

export enum CustomerOrderByInput {
  address_ASC,
  address_DESC,
  companyName_ASC,
  companyName_DESC,
  contactName_ASC,
  contactName_DESC,
  contactTitle_ASC,
  contactTitle_DESC,
  createdAt_ASC,
  createdAt_DESC,
  id_ASC,
  id_DESC,
  phone_ASC,
  phone_DESC,
  region_ASC,
  region_DESC,
  updatedAt_ASC,
  updatedAt_DESC
}
```

In addition to these interfaces, actual query and mutation resolvers implementing these interfaces are generated in the
`queries` and `mutations` subdirectories of the resolvers directory. As discussed in the section below, these files are typically
generated in pairs: one which cannot be manually edited (and is regenerated every time you run graphstrap) and one which can be
edited (and is generated **ONLY** if the file is missing).

### Making Changes

Beyond generating the interfaces your resolvers need to implement, graphstrap also generates the boiler plate code for
these resolvers. These resolvers are typically split between 2 files; one which should not be edited and one which can be
edited to modify the default behaviours of the resolvers.

##### Files that should not be edited

Files which should not be edited contain default implementation/behaviour as generated by graphstrap.
These files are overwritten every time you run graphstrap. You can easily identify these files as they
typically contain `CondeGen` in their names, and have comments at the top saying
`This file was generated using graphstrap Do not edit this file manually`.

An example is shown below.

*/resolvers/queries/customer/CustomerQueryResolversCodeGen.ts*
```ts
/*
This file was generated using graphstrap
Do not edit this file manually
*/

import { QueryResolvers, Customer } from '../../resolvers';

export const CustomerQueryResolversCodeGen: Pick<QueryResolvers, "customer" | "customers"> = {
  async customer(root, args, ctx, info) {
    
    const { dataSources: { db } } = ctx;
    const { id } = args;
    
    const customer = await db.findOne<Customer>({ id, table: "customers" });
    if (!customer) {
      throw new Error(`Could not find the Customer with ID ${id}`);
    }
    
    return customer;
  },
  async customers(root, args, ctx, info) {
    const { dataSources: { db } } = ctx;
    const { where, orderBy } = args;
    
    const customers = await db.findMany<Customer>({ table: "customers" })
    
    return customers;
  }
}
```

##### Files that can be edited

Files which can be edited allow you to modify the default implementation/behaviour generated by graphstrap.
These files are generated only if they do not exist when run graphstrap. You can easily identify these files as they
typically do not contain `CondeGen` in their names, and have comments at the top saying
`This file will be generated by graphstrap only if it does NOT exist`.

An example is shown below.

*/resolvers/queries/customer/CustomerQueryResolvers.ts*
```ts
/*
This file will be generated by graphstrap only if it does NOT exist
*/

import { QueryResolvers } from '../../resolvers';
import { CustomerQueryResolversCodeGen } from './CustomerQueryResolversCodeGen';

export const CustomerQueryResolvers: Pick<QueryResolvers, "customer" | "customers"> = {
  ...CustomerQueryResolversCodeGen,
  // You can add more functions and even override those in CustomerQueryResolversCodeGen
}
```

### Decorations

##### /** @graphql manifest */

##### /** @graphql input */

##### /** @graphql directive */

### Templates

### Custom Schema

##### Object Resolvers
