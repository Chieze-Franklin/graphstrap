"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tsToResolvers = void 0;
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
const actions_1 = require("./actions");
const questions_1 = require("./questions");
const logger_util_1 = require("./utils/logger.util");
const store_1 = require("./store");
async function tsToResolvers() {
    logger_util_1.showTitleAndBanner();
    const configFileName = 'ts2resolvers.config.json';
    const configFilePath = path_1.default.join(process.cwd(), configFileName);
    let configFile;
    if (!fs_1.default.existsSync(configFilePath)) {
        logger_util_1.showError(`The file ${configFileName} cannot be found in this directory`);
    }
    else {
        try {
            configFile = JSON.parse(fs_1.default.readFileSync(configFilePath, { encoding: 'utf8', flag: 'r' }));
        }
        catch (e) {
            logger_util_1.showError(e.message);
        }
    }
    if ((configFile.config || {}).inputFiles) {
        store_1.store.inputFiles = configFile.config.inputFiles;
    }
    else {
        logger_util_1.showError(`Cannot find config.inputFiles in ${configFileName}`);
        const answer = await questions_1.inputFilesQuestion();
        store_1.store.inputFiles = answer.inputFiles;
    }
    if ((configFile.config || {}).outputResolversDir) {
        store_1.store.outputResolversDir = configFile.config.outputResolversDir;
    }
    else {
        logger_util_1.showError(`Cannot find config.outputResolversDir in ${configFileName}`);
        const answer = await questions_1.outputResolversDirectoryQuestion();
        store_1.store.outputResolversDir = answer.outputResolversDir;
    }
    if ((configFile.config || {}).context) {
        store_1.store.context = configFile.config.context;
    }
    else {
        logger_util_1.showError(`Cannot find config.context in ${configFileName}\nContext will be set to type '{[key: string]: any}'.`);
    }
    await actions_1.resolversActions();
}
exports.tsToResolvers = tsToResolvers;
