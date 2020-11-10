import inquirer from 'inquirer';

import { Answer } from '../models/answer';

export async function inputFilesQuestion(): Promise<Answer> {

    return await inquirer.prompt([{
        name: 'inputFiles',
        type: 'input',
        message: 'Specify the input files:'
    }]);
}
