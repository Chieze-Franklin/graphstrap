import _ from 'lodash';

import * as Types from './types';
import { ReferenceNode } from './types';

// tslint:disable-next-line
// https://raw.githubusercontent.com/sogko/graphql-shorthand-notation-cheat-sheet/master/graphql-shorthand-notation-cheat-sheet.png
export default class Emitter {
    renames: {[key: string]: string} = {};
    enumNames: string[] = [];
    scalarNames: string[] = ['Date'];
    queryResolvers: Types.InterfaceNode = {
        type: 'interface',
        members: [],
        inherits: ['Query'],
        concrete: false
    };
    mutationResolvers: Types.InterfaceNode = {
        type: 'interface',
        members: [],
        inherits: ['Mutation'],
        concrete: false
    };
    allResolvers: Types.InterfaceNode = {
        type: 'interface',
        members: [],
        inherits: [],
        concrete: false
    };

    constructor(private types: Types.TypeMap) {
        this.types = <Types.TypeMap>_.omitBy(types, (node, name) => this._preprocessNode(node, name!));
    }

    emitAll(stream: NodeJS.WritableStream) {
        stream.write('\n');
        _.each(this.types, (node, name) => this.emitTopLevelNode(node, name!, stream));

        // QueryResolvers
        this.emitTopLevelNode(this.queryResolvers, 'QueryResolvers', stream);
        this.allResolvers.members.push({
            type: 'property',
            name: 'Query',
            signature: {
                type: 'reference',
                target: `QueryResolvers`
            }
        });

        // MutationResolvers
        this.emitTopLevelNode(this.mutationResolvers, 'MutationResolvers', stream);
        this.allResolvers.members.push({
            type: 'property',
            name: 'Mutation',
            signature: {
                type: 'reference',
                target: `MutationResolvers`
            }
        });

        // Resolvers
        this.emitTopLevelNode(this.allResolvers, 'Resolvers', stream);
    }

    emitTopLevelNode(node: Types.Node, name: Types.SymbolName, stream: NodeJS.WritableStream) {
        let content;
        if (node.type === 'alias') {
          content = this._emitAlias(node, name);
        } else if (node.type === 'interface') {
            content = this._emitInterface(node, name);
        } else if (node.type === 'enum') {
          content = this._emitEnum(node, name);
        } else if (node.type === 'import') {
            content = this._emitImport(node, name);
        } else {
            throw new Error(`Can't emit ${node.type} as a top level node`);
        }
        stream.write(`${content}\n\n`);
    }

    _collectMembers = (node: Types.InterfaceNode|Types.LiteralObjectNode): Types.PropertyNode[] => {
        let members: Types.Node[] = [];
        if (node.type === 'literal object') {
            members = node.members;
        } else {
            const seenProps = new Set<Types.SymbolName>();
            let interfaceNode: Types.InterfaceNode|null;
            interfaceNode = node;
        
            // loop through this interface and any super-interfaces
            while (interfaceNode) {
                for (const member of interfaceNode.members) {
                    if (seenProps.has(member.name)) continue;
                    seenProps.add(member.name);
                    members.push(member);
                }
                if (interfaceNode.inherits.length > 1) {
                    throw new Error(`No support for multiple inheritence: ${JSON.stringify(interfaceNode.inherits)}`);
                } else if (interfaceNode.inherits.length === 1) {
                    const supertype: Types.Node = this.types[interfaceNode.inherits[0]];
                    if (supertype.type !== 'interface') {
                        throw new Error(`Expected supertype to be an interface node: ${supertype}`);
                    }
                    interfaceNode = supertype;
                } else {
                    interfaceNode = null;
                }
            }
        }
    
        for (const member of members) {
            if (member.type !== 'property') {
                throw new Error(`Expected members to be properties; got ${member.type}`);
            }
        }
        return members as Types.PropertyNode[];
    }

    _costHelper(node: Types.ComplexNode) {
        const costExists = this._getDocTag(node, 'cost');
        if (costExists) {
            return ` @cost${costExists.substring(5)}`;
        }
        return '';
    }

