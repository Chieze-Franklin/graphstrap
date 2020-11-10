"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emit = exports.foundSchema = exports.load = exports.Emitter = void 0;
const tslib_1 = require("tslib");
const _ = tslib_1.__importStar(require("lodash"));
const typescript = tslib_1.__importStar(require("typescript"));
const path = tslib_1.__importStar(require("path"));
const util = tslib_1.__importStar(require("./util"));
const collector_1 = tslib_1.__importDefault(require("./collector"));
const emitter_1 = tslib_1.__importDefault(require("./emitter"));
exports.Emitter = emitter_1.default;
tslib_1.__exportStar(require("./types"), exports);
function load(schemaRootPath, rootNodeNames) {
    schemaRootPath = path.resolve(schemaRootPath);
    const program = typescript.createProgram([schemaRootPath], {});
    const schemaRoot = program.getSourceFile(schemaRootPath);
    const interfaces = {};
    typescript.forEachChild(schemaRoot, (node) => {
        if (!isNodeExported(node))
            return;
        if (node.kind === typescript.SyntaxKind.InterfaceDeclaration) {
            const interfaceNode = node;
            interfaces[interfaceNode.name.text] = interfaceNode;
            const documentation = util.documentationForNode(interfaceNode, schemaRoot.text);
            if (documentation && _.find(documentation.tags, { title: 'graphql', description: 'schema' })) {
                rootNodeNames.push(interfaceNode.name.text);
            }
        }
    });
    rootNodeNames = _.uniq(rootNodeNames);
    const collector = new collector_1.default(program);
    for (const name of rootNodeNames) {
        const rootInterface = interfaces[name];
        if (!rootInterface) {
            throw new Error(`No interface named ${name} was exported by ${schemaRootPath}`);
        }
        collector.addRootNode(rootInterface);
    }
    _.each(interfaces, (node, name) => {
        const documentation = util.documentationForNode(node);
        if (!documentation)
            return;
        const override = _.find(documentation.tags, t => t.title === 'graphql' && t.description.startsWith('override'));
        if (!override)
            return;
        const overrideName = override.description.split(' ')[1] || name;
        collector.mergeOverrides(node, overrideName);
    });
    return collector.types;
}
exports.load = load;
function foundSchema(schemaRootPath) {
    schemaRootPath = path.resolve(schemaRootPath);
    const program = typescript.createProgram([schemaRootPath], {});
    const schemaRoot = program.getSourceFile(schemaRootPath);
    let foundSchema = false;
    typescript.forEachChild(schemaRoot, (node) => {
        if (foundSchema)
            return;
        if (!isNodeExported(node))
            return;
        if (node.kind === typescript.SyntaxKind.InterfaceDeclaration) {
            const interfaceNode = node;
            const documentation = util.documentationForNode(interfaceNode, schemaRoot.text);
            if (documentation && _.find(documentation.tags, { title: 'graphql', description: 'schema' })) {
                foundSchema = true;
            }
        }
    });
    return foundSchema;
}
exports.foundSchema = foundSchema;
function emit(schemaRootPath, rootNodeNames, stream = process.stdout) {
    const loadedTypes = load(schemaRootPath, rootNodeNames);
    const emitter = new emitter_1.default(loadedTypes);
    emitter.emitAll(stream);
}
exports.emit = emit;
function isNodeExported(node) {
    return !!node.modifiers && node.modifiers.some(m => m.kind === typescript.SyntaxKind.ExportKeyword);
}
