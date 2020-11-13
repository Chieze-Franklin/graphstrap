"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const console_message_1 = require("../../models/console-message");
class Emitter {
    constructor(types) {
        this.types = types;
        this.renames = {};
        this._concreteInterfaceNames = [];
        this.enumNames = [];
        this.scalarNames = ['Date'];
        this.queryResolvers = {
            type: 'interface',
            members: [],
            inherits: [],
            concrete: false
        };
        this.mutationResolvers = {
            type: 'interface',
            members: [],
            inherits: [],
            concrete: false
        };
        this.allResolvers = {
            type: 'interface',
            members: [],
            inherits: [],
            concrete: false
        };
        this._collectMembers = (node) => {
            let members = [];
            if (node.type === 'literal object') {
                members = node.members;
            }
            else {
                const seenProps = new Set();
                let interfaceNode;
                interfaceNode = node;
                while (interfaceNode) {
                    for (const member of interfaceNode.members) {
                        if (seenProps.has(member.name))
                            continue;
                        seenProps.add(member.name);
                        members.push(member);
                    }
                    if (interfaceNode.inherits.length > 1) {
                        throw new Error(`No support for multiple inheritence: ${JSON.stringify(interfaceNode.inherits)}`);
                    }
                    else if (interfaceNode.inherits.length === 1) {
                        const supertype = this.types[interfaceNode.inherits[0]];
                        if (supertype.type !== 'interface') {
                            throw new Error(`Expected supertype to be an interface node: ${supertype}`);
                        }
                        interfaceNode = supertype;
                    }
                    else {
                        interfaceNode = null;
                    }
                }
            }
            for (const member of members) {
                if (member.type !== 'property') {
                    throw new Error(`Expected members to be properties; got ${member.type}`);
                }
            }
            return members;
        };
        this._emitExpression = (node) => {
            if (!node) {
                return '';
            }
            else if (node.type === 'reference') {
                return this._name(node.target);
            }
            else if (node.type === 'array') {
                return `[${node.elements.map(this._emitExpression).join(', ')}]`;
            }
            else if (node.type === 'union') {
                return this._emitUnion(node);
            }
            else if (node.type === 'literal object' || node.type === 'interface') {
                return lodash_1.default(this._collectMembers(node))
                    .map((member) => {
                    return `${this._name(member.name)}: ${this._emitExpression(member.signature)}`;
                })
                    .join(', ');
            }
            else {
                return node.type;
            }
        };
        this._emitInterfaceCreateInputClauses = (node, name, optional = false) => {
            const expression = this._emitExpression(node);
            const mark = optional ? '?' : '';
            if (!node) {
                return '';
            }
            else if (expression === 'ID') {
                return `${name}?: ${expression};`;
            }
            else if (node.type === 'alias') {
                return this._emitInterfaceCreateInputClauses(node.target, name, optional);
            }
            else if (node.type === 'array') {
                if (node.elements[0].type === 'reference') {
                    return `${name}${mark}: ${node.elements[0].target}CreateManyInput;`;
                }
                else {
                    return `${name}${mark}: ${expression};`;
                }
            }
            else if (node.type === 'reference') {
                if (this.enumNames.includes(expression) || this.scalarNames.includes(expression)) {
                    return `${name}${mark}: ${expression};`;
                }
                else {
                    return `${name}${mark}: ${node.target}CreateOneInput;`;
                }
            }
            else {
                return `${name}${mark}: ${expression};`;
            }
        };
        this._emitInterfaceUpdateInputClauses = (node, name) => {
            const expression = this._emitExpression(node);
            if (!node) {
                return '';
            }
            else if (expression === 'ID') {
                return '';
            }
            else if (node.type === 'alias') {
                return this._emitInterfaceUpdateInputClauses(node.target, name);
            }
            else if (node.type === 'array') {
                if (node.elements[0].type === 'reference') {
                    return `${name}?: ${node.elements[0].target}UpdateManyInput;`;
                }
                else {
                    return `${name}?: ${expression};`;
                }
            }
            else if (node.type === 'reference') {
                if (this.enumNames.includes(expression) || this.scalarNames.includes(expression)) {
                    return `${name}?: ${expression};`;
                }
                else {
                    return `${name}?: ${node.target}UpdateOneInput;`;
                }
            }
            else {
                return `${name}?: ${expression};`;
            }
        };
        this._emitInterfaceUpdateManyMutationInputClauses = (node, name) => {
            const expression = this._emitExpression(node);
            if (!node) {
                return '';
            }
            else if (expression === 'ID') {
                return '';
            }
            else if (node.type === 'alias') {
                return this._emitInterfaceUpdateInputClauses(node.target, name);
            }
            else if (node.type === 'array') {
                return '';
            }
            else if (node.type === 'reference') {
                if (this.enumNames.includes(expression) || this.scalarNames.includes(expression)) {
                    return `${name}?: ${expression};`;
                }
                else {
                    return '';
                }
            }
            else {
                return `${name}?: ${expression};`;
            }
        };
        this._emitInterfaceWhereInputClauses = (node, name) => {
            const expression = this._emitExpression(node);
            if (!node) {
                return [];
            }
            else if (node.type === 'alias') {
                return this._emitInterfaceWhereInputClauses(node.target, name);
            }
            else if (node.type === 'string' || expression === 'ID') {
                return [
                    `${name}?: ${expression};`,
                    `${name}_not?: ${expression};`,
                    `${name}_in?: ${expression}[];`,
                    `${name}_not_in?: ${expression}[];`,
                    `${name}_lt?: ${expression};`,
                    `${name}_lte?: ${expression};`,
                    `${name}_gt?: ${expression};`,
                    `${name}_gte?: ${expression};`,
                    `${name}_contains?: ${expression};`,
                    `${name}_not_contains?: ${expression};`,
                    `${name}_starts_with?: ${expression};`,
                    `${name}_not_starts_with?: ${expression};`,
                    `${name}_ends_with?: ${expression};`,
                    `${name}_not_ends_with?: ${expression};`,
                ];
            }
            else if (node.type === 'number') {
                return [
                    `${name}?: ${expression};`,
                    `${name}_not?: ${expression};`,
                    `${name}_in?: ${expression}[];`,
                    `${name}_not_in?: ${expression}[];`,
                    `${name}_lt?: ${expression};`,
                    `${name}_lte?: ${expression};`,
                    `${name}_gt?: ${expression};`,
                    `${name}_gte?: ${expression};`,
                ];
            }
            else if (node.type === 'boolean') {
                return [
                    `${name}?: ${expression};`,
                    `${name}_not?: ${expression};`,
                    `${name}_in?: ${expression}[];`,
                    `${name}_not_in?: ${expression}[];`,
                ];
            }
            else if (expression === 'Date' || expression === 'DateTime') {
                return [
                    `${name}?: ${expression};`,
                    `${name}_not?: ${expression};`,
                    `${name}_in?: ${expression}[];`,
                    `${name}_not_in?: ${expression}[];`,
                    `${name}_lt?: ${expression};`,
                    `${name}_lte?: ${expression};`,
                    `${name}_gt?: ${expression};`,
                    `${name}_gte?: ${expression};`,
                ];
            }
            else if (node.type === 'array') {
                return [
                    `${name}_every?: ${this._emitExpression(node.elements[0])}WhereInput;`,
                    `${name}_some?: ${this._emitExpression(node.elements[0])}WhereInput;`,
                    `${name}_none?: ${this._emitExpression(node.elements[0])}WhereInput;`,
                ];
            }
            else if (node.type === 'reference') {
                if (this.enumNames.includes(expression)) {
                    return [
                        `${name}?: ${expression};`,
                        `${name}_not?: ${expression};`,
                        `${name}_in?: ${expression}[];`,
                        `${name}_not_in?: ${expression}[];`,
                    ];
                }
                else if (this.scalarNames.includes(expression)) {
                    return [
                        `${name}?: ${expression};`,
                        `${name}_not?: ${expression};`,
                        `${name}_in?: ${expression}[];`,
                        `${name}_not_in?: ${expression}[];`,
                        `${name}_lt?: ${expression};`,
                        `${name}_lte?: ${expression};`,
                        `${name}_gt?: ${expression};`,
                        `${name}_gte?: ${expression};`,
                        `${name}_contains?: ${expression};`,
                        `${name}_not_contains?: ${expression};`,
                        `${name}_starts_with?: ${expression};`,
                        `${name}_not_starts_with?: ${expression};`,
                        `${name}_ends_with?: ${expression};`,
                        `${name}_not_ends_with?: ${expression};`,
                    ];
                }
                return [
                    `${name}?: ${expression}WhereInput;`,
                ];
            }
            else {
                return [];
            }
        };
        this._name = (name) => {
            return this.renames[name] || name;
        };
        this.types = lodash_1.default.omitBy(types, (node, name) => this._preprocessNode(node, name));
    }
    get concreteInterfaceNames() {
        return this._concreteInterfaceNames;
    }
    emitAll(stream) {
        stream.write(`/*\nThis files was generated using ${console_message_1.ConsoleMessage.TITLE}\nDo not edit this file manually\n*/\n`);
        stream.write('\n');
        lodash_1.default.each(this.types, (node, name) => this.emitTopLevelNode(node, name, stream));
        this.emitTopLevelNode(this.queryResolvers, 'QueryResolvers', stream);
        this.allResolvers.members.push({
            type: 'property',
            name: 'Query',
            signature: {
                type: 'reference',
                target: `QueryResolvers`
            }
        });
        this.emitTopLevelNode(this.mutationResolvers, 'MutationResolvers', stream);
        this.allResolvers.members.push({
            type: 'property',
            name: 'Mutation',
            signature: {
                type: 'reference',
                target: `MutationResolvers`
            }
        });
        this.emitTopLevelNode(this.allResolvers, 'Resolvers', stream);
    }
    emitTopLevelNode(node, name, stream) {
        let content;
        if (node.type === 'alias') {
            content = this._emitAlias(node, name);
        }
        else if (node.type === 'interface') {
            content = this._emitInterface(node, name);
        }
        else if (node.type === 'enum') {
            content = this._emitEnum(node, name);
        }
        else if (node.type === 'import') {
            content = this._emitImport(node, name);
        }
        else {
            throw new Error(`Can't emit ${node.type} as a top level node`);
        }
        stream.write(`${content}\n\n`);
    }
    _costHelper(node) {
        const costExists = this._getDocTag(node, 'cost');
        if (costExists) {
            return ` @cost${costExists.substring(5)}`;
        }
        return '';
    }
    _directiveHelper(node) {
        const directives = this._getDocTags(node, 'directive')
            .map(tag => ` @${tag.substring(10)}`)
            .join('');
        return directives;
    }
    _emitAlias(node, name) {
        if (this._isPrimitive(node.target)) {
            this.scalarNames.push(this._name(name));
            return `export type ${this._name(name)} = ${node.target.type};`;
        }
        else if (node.target.type === 'method') {
            return `export type ${this._name(name)} = ${this._emitMethod(node.target)};`;
        }
        else if (node.target.type === 'property') {
            return `export type ${this._name(name)} = ${this._emitProperty(node.target)};`;
        }
        else if (node.target.type === 'reference') {
            return `export type ${this._name(name)} = ${this._name(node.target.target)};`;
        }
        else {
            return `export type ${this._name(name)} = ${this._emitExpression(node.target)};`;
        }
    }
    _emitEnum(node, name) {
        this.enumNames.push(this._name(name));
        return `export enum ${this._name(name)} {\n${this._indent(node.values.join(',\n'))}\n}`;
    }
    _emitImport(node, name) {
        return `import ${node.default ? `${node.default}, ` : ''}{\n${this._indent(node.imports || [])}\n} from '${name}';`;
    }
    _emitInterface(node, name) {
        const members = node.members;
        let extendsSection = node.inherits.length ? ` extends ${node.inherits.join(', ')}` : '';
        const properties = lodash_1.default.map(members, (member) => {
            if (member.type === 'method') {
                return `${this._emitMethod(member)};`;
            }
            else if (member.type === 'property') {
                return `${this._emitProperty(member)};`;
            }
            return '';
        });
        if (this._getDocTag(node, 'schema')) {
            return '';
        }
        else if (this._getDocTag(node, 'input')) {
            return `export interface ${this._name(name)}${extendsSection} {\n${this._indent(properties)}\n}`;
        }
        if (node.concrete) {
            let result = `export interface ${this._name(name)}${extendsSection} {\n${this._indent(properties)}\n}`;
            if (name.toLowerCase() !== 'query' && name.toLowerCase() !== 'mutation' && !name.startsWith('_')) {
                this._concreteInterfaceNames.push(name);
                result = `${result}\n\n${this._emitInterfaceBatchPayload(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceCreateInput(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceCreateManyInput(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceCreateOneInput(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceCreateOneMutationArgs(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceDeleteManyMutationArgs(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceFindOneQueryArgs(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceFindManyQueryArgs(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceOrderByInput(node, name)}`;
                result = `${result}\n\n${this._emitInterfacePayload(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceUpdateInput(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceUpdateManyInput(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceUpdateManyMutationArgs(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceUpdateManyMutationInput(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceUpdateOneInput(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceUpdateOneMutationArgs(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceUpsertOneMutationArgs(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceWhereInput(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceWhereUniqueInput(node, name)}`;
                this._emitQueryExtension(node, name);
                this._emitMutationExtension(node, name);
            }
            return result;
        }
        let result = `export interface ${this._name(name)}${extendsSection} {\n${this._indent(properties)}\n}`;
        const fragmentDeclaration = this._getDocTag(node, 'fragment');
        if (fragmentDeclaration) {
            result = `${result}\n\n${fragmentDeclaration} {\n${this._indent(members.map((m) => m.name))}\n}`;
        }
        return result;
    }
    _emitInterfaceBatchPayload(node, name) {
        const camelCasedName = name.charAt(0).toLowerCase() + name.substr(1);
        const properties = [
            `count: Long;`,
            `errors?: Error[];`,
            `${camelCasedName}s?: ${name}[];`,
        ];
        return `export interface ${name}BatchPayload {\n${this._indent(properties)}\n}`;
    }
    _emitInterfaceCreateInput(node, name) {
        const members = lodash_1.default(this._transitiveInterfaces(node))
            .map((i) => i.members)
            .flatten()
            .uniqBy('name')
            .sortBy('name')
            .value();
        if (!members.length) {
            members.push({
                type: 'property',
                name: '_placeholder',
                signature: { type: 'boolean' },
                optional: true,
            });
        }
        let properties = lodash_1.default.map(members, (member) => {
            if (member.type === 'method') {
                if (lodash_1.default.size(member.parameters) === 0) {
                    return this._emitInterfaceCreateInputClauses(member.returns, member.name, member.optional);
                }
                return '';
            }
            else if (member.type === 'property') {
                return this._emitInterfaceCreateInputClauses(member.signature, member.name, member.optional);
            }
            else {
                throw new Error(`Can't serialize ${member.type} as a property of an interface`);
            }
        });
        return `export interface ${name}CreateInput {\n${this._indent(properties.filter(p => !!(p)))}\n}`;
    }
    _emitInterfaceCreateManyInput(node, name) {
        const properties = [
            `connect?: ${name}WhereUniqueInput[];`
        ];
        return `export interface ${name}CreateManyInput {\n${this._indent(properties)}\n}`;
    }
    _emitInterfaceCreateOneInput(node, name) {
        const properties = [
            `connect?: ${name}WhereUniqueInput;`
        ];
        return `export interface ${name}CreateOneInput {\n${this._indent(properties)}\n}`;
    }
    _emitInterfaceCreateOneMutationArgs(node, name) {
        const properties = [`data: ${name}CreateInput;`];
        return `export interface ${name}CreateOneMutationArgs {\n${this._indent(properties)}\n}`;
    }
    _emitInterfaceDeleteManyMutationArgs(node, name) {
        const properties = [`where: ${name}WhereInput;`];
        return `export interface ${name}DeleteManyMutationArgs {\n${this._indent(properties)}\n}`;
    }
    _emitInterfaceFindOneQueryArgs(node, name) {
        const properties = [`id: ID;`];
        return `export interface ${name}FindOneQueryArgs {\n${this._indent(properties)}\n}`;
    }
    _emitInterfaceFindManyQueryArgs(node, name) {
        const properties = [
            `where?: ${name}WhereInput | null | undefined;`,
            `orderBy?: ${name}OrderByInput | null | undefined;`,
            'skip?: number;',
            'after?: string;',
            'before?: string;',
            'first?: number;',
            'last?: number;'
        ];
        return `export interface ${name}FindManyQueryArgs {\n${this._indent(properties)}\n}`;
    }
    _emitInterfaceOrderByInput(node, name) {
        const members = lodash_1.default(this._transitiveInterfaces(node))
            .map((i) => i.members)
            .flatten()
            .uniqBy('name')
            .sortBy('name')
            .value();
        if (!members.length) {
            members.push({
                type: 'property',
                name: '_placeholder',
                signature: { type: 'boolean' },
                optional: true,
            });
        }
        let properties = lodash_1.default.map(members, (member) => {
            if (member.type === 'method') {
                if (lodash_1.default.size(member.parameters) === 0) {
                    return [`${member.name}_ASC`, `${member.name}_DESC`];
                }
                return [];
            }
            else if (member.type === 'property') {
                return [`${member.name}_ASC`, `${member.name}_DESC`];
            }
            else {
                throw new Error(`Can't serialize ${member.type} as a property of an interface`);
            }
        });
        return `export enum ${name}OrderByInput {\n${this._indent(properties.flat().join(',\n'))}\n}`;
    }
    _emitInterfacePayload(node, name) {
        const camelCasedName = name.charAt(0).toLowerCase() + name.substr(1);
        const properties = [
            `${camelCasedName}?: ${name};`,
            `errors?: Error[];`,
        ];
        return `export interface ${name}Payload {\n${this._indent(properties)}\n}`;
    }
    _emitInterfaceUpdateInput(node, name) {
        const members = lodash_1.default(this._transitiveInterfaces(node))
            .map((i) => i.members)
            .flatten()
            .uniqBy('name')
            .sortBy('name')
            .value();
        if (!members.length) {
            members.push({
                type: 'property',
                name: '_placeholder',
                signature: { type: 'boolean' },
                optional: true,
            });
        }
        let properties = lodash_1.default.map(members, (member) => {
            if (member.type === 'method') {
                if (lodash_1.default.size(member.parameters) === 0) {
                    return this._emitInterfaceUpdateInputClauses(member.returns, member.name);
                }
                return '';
            }
            else if (member.type === 'property') {
                return this._emitInterfaceUpdateInputClauses(member.signature, member.name);
            }
            else {
                throw new Error(`Can't serialize ${member.type} as a property of an interface`);
            }
        });
        return `export interface ${name}UpdateInput {\n${this._indent(properties.filter(p => !!(p)))}\n}`;
    }
    _emitInterfaceUpdateManyInput(node, name) {
        const properties = [
            `connect?: ${name}WhereUniqueInput[]`
        ];
        return `export interface ${name}UpdateManyInput {\n${this._indent(properties)}\n}`;
    }
    _emitInterfaceUpdateManyMutationArgs(node, name) {
        const properties = [
            `data: ${name}UpdateManyMutationInput;`,
            `where: ${name}WhereInput;`
        ];
        return `export interface ${name}UpdateManyMutationArgs {\n${this._indent(properties)}\n}`;
    }
    _emitInterfaceUpdateManyMutationInput(node, name) {
        const members = lodash_1.default(this._transitiveInterfaces(node))
            .map((i) => i.members)
            .flatten()
            .uniqBy('name')
            .sortBy('name')
            .value();
        if (!members.length) {
            members.push({
                type: 'property',
                name: '_placeholder',
                signature: { type: 'boolean' },
                optional: true,
            });
        }
        let properties = lodash_1.default.map(members, (member) => {
            if (member.type === 'method') {
                if (lodash_1.default.size(member.parameters) === 0) {
                    return this._emitInterfaceUpdateManyMutationInputClauses(member.returns, member.name);
                }
                return '';
            }
            else if (member.type === 'property') {
                return this._emitInterfaceUpdateManyMutationInputClauses(member.signature, member.name);
            }
            else {
                throw new Error(`Can't serialize ${member.type} as a property of an interface`);
            }
        });
        return `export interface ${name}UpdateManyMutationInput {\n${this._indent(properties.filter(p => !!(p)))}\n}`;
    }
    _emitInterfaceUpdateOneInput(node, name) {
        const properties = [
            `connect?: ${name}WhereUniqueInput`
        ];
        return `export interface ${name}UpdateOneInput {\n${this._indent(properties)}\n}`;
    }
    _emitInterfaceUpdateOneMutationArgs(node, name) {
        const properties = [
            `id: ID;`,
            `data: ${name}UpdateInput;`
        ];
        return `export interface ${name}UpdateOneMutationArgs {\n${this._indent(properties)}\n}`;
    }
    _emitInterfaceUpsertOneMutationArgs(node, name) {
        const properties = [
            `id: ID;`,
            `create: ${name}CreateInput;`,
            `update: ${name}UpdateInput;`
        ];
        return `export interface ${name}UpsertOneMutationArgs {\n${this._indent(properties)}\n}`;
    }
    _emitInterfaceWhereInput(node, name) {
        const members = lodash_1.default(this._transitiveInterfaces(node))
            .map((i) => i.members)
            .flatten()
            .uniqBy('name')
            .sortBy('name')
            .value();
        if (!members.length) {
            members.push({
                type: 'property',
                name: '_placeholder',
                signature: { type: 'boolean' },
                optional: true,
            });
        }
        let properties = lodash_1.default.map(members, (member) => {
            if (member.type === 'method') {
                if (lodash_1.default.size(member.parameters) === 0) {
                    return this._emitInterfaceWhereInputClauses(member.returns, member.name);
                }
                return [];
            }
            else if (member.type === 'property') {
                return this._emitInterfaceWhereInputClauses(member.signature, member.name);
            }
            else {
                throw new Error(`Can't serialize ${member.type} as a property of an interface`);
            }
        });
        properties.push([
            `AND?: ${name}WhereInput[];`,
            `OR?: ${name}WhereInput[];`,
            `NOT?: ${name}WhereInput[];`
        ]);
        return `export interface ${name}WhereInput {\n${this._indent(properties.flat())}\n}`;
    }
    _emitInterfaceWhereUniqueInput(node, name) {
        const properties = [`id: ID;`];
        return `export interface ${name}WhereUniqueInput {\n${this._indent(properties)}\n}`;
    }
    _emitMethod(node) {
        let parameters = [];
        lodash_1.default.forEach(node.parameters, (parameter, name) => {
            parameters.push(`${name}: ${this._emitExpression(parameter)}`);
        });
        const mark = node.optional ? '?' : '';
        const nameSection = node.name ? `${this._name(node.name)}${mark}: ` : '';
        const returnType = this._emitExpression(node.returns);
        return `${nameSection}(${parameters.join(', ')}) => ${returnType}`;
    }
    _emitProperty(node) {
        const mark = node.optional ? '?' : '';
        const nameSection = node.name ? `${this._name(node.name)}${mark}: ` : '';
        return `${nameSection}${this._emitExpression(node.signature)}`;
    }
    _emitMutationExtension(node, name) {
        const pascalCasedName = name.charAt(0).toUpperCase() + name.substr(1);
        this.mutationResolvers.members.push({
            type: 'property',
            name: `create${pascalCasedName}`,
            signature: {
                type: 'reference',
                target: `__Resolver<{}, ${name}CreateOneMutationArgs, ${name}Payload>`
            }
        }, {
            type: 'property',
            name: `delete${pascalCasedName}`,
            signature: {
                type: 'reference',
                target: `__Resolver<{}, ${name}FindOneQueryArgs, ${name}Payload>`
            }
        }, {
            type: 'property',
            name: `deleteMany${pascalCasedName}s`,
            signature: {
                type: 'reference',
                target: `__Resolver<{}, ${name}DeleteManyMutationArgs, ${name}BatchPayload>`
            }
        }, {
            type: 'property',
            name: `update${pascalCasedName}`,
            signature: {
                type: 'reference',
                target: `__Resolver<{}, ${name}UpdateOneMutationArgs, ${name}Payload>`
            }
        }, {
            type: 'property',
            name: `updateMany${pascalCasedName}s`,
            signature: {
                type: 'reference',
                target: `__Resolver<{}, ${name}UpdateManyMutationArgs, ${name}BatchPayload>`
            }
        }, {
            type: 'property',
            name: `upsert${pascalCasedName}`,
            signature: {
                type: 'reference',
                target: `__Resolver<{}, ${name}UpsertOneMutationArgs, ${name}Payload>`
            }
        });
    }
    _emitQueryExtension(node, name) {
        const camelCasedName = name.charAt(0).toLowerCase() + name.substr(1);
        this.queryResolvers.members.push({
            type: 'property',
            name: camelCasedName,
            signature: {
                type: 'reference',
                target: `__Resolver<{}, ${name}FindOneQueryArgs, ${name}Payload>`
            }
        }, {
            type: 'property',
            name: `${camelCasedName}s`,
            signature: {
                type: 'reference',
                target: `__Resolver<{}, ${name}FindManyQueryArgs, ${name}BatchPayload>`
            }
        });
    }
    _emitUnion(node) {
        let unions = [];
        lodash_1.default.forEach(node.types, union => {
            unions.push(this._emitExpression(union));
        });
        return `(${unions.join(' | ')})`;
    }
    _getDocTag(node, prefix) {
        if (!node.documentation)
            return null;
        for (const tag of node.documentation.tags) {
            if (tag.title !== 'graphql')
                continue;
            if (tag.description.startsWith(prefix))
                return tag.description;
        }
        return null;
    }
    _getDocTags(node, prefix) {
        const matchingTags = [];
        if (!node.documentation)
            return matchingTags;
        for (const tag of node.documentation.tags) {
            if (tag.title !== 'graphql')
                continue;
            if (tag.description.startsWith(prefix))
                matchingTags.push(tag.description);
        }
        return matchingTags;
    }
    _hasDocTag(node, prefix) {
        return !!this._getDocTag(node, prefix);
    }
    _indent(content) {
        if (!lodash_1.default.isArray(content))
            content = content.split('\n');
        return content.map(s => `  ${s}`).join('\n');
    }
    _isPrimitive(node) {
        return node.type === 'string' || node.type === 'number' || node.type === 'boolean' || node.type === 'any';
    }
    _isNamedNode(node) {
        return node.type === 'method' || node.type === 'property';
    }
    _preprocessNode(node, name) {
        if (node.type === 'alias' && node.target.type === 'reference') {
            const referencedNode = this.types[node.target.target];
            if (!referencedNode)
                return false;
            if (this._isPrimitive(referencedNode) || referencedNode.type === 'enum') {
                this.renames[name] = node.target.target;
                return true;
            }
        }
        else if (node.type === 'alias' && this._hasDocTag(node, 'ID')) {
            this.renames[name] = 'ID';
            return true;
        }
        return false;
    }
    _transitiveInterfaces(node) {
        let interfaces = [node];
        for (const name of node.inherits) {
            const inherited = this.types[name];
            interfaces = interfaces.concat(this._transitiveInterfaces(inherited));
        }
        return lodash_1.default.uniq(interfaces);
    }
}
exports.default = Emitter;