    _directiveHelper(node: Types.ComplexNode) {
        const directives = this._getDocTags(node, 'directive')
            .map(tag => ` @${tag.substring(10)}`)
            .join('');
        return directives;
    }

    _emitAlias(node: Types.AliasNode, name: Types.SymbolName): string {
        if (this._isPrimitive(node.target)) {
            this.scalarNames.push(this._name(name));
            return `export type ${this._name(name)} = ${node.target.type};`;
        } else if (node.target.type === 'method') {
            return `export type ${this._name(name)} = ${this._emitMethod(node.target)};`;
        } else if (node.target.type === 'property') {
            return `export type ${this._name(name)} = ${this._emitProperty(node.target)};`;
        } else if (node.target.type === 'reference') {
            return `export type ${this._name(name)} = ${this._name(node.target.target)};`;
        } else {
            return `export type ${this._name(name)} = ${this._emitExpression(node.target)};`;
        }
    }

    _emitEnum(node:Types.EnumNode, name:Types.SymbolName):string {
        this.enumNames.push(this._name(name));
        return `export enum ${this._name(name)} {\n${this._indent(node.values.join(',\n'))}\n}`;
    }

    _emitImport(node:Types.ImportNode, name:Types.SymbolName):string {
        return `import ${node.default ? `${node.default}, ` : ''}{\n${this._indent(node.imports || [])}\n} from '${name}';`;
    }

    _emitExpression = (node: Types.Node): string => {
        if (!node) {
            return '';
        } else if (node.type === 'reference') {
            return this._name(node.target);
        } else if (node.type === 'array') {
            return `[${node.elements.map(this._emitExpression).join(', ')}]`;
        } else if (node.type === 'union') {
            return this._emitUnion(node);
        } else if (node.type === 'literal object' || node.type === 'interface') {
            return _(this._collectMembers(node))
                .map((member:Types.PropertyNode) => {
                    return `${this._name(member.name)}: ${this._emitExpression(member.signature)}`;
                })
                .join(', ');
        } else {
            return node.type;
        }
    }

    _emitInterface(node: Types.InterfaceNode, name: Types.SymbolName): string {
        const members = node.members;

        let extendsSection = node.inherits.length ? ` extends ${node.inherits.join(', ')}` : '';
    
        const properties = _.map(members, (member) => {
            if (member.type === 'method') {
                return `${this._emitMethod(member)};`;
            } else if (member.type === 'property') {
                return `${this._emitProperty(member)};`;
            }
            return '';
        });
    
        if (this._getDocTag(node, 'schema')) {
            return '';
        } else if (this._getDocTag(node, 'input')) {
            return `export interface ${this._name(name)}${extendsSection} {\n${this._indent(properties)}\n}`;
        }
    
        if (node.concrete) {
            let result = `export interface ${this._name(name)}${extendsSection} {\n${this._indent(properties)}\n}`;

            if (name.toLowerCase() !== 'query' && name.toLowerCase() !== 'mutation'&& !name.startsWith('_')) {

                // batch payload
                result = `${result}\n\n${this._emitInterfaceBatchPayload(node, name)}`;

                // create input
                result = `${result}\n\n${this._emitInterfaceCreateInput(node, name)}`;

                // create many input
                result = `${result}\n\n${this._emitInterfaceCreateManyInput(node, name)}`;

                // create one input
                result = `${result}\n\n${this._emitInterfaceCreateOneInput(node, name)}`;

                // create one mutation args
                result = `${result}\n\n${this._emitInterfaceCreateOneMutationArgs(node, name)}`;

                // delete many mutation args
                result = `${result}\n\n${this._emitInterfaceDeleteManyMutationArgs(node, name)}`;

                // find one query args
                result = `${result}\n\n${this._emitInterfaceFindOneQueryArgs(node, name)}`;

                // find many query args
                result = `${result}\n\n${this._emitInterfaceFindManyQueryArgs(node, name)}`;

                // order by input
                result = `${result}\n\n${this._emitInterfaceOrderByInput(node, name)}`;

                // payload
                result = `${result}\n\n${this._emitInterfacePayload(node, name)}`;

                // update input
                result = `${result}\n\n${this._emitInterfaceUpdateInput(node, name)}`;

                // update many input
                result = `${result}\n\n${this._emitInterfaceUpdateManyInput(node, name)}`;

                // update many mutation args
                result = `${result}\n\n${this._emitInterfaceUpdateManyMutationArgs(node, name)}`;

                // update many mutation input
                result = `${result}\n\n${this._emitInterfaceUpdateManyMutationInput(node, name)}`;

                // update one input
                result = `${result}\n\n${this._emitInterfaceUpdateOneInput(node, name)}`;

                // update one mutation args
                result = `${result}\n\n${this._emitInterfaceUpdateOneMutationArgs(node, name)}`;

                // upsert one mutation args
                result = `${result}\n\n${this._emitInterfaceUpsertOneMutationArgs(node, name)}`;

                // where input
                result = `${result}\n\n${this._emitInterfaceWhereInput(node, name)}`;

                // where unique input
                result = `${result}\n\n${this._emitInterfaceWhereUniqueInput(node, name)}`;

                // query extension
                this._emitQueryExtension(node, name);

                // mutation extension
                this._emitMutationExtension(node, name);
            }

            return result;
        }
    
        let result = `export interface ${this._name(name)}${extendsSection} {\n${this._indent(properties)}\n}`;

        const fragmentDeclaration = this._getDocTag(node, 'fragment');
        if (fragmentDeclaration) {
          result = `${result}\n\n${fragmentDeclaration} {\n${this._indent(members.map((m: any) => m.name))}\n}`;
        }
    
        return result;
    }

