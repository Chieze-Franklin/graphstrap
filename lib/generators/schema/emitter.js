"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const console_message_1 = require("../../models/console-message");
class Emitter {
    constructor(types) {
        this.types = types;
        this.renames = {};
        this.enumNames = [];
        this.scalarNames = [];
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
            else if (node.type === 'string') {
                return 'String';
            }
            else if (node.type === 'number') {
                return 'Float';
            }
            else if (node.type === 'boolean') {
                return 'Boolean';
            }
            else if (node.type === 'reference') {
                return this._name(node.target);
            }
            else if (node.type === 'array') {
                return `[${node.elements.map(this._emitExpression).join(' | ')}]`;
            }
            else if (node.type === 'literal object' || node.type === 'interface') {
                return lodash_1.default(this._collectMembers(node))
                    .map((member) => {
                    return `${this._name(member.name)}: ${this._emitExpression(member.signature)}`;
                })
                    .join(', ');
            }
            else {
                throw new Error(`Can't serialize ${node.type} as an expression`);
            }
        };
        this._emitInterfaceCreateInputClauses = (node, name, optional = false) => {
            const expression = this._emitExpression(node);
            const mark = optional ? '' : '!';
            if (!node) {
                return '';
            }
            else if (expression === 'ID') {
                return `${name}: ${expression}`;
            }
            else if (node.type === 'alias') {
                return this._emitInterfaceCreateInputClauses(node.target, name);
            }
            else if (node.type === 'array') {
                if (node.elements[0].type === 'reference') {
                    return `${name}: ${node.elements[0].target}CreateManyInput${mark}`;
                }
                else {
                    return `${name}: ${expression}${mark}`;
                }
            }
            else if (node.type === 'reference') {
                if (this.enumNames.includes(expression) || this.scalarNames.includes(expression)) {
                    return `${name}: ${expression}${mark}`;
                }
                else {
                    return `${name}: ${node.target}CreateOneInput${mark}`;
                }
            }
            else {
                return `${name}: ${expression}${mark}`;
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
                    return `${name}: ${node.elements[0].target}UpdateManyInput`;
                }
                else {
                    return `${name}: ${expression}`;
                }
            }
            else if (node.type === 'reference') {
                if (this.enumNames.includes(expression) || this.scalarNames.includes(expression)) {
                    return `${name}: ${expression}`;
                }
                else {
                    return `${name}: ${node.target}UpdateOneInput`;
                }
            }
            else {
                return `${name}: ${expression}`;
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
                    return `${name}: ${expression}`;
                }
                else {
                    return '';
                }
            }
            else {
                return `${name}: ${expression}`;
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
                    `${name}: ${expression}`,
                    `${name}_not: ${expression}`,
                    `${name}_in: [${expression}!]`,
                    `${name}_not_in: [${expression}!]`,
                    `${name}_lt: ${expression}`,
                    `${name}_lte: ${expression}`,
                    `${name}_gt: ${expression}`,
                    `${name}_gte: ${expression}`,
                    `${name}_contains: ${expression}`,
                    `${name}_not_contains: ${expression}`,
                    `${name}_starts_with: ${expression}`,
                    `${name}_not_starts_with: ${expression}`,
                    `${name}_ends_with: ${expression}`,
                    `${name}_not_ends_with: ${expression}`,
                ];
            }
            else if (node.type === 'number') {
                return [
                    `${name}: ${expression}`,
                    `${name}_not: ${expression}`,
                    `${name}_in: [${expression}!]`,
                    `${name}_not_in: [${expression}!]`,
                    `${name}_lt: ${expression}`,
                    `${name}_lte: ${expression}`,
                    `${name}_gt: ${expression}`,
                    `${name}_gte: ${expression}`,
                ];
            }
            else if (node.type === 'boolean') {
                return [
                    `${name}: ${expression}`,
                    `${name}_not: ${expression}`,
                    `${name}_in: [${expression}!]`,
                    `${name}_not_in: [${expression}!]`,
                ];
            }
            else if (expression === 'Date' || expression === 'DateTime') {
                return [
                    `${name}: ${expression}`,
                    `${name}_not: ${expression}`,
                    `${name}_in: [${expression}!]`,
                    `${name}_not_in: [${expression}!]`,
                    `${name}_lt: ${expression}`,
                    `${name}_lte: ${expression}`,
                    `${name}_gt: ${expression}`,
                    `${name}_gte: ${expression}`,
                ];
            }
            else if (node.type === 'array') {
                return [
                    `${name}_every: ${this._emitExpression(node.elements[0])}WhereInput`,
                    `${name}_some: ${this._emitExpression(node.elements[0])}WhereInput`,
                    `${name}_none: ${this._emitExpression(node.elements[0])}WhereInput`,
                ];
            }
            else if (node.type === 'reference') {
                if (this.enumNames.includes(expression)) {
                    return [
                        `${name}: ${expression}`,
                        `${name}_not: ${expression}`,
                        `${name}_in: [${expression}!]`,
                        `${name}_not_in: [${expression}!]`,
                    ];
                }
                else if (this.scalarNames.includes(expression)) {
                    return [
                        `${name}: ${expression}`,
                        `${name}_not: ${expression}`,
                        `${name}_in: [${expression}!]`,
                        `${name}_not_in: [${expression}!]`,
                        `${name}_lt: ${expression}`,
                        `${name}_lte: ${expression}`,
                        `${name}_gt: ${expression}`,
                        `${name}_gte: ${expression}`,
                        `${name}_contains: ${expression}`,
                        `${name}_not_contains: ${expression}`,
                        `${name}_starts_with: ${expression}`,
                        `${name}_not_starts_with: ${expression}`,
                        `${name}_ends_with: ${expression}`,
                        `${name}_not_ends_with: ${expression}`,
                    ];
                }
                return [
                    `${name}: ${expression}WhereInput`,
                ];
            }
            else {
                return [];
            }
        };
        this._name = (name) => {
            name = this.renames[name] || name;
            return name.replace(/\W/g, '_');
        };
        this.types = lodash_1.default.omitBy(types, (node, name) => this._preprocessNode(node, name));
    }
    emitAll(stream) {
        stream.write(`"""\nThis files was generated using ${console_message_1.ConsoleMessage.TITLE}\nDo not edit this file manually\n"""\n`);
        stream.write('\n');
        lodash_1.default.each(this.types, (node, name) => this.emitTopLevelNode(node, name, stream));
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
            return `scalar ${this._name(name)}`;
        }
        else if (node.target.type === 'reference') {
            return `union ${this._name(name)} = ${this._name(node.target.target)}`;
        }
        else if (node.target.type === 'union') {
            return this._emitUnion(node.target, name);
        }
        else {
            throw new Error(`Can't serialize ${JSON.stringify(node.target)} as an alias`);
        }
    }
    _emitEnum(node, name) {
        this.enumNames.push(this._name(name));
        return `enum ${this._name(name)} {\n${this._indent(node.values)}\n}`;
    }
    _emitInterface(node, name) {
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
            });
        }
        const properties = lodash_1.default.map(members, (member) => {
            if (member.type === 'method') {
                let parameters = '';
                if (lodash_1.default.size(member.parameters) > 1) {
                    throw new Error(`Methods can have a maximum of 1 argument`);
                }
                else if (lodash_1.default.size(member.parameters) === 1) {
                    let argType = lodash_1.default.values(member.parameters)[0];
                    if (argType.type === 'reference') {
                        argType = this.types[argType.target];
                    }
                    parameters = `(${this._emitExpression(argType)})`;
                }
                const returnType = this._emitExpression(member.returns);
                const costDecorator = this._costHelper(member);
                const directives = this._directiveHelper(member);
                return `${this._name(member.name)}${parameters}: ${returnType}${costDecorator}${directives}`;
            }
            else if (member.type === 'property') {
                const costDecorator = this._costHelper(member);
                const directives = this._directiveHelper(member);
                const mark = member.optional || this._getDocTag(node, 'schema') ? '' : '!';
                return `${this._name(member.name)}: ${this._emitExpression(member.signature)}${mark}${costDecorator}${directives}`;
            }
            else {
                throw new Error(`Can't serialize ${member.type} as a property of an interface`);
            }
        });
        if (this._getDocTag(node, 'schema')) {
            return `schema {\n${this._indent(properties)}\n}`;
        }
        else if (this._getDocTag(node, 'input')) {
            return `input ${this._name(name)} {\n${this._indent(properties)}\n}`;
        }
        if (node.concrete) {
            const federationDecorator = this._getDocTags(node, 'key')
                .map(tag => ` @key(fields: "${tag.substring(4)}")`)
                .join('');
            const costDecorator = this._costHelper(node);
            const directives = this._directiveHelper(node);
            let result = `type ${this._name(name)}${federationDecorator}${costDecorator}${directives} {\n${this._indent(properties)}\n}`;
            if (name.toLowerCase() !== 'query' && name.toLowerCase() !== 'mutation' && name.toLowerCase() !== 'error' && !name.startsWith('_')) {
                result = `${result}\n\n${this._emitInterfaceBatchPayload(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceCreateInput(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceCreateManyInput(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceCreateOneInput(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceOrderByInput(node, name)}`;
                result = `${result}\n\n${this._emitInterfacePayload(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceUpdateInput(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceUpdateManyInput(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceUpdateManyMutationInput(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceUpdateOneInput(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceWhereInput(node, name)}`;
                result = `${result}\n\n${this._emitInterfaceWhereUniqueInput(node, name)}`;
                result = `${result}\n\n${this._emitQueryExtension(node, name)}`;
                result = `${result}\n\n${this._emitMutationExtension(node, name)}`;
            }
            return result;
        }
        let result = `interface ${this._name(name)} {\n${this._indent(properties)}\n}`;
        const fragmentDeclaration = this._getDocTag(node, 'fragment');
        if (fragmentDeclaration) {
            result = `${result}\n\n${fragmentDeclaration} {\n${this._indent(members.map((m) => m.name))}\n}`;
        }
        return result;
    }
    _emitInterfaceBatchPayload(node, name) {
        const camelCasedName = name.charAt(0).toLowerCase() + name.substr(1);
        const properties = [
            `count: Long`,
            `errors: [Error]`,
            `${camelCasedName}s: [${name}]`,
        ];
        return `type ${name}BatchPayload {\n${this._indent(properties)}\n}`;
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
        return `input ${name}CreateInput {\n${this._indent(properties.filter(p => !!(p)))}\n}`;
    }
    _emitInterfaceCreateManyInput(node, name) {
        const properties = [
            `connect: [${name}WhereUniqueInput!]`
        ];
        return `input ${name}CreateManyInput {\n${this._indent(properties)}\n}`;
    }
    _emitInterfaceCreateOneInput(node, name) {
        const properties = [
            `connect: ${name}WhereUniqueInput`
        ];
        return `input ${name}CreateOneInput {\n${this._indent(properties)}\n}`;
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
        return `enum ${name}OrderByInput {\n${this._indent(properties.flat())}\n}`;
    }
    _emitInterfacePayload(node, name) {
        const camelCasedName = name.charAt(0).toLowerCase() + name.substr(1);
        const properties = [
            `${camelCasedName}: ${name}`,
            `errors: [Error]`
        ];
        return `type ${name}Payload {\n${this._indent(properties)}\n}`;
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
        return `input ${name}UpdateInput {\n${this._indent(properties.filter(p => !!(p)))}\n}`;
    }
    _emitInterfaceUpdateManyInput(node, name) {
        const properties = [
            `connect: [${name}WhereUniqueInput!]`
        ];
        return `input ${name}UpdateManyInput {\n${this._indent(properties)}\n}`;
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
        return `input ${name}UpdateManyMutationInput {\n${this._indent(properties.filter(p => !!(p)))}\n}`;
    }
    _emitInterfaceUpdateOneInput(node, name) {
        const properties = [
            `connect: ${name}WhereUniqueInput`
        ];
        return `input ${name}UpdateOneInput {\n${this._indent(properties)}\n}`;
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
            `AND: [${name}WhereInput!]`,
            `OR: [${name}WhereInput!]`,
            `NOT: [${name}WhereInput!]`
        ]);
        return `input ${name}WhereInput {\n${this._indent(properties.flat())}\n}`;
    }
    _emitInterfaceWhereUniqueInput(node, name) {
        const properties = [`id: ID!`];
        return `input ${name}WhereUniqueInput {\n${this._indent(properties.flat())}\n}`;
    }
    _emitMutationExtension(node, name) {
        const pascalCasedName = name.charAt(0).toUpperCase() + name.substr(1);
        const createMutation = `create${pascalCasedName}(data: ${name}CreateInput!): ${name}Payload!`;
        const deleteMutation = `delete${pascalCasedName}(id: ID!): ${name}Payload`;
        const deleteManyMutation = `deleteMany${pascalCasedName}s(where: ${name}WhereInput): ${name}BatchPayload!`;
        const updateMutation = `update${pascalCasedName}(id: ID!, data: ${name}UpdateInput!): ${name}Payload`;
        const updateManyMutation = `updateMany${pascalCasedName}s(data: ${name}UpdateManyMutationInput!, where: ${name}WhereInput): ${name}BatchPayload!`;
        const upsertMutation = `upsert${pascalCasedName}(id: ID!, create: ${name}CreateInput!, update: ${name}UpdateInput!): ${name}Payload!`;
        const properties = [
            createMutation,
            deleteMutation,
            deleteManyMutation,
            updateMutation,
            updateManyMutation,
            upsertMutation
        ];
        return `extend type Mutation {\n${this._indent(properties)}\n}`;
    }
    _emitQueryExtension(node, name) {
        const camelCasedName = name.charAt(0).toLowerCase() + name.substr(1);
        const singularQuery = `${camelCasedName}(id: ID!): ${name}Payload!`;
        const queryParams = `where: ${name}WhereInput, orderBy: ${name}OrderByInput, skip: Int, after: String, before: String, first: Int, last: Int`;
        const pluralQuery = `${camelCasedName}s(${queryParams}): ${name}BatchPayload!`;
        const properties = [
            singularQuery,
            pluralQuery
        ];
        return `extend type Query {\n${this._indent(properties)}\n}`;
    }
    _emitUnion(node, name) {
        if (lodash_1.default.every(node.types, entry => entry.type === 'string literal')) {
            const nodeValues = node.types.map((type) => type.value);
            return this._emitEnum({
                type: 'enum',
                values: lodash_1.default.uniq(nodeValues),
            }, this._name(name));
        }
        node.types.map(type => {
            if (type.type !== 'reference') {
                throw new Error(`GraphQL unions require that all types are references. Got a ${type.type}`);
            }
        });
        const firstChild = node.types[0];
        const firstChildType = this.types[firstChild.target];
        if (firstChildType.type === 'enum') {
            const nodeTypes = node.types.map((type) => {
                const subNode = this.types[type.target];
                if (subNode.type !== 'enum') {
                    throw new Error(`Expected a union of only enums since first child is an enum. Got a ${type.type}`);
                }
                return subNode.values;
            });
            return this._emitEnum({
                type: 'enum',
                values: lodash_1.default.uniq(lodash_1.default.flatten(nodeTypes)),
            }, this._name(name));
        }
        else if (firstChildType.type === 'interface') {
            const nodeNames = node.types.map((type) => {
                const subNode = this.types[type.target];
                if (subNode.type !== 'interface') {
                    throw new Error(`Expected a union of only interfaces since first child is an interface. ` +
                        `Got a ${type.type}`);
                }
                return type.target;
            });
            return `union ${this._name(name)} = ${nodeNames.join(' | ')}`;
        }
        else {
            throw new Error(`No support for unions of type: ${firstChildType.type}`);
        }
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
    _preprocessNode(node, name) {
        if (node.type === 'alias' && node.target.type === 'reference') {
            const referencedNode = this.types[node.target.target];
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
