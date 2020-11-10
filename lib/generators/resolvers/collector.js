"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const typescript_1 = tslib_1.__importDefault(require("typescript"));
const util = tslib_1.__importStar(require("../util"));
const SyntaxKind = typescript_1.default.SyntaxKind;
const TypeFlags = typescript_1.default.TypeFlags;
class Collector {
    constructor(program) {
        this.types = {
            graphql: { type: 'import', imports: ['GraphQLResolveInfo'] },
            ID: { type: 'alias', target: { type: 'string' } },
            Long: { type: 'alias', target: { type: 'number' } },
            '__Resolver<R, A, T>': {
                type: 'alias',
                target: {
                    type: 'method',
                    name: '',
                    parameters: {
                        root: {
                            type: 'reference',
                            target: 'R'
                        },
                        args: {
                            type: 'reference',
                            target: 'A'
                        },
                        ctx: {
                            type: 'reference',
                            target: '__ContextType'
                        },
                        info: {
                            type: 'reference',
                            target: 'GraphQLResolveInfo'
                        }
                    },
                    returns: {
                        type: 'union',
                        types: [{
                                type: 'reference',
                                target: 'T'
                            }, {
                                type: 'reference',
                                target: 'Promise<T>'
                            }]
                    }
                }
            }
        };
        this.nodeMap = new Map();
        this._walkNode = (node) => {
            if (this.nodeMap.has(node)) {
                return this.nodeMap.get(node);
            }
            const nodeReference = {};
            this.nodeMap.set(node, nodeReference);
            let result = null;
            if (node.kind === SyntaxKind.InterfaceDeclaration) {
                result = this._walkInterfaceDeclaration(node);
            }
            else if (node.kind === SyntaxKind.MethodSignature) {
                result = this._walkMethodSignature(node);
            }
            else if (node.kind === SyntaxKind.PropertySignature) {
                result = this._walkPropertySignature(node);
            }
            else if (node.kind === SyntaxKind.TypeReference) {
                result = this._walkTypeReferenceNode(node);
            }
            else if (node.kind === SyntaxKind.TypeAliasDeclaration) {
                result = this._walkTypeAliasDeclaration(node);
            }
            else if (node.kind === SyntaxKind.EnumDeclaration) {
                result = this._walkEnumDeclaration(node);
            }
            else if (node.kind === SyntaxKind.TypeLiteral) {
                result = this._walkTypeLiteralNode(node);
            }
            else if (node.kind === SyntaxKind.ArrayType) {
                result = this._walkArrayTypeNode(node);
            }
            else if (node.kind === SyntaxKind.UnionType) {
                result = this._walkUnionTypeNode(node);
            }
            else if (node.kind === SyntaxKind.LiteralType) {
                result = {
                    type: 'string literal',
                    value: lodash_1.default.trim(node.literal.getText(), "'\""),
                };
            }
            else if (node.kind === SyntaxKind.StringKeyword) {
                result = { type: 'string' };
            }
            else if (node.kind === SyntaxKind.NumberKeyword) {
                result = { type: 'number' };
            }
            else if (node.kind === SyntaxKind.BooleanKeyword) {
                result = { type: 'boolean' };
            }
            else if (node.kind === SyntaxKind.AnyKeyword) {
                result = { type: 'any' };
            }
            else if (node.kind === SyntaxKind.ModuleDeclaration) {
            }
            else if (node.kind === SyntaxKind.VariableDeclaration) {
            }
            else {
                console.error(node);
                console.error(node.getSourceFile().fileName);
                throw new Error(`Don't know how to handle ${SyntaxKind[node.kind]} nodes`);
            }
            if (result) {
                Object.assign(nodeReference, result);
            }
            return nodeReference;
        };
        this._walkSymbol = (symbol) => {
            return lodash_1.default.map(symbol.getDeclarations(), d => this._walkNode(d));
        };
        this._walkType = (type) => {
            if (type.flags & TypeFlags.Object) {
                return this._walkTypeReference(type);
            }
            else if (type.flags & TypeFlags.BooleanLike) {
                return this._walkInterfaceType(type);
            }
            else if (type.flags & TypeFlags.Index) {
                return this._walkNode(type.getSymbol().declarations[0]);
            }
            else if (type.flags & TypeFlags.String) {
                return { type: 'string' };
            }
            else if (type.flags & TypeFlags.Number) {
                return { type: 'number' };
            }
            else if (type.flags & TypeFlags.Boolean) {
                return { type: 'boolean' };
            }
            else {
                console.error(type);
                console.error(type.getSymbol().declarations[0].getSourceFile().fileName);
                throw new Error(`Don't know how to handle type with flags: ${type.flags}`);
            }
        };
        this.checker = program.getTypeChecker();
    }
    addRootNode(node) {
        this._walkNode(node);
        const simpleNode = this.types[this._nameForSymbol(this._symbolForNode(node.name))];
        simpleNode.concrete = true;
    }
    mergeOverrides(node, name) {
        const existing = this.types[name];
        if (!existing) {
            throw new Error(`Cannot override "${name}" - it was never included`);
        }
        const overrides = node.members.map(this._walkNode);
        const overriddenNames = new Set(overrides.map(o => o.name));
        existing.members = lodash_1.default(existing.members)
            .filter(m => !overriddenNames.has(m.name))
            .concat(overrides)
            .value();
    }
    _walkInterfaceDeclaration(node) {
        if (node.name.text === 'Date') {
            return { type: 'reference', target: 'Date' };
        }
        return this._addType(node, () => {
            const inherits = [];
            if (node.heritageClauses) {
                for (const clause of node.heritageClauses) {
                    for (const type of clause.types) {
                        const symbol = this._symbolForNode(type.expression);
                        this._walkSymbol(symbol);
                        inherits.push(this._nameForSymbol(symbol));
                    }
                }
            }
            return {
                type: 'interface',
                members: node.members.map(this._walkNode),
                inherits,
            };
        });
    }
    _walkMethodSignature(node) {
        const signature = this.checker.getSignatureFromDeclaration(node);
        const parameters = {};
        for (const parameter of signature.getParameters()) {
            const parameterNode = parameter.valueDeclaration;
            parameters[parameter.getName()] = this._walkNode(parameterNode.type);
        }
        return {
            type: 'method',
            name: node.name.getText(),
            documentation: util.documentationForNode(node),
            parameters,
            returns: this._walkNode(node.type),
        };
    }
    _walkPropertySignature(node) {
        return {
            type: 'property',
            name: node.name.getText(),
            documentation: util.documentationForNode(node),
            signature: this._walkNode(node.type),
            optional: !!(node.questionToken)
        };
    }
    _walkTypeReferenceNode(node) {
        return this._referenceForSymbol(this._symbolForNode(node.typeName));
    }
    _walkTypeAliasDeclaration(node) {
        return this._addType(node, () => ({
            type: 'alias',
            target: this._walkNode(node.type),
        }));
    }
    _walkEnumDeclaration(node) {
        return this._addType(node, () => {
            const values = node.members.map(m => {
                if (m.initializer && m.initializer.kind !== SyntaxKind.NumericLiteral) {
                    const target = lodash_1.default.last(m.initializer.getChildren()) || m.initializer;
                    return lodash_1.default.trim(target.getText(), "'\"");
                }
                else {
                    return lodash_1.default.trim(m.name.getText(), "'\"");
                }
            });
            return {
                type: 'enum',
                values,
            };
        });
    }
    _walkTypeLiteralNode(node) {
        return {
            type: 'literal object',
            members: node.members.map(this._walkNode),
        };
    }
    _walkArrayTypeNode(node) {
        return {
            type: 'array',
            elements: [this._walkNode(node.elementType)],
        };
    }
    _walkUnionTypeNode(node) {
        return {
            type: 'union',
            types: node.types.map(this._walkNode),
        };
    }
    _walkTypeReference(type) {
        if (type.target && type.target.getSymbol().name === 'Array') {
            return {
                type: 'array',
                elements: type.typeArguments.map(this._walkType),
            };
        }
        else {
            throw new Error('Non-array type references not yet implemented');
        }
    }
    _walkInterfaceType(type) {
        return this._referenceForSymbol(this._expandSymbol(type.getSymbol()));
    }
    _addType(node, typeBuilder) {
        const name = this._nameForSymbol(this._symbolForNode(node.name));
        if (this.types[name])
            return this.types[name];
        const type = typeBuilder();
        type.documentation = util.documentationForNode(node);
        this.types[name] = type;
        return type;
    }
    _symbolForNode(node) {
        return this._expandSymbol(this.checker.getSymbolAtLocation(node));
    }
    _nameForSymbol(symbol) {
        symbol = this._expandSymbol(symbol);
        const parts = [];
        while (symbol) {
            parts.unshift(this.checker.symbolToString(symbol));
            symbol = symbol['parent'];
            if (symbol && symbol.flags === typescript_1.default.SymbolFlags.ValueModule)
                break;
        }
        return parts.join('.');
    }
    _expandSymbol(symbol) {
        while (symbol.flags & typescript_1.default.SymbolFlags.Alias) {
            symbol = this.checker.getAliasedSymbol(symbol);
        }
        return symbol;
    }
    _referenceForSymbol(symbol) {
        this._walkSymbol(symbol);
        const referenced = this.types[this._nameForSymbol(symbol)];
        if (referenced && referenced.type === 'interface') {
            referenced.concrete = true;
        }
        return {
            type: 'reference',
            target: this._nameForSymbol(symbol),
        };
    }
}
exports.default = Collector;