    _emitInterfaceBatchPayload(node: Types.InterfaceNode, name: Types.SymbolName): string {
        const camelCasedName = name.charAt(0).toLowerCase() + name.substr(1);
        const properties = [
            `count: Long;`,
            `errors?: Error[];`,
            `${camelCasedName}s?: ${name}[];`,
        ];
    
        return `export interface ${name}BatchPayload {\n${this._indent(properties)}\n}`;
    }

    _emitInterfaceCreateInput(node: Types.InterfaceNode, name: Types.SymbolName): string {
        // GraphQL expects denormalized type interfaces
        const members = <Types.Node[]>_(this._transitiveInterfaces(node))
            .map((i: Types.InterfaceNode) => i.members)
            .flatten()
            .uniqBy('name')
            .sortBy('name')
            .value();
    
        // GraphQL can't handle empty types or interfaces, but we also don't want
        // to remove all references (complicated).
        if (!members.length) {
            members.push({
                type: 'property',
                name: '_placeholder',
                signature: { type: 'boolean' },
            });
        }
    
        let properties = _.map(members, (member) => {
            if (member.type === 'method') {
                if (_.size(member.parameters) === 0) {
                    return this._emitInterfaceCreateInputClauses(member.returns, member.name, member.optional);
                }
                
                return '';
            } else if (member.type === 'property') {
                // TODO: if property is a reference to the plural of a type, create the appropriate clauses
                return this._emitInterfaceCreateInputClauses(member.signature, member.name, member.optional);
            } else {
                throw new Error(`Can't serialize ${member.type} as a property of an interface`);
            }
        });
    
        return `export interface ${name}CreateInput {\n${this._indent(properties.filter(p => !!(p)))}\n}`;
    }

    _emitInterfaceCreateInputClauses = (node: Types.Node, name: Types.SymbolName, optional: boolean = false): string => {
        const expression = this._emitExpression(node);
        const mark = optional ? '?' : '';

        if (!node) {
            return '';
        } else if (expression === 'ID') {
            return `${name}?: ${expression};`; // always optional
        } else if (node.type === 'alias') {
            return this._emitInterfaceCreateInputClauses(node.target, name, optional);
        } else if (node.type === 'array') {
            if (node.elements[0].type === 'reference') {
                return `${name}${mark}: ${node.elements[0].target}CreateManyInput;`;
            } else {
                return `${name}${mark}: ${expression};`;
            }
        } else if (node.type === 'reference') {
            if (this.enumNames.includes(expression) || this.scalarNames.includes(expression)) {
                return `${name}${mark}: ${expression};`;
            } else {
                return `${name}${mark}: ${node.target}CreateOneInput;`;
            }
        } else {
            return `${name}${mark}: ${expression};`;
        }
    }

