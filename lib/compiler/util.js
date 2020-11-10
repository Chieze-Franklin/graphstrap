"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentationForNode = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const doctrine = tslib_1.__importStar(require("doctrine"));
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
