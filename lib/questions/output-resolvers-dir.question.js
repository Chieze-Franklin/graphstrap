"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outputResolversDirectoryQuestion = void 0;
const tslib_1 = require("tslib");
const inquirer_1 = tslib_1.__importDefault(require("inquirer"));
async function outputResolversDirectoryQuestion() {
    return await inquirer_1.default.prompt([{
            name: 'outputResolversDir',
            type: 'input',
            message: 'Specify the output resolvers directory:'
        }]);
}
exports.outputResolversDirectoryQuestion = outputResolversDirectoryQuestion;