    _emitInterfaceCreateManyInput(node: Types.InterfaceNode, name: Types.SymbolName): string {
        const properties = [
            `connect?: ${name}WhereUniqueInput[];`
        ];
    
        return `export interface ${name}CreateManyInput {\n${this._indent(properties)}\n}`;
    }

    _emitInterfaceCreateOneInput(node: Types.InterfaceNode, name: Types.SymbolName): string {
        const properties = [
            `connect?: ${name}WhereUniqueInput;`
        ];
    
        return `export interface ${name}CreateOneInput {\n${this._indent(properties)}\n}`;
    }

    _emitInterfaceCreateOneMutationArgs(node: Types.InterfaceNode, name: Types.SymbolName): string {
        const properties = [`data: ${name}CreateInput;`];
    
        return `export interface ${name}CreateOneMutationArgs {\n${this._indent(properties)}\n}`;
    }

    _emitInterfaceDeleteManyMutationArgs(node: Types.InterfaceNode, name: Types.SymbolName): string {
        const properties = [`where: ${name}WhereInput;`];
    
        return `export interface ${name}DeleteManyMutationArgs {\n${this._indent(properties)}\n}`;
    }

    _emitInterfaceFindOneQueryArgs(node: Types.InterfaceNode, name: Types.SymbolName): string {
        const properties = [`id: ID;`];
    
        return `export interface ${name}FindOneQueryArgs {\n${this._indent(properties)}\n}`;
    }

