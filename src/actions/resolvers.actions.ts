import fs from 'fs-extra';
import path from 'path';
import { showInfo, showGenerated } from '../utils/logger.util';
import { store } from '../store';
import * as generator from '../generators/resolvers';
import Emitter from '../generators/resolvers/emitter';
import * as util from '../generators/util';

export async function resolversActions(): Promise<any>  {
    if (store.in && store.resolversRootDir) {
        showInfo('Generating resolvers...');

        const files = store.inFiles || [];
        const promises = files.map(async file => {
            if (util.foundSchema(file)) {
                // const fileName = path.basename(file, '.ts');
                const resolversPath = path.resolve(path.join(store.resolversRootDir!, `resolvers.ts`));

                await fs.createFile(resolversPath)
                const writeStream = fs.createWriteStream(resolversPath);
                let loadedTypes = generator.load(file, [])
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
                store.concreteInterfaceNames = emitter.concreteInterfaceNames;

                showGenerated(resolversPath);
            }
        });

        await Promise.all(promises);

        return;
    }
}
