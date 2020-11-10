import inquirer from 'inquirer';

import { Answer } from '../models/answer';

export async function outputResolversDirectoryQuestion(): Promise<Answer> {

    return await inquirer.prompt([{
        name: 'outputResolversDir',
        type: 'input',
        message: 'Specify the output resolvers directory:'
    }]);
}