    _emitInterfaceFindManyQueryArgs(node: Types.InterfaceNode, name: Types.SymbolName): string {
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

    _emitInterfaceOrderByInput(node: Types.InterfaceNode, name: Types.SymbolName): string {
        // GraphQL expects denormalized type interfaces
        const members = <Types.Node[]>_(this._transitiveInterfaces(node))
            .map((i: Types.InterfaceNode) => i.members)
            .flatten()
            .uniqBy('name')
            .sortBy('name')
            .value();
    
        // GraphQL can't handle empty types or interfaces, but we also don't want
        // to remove all references (complicated).
        if (!members.length) {
            members.push({
                type: 'property',
                name: '_placeholder',
                signature: { type: 'boolean' },
            });
        }
    
        let properties = _.map(members, (member) => {
            if (member.type === 'method') {
                if (_.size(member.parameters) === 0) {
                    return [`${member.name}_ASC`, `${member.name}_DESC`];
                }
                
                return [];
            } else if (member.type === 'property') {
                // TODO: if property is a reference to the plural of a type, create the appropriate clauses
                return [`${member.name}_ASC`, `${member.name}_DESC`];
            } else {
                throw new Error(`Can't serialize ${member.type} as a property of an interface`);
            }
        });
    
        return `export enum ${name}OrderByInput {\n${this._indent(properties.flat().join(',\n'))}\n}`;
    }

    _emitInterfacePayload(node: Types.InterfaceNode, name: Types.SymbolName): string {
        const camelCasedName = name.charAt(0).toLowerCase() + name.substr(1);
        const properties = [
            `${camelCasedName}?: ${name};`,
            `errors?: Error[];`,
        ];
    
        return `export interface ${name}Payload {\n${this._indent(properties)}\n}`;
    }

    _emitInterfaceUpdateInput(node: Types.InterfaceNode, name: Types.SymbolName): string {
        // GraphQL expects denormalized type interfaces
        const members = <Types.Node[]>_(this._transitiveInterfaces(node))
            .map((i: Types.InterfaceNode) => i.members)
            .flatten()
            .uniqBy('name')
            .sortBy('name')
            .value();
    
        // GraphQL can't handle empty types or interfaces, but we also don't want
        // to remove all references (complicated).
        if (!members.length) {
            members.push({
                type: 'property',
                name: '_placeholder',
                signature: { type: 'boolean' },
            });
        }
    
        let properties = _.map(members, (member) => {
            if (member.type === 'method') {
                if (_.size(member.parameters) === 0) {
                    return this._emitInterfaceUpdateInputClauses(member.returns, member.name);
                }
                
                return '';
            } else if (member.type === 'property') {
                // TODO: if property is a reference to the plural of a type, create the appropriate clauses
                return this._emitInterfaceUpdateInputClauses(member.signature, member.name);
            } else {
                throw new Error(`Can't serialize ${member.type} as a property of an interface`);
            }
        });
    
        return `export interface ${name}UpdateInput {\n${this._indent(properties.filter(p => !!(p)))}\n}`;
    }

    _emitInterfaceUpdateInputClauses = (node: Types.Node, name: Types.SymbolName): string => {
        const expression = this._emitExpression(node);

        if (!node) {
            return '';
        } else if (expression === 'ID') {
            return ''; // can't update ID
        } else if (node.type === 'alias') {
            return this._emitInterfaceUpdateInputClauses(node.target, name);
        } else if (node.type === 'array') {
            if (node.elements[0].type === 'reference') {
                return `${name}?: ${node.elements[0].target}UpdateManyInput;`;
            } else {
                return `${name}?: ${expression};`;
            }
        } else if (node.type === 'reference') {
            if (this.enumNames.includes(expression) || this.scalarNames.includes(expression)) {
                return `${name}?: ${expression};`;
            } else {
                return `${name}?: ${node.target}UpdateOneInput;`;
            }
        } else {
            return `${name}?: ${expression};`;
        }
    }

    _emitInterfaceUpdateManyInput(node: Types.InterfaceNode, name: Types.SymbolName): string {
        const properties = [
            `connect?: ${name}WhereUniqueInput[]`
        ];
    
        return `export interface ${name}UpdateManyInput {\n${this._indent(properties)}\n}`;
    }

    _emitInterfaceUpdateManyMutationArgs(node: Types.InterfaceNode, name: Types.SymbolName): string {
        const properties = [
            `data: ${name}UpdateManyMutationInput;`,
            `where: ${name}WhereInput;`
        ];
    
        return `export interface ${name}UpdateManyMutationArgs {\n${this._indent(properties)}\n}`;
    }

    _emitInterfaceUpdateManyMutationInput(node: Types.InterfaceNode, name: Types.SymbolName): string {
        // GraphQL expects denormalized type interfaces
        const members = <Types.Node[]>_(this._transitiveInterfaces(node))
            .map((i: Types.InterfaceNode) => i.members)
            .flatten()
            .uniqBy('name')
            .sortBy('name')
            .value();
    
        // GraphQL can't handle empty types or interfaces, but we also don't want
        // to remove all references (complicated).
        if (!members.length) {
            members.push({
                type: 'property',
                name: '_placeholder',
                signature: { type: 'boolean' },
            });
        }
    
        let properties = _.map(members, (member) => {
            if (member.type === 'method') {
                if (_.size(member.parameters) === 0) {
                    return this._emitInterfaceUpdateManyMutationInputClauses(member.returns, member.name);
                }
                
                return '';
            } else if (member.type === 'property') {
                // TODO: if property is a reference to the plural of a type, create the appropriate clauses
                return this._emitInterfaceUpdateManyMutationInputClauses(member.signature, member.name);
            } else {
                throw new Error(`Can't serialize ${member.type} as a property of an interface`);
            }
        });
    
        return `export interface ${name}UpdateManyMutationInput {\n${this._indent(properties.filter(p => !!(p)))}\n}`;
    }

    _emitInterfaceUpdateManyMutationInputClauses = (node: Types.Node, name: Types.SymbolName): string => {
        const expression = this._emitExpression(node);

        if (!node) {
            return '';
        } else if (expression === 'ID') {
            return ''; // can't update ID
        } else if (node.type === 'alias') {
            return this._emitInterfaceUpdateInputClauses(node.target, name);
        } else if (node.type === 'array') {
            return ''; // can't update array on many objects simultaneously
        } else if (node.type === 'reference') {
            if (this.enumNames.includes(expression) || this.scalarNames.includes(expression)) {
                return `${name}?: ${expression};`;
            } else {
                return ''; // can't update reference on many objects simultaneously
            }
        } else {
            return `${name}?: ${expression};`;
        }
    }

    _emitInterfaceUpdateOneInput(node: Types.InterfaceNode, name: Types.SymbolName): string {
        const properties = [
            `connect?: ${name}WhereUniqueInput`
        ];
    
        return `export interface ${name}UpdateOneInput {\n${this._indent(properties)}\n}`;
    }

    _emitInterfaceUpdateOneMutationArgs(node: Types.InterfaceNode, name: Types.SymbolName): string {
        const properties = [
            `id: ID;`,
            `data: ${name}UpdateInput;`
        ];
    
        return `export interface ${name}UpdateOneMutationArgs {\n${this._indent(properties)}\n}`;
    }

    _emitInterfaceUpsertOneMutationArgs(node: Types.InterfaceNode, name: Types.SymbolName): string {
        const properties = [
            `id: ID;`,
            `create: ${name}CreateInput;`,
            `update: ${name}UpdateInput;`
        ];
    
        return `export interface ${name}UpsertOneMutationArgs {\n${this._indent(properties)}\n}`;
    }

    _emitInterfaceWhereInput(node: Types.InterfaceNode, name: Types.SymbolName): string {
        // GraphQL expects denormalized type interfaces
        const members = <Types.Node[]>_(this._transitiveInterfaces(node))
            .map((i: Types.InterfaceNode) => i.members)
            .flatten()
            .uniqBy('name')
            .sortBy('name')
            .value();
    
        // GraphQL can't handle empty types or interfaces, but we also don't want
        // to remove all references (complicated).
        if (!members.length) {
            members.push({
                type: 'property',
                name: '_placeholder',
                signature: { type: 'boolean' },
            });
        }
    
        let properties = _.map(members, (member) => {
            if (member.type === 'method') {
                if (_.size(member.parameters) === 0) {
                    return this._emitInterfaceWhereInputClauses(member.returns, member.name);
                }
                
                return [];
            } else if (member.type === 'property') {
                // TODO: if property is a reference to the plural of a type, create the appropriate clauses
                return this._emitInterfaceWhereInputClauses(member.signature, member.name);
            } else {
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

    _emitInterfaceWhereInputClauses = (node: Types.Node, name: Types.SymbolName): string[] => {
        const expression = this._emitExpression(node);

        if (!node) {
            return [];
        } else if (node.type === 'alias') {
            return this._emitInterfaceWhereInputClauses(node.target, name);
        } else if (node.type === 'string' || expression === 'ID') {
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
        } else if (node.type === 'number') {  // TODO: Int/Float annotation
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
        } else if (node.type === 'boolean') {
            return [
                `${name}?: ${expression};`,
                `${name}_not?: ${expression};`,
                `${name}_in?: ${expression}[];`,
                `${name}_not_in?: ${expression}[];`,
            ];
        } else if (expression === 'Date' || expression === 'DateTime') {
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
        } else if (node.type === 'array') {
            return [
                `${name}_every?: ${this._emitExpression(node.elements[0])}WhereInput;`,
                `${name}_some?: ${this._emitExpression(node.elements[0])}WhereInput;`,
                `${name}_none?: ${this._emitExpression(node.elements[0])}WhereInput;`,
            ];
        } else if (node.type === 'reference') {
            if (this.enumNames.includes(expression)) {
                return [
                    `${name}?: ${expression};`,
                    `${name}_not?: ${expression};`,
                    `${name}_in?: ${expression}[];`,
                    `${name}_not_in?: ${expression}[];`,
                ];
            } else if (this.scalarNames.includes(expression)) {
                // since string has the largest set of operations, we use it
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
        // else if (node.type === 'literal object' || node.type === 'interface') {
        //     return _(this._collectMembers(node))
        //         .map((member:Types.PropertyNode) => {
        //             return `${this._name(member.name)}: ${this._emitExpression(member.signature)}`;
        //         })
        //         .join(', ');
        // }
        else {
            return []; // throw new Error(`Can't serialize ${node.type} as an expression`);
        }
    }

    _emitInterfaceWhereUniqueInput(node: Types.InterfaceNode, name: Types.SymbolName): string {
        const properties = [`id: ID;`];
    
        return `export interface ${name}WhereUniqueInput {\n${this._indent(properties)}\n}`;
    }

    _emitMethod(node: Types.MethodNode,): string {
        let parameters: string[] = [];
        _.forEach(node.parameters, (parameter, name) => {
            parameters.push(`${name}: ${this._emitExpression(parameter)}`);
        })

        const mark = node.optional ? '?' : '';
        const nameSection = node.name ? `${this._name(node.name)}${mark}: ` : '';
        const returnType = this._emitExpression(node.returns);
        return `${nameSection}(${parameters.join(', ')}) => ${returnType}`;
    }

    _emitProperty(node: Types.PropertyNode): string {
        const mark = node.optional ? '?' : '';
        const nameSection = node.name ? `${this._name(node.name)}${mark}: ` : '';
        return `${nameSection}${this._emitExpression(node.signature)}`;
    }

    _emitMutationExtension(node: Types.InterfaceNode, name: Types.SymbolName): void {
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

    _emitQueryExtension(node: Types.InterfaceNode, name: Types.SymbolName): void {
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

    _emitUnion(node: Types.UnionNode): string {
        let unions: string[] = [];
        _.forEach(node.types, union => {
            unions.push(this._emitExpression(union));
        })
    
        return `(${unions.join(' | ')})`;
    }

    _getDocTag(node: Types.ComplexNode, prefix: string): string|null {
        if (!node.documentation) return null;
        for (const tag of node.documentation.tags) {
            if (tag.title !== 'graphql') continue;
            if (tag.description.startsWith(prefix)) return tag.description;
        }
        return null;
    }

    // Returns ALL matching tags from the given node.
    _getDocTags(node: Types.ComplexNode, prefix: string): string[] {
        const matchingTags:string[] = [];
        if (!node.documentation) return matchingTags;
        for (const tag of node.documentation.tags) {
            if (tag.title !== 'graphql') continue;
            if (tag.description.startsWith(prefix)) matchingTags.push(tag.description);
        }
        return matchingTags;
    }

    _hasDocTag(node: Types.ComplexNode, prefix: string): boolean {
        return !!this._getDocTag(node, prefix);
    }

    _indent(content: string|string[]): string {
        if (!_.isArray(content)) content = content.split('\n');
        return content.map(s => `  ${s}`).join('\n');
    }

    _isPrimitive(node: Types.Node): boolean {
        return node.type === 'string' || node.type === 'number' || node.type === 'boolean' || node.type === 'any';
    }

    _isNamedNode(node: Types.Node): boolean {
        return node.type === 'method' || node.type === 'property';
    }

    _name = (name: Types.SymbolName): string => {
        return this.renames[name] || name;
    }

    _preprocessNode(node: Types.Node, name: Types.SymbolName):boolean {
        if (node.type === 'alias' && node.target.type === 'reference') {
            const referencedNode = this.types[node.target.target];
            if (!referencedNode) return false;
            if (this._isPrimitive(referencedNode) || referencedNode.type === 'enum') {
                this.renames[name] = node.target.target;
                return true;
            }
        } else if (node.type === 'alias' && this._hasDocTag(node, 'ID')) {
            this.renames[name] = 'ID';
            return true;
        }

        return false;
    }

    _transitiveInterfaces(node: Types.InterfaceNode): Types.InterfaceNode[] {
        let interfaces = [node];
        for (const name of node.inherits) {
          const inherited = <Types.InterfaceNode>this.types[name];
          interfaces = interfaces.concat(this._transitiveInterfaces(inherited));
        }
        return _.uniq(interfaces);
    }
}