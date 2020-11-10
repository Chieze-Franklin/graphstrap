"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overwriteFileQuestion = void 0;
const tslib_1 = require("tslib");
const inquirer_1 = tslib_1.__importDefault(require("inquirer"));
async function overwriteFileQuestion() {
    return inquirer_1.default.prompt([{
            name: 'overwrite',
            type: 'confirm',
            message: 'This file already exists. Do you want to overwrite it?',
            default: false,
        }]);
}
exports.overwriteFileQuestion = overwriteFileQuestion;
