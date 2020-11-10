import * as glob from 'glob';
import fs from 'fs-extra';
import path from 'path';
import { showReading, showGenerated } from '../utils/logger.util';
import { store } from '../store';
import * as compiler from '../compiler';
import Emitter from '../compiler/emitter';

export async function resolversActions(): Promise<any>  {
    if (store.inputFiles && store.outputResolversDir) {
        const files = glob.sync(store.inputFiles);
        files.forEach(async file => {
            showReading(file);

            if (compiler.foundSchema(file)) {
                const fileName = path.basename(file, '.ts');
                const outputFilePath = path.resolve(path.join(store.outputResolversDir, `${fileName}.resolvers.ts`));

                await fs.createFile(outputFilePath)
                const writeStream = fs.createWriteStream(outputFilePath);
                let loadedTypes = compiler.load(file, [])
                loadedTypes = {
                    ...(
                        (store.context && store.context.import && store.context.from) &&
                        {[store.context.from]: {type: 'import', imports: [store.context.import]}}
                        ),
                    ...(
                        (store.context && store.context.default && store.context.from) &&
                        {[store.context.from]: {type: 'import', default: store.context.default}}
                        ),
                    ...loadedTypes,
                    ...(
                        (store.context && store.context.import && store.context.from) &&
                        {__ContextType: {type: 'alias', target: {type: 'reference', target: store.context.import}}}
                        ),
                    ...(
                        (store.context && store.context.default && store.context.from) &&
                        {__ContextType: {type: 'alias', target: {type: 'reference', target: store.context.default}}}
                        ),
                    ...(
                        (!store.context || !store.context.from || (!store.context.import && !store.context.default)) &&
                        {__ContextType: {type: 'alias', target: {type: 'any'}}}
                        ),
                }
                const emitter = new Emitter(loadedTypes);
                emitter.emitAll(writeStream);

                showGenerated(outputFilePath);
            }
        });

        return;
    }
}
