"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolversActions = void 0;
const tslib_1 = require("tslib");
const glob = tslib_1.__importStar(require("glob"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const logger_util_1 = require("../utils/logger.util");
const store_1 = require("../store");
const compiler = tslib_1.__importStar(require("../compiler"));
const emitter_1 = tslib_1.__importDefault(require("../compiler/emitter"));
async function resolversActions() {
    if (store_1.store.inputFiles && store_1.store.outputResolversDir) {
        const files = glob.sync(store_1.store.inputFiles);
        files.forEach(async (file) => {
            logger_util_1.showReading(file);
            if (compiler.foundSchema(file)) {
                const fileName = path_1.default.basename(file, '.ts');
                const outputFilePath = path_1.default.resolve(path_1.default.join(store_1.store.outputResolversDir, `${fileName}.resolvers.ts`));
                await fs_extra_1.default.createFile(outputFilePath);
                const writeStream = fs_extra_1.default.createWriteStream(outputFilePath);
                let loadedTypes = compiler.load(file, []);
                loadedTypes = {
                    ...((store_1.store.context && store_1.store.context.import && store_1.store.context.from) &&
                        { [store_1.store.context.from]: { type: 'import', imports: [store_1.store.context.import] } }),
                    ...((store_1.store.context && store_1.store.context.default && store_1.store.context.from) &&
                        { [store_1.store.context.from]: { type: 'import', default: store_1.store.context.default } }),
                    ...loadedTypes,
                    ...((store_1.store.context && store_1.store.context.import && store_1.store.context.from) &&
                        { __ContextType: { type: 'alias', target: { type: 'reference', target: store_1.store.context.import } } }),
                    ...((store_1.store.context && store_1.store.context.default && store_1.store.context.from) &&
                        { __ContextType: { type: 'alias', target: { type: 'reference', target: store_1.store.context.default } } }),
                    ...((!store_1.store.context || !store_1.store.context.from || (!store_1.store.context.import && !store_1.store.context.default)) &&
                        { __ContextType: { type: 'alias', target: { type: 'any' } } }),
                };
                const emitter = new emitter_1.default(loadedTypes);
                emitter.emitAll(writeStream);
                logger_util_1.showGenerated(outputFilePath);
            }
        });
        return;
    }
}
exports.resolversActions = resolversActions;
