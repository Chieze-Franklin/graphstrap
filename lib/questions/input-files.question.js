"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inputFilesQuestion = void 0;
const tslib_1 = require("tslib");
const inquirer_1 = tslib_1.__importDefault(require("inquirer"));
async function inputFilesQuestion() {
    return await inquirer_1.default.prompt([{
            name: 'inputFiles',
            type: 'input',
            message: 'Specify the input files:'
        }]);
}
exports.inputFilesQuestion = inputFilesQuestion;
