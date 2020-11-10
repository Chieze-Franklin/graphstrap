import * as glob from 'glob';
import fs from 'fs-extra';
import path from 'path';
import { showReading, showGenerated, showInfo } from '../utils/logger.util';
import { store } from '../store';
import * as generator from '../generators/schema';
import * as util from '../generators/util';

export async function schemaActions(): Promise<any>  {
    if (store.in && store.schemaOutDir) {
        showInfo('Generating schema...');

        const files = glob.sync(store.in);
        store.inFiles = files;

        files.forEach(async file => {
            showReading(file);

            if (util.foundSchema(file)) {
                // const fileName = path.basename(file, '.ts');
                const outputFilePath = path.resolve(path.join(store.schemaOutDir!, `schema.graphql`));

                await fs.createFile(outputFilePath)
                const writeStream = fs.createWriteStream(outputFilePath);
                generator.emit(file, [], writeStream);

                showGenerated(outputFilePath);
            }
        });

        return;
    }
}
