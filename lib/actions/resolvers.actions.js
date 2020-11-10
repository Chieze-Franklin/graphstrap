"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolversActions = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const logger_util_1 = require("../utils/logger.util");
const store_1 = require("../store");
const generator = tslib_1.__importStar(require("../generators/resolvers"));
const emitter_1 = tslib_1.__importDefault(require("../generators/resolvers/emitter"));
const util = tslib_1.__importStar(require("../generators/util"));
async function resolversActions() {
    if (store_1.store.in && store_1.store.resolversRootDir) {
        logger_util_1.showInfo('Generating resolvers...');
        const files = store_1.store.inFiles || [];
        const promises = files.map(async (file) => {
            if (util.foundSchema(file)) {
                const resolversPath = path_1.default.resolve(path_1.default.join(store_1.store.resolversRootDir, `resolvers.ts`));
                await fs_extra_1.default.createFile(resolversPath);
                const writeStream = fs_extra_1.default.createWriteStream(resolversPath);
                let loadedTypes = generator.load(file, []);
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
                store_1.store.concreteInterfaceNames = emitter.concreteInterfaceNames;
                logger_util_1.showGenerated(resolversPath);
            }
        });
        await Promise.all(promises);
        return;
    }
}
exports.resolversActions = resolversActions;
