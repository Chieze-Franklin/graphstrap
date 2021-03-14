"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emit = exports.load = exports.Emitter = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const typescript_1 = tslib_1.__importDefault(require("typescript"));
const path = tslib_1.__importStar(require("path"));
const util = tslib_1.__importStar(require("../util"));
const collector_1 = tslib_1.__importDefault(require("./collector"));
const emitter_1 = tslib_1.__importDefault(require("./emitter"));
exports.Emitter = emitter_1.default;
tslib_1.__exportStar(require("../types"), exports);
function load(schemaRootPath, rootNodeNames) {
    schemaRootPath = path.resolve(schemaRootPath);
    const program = typescript_1.default.createProgram([schemaRootPath], {});
    const schemaRoot = program.getSourceFile(schemaRootPath);
    const interfaces = {};
    typescript_1.default.forEachChild(schemaRoot, (node) => {
        if (!util.isNodeExported(node))
            return;
        if (node.kind === typescript_1.default.SyntaxKind.InterfaceDeclaration) {
            const interfaceNode = node;
            interfaces[interfaceNode.name.text] = interfaceNode;
            const documentation = util.documentationForNode(interfaceNode, schemaRoot.text);
            if (documentation && lodash_1.default.find(documentation.tags, { title: 'graphql', description: 'manifest' })) {
                rootNodeNames.push(interfaceNode.name.text);
            }
        }
    });
    rootNodeNames = lodash_1.default.uniq(rootNodeNames);
    const collector = new collector_1.default(program);
    for (const name of rootNodeNames) {
        const rootInterface = interfaces[name];
        if (!rootInterface) {
            throw new Error(`No interface named ${name} was exported by ${schemaRootPath}`);
        }
        collector.addRootNode(rootInterface);
    }
    lodash_1.default.each(interfaces, (node, name) => {
        const documentation = util.documentationForNode(node);
        if (!documentation)
            return;
        const override = lodash_1.default.find(documentation.tags, t => t.title === 'graphql' && t.description.startsWith('override'));
        if (!override)
            return;
        const overrideName = override.description.split(' ')[1] || name;
        collector.mergeOverrides(node, overrideName);
    });
    return collector.types;
}
exports.load = load;
function emit(schemaRootPath, rootNodeNames, stream = process.stdout) {
    const loadedTypes = load(schemaRootPath, rootNodeNames);
    const emitter = new emitter_1.default(loadedTypes);
    emitter.emitAll(stream);
}
exports.emit = emit;
