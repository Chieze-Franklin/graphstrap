import fs from 'fs';
import path from 'path';
import { Answer } from './models/answer';
import { resolversActions } from './actions';
import { inputFilesQuestion, outputResolversDirectoryQuestion } from './questions';
import { showTitleAndBanner, showError } from './utils/logger.util';
import { store } from './store';

export async function tsToResolvers(): Promise<any> {
    showTitleAndBanner();

    // check if ts2resolvers.congig.json exists
    const configFileName = 'ts2resolvers.config.json';
    const configFilePath = path.join(process.cwd(), configFileName);

    let configFile;

    if (!fs.existsSync(configFilePath)) {
        showError(`The file ${configFileName} cannot be found in this directory`);
    } else {
        try {
            configFile = JSON.parse(fs.readFileSync(configFilePath, {encoding:'utf8', flag:'r'}));
        } catch (e) {
            showError(e.message);
        }
    }

    if ((configFile.config || {}).inputFiles) {
        store.inputFiles = configFile.config.inputFiles;
    } else {
        showError(`Cannot find config.inputFiles in ${configFileName}`);

        const answer: Answer = await inputFilesQuestion();
        store.inputFiles = answer.inputFiles;
    }

    if ((configFile.config || {}).outputResolversDir) {
        store.outputResolversDir = configFile.config.outputResolversDir;
    } else {
        showError(`Cannot find config.outputResolversDir in ${configFileName}`);

        const answer: Answer = await outputResolversDirectoryQuestion();
        store.outputResolversDir = answer.outputResolversDir;
    }

    if ((configFile.config || {}).context) {
        store.context = configFile.config.context;
    } else {
        showError(`Cannot find config.context in ${configFileName}\nContext will be set to type '{[key: string]: any}'.`);
    }

    await resolversActions();
}
