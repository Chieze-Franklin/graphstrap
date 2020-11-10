import _ from 'lodash';
import * as doctrine from 'doctrine';
import * as path from 'path';
import typescript from 'typescript';

export function documentationForNode(node: typescript.Node, source?: string): doctrine.ParseResult|undefined {
    source = source || node.getSourceFile().text;
    const commentRanges = typescript.getLeadingCommentRanges(source, node.getFullStart());
    if (!commentRanges) return undefined;
    // We only care about the closest comment to the node.
    const lastRange = _.last(commentRanges);
    if (!lastRange) return undefined;
    const comment = source.substr(lastRange.pos, lastRange.end - lastRange.pos).trim();

    return doctrine.parse(comment, {unwrap: true});
}

export function foundSchema(schemaRootPath: string): boolean {
    schemaRootPath = path.resolve(schemaRootPath);
    const program = typescript.createProgram([schemaRootPath], {});
    const schemaRoot = program.getSourceFile(schemaRootPath);
    let foundSchema = false;
  
    typescript.forEachChild((schemaRoot as typescript.Node), (node) => {
      if (foundSchema) return;
      if (!isNodeExported(node)) return;
      if (node.kind === typescript.SyntaxKind.InterfaceDeclaration) {
        const interfaceNode = <typescript.InterfaceDeclaration>node;
        const documentation = documentationForNode(interfaceNode, (schemaRoot as typescript.SourceFile).text);
        if (documentation && _.find(documentation.tags, {title: 'graphql', description: 'schema'})) {
          foundSchema = true;
        }
      }
    });
  
    return foundSchema;
}

export function isNodeExported(node:typescript.Node):boolean {
    return !!node.modifiers && node.modifiers.some(m => m.kind === typescript.SyntaxKind.ExportKeyword);
}
