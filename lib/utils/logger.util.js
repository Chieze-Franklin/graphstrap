"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showUpdate = exports.showCreate = exports.showGenerated = exports.showReading = exports.showInfo = exports.showSuccess = exports.showError = exports.showTitleAndBanner = void 0;
const tslib_1 = require("tslib");
const kleur_1 = require("kleur");
const figlet = tslib_1.__importStar(require("figlet"));
const console_message_1 = require("../models/console-message");
const newLine = '\n';
exports.showTitleAndBanner = () => {
    console.log(kleur_1.cyan(figlet.textSync(console_message_1.ConsoleMessage.TITLE, { horizontalLayout: 'full' })));
    console.info(kleur_1.cyan(console_message_1.ConsoleMessage.BANNER));
};
exports.showError = (message) => {
    console.error(kleur_1.red(console_message_1.ConsoleMessage.ERROR) + message);
};
exports.showSuccess = (message) => {
    console.log(kleur_1.green(console_message_1.ConsoleMessage.SUCCESS) + message + newLine);
};
exports.showInfo = (message) => {
    console.info(kleur_1.cyan(console_message_1.ConsoleMessage.INFO) + message + newLine);
};
exports.showReading = (filePath) => {
    console.info(kleur_1.cyan(console_message_1.ConsoleMessage.READING) + filePath + newLine);
};
exports.showGenerated = (filePath) => {
    console.log(kleur_1.cyan(console_message_1.ConsoleMessage.GENERATED) + filePath + newLine);
};
exports.showCreate = (fileName, filePath) => {
    filePath
        ? console.log(kleur_1.green(console_message_1.ConsoleMessage.CREATE) + `${fileName} in ${filePath}`)
        : console.log(kleur_1.green(console_message_1.ConsoleMessage.CREATE) + `${fileName}`);
};
exports.showUpdate = (fileName, filePath) => {
    filePath
        ? console.log(kleur_1.green(console_message_1.ConsoleMessage.UPDATE) + `${fileName} in ${filePath}`)
        : console.log(kleur_1.green(console_message_1.ConsoleMessage.UPDATE) + `${fileName}`);
};
