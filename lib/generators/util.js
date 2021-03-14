"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNodeExported = exports.foundManifest = exports.documentationForNode = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const doctrine = tslib_1.__importStar(require("doctrine"));
const path = tslib_1.__importStar(require("path"));
const typescript_1 = tslib_1.__importDefault(require("typescript"));
function documentationForNode(node, source) {
    source = source || node.getSourceFile().text;
    const commentRanges = typescript_1.default.getLeadingCommentRanges(source, node.getFullStart());
    if (!commentRanges)
        return undefined;
    const lastRange = lodash_1.default.last(commentRanges);
    if (!lastRange)
        return undefined;
    const comment = source.substr(lastRange.pos, lastRange.end - lastRange.pos).trim();
    return doctrine.parse(comment, { unwrap: true });
}
exports.documentationForNode = documentationForNode;
function foundManifest(schemaRootPath) {
    schemaRootPath = path.resolve(schemaRootPath);
    const program = typescript_1.default.createProgram([schemaRootPath], {});
    const schemaRoot = program.getSourceFile(schemaRootPath);
    let foundManifest = false;
    typescript_1.default.forEachChild(schemaRoot, (node) => {
        if (foundManifest)
            return;
        if (!isNodeExported(node))
            return;
        if (node.kind === typescript_1.default.SyntaxKind.InterfaceDeclaration) {
            const interfaceNode = node;
            const documentation = documentationForNode(interfaceNode, schemaRoot.text);
            if (documentation && lodash_1.default.find(documentation.tags, { title: 'graphql', description: 'manifest' })) {
                foundManifest = true;
            }
        }
    });
    return foundManifest;
}
exports.foundManifest = foundManifest;
function isNodeExported(node) {
    return !!node.modifiers && node.modifiers.some(m => m.kind === typescript_1.default.SyntaxKind.ExportKeyword);
}
exports.isNodeExported = isNodeExported;
