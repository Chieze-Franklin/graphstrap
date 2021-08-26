import fs from 'fs-extra';
import path from 'path';
import { showError, showGenerated, showInfo } from '../utils/logger.util';
import { store } from '../store';
import Emitter from '../generators/real-resolvers/emitter';
import SilverB from '../tools/silverb';

export async function mutationsActions(): Promise<any>  {
    if (store.resolversRootDir && store.concreteInterfaceNames) {
        showInfo('Generating mutation resolvers...');

        const interfaces = store.concreteInterfaceNames;
        const rootMutationPath = path.resolve(path.join(store.resolversRootDir, `mutations/index.ts`));
        const rootMutationCodeGenPath = path.resolve(path.join(store.resolversRootDir, `mutations/mutations.ts`));
        const emitter = new Emitter();

        if (!fs.existsSync(rootMutationPath)) {
            await fs.createFile(rootMutationPath)
            const rootMutationWriteStream = fs.createWriteStream(rootMutationPath);
            emitter.emitRootMutation(rootMutationWriteStream, interfaces);
            showGenerated(rootMutationPath);
        }

        await fs.createFile(rootMutationCodeGenPath)
        const rootMutationCodeGenWriteStream = fs.createWriteStream(rootMutationCodeGenPath);
        emitter.emitRootMutationCodeGen(rootMutationCodeGenWriteStream, interfaces);
        showGenerated(rootMutationCodeGenPath);

        interfaces.forEach(async _interface => {
            const resolverPath =
                path.resolve(path.join(store.resolversRootDir!, `mutations/${_interface.toLowerCase()}/${_interface}MutationResolvers.ts`));
            const resolverCodeGenPath =
                path.resolve(path.join(store.resolversRootDir!, `mutations/${_interface.toLowerCase()}/${_interface}MutationResolversCodeGen.ts`));

            // create the normal resolver file only if it does not exist
            if (!fs.existsSync(resolverPath)) {
                await fs.createFile(resolverPath);
                const writeStream = fs.createWriteStream(resolverPath);
                emitter.emitMutation(writeStream, _interface);
                showGenerated(resolverPath);
            }

            let codegen: any = {};
            const variables = {
                model: _interface
            };
            Object.entries((store.templates || {})).forEach(([key, value]) => {
                if (!['createModel', 'deleteModel', 'deleteManyModels', 'updateModel', 'updateManyModels', 'upsertModel'].includes(key)) {
                    return;
                }
                if (!value) {
                    return;
                }
                const templatePath = path.resolve(value);
                if (fs.existsSync(templatePath)) {
                    const template = fs.readFileSync(templatePath, {encoding:'utf8', flag:'r'});
                    codegen[key] = new SilverB(template).compile(variables);
                } else {
                    showError(`The template file ${value} cannot be found in this directory`);
                }
            });
            await fs.createFile(resolverCodeGenPath);
            const codeGenWriteStream = fs.createWriteStream(resolverCodeGenPath);
            emitter.emitMutationCodeGen(codeGenWriteStream, _interface, codegen);
            showGenerated(resolverCodeGenPath);
        });

        return;
    }
}
