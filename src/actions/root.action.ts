import fs from 'fs-extra';
import path from 'path';
import { showGenerated, showInfo } from '../utils/logger.util';
import { store } from '../store';
import Emitter from '../generators/real-resolvers/emitter';

export async function rootActions(): Promise<any>  {
    if (store.resolversRootDir && store.concreteInterfaceNames) {
        showInfo('Generating root resolvers...');

        const interfaces = store.concreteInterfaceNames;
        const rootPath = path.resolve(path.join(store.resolversRootDir, `index.ts`));
        const emitter = new Emitter();

        await fs.createFile(rootPath)
        const rootWriteStream = fs.createWriteStream(rootPath);
        emitter.emitRoot(rootWriteStream);
        showGenerated(rootPath);

        return;
    }
}
