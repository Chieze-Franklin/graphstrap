"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemaActions = void 0;
const tslib_1 = require("tslib");
const glob = tslib_1.__importStar(require("glob"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const logger_util_1 = require("../utils/logger.util");
const store_1 = require("../store");
const generator = tslib_1.__importStar(require("../generators/schema"));
const util = tslib_1.__importStar(require("../generators/util"));
async function schemaActions() {
    if (store_1.store.in && store_1.store.schemaOutDir) {
        logger_util_1.showInfo('Generating schema...');
        const files = glob.sync(store_1.store.in);
        store_1.store.inFiles = files;
        files.forEach(async (file) => {
            logger_util_1.showReading(file);
            if (util.foundSchema(file)) {
                const outputFilePath = path_1.default.resolve(path_1.default.join(store_1.store.schemaOutDir, `schema.graphql`));
                await fs_extra_1.default.createFile(outputFilePath);
                const writeStream = fs_extra_1.default.createWriteStream(outputFilePath);
                generator.emit(file, [], writeStream);
                logger_util_1.showGenerated(outputFilePath);
            }
        });
        return;
    }
}
exports.schemaActions = schemaActions;
