import fs from 'fs-extra';
import path from 'path';
import { showGenerated, showInfo } from '../utils/logger.util';
import { store } from '../store';
import Emitter from '../generators/real-resolvers/emitter';

export async function rootActions(): Promise<any>  {
    if (store.resolversRootDir && store.concreteInterfaceNames) {
        showInfo('Generating root resolvers...');

        const rootPath = path.resolve(path.join(store.resolversRootDir, `index.ts`));
        const rootPathCodeGen = path.resolve(path.join(store.resolversRootDir, `codegen.ts`));
        const emitter = new Emitter();

        // create the normal index file only if it does not exist
        if (!fs.existsSync(rootPath)) {
            await fs.createFile(rootPath);
            const writeStream = fs.createWriteStream(rootPath);
            emitter.emitRoot(writeStream);
            showGenerated(rootPath);
        }

        await fs.createFile(rootPathCodeGen)
        const codeGenWriteStream = fs.createWriteStream(rootPathCodeGen);
        emitter.emitRootCodeGen(codeGenWriteStream);
        showGenerated(rootPathCodeGen);

        return;
    }
}
