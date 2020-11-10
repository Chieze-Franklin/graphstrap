import fs from 'fs-extra';
import path from 'path';
import { showGenerated, showInfo } from '../utils/logger.util';
import { store } from '../store';
import Emitter from '../generators/real-resolvers/emitter';

export async function queriesActions(): Promise<any>  {
    if (store.resolversRootDir && store.concreteInterfaceNames) {
        showInfo('Generating query resolvers...');

        const interfaces = store.concreteInterfaceNames;
        const rootQueryPath = path.resolve(path.join(store.resolversRootDir, `queries/index.ts`));
        const emitter = new Emitter();

        await fs.createFile(rootQueryPath)
        const rootQueryWriteStream = fs.createWriteStream(rootQueryPath);
        emitter.emitRootQuery(rootQueryWriteStream, interfaces);
        showGenerated(rootQueryPath);

        interfaces.forEach(async _interface => {
            const resolverPath =
                path.resolve(path.join(store.resolversRootDir!, `queries/${_interface.toLowerCase()}/${_interface}QueryResolvers.ts`));
            const resolverCodeGenPath =
                path.resolve(path.join(store.resolversRootDir!, `queries/${_interface.toLowerCase()}/${_interface}QueryResolversCodeGen.ts`));

            // create the normal resolver file only if it does not exist
            if (!fs.existsSync(resolverPath)) {
                await fs.createFile(resolverPath);
                const writeStream = fs.createWriteStream(resolverPath);
                emitter.emitQuery(writeStream, _interface);
                showGenerated(resolverPath);
            }

            await fs.createFile(resolverCodeGenPath);
            const codeGenWriteStream = fs.createWriteStream(resolverCodeGenPath);
            emitter.emitQueryCodeGen(codeGenWriteStream, _interface);
            showGenerated(resolverCodeGenPath);
        });

        return;
    }
}
