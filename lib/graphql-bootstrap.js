"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphqlBootstrap = void 0;
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
const actions_1 = require("./actions");
const logger_util_1 = require("./utils/logger.util");
const store_1 = require("./store");
async function graphqlBootstrap() {
    logger_util_1.showTitleAndBanner();
    const configFileName = 'graphql-bootstrap.json';
    const configFilePath = path_1.default.join(process.cwd(), configFileName);
    let configFile;
    if (!fs_1.default.existsSync(configFilePath)) {
        logger_util_1.showError(`The file ${configFileName} cannot be found in this directory`);
        return;
    }
    try {
        configFile = JSON.parse(fs_1.default.readFileSync(configFilePath, { encoding: 'utf8', flag: 'r' }));
    }
    catch (e) {
        logger_util_1.showError(e.message);
        return;
    }
    if (configFile?.config?.in) {
        store_1.store.in = configFile.config.in;
    }
    else {
        logger_util_1.showError(`Cannot find config.in in ${configFileName}`);
        return;
    }
    if (configFile?.config?.schema?.outDir) {
        store_1.store.schemaOutDir = configFile.config.schema.outDir;
        await actions_1.schemaActions();
    }
    else {
        logger_util_1.showError(`Cannot find config.schema.outDir in ${configFileName}`);
        return;
    }
    if (configFile?.config?.resolvers?.rootDir) {
        if (!configFile?.config?.resolvers?.context?.from) {
            logger_util_1.showError(`Cannot find config.resolvers.context.from in ${configFileName}`);
            return;
        }
        store_1.store.context = configFile.config.resolvers.context;
        store_1.store.resolversRootDir = configFile.config.resolvers.rootDir;
        await actions_1.resolversActions();
    }
    else {
        logger_util_1.showError(`Cannot find config.resolvers.rootDir in ${configFileName}`);
        return;
    }
    let createRootResolvers = false;
    store_1.store.templates = {};
    if (configFile?.config?.resolvers?.queries) {
        if (configFile?.config?.resolvers?.queries?.templates?.model &&
            configFile?.config?.resolvers?.queries?.templates?.models) {
            createRootResolvers = true;
            store_1.store.templates = { ...configFile.config.resolvers.queries.templates };
            await actions_1.queriesActions();
        }
        else {
            logger_util_1.showError(`Cannot find config.resolvers.queries.templates.model (or .models) in ${configFileName}`);
        }
    }
    else {
        logger_util_1.showError(`Cannot find config.resolvers.queries in ${configFileName}`);
    }
    if (configFile?.config?.resolvers?.mutations) {
        if (configFile?.config?.resolvers?.mutations?.templates?.createModel &&
            configFile?.config?.resolvers?.mutations?.templates?.deleteModel) {
            createRootResolvers = true;
            store_1.store.templates = { ...store_1.store.templates, ...configFile.config.resolvers.mutations.templates };
            await actions_1.mutationsActions();
        }
        else {
            logger_util_1.showError(`Cannot find config.resolvers.mutations.templates.createModel (or .deleteModel) in ${configFileName}`);
        }
    }
    else {
        logger_util_1.showError(`Cannot find config.resolvers.mutations in ${configFileName}`);
    }
    if (createRootResolvers) {
        await actions_1.rootActions();
    }
}
exports.graphqlBootstrap = graphqlBootstrap;
