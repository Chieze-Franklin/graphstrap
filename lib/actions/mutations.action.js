"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mutationsActions = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const logger_util_1 = require("../utils/logger.util");
const store_1 = require("../store");
const emitter_1 = tslib_1.__importDefault(require("../generators/real-resolvers/emitter"));
const silverb_1 = tslib_1.__importDefault(require("../tools/silverb"));
async function mutationsActions() {
    if (store_1.store.resolversRootDir && store_1.store.concreteInterfaceNames) {
        logger_util_1.showInfo('Generating mutation resolvers...');
        const interfaces = store_1.store.concreteInterfaceNames;
        const rootMutationPath = path_1.default.resolve(path_1.default.join(store_1.store.resolversRootDir, `mutations/index.ts`));
        const rootMutationCodeGenPath = path_1.default.resolve(path_1.default.join(store_1.store.resolversRootDir, `mutations/mutations.ts`));
        const emitter = new emitter_1.default();
        if (!fs_extra_1.default.existsSync(rootMutationPath)) {
            await fs_extra_1.default.createFile(rootMutationPath);
            const rootMutationWriteStream = fs_extra_1.default.createWriteStream(rootMutationPath);
            emitter.emitRootMutation(rootMutationWriteStream, interfaces);
            logger_util_1.showGenerated(rootMutationPath);
        }
        await fs_extra_1.default.createFile(rootMutationCodeGenPath);
        const rootMutationCodeGenWriteStream = fs_extra_1.default.createWriteStream(rootMutationCodeGenPath);
        emitter.emitRootMutationCodeGen(rootMutationCodeGenWriteStream, interfaces);
        logger_util_1.showGenerated(rootMutationCodeGenPath);
        interfaces.forEach(async (_interface) => {
            const resolverPath = path_1.default.resolve(path_1.default.join(store_1.store.resolversRootDir, `mutations/${_interface.toLowerCase()}/${_interface}MutationResolvers.ts`));
            const resolverCodeGenPath = path_1.default.resolve(path_1.default.join(store_1.store.resolversRootDir, `mutations/${_interface.toLowerCase()}/${_interface}MutationResolversCodeGen.ts`));
            if (!fs_extra_1.default.existsSync(resolverPath)) {
                await fs_extra_1.default.createFile(resolverPath);
                const writeStream = fs_extra_1.default.createWriteStream(resolverPath);
                emitter.emitMutation(writeStream, _interface);
                logger_util_1.showGenerated(resolverPath);
            }
            let codegen = {};
            const variables = {
                model: _interface
            };
            Object.entries((store_1.store.templates || {})).forEach(([key, value]) => {
                if (!['createModel', 'deleteModel', 'deleteManyModels', 'updateModel', 'updateManyModels', 'upsertModel'].includes(key)) {
                    return;
                }
                if (!value) {
                    return;
                }
                const templatePath = path_1.default.resolve(value);
                if (fs_extra_1.default.existsSync(templatePath)) {
                    const template = fs_extra_1.default.readFileSync(templatePath, { encoding: 'utf8', flag: 'r' });
                    codegen[key] = new silverb_1.default(template).compile(variables);
                }
                else {
                    logger_util_1.showError(`The template file ${value} cannot be found in this directory`);
                }
            });
            await fs_extra_1.default.createFile(resolverCodeGenPath);
            const codeGenWriteStream = fs_extra_1.default.createWriteStream(resolverCodeGenPath);
            emitter.emitMutationCodeGen(codeGenWriteStream, _interface, codegen);
            logger_util_1.showGenerated(resolverCodeGenPath);
        });
        return;
    }
}
exports.mutationsActions = mutationsActions;
